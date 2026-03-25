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
} from "../models/user.model.js";
import { formatUserData, resolveProfilePicture } from "../helpers/user.helper.js";
import { sendSuccessResponse, sendErrorResponse } from "../../../utils/response.js";

export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, userName, password, email, phone, gender } = req.body;

    const existingUsers = await findUserByEmailOrUsername(email, userName);
    if (existingUsers.length > 0) {
      if (existingUsers.some((u) => u.email === email))
        return sendErrorResponse(res, "Email already registered", 409);
      if (existingUsers.some((u) => u.userName === userName))
        return sendErrorResponse(res, "Username already taken", 409);
    }

    const profilePicture = resolveProfilePicture(req.file);
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await insertUser(
      firstName, lastName, userName, hashedPassword, email, phone, gender, profilePicture
    );

    const token = jwt.sign(formatUserData(newUser), process.env.JWT_SECRET, { expiresIn: "1h" });
    await saveUserToken(newUser.id, token);

    return sendSuccessResponse(res, "User registered successfully", null, token, 201);
  } catch (error) {
    console.error("registerUser error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;

    const user = await findUserByUsername(userName);
    if (!user) return sendErrorResponse(res, "Invalid username.", 401);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendErrorResponse(res, "Invalid password.", 401);

    const token = jwt.sign(formatUserData(user), process.env.JWT_SECRET, { expiresIn: "1h" });
    await saveUserToken(user.id, token);

    return sendSuccessResponse(res, "Login successful", null, token, 200);
  } catch (error) {
    console.error("loginUser error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const logoutUser = async (req, res) => {
  try {
    await deleteUserToken(req.token);
    return sendSuccessResponse(res, "Logged out successfully", null, null, 200);
  } catch (error) {
    console.error("logoutUser error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const getDashboard = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return sendErrorResponse(res, "User not found", 404);
    return sendSuccessResponse(res, "Dashboard fetched successfully", { data: formatUserData(user) }, null, 200);
  } catch (error) {
    console.error("getDashboard error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return sendErrorResponse(res, "User not found", 404);
    return sendSuccessResponse(res, "Profile fetched successfully", { data: formatUserData(user) }, null, 200);
  } catch (error) {
    console.error("getUserProfile error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, gender } = req.body;
    const profilePicture = resolveProfilePicture(req.file, req.body.profilePicture);

    const updatedUser = await updateUserProfile(
      req.user.id, firstName, lastName, phone, gender, profilePicture
    );

    return sendSuccessResponse(res, "Profile updated successfully", { data: formatUserData(updatedUser) }, null, 200);
  } catch (error) {
    console.error("updateProfile error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    const user = await findUserById(req.user.id);
    if (!user) return sendErrorResponse(res, "User not found", 404);

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.id, hashedNew);
    await deleteUserToken(req.token);

    return sendSuccessResponse(res, "Password changed successfully. Please login again.", null, null, 200);
  } catch (error) {
    return sendErrorResponse(res, "Server error", 500);
  }
};