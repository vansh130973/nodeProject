import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  findUserByEmailOrUsername,
  insertUser,
  findUserByUsername,
  findUserById,
  updateUserProfile,
  updateUserPassword,
  saveUserToken,
  deleteUserToken,
} from "../services/userService.js";
import { sendSuccessResponse, sendErrorResponse, userData } from "../utils/response.js";

export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, userName, password, email, phone, gender } = req.body;

    const existingUsers = await findUserByEmailOrUsername(email, userName);
    if (existingUsers.length > 0) {
      if (existingUsers.some((u) => u.email === email))
        return sendErrorResponse(res, "Email already registered");
      if (existingUsers.some((u) => u.userName === userName))
        return sendErrorResponse(res, "Username already taken");
    }

    const profilePicture = req.file
      ? `uploads/profiles/${req.file.filename}`
      : null;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await insertUser(
      firstName, lastName, userName, hashedPassword, email, phone, gender, profilePicture
    );

    const token = jwt.sign(userData(newUser), process.env.JWT_SECRET, { expiresIn: "1h" });
    await saveUserToken(newUser.id, token);

    return sendSuccessResponse(res, "User registered successfully", null, token);
  } catch (error) {
    console.error("registerUser error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;

    const user = await findUserByUsername(userName);
    if (!user) return sendErrorResponse(res, "Invalid username.");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendErrorResponse(res, "Invalid password.");

    const token = jwt.sign(userData(user), process.env.JWT_SECRET, { expiresIn: "1h" });
    await saveUserToken(user.id, token);

    return sendSuccessResponse(res, "Login successful", null, token);
  } catch (error) {
    console.error("loginUser error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const logoutUser = async (req, res) => {
  try {
    await deleteUserToken(req.token);
    return sendSuccessResponse(res, "Logged out successfully");
  } catch (error) {
    console.error("logoutUser error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const getDashboard = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return sendErrorResponse(res, "User not found");
    return sendSuccessResponse(res, "Dashboard fetched successfully", { data: userData(user) });
  } catch (error) {
    console.error("getDashboard error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return sendErrorResponse(res, "User not found");
    return sendSuccessResponse(res, "Profile fetched successfully", { data: userData(user) });
  } catch (error) {
    console.error("getUserProfile error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, gender } = req.body;
    const profilePicture = req.file
      ? `uploads/profiles/${req.file.filename}`
      : req.body.profilePicture ?? null;

    const updatedUser = await updateUserProfile(
      req.user.id, firstName, lastName, phone, gender, profilePicture
    );

    return sendSuccessResponse(res, "Profile updated successfully", { data: userData(updatedUser) });
  } catch (error) {
    console.error("updateProfile error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    const user = await findUserById(req.user.id);
    if (!user) return sendErrorResponse(res, "User not found");

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.id, hashedNew);

    await deleteUserToken(req.token);

    return sendSuccessResponse(res, "Password changed successfully. Please login again.");
  } catch (error) {
    return sendErrorResponse(res, "Server error");
  }
};