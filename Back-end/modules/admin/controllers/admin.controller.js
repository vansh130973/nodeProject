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
import { sendSuccessResponse, sendErrorResponse } from "../../../common/http/response.js";
import { parseLimit, parsePage, buildPaginationMeta } from "../../../common/http/pagination.js";
import {
  emitUserStatusChanged,
  emitForceLogoutUser,
  emitForceLogoutAdmin,
  emitAdminStatusChanged,
} from "../../../socket/socketManager.js";
import { BCRYPT_ROUNDS } from "../../../common/constants/app.constants.js";

/** username "admin" = unrestricted super-admin */
const isSuperAdmin = (userName) => userName === "admin";

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

    // Prevent creating another "admin" super-admin account
    if (isSuperAdmin(userName)) {
      return sendErrorResponse(res, "Username 'admin' is reserved", 400);
    }

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

    const hashedPassword = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
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

    // Super-admin gets no permission payload (has everything); others get their role's permissions
    const permissions = isSuperAdmin(admin.userName)
      ? []
      : await getAdminPermissions(admin.roleId);

    const tokenPayload = {
      ...formatAdminData({
        ...admin,
        permissions: buildPermissionMap(permissions),
      }),
      isMasterAdmin: isSuperAdmin(admin.userName),
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1h" });
    await saveAdminToken(admin.id, token);

    return sendSuccessResponse(res, "Login successful", { token }, 200);

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
    // Super-admin: signal full access to frontend
    if (isSuperAdmin(req.user.userName)) {
      return sendSuccessResponse(res, "Permissions fetched successfully", {
        permissions: {},
        isSuperAdmin: true,
      });
    }

    const permissions = await getAdminPermissions(req.user.roleId);
    return sendSuccessResponse(res, "Permissions fetched successfully", {
      permissions: buildPermissionMap(permissions),
      isSuperAdmin: false,
    });
  } catch (error) {
    console.error("getMyPermissions error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── USERS ────────────────────────────────────────────────────────────────────

export const showAllUsers = async (req, res) => {
  try {
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 10);
    const status = req.query.status || "";
    const search = req.query.search || "";

    const { rows: users, total } = await getUsersWithPaginationAndCount(page, limit, status, search);

    return sendSuccessResponse(res, "Users fetched successfully", {
      users,
      pagination: buildPaginationMeta({ total, page, limit }),
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
    if (status !== "active") {
      await forceLogoutUser(id);
      emitForceLogoutUser(Number(id));  // real-time forced logout
    }
    emitUserStatusChanged(Number(id), status); // real-time status badge update

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
    emitForceLogoutUser(Number(id));
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
      hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
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
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 10);
    const search = req.query.search || "";

    const { rows: admins, total } = await getAdminsWithPaginationAndCount(page, limit, search);

    return sendSuccessResponse(res, "Admins fetched successfully", {
      admins,
      pagination: buildPaginationMeta({ total, page, limit }),
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
    // Protect the super-admin account from being fetched/edited via API
    if (isSuperAdmin(admin.userName)) return sendErrorResponse(res, "Forbidden", 403);
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
    if (isSuperAdmin(admin.userName)) return sendErrorResponse(res, "Cannot edit the super-admin account", 403);
    if (admin.status === "deleted") return sendErrorResponse(res, "Cannot edit deleted admin", 400);

    const conflicts = await findAdminByEmailOrUsername(email, userName);
    const others = conflicts.filter((a) => a.id !== Number(id));
    if (others.some((a) => a.email === email))    return sendErrorResponse(res, "Email already registered", 409);
    if (others.some((a) => a.userName === userName)) return sendErrorResponse(res, "Username already taken", 409);

    let hashedPassword;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    const updated = await updateAdminByMaster(id, { userName, email, phone, password: hashedPassword, roleId });
    await deleteAllAdminTokens(id);
    emitForceLogoutAdmin(Number(id)); // real-time: kick the edited admin out to re-login

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
    if (isSuperAdmin(admin.userName)) return sendErrorResponse(res, "Cannot delete the super-admin account", 403);
    if (admin.status === "deleted") return sendErrorResponse(res, "Already deleted", 400);

    await softDeleteAdmin(id);
    emitForceLogoutAdmin(Number(id)); // real-time: kick deleted admin immediately
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

    const hashed = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
    await updateAdminPassword(id, hashed);
    await deleteAdminToken(id);

    return sendSuccessResponse(res, "Password changed. Please login again.");
  } catch (error) {
    console.error("changeAdminOwnPassword error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};