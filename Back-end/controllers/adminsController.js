import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  findAdminByEmailOrUsername,
  insertAdmin,
  findAdminByUsername,
  getAllUsers,
  getAllAdmins,
  saveAdminToken,
  deleteAdminToken,
} from "../services/adminService.js";
import { sendSuccessResponse, sendErrorResponse, adminData } from "../utils/response.js";

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

    return sendSuccessResponse(res, "Admin registered successfully", { admin: adminData(insertedAdmin) }, null, 201);
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

    const token = jwt.sign(adminData(admin), process.env.JWT_SECRET, { expiresIn: "1h" });

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

export const showAllUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    return sendSuccessResponse(res, "Users fetched successfully", { users }, null, 200);
  } catch (error) {
    console.error("showAllUsers error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const showAllAdmins = async (req, res) => {
  try {
    const admins = await getAllAdmins();
    return sendSuccessResponse(res, "Admins fetched successfully", { admins }, null, 200);
  } catch (error) {
    console.error("showAllAdmins error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};