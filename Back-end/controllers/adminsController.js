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

    const existingAdmin = await findAdminByEmailOrUsername(email, userName);
    if (existingAdmin.length > 0)
      return sendErrorResponse(res, "Username or email already exists");

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const insertedAdmin = await insertAdmin(userName, hashedPassword, email, phone);

    return sendSuccessResponse(res, "Admin registered successfully", { admin: adminData(insertedAdmin) });
  } catch (error) {
    console.error("addAdmin error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { userName, password } = req.body;

    const admin = await findAdminByUsername(userName);
    if (!admin) return sendErrorResponse(res, "Invalid username");

    const isMatch = await bcrypt.compare(String(password), admin.password);
    if (!isMatch) return sendErrorResponse(res, "Invalid password");

    const token = jwt.sign(adminData(admin), process.env.JWT_SECRET, { expiresIn: "1h" });

    await saveAdminToken(admin.id, token);

    return sendSuccessResponse(res, "Login successful", null, token);
  } catch (error) {
    console.error("loginAdmin error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const logoutAdmin = async (req, res) => {
  try {
    await deleteAdminToken(req.token);
    return sendSuccessResponse(res, "Logged out successfully");
  } catch (error) {
    console.error("logoutAdmin error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const showAllUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    return sendSuccessResponse(res, "Users fetched successfully", { users });
  } catch (error) {
    console.error("showAllUsers error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const showAllAdmins = async (req, res) => {
  try {
    const admins = await getAllAdmins();
    return sendSuccessResponse(res, "Admins fetched successfully", { admins });
  } catch (error) {
    console.error("showAllAdmins error:", error);
    return sendErrorResponse(res, "Server error");
  }
};