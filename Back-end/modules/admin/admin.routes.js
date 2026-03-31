import express from "express";
import {
  addAdmin,
  loginAdmin,
  logoutAdmin,
  getDashboard,
  showAllUsers,
  getUserById,
  changeUserStatus,
  deleteUser,
  logoutUserByAdmin,
  showAllAdmins,
} from "./controllers/admin.controller.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate, roleCheck } from "../../middlewares/authMiddleware.js";
import {
  addAdminSchema,
  loginAdminSchema,
  updateUserStatusSchema,
} from "./validations/admin.validation.js";

const router = express.Router();

// Auth
router.post("/login",  validate(loginAdminSchema), loginAdmin);
router.post("/logout", authenticate, logoutAdmin);

// Dashboard — single API for all counts
router.get("/dashboard", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), getDashboard);

// Admin management
router.post("/addAdmin", authenticate, roleCheck("MASTER_ADMIN"), validate(addAdminSchema), addAdmin);
router.get("/showAllAdmins", authenticate, roleCheck("MASTER_ADMIN"), showAllAdmins);

// User listing — GET /admin/users?page=1&limit=10
router.get("/users", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), showAllUsers);

// Single user (edit page)
router.get("/users/:id", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), getUserById);

// Update status — PATCH /admin/users/:id/status  body: { status: "active"|"inactive"|"pending" }
router.patch("/users/:id/status", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), validate(updateUserStatusSchema), changeUserStatus);

// Soft delete
router.delete("/users/:id", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), deleteUser);

// Force logout user
router.post("/users/:id/logout", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), logoutUserByAdmin);

export default router;