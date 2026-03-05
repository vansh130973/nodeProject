import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  findAdminByEmailOrUsername,
  insertMasterAdmin,
  findAdminByUsername,
  getAllUsers,
  getAllAdmins,
} from "../services/adminService.js";

export const addAdmin = async (req, res) => {
  try {
    const { userName, password, phone, email } = req.body;

    const existingAdmin = await findAdminByEmailOrUsername(email, userName);
    if (existingAdmin.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const insertedAdmin = await insertMasterAdmin(
      userName,
      hashedPassword,
      email,
      phone,
    );

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      admin: insertedAdmin,
    });
  } catch (error) {
    console.error("addAdmin error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { userName, password } = req.body;

    const admin = await findAdminByUsername(userName);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid username",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      String(password),
      admin.password,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        userName: admin.userName,
        email: admin.email,
        phone: admin.phone,
      },
    });
  } catch (error) {
    console.error("loginAdmin error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const showAllUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("showAllUsers error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const showAllAdmins = async (req, res) => {
  try {
    const admins = await getAllAdmins();
    return res.status(200).json({ success: true, admins });
  } catch (error) {
    console.error("showAllAdmins error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
