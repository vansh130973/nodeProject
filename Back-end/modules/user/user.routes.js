import express from "express";
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
import { validate } from "../../middlewares/validate.js";
import { authenticate, roleCheck } from "../../middlewares/authMiddleware.js";
import {
  addUserSchema,
  loginUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from "./validations/user.validation.js";
import upload from "../../middlewares/upload.js";
import {
  createTicket,
  getMyTickets,
  getTicketDetailUser,
  addMessageUser,
  patchTicketStatusUser,
} from "../ticket/controllers/ticket.controller.js";
import {
  createTicketSchema,
  addMessageSchema,
  updateTicketStatusSchema,
} from "../ticket/validations/ticket.validation.js";

const router = express.Router();

router.post("/register", upload.single("profilePicture"), validate(addUserSchema), registerUser);
router.post("/login", validate(loginUserSchema), loginUser);
router.post("/logout", authenticate, logoutUser);
router.get("/dashboard", authenticate, getDashboard);
router.get("/profile", authenticate, getUserProfile);
router.put("/profile", authenticate, upload.single("profilePicture"), validate(updateProfileSchema), updateProfile);
router.post("/changePassword", authenticate, validate(changePasswordSchema), changePassword);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// ─── Support tickets (authenticated users only) ─────────────────────────────
router.post(
  "/tickets",
  authenticate,
  roleCheck("USER"),
  upload.single("file"),
  validate(createTicketSchema),
  createTicket
);
router.get("/tickets", authenticate, roleCheck("USER"), getMyTickets);
router.get("/tickets/:id", authenticate, roleCheck("USER"), getTicketDetailUser);
router.post(
  "/tickets/:id/messages",
  authenticate,
  roleCheck("USER"),
  upload.single("file"),
  validate(addMessageSchema),
  addMessageUser
);
router.patch(
  "/tickets/:id/status",
  authenticate,
  roleCheck("USER"),
  validate(updateTicketStatusSchema),
  patchTicketStatusUser
);

export default router;