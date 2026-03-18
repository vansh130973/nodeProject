import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  findUserByEmailOrUsername,
  insertUser,
  findUserByUsername,
  findUserById,
} from "../services/userService.js";
import { sendSuccessResponse, sendErrorResponse, userData } from "../utils/response.js";

export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, userName, password, email, phone } = req.body;

    const existingUsers = await findUserByEmailOrUsername(email, userName);

    if (existingUsers.length > 0) {
      const emailExists = existingUsers.some(user => user.email === email);
      const usernameExists = existingUsers.some(user => user.userName === userName);

      if (emailExists) {
        return sendErrorResponse(res, "Email already registered");
      }

      if (usernameExists) {
        return sendErrorResponse(res, "Username already taken");
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await insertUser(
      firstName,
      lastName,
      userName,
      hashedPassword,
      email,
      phone
    );

    return sendSuccessResponse( res, "User registered successfully", null, jwt.sign(userData(newUser), process.env.JWT_SECRET, { expiresIn: "1h" }));

  } catch (error) {
    console.error("registerUser error:", error);
    return sendErrorResponse(res, "Server error");
  }
};

export const loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;

    const user = await findUserByUsername(userName);

    if (!user) {
      return sendErrorResponse(res, "Invalid username.");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return sendErrorResponse(res, "Invalid password.");
    }

    const token = jwt.sign({ 
      id: user.id, 
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      email: user.email,
      phone: user.phone }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    sendSuccessResponse(res, "Login successful", null, token);
  } catch (error) {
    console.error("loginUser error:", error);
    sendErrorResponse(res, "Server error");
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);

    if (!user) {
      return sendErrorResponse(res, "User not found");
    }

    return sendSuccessResponse(res, "User fetched successfully", { data: userData(user) });

  } catch (error) {
    return sendErrorResponse(res, "Server error");
  }
};