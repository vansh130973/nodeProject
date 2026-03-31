import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  findAdminByEmailOrUsername,
  insertAdmin,
  findAdminByUsername,
  getUsersWithPagination,
  getUsersCount,
  findUserByIdAdmin,
  updateUserStatus,
  softDeleteUser,
  forceLogoutUser,
  getAllAdmins,
  getDashboardCounts,
  saveAdminToken,
  deleteAdminToken,
} from "../models/admin.model.js";
import { formatAdminData } from "../helpers/admin.helper.js";
import { sendSuccessResponse, sendErrorResponse } from "../../../utils/response.js";

// ─── Admin auth ───────────────────────────────────────────────────────────────

export const addAdmin = async (req, res) => {
  try {
    const { userName, password, phone, email } = req.body;

    const existingUsers = await findAdminByEmailOrUsername(email, userName);
    if (existingUsers.length > 0) {
      if (existingUsers.some((u) => u.email === email))
        return sendErrorResponse(res, "Email already registered", 409);
      if (existingUsers.some((u) => u.userName === userName))
        return sendErrorResponse(res, "Username already taken", 409);
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const insertedAdmin = await insertAdmin(userName, hashedPassword, email, phone);

    return sendSuccessResponse(
      res,
      "Admin registered successfully",
      { admin: formatAdminData(insertedAdmin) },
      null,
      201
    );
  } catch (error) {
    console.error("addAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { userName, password } = req.body;

    const admin = await findAdminByUsername(userName);
    if (!admin) return sendErrorResponse(res, "Invalid username", 401);

    const isMatch = await bcrypt.compare(String(password), admin.password);
    if (!isMatch) return sendErrorResponse(res, "Invalid password", 401);

    const token = jwt.sign(formatAdminData(admin), process.env.JWT_SECRET, { expiresIn: "1h" });
    await saveAdminToken(admin.id, token);

    return sendSuccessResponse(res, "Login successful", null, token, 200);
  } catch (error) {
    console.error("loginAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const logoutAdmin = async (req, res) => {
  try {
    await deleteAdminToken(req.token);
    return sendSuccessResponse(res, "Logged out successfully", null, null, 200);
  } catch (error) {
    console.error("logoutAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboard = async (req, res) => {
  try {
    const counts = await getDashboardCounts();
    return sendSuccessResponse(res, "Dashboard fetched successfully", { data: counts }, null, 200);
  } catch (error) {
    console.error("getDashboard error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── User listing with pagination ────────────────────────────────────────────

export const showAllUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

    const [users, total] = await Promise.all([
      getUsersWithPagination(page, limit),
      getUsersCount(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return sendSuccessResponse(res, "Users fetched successfully", {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }, null, 200);
  } catch (error) {
    console.error("showAllUsers error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── Single user (for edit) ───────────────────────────────────────────────────

export const getUserById = async (req, res) => {
  try {
    const user = await findUserByIdAdmin(req.params.id);
    if (!user) return sendErrorResponse(res, "User not found", 404);
    return sendSuccessResponse(res, "User fetched successfully", { user }, null, 200);
  } catch (error) {
    console.error("getUserById error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── Update user status ───────────────────────────────────────────────────────

export const changeUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["active", "pending", "inactive"];
    if (!allowed.includes(status))
      return sendErrorResponse(res, `Invalid status. Allowed: ${allowed.join(", ")}`, 400);

    const user = await findUserByIdAdmin(id);
    if (!user) return sendErrorResponse(res, "User not found", 404);
    if (user.status === "deleted")
      return sendErrorResponse(res, "Cannot update status of a deleted user", 400);

    await updateUserStatus(id, status);

    // If deactivating/pending, kill all active sessions
    if (status !== "active") {
      await forceLogoutUser(id);
    }

    return sendSuccessResponse(res, `User status updated to '${status}'`, null, null, 200);
  } catch (error) {
    console.error("changeUserStatus error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── Soft delete user ─────────────────────────────────────────────────────────

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await findUserByIdAdmin(id);
    if (!user) return sendErrorResponse(res, "User not found", 404);
    if (user.status === "deleted")
      return sendErrorResponse(res, "User is already deleted", 400);

    await softDeleteUser(id);

    return sendSuccessResponse(res, "User deleted successfully", null, null, 200);
  } catch (error) {
    console.error("deleteUser error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── Force logout user ────────────────────────────────────────────────────────

export const logoutUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await findUserByIdAdmin(id);
    if (!user) return sendErrorResponse(res, "User not found", 404);

    await forceLogoutUser(id);

    return sendSuccessResponse(res, "User logged out successfully", null, null, 200);
  } catch (error) {
    console.error("logoutUserByAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── Admin listing ────────────────────────────────────────────────────────────

export const showAllAdmins = async (req, res) => {
  try {
    const admins = await getAllAdmins();
    return sendSuccessResponse(res, "Admins fetched successfully", { admins }, null, 200);
  } catch (error) {
    console.error("showAllAdmins error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};