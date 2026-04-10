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
  showAdminsWithPagination,
  getAdminById,
  editAdmin,
  deleteAdmin,
  editUser,
} from "./controllers/admin.controller.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate, roleCheck } from "../../middlewares/authMiddleware.js";
import {
  addAdminSchema,
  loginAdminSchema,
  updateUserStatusSchema,
  editUserSchema,
  editAdminSchema,
} from "./validations/admin.validation.js";

const router = express.Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/login",   validate(loginAdminSchema), loginAdmin);
router.post("/logout",  authenticate, logoutAdmin);

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), getDashboard);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get("/users",              authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), showAllUsers);
router.get("/users/:id",          authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), getUserById);
router.put("/users/:id",          authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), validate(editUserSchema), editUser);
router.patch("/users/:id/status", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), validate(updateUserStatusSchema), changeUserStatus);
router.delete("/users/:id",       authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), deleteUser);
router.post("/users/:id/logout",  authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), logoutUserByAdmin);

// ─── Admins ───────────────────────────────────────────────────────────────────
router.post("/addAdmin",             authenticate, roleCheck("MASTER_ADMIN"), validate(addAdminSchema), addAdmin);
router.get("/showAllAdmins",         authenticate, roleCheck("MASTER_ADMIN"), showAllAdmins);
router.get("/admins",                authenticate, roleCheck("MASTER_ADMIN"), showAdminsWithPagination);
router.get("/admins/:id",            authenticate, roleCheck("MASTER_ADMIN"), getAdminById);
router.put("/admins/:id",            authenticate, roleCheck("MASTER_ADMIN"), validate(editAdminSchema), editAdmin);
router.delete("/admins/:id",         authenticate, roleCheck("MASTER_ADMIN"), deleteAdmin);

export default router;