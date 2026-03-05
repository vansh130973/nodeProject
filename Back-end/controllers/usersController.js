import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  findUserByEmailOrUsername,
  insertUser,
  findUserByUsername,
  findUserById,
} from "../services/userService.js";

export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, userName, password, email, phone } = req.body;

    const existingUsers = await findUserByEmailOrUsername(email, userName);

    if (existingUsers.length > 0) {

      const emailExists = existingUsers.some(user => user.email === email);
      const usernameExists = existingUsers.some(user => user.userName === userName);

      if (emailExists && usernameExists) {
        return res.status(409).json({
          success: false,
          message: "Email and username already exist",
        });
      }

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }

      if (usernameExists) {
        return res.status(409).json({
          success: false,
          message: "Username already taken",
        });
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

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: newUser,
    });

  } catch (error) {
    console.error("registerUser error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;

    const user = await findUserByUsername(userName);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.userName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("loginUser error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.userName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("getUserProfile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};