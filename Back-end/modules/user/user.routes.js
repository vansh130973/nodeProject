import express from "express";
import upload from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  getDashboard,
  getUserProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "./controllers/user.controller.js";
import {
  addUserSchema,
  loginUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from "./validations/user.validation.js";

const router = express.Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/register",        upload.single("profilePicture"), validate(addUserSchema),    registerUser);
router.post("/login",           validate(loginUserSchema),                                   loginUser);
router.post("/logout",          authenticate,                                                logoutUser);
router.post("/forgot-password", validate(forgotPasswordSchema),                              forgotPassword);
router.post("/verify-otp",      validate(verifyOtpSchema),                                   verifyOtp);
router.post("/reset-password",  validate(resetPasswordSchema),                               resetPassword);

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get( "/dashboard",      authenticate, getDashboard);
router.get( "/profile",        authenticate, getUserProfile);
router.put( "/profile",        authenticate, upload.single("profilePicture"), validate(updateProfileSchema), updateProfile);
router.post("/changePassword",  authenticate, validate(changePasswordSchema), changePassword);

export default router;
