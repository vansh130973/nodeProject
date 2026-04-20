import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  findAdminByEmailOrUsername,
  insertAdmin,
  findAdminByUsername,
  findAdminById,
  getAdminsWithPaginationAndCount,
  updateAdminByMaster,
  softDeleteAdmin,
  findUserByIdAdmin,
  updateUserStatus,
  softDeleteUser,
  forceLogoutUser,
  getAllAdmins,
  getDashboardCounts,
  getAdminPermissions,
  saveAdminToken,
  deleteAdminToken,
  deleteAllAdminTokens,
  updateUserByAdmin,
  getUsersWithPaginationAndCount,
} from "../models/admin.model.js";
import { findRoleById } from "../../role/models/role.model.js";

import { formatAdminData } from "../helpers/admin.helper.js";
import { sendSuccessResponse, sendErrorResponse } from "../../../utils/response.js";

const parseLimit = (value, fallback = 10) => {
  if (String(value).toLowerCase() === "all") return "all";
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(100, Math.max(1, parsed));
};

const buildPermissionMap = (permissions) =>
  permissions.reduce((acc, p) => {
    acc[String(p.moduleName || "").toLowerCase()] = {
      canView: !!p.canView,
      canAdd: !!p.canAdd,
      canEdit: !!p.canEdit,
      canDelete: !!p.canDelete,
    };
    return acc;
  }, {});

// ─── ADD ADMIN ────────────────────────────────────────────────────────────────

export const addAdmin = async (req, res) => {
  try {
    const { userName, password, phone, email, roleId } = req.body;

    const existingUsers = await findAdminByEmailOrUsername(email, userName);
    if (existingUsers.length > 0) {
      if (existingUsers.some((u) => u.email === email))
        return sendErrorResponse(res, "Email already registered", 409);
      if (existingUsers.some((u) => u.userName === userName))
        return sendErrorResponse(res, "Username already taken", 409);
    }

    const role = await findRoleById(roleId);
    if (!role || role.status !== "active" || role.isDeleted) {
      return sendErrorResponse(res, "Selected role is invalid or inactive", 400);
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const insertedAdmin = await insertAdmin(userName, hashedPassword, email, phone, roleId);

    return sendSuccessResponse(res, "Admin registered successfully", {
      admin: formatAdminData(insertedAdmin),
    }, 201);

  } catch (error) {
    console.error("addAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export const loginAdmin = async (req, res) => {
  try {
    const { userName, password } = req.body;

    const admin = await findAdminByUsername(userName);
    if (!admin) return sendErrorResponse(res, "Invalid username", 401);

    if (admin.status === "inactive")
      return sendErrorResponse(res, "Your account has been deactivated. Contact support.", 403);
    if (admin.status === "deleted")
      return sendErrorResponse(res, "Account not found.", 403);

    const isMatch = await bcrypt.compare(String(password), admin.password);
    if (!isMatch) return sendErrorResponse(res, "Invalid password", 401);

    const permissions = admin.role === "ADMIN" ? await getAdminPermissions(admin.roleId) : [];
    const tokenPayload = formatAdminData({ ...admin, permissions: buildPermissionMap(permissions) });
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1h" });
    await saveAdminToken(admin.id, token);

    return sendSuccessResponse(res, "Login successful", {token}, 200);

  } catch (error) {
    console.error("loginAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

export const logoutAdmin = async (req, res) => {
  try {
    await deleteAdminToken(req.token);
    return sendSuccessResponse(res, "Logged out successfully");
  } catch (error) {
    console.error("logoutAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export const getDashboard = async (req, res) => {
  try {
    const counts = await getDashboardCounts();
    return sendSuccessResponse(res, "Dashboard fetched successfully", { data: counts });
  } catch (error) {
    console.error("getDashboard error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const getMyPermissions = async (req, res) => {
  try {
    if (req.user.role === "MASTER_ADMIN") {
      return sendSuccessResponse(res, "Permissions fetched successfully", {
        permissions: {},
        isMasterAdmin: true,
      });
    }

    if (req.user.role !== "ADMIN") {
      return sendErrorResponse(res, "Access denied.", 403);
    }

    const permissions = await getAdminPermissions(req.user.roleId);
    return sendSuccessResponse(res, "Permissions fetched successfully", {
      permissions: buildPermissionMap(permissions),
      isMasterAdmin: false,
    });
  } catch (error) {
    console.error("getMyPermissions error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── USERS ────────────────────────────────────────────────────────────────────

export const showAllUsers = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = parseLimit(req.query.limit, 10);
    const status = req.query.status || "";
    const search = req.query.search || "";

    const { rows: users, total } = await getUsersWithPaginationAndCount(page, limit, status, search);
    const totalPages = limit === "all" ? 1 : Math.ceil(total / limit);

    return sendSuccessResponse(res, "Users fetched successfully", {
      users,
      pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (error) {
    console.error("showAllUsers error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await findUserByIdAdmin(req.params.id);
    if (!user) return sendErrorResponse(res, "User not found", 404);
    return sendSuccessResponse(res, "User fetched successfully", { user });
  } catch (error) {
    console.error("getUserById error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const changeUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["active", "pending", "inactive"];
    if (!allowed.includes(status))
      return sendErrorResponse(res, "Invalid status", 400);

    const user = await findUserByIdAdmin(id);
    if (!user) return sendErrorResponse(res, "User not found", 404);
    if (user.status === "deleted") return sendErrorResponse(res, "Cannot update deleted user", 400);

    await updateUserStatus(id, status);
    if (status !== "active") await forceLogoutUser(id);

    return sendSuccessResponse(res, `User status updated to '${status}'`);
  } catch (error) {
    console.error("changeUserStatus error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await findUserByIdAdmin(id);
    if (!user) return sendErrorResponse(res, "User not found", 404);
    if (user.status === "deleted") return sendErrorResponse(res, "Already deleted", 400);
    await softDeleteUser(id);
    return sendSuccessResponse(res, "User deleted successfully");
  } catch (error) {
    console.error("deleteUser error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const logoutUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await findUserByIdAdmin(id);
    if (!user) return sendErrorResponse(res, "User not found", 404);
    await forceLogoutUser(id);
    return sendSuccessResponse(res, "User logged out successfully");
  } catch (err) {
    console.log("logoutUserByAdmin error:", err);
    return sendErrorResponse(res, "Unable to logout user", 500, err.stack);
  }
};

export const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, gender, password } = req.body;

    const user = await findUserByIdAdmin(id);
    if (!user) return sendErrorResponse(res, "User not found", 404);
    if (user.status === "deleted") return sendErrorResponse(res, "Cannot edit deleted user", 400);

    let hashedPassword;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updated = await updateUserByAdmin(id, { firstName, lastName, email, phone, gender, password: hashedPassword });
    return sendSuccessResponse(res, "User updated successfully", { user: updated });
  } catch (error) {
    console.error("editUser error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── ADMINS CRUD ──────────────────────────────────────────────────────────────

export const showAllAdmins = async (req, res) => {
  try {
    const admins = await getAllAdmins();
    return sendSuccessResponse(res, "Admins fetched successfully", { admins });
  } catch (error) {
    console.error("showAllAdmins error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const showAdminsWithPagination = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = parseLimit(req.query.limit, 10);
    const search = req.query.search || "";

    const { rows: admins, total } = await getAdminsWithPaginationAndCount(page, limit, search);
    const totalPages = limit === "all" ? 1 : Math.ceil(total / limit);

    return sendSuccessResponse(res, "Admins fetched successfully", {
      admins,
      pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (error) {
    console.error("showAdminsWithPagination error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const getAdminById = async (req, res) => {
  try {
    const admin = await findAdminById(req.params.id);
    if (!admin) return sendErrorResponse(res, "Admin not found", 404);
    if (admin.role === "MASTER_ADMIN") return sendErrorResponse(res, "Forbidden", 403);
    return sendSuccessResponse(res, "Admin fetched successfully", { admin: formatAdminData(admin) });
  } catch (error) {
    console.error("getAdminById error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const editAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, email, phone, password, roleId } = req.body;
    const role = await findRoleById(roleId);
    if (!role || role.status !== "active" || role.isDeleted) {
      return sendErrorResponse(res, "Selected role is invalid or inactive", 400);
    }


    const admin = await findAdminById(id);
    if (!admin) return sendErrorResponse(res, "Admin not found", 404);
    if (admin.role === "MASTER_ADMIN") return sendErrorResponse(res, "Cannot edit MASTER_ADMIN", 403);
    if (admin.status === "deleted") return sendErrorResponse(res, "Cannot edit deleted admin", 400);

    // Check uniqueness for userName/email (excluding self)
    const conflicts = await findAdminByEmailOrUsername(email, userName);
    const others = conflicts.filter((a) => a.id !== Number(id));
    if (others.some((a) => a.email === email))    return sendErrorResponse(res, "Email already registered", 409);
    if (others.some((a) => a.userName === userName)) return sendErrorResponse(res, "Username already taken", 409);

    let hashedPassword;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updated = await updateAdminByMaster(id, {
      userName,
      email,
      phone,
      password: hashedPassword,
      roleId,
    });

    await deleteAllAdminTokens(id);

    return sendSuccessResponse(res, "Admin updated successfully", { admin: formatAdminData(updated) });
  } catch (error) {
    console.error("editAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await findAdminById(id);
    if (!admin) return sendErrorResponse(res, "Admin not found", 404);
    if (admin.role === "MASTER_ADMIN") return sendErrorResponse(res, "Cannot delete MASTER_ADMIN", 403);
    if (admin.status === "deleted") return sendErrorResponse(res, "Already deleted", 400);

    await softDeleteAdmin(id);
    return sendSuccessResponse(res, "Admin deleted successfully");
  } catch (error) {
    console.error("deleteAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};
// ─── OWN PROFILE ─────────────────────────────────────────────────────────────

import {
  updateAdminOwnProfile,
  updateAdminPassword,
  findAdminWithPasswordById,
} from "../models/admin.model.js";

export const getAdminProfile = async (req, res) => {
  try {
    const admin = await findAdminById(req.user.id);
    if (!admin) return sendErrorResponse(res, "Admin not found", 404);
    return sendSuccessResponse(res, "Profile fetched", { admin });
  } catch (error) {
    console.error("getAdminProfile error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const editAdminProfile = async (req, res) => {
  try {
    const id = req.user.id;
    const { userName, email, phone } = req.body;

    // Check uniqueness (exclude self)
    const existing = await findAdminByEmailOrUsername(email, userName);
    const conflict = existing.filter((a) => a.id !== id);
    if (conflict.some((a) => a.email === email))
      return sendErrorResponse(res, "Email already in use", 409);
    if (conflict.some((a) => a.userName === userName))
      return sendErrorResponse(res, "Username already taken", 409);

    const updated = await updateAdminOwnProfile(id, { userName, email, phone });
    return sendSuccessResponse(res, "Profile updated", { admin: updated });
  } catch (error) {
    console.error("editAdminProfile error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const changeAdminOwnPassword = async (req, res) => {
  try {
    const id = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const admin = await findAdminWithPasswordById(id);
    if (!admin) return sendErrorResponse(res, "Admin not found", 404);

    const match = await bcrypt.compare(String(currentPassword), admin.password);
    if (!match) return sendErrorResponse(res, "Current password is incorrect", 400);

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await updateAdminPassword(id, hashed);
    // Invalidate all tokens
    await deleteAdminToken(id);

    return sendSuccessResponse(res, "Password changed. Please login again.");
  } catch (error) {
    console.error("changeAdminOwnPassword error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};