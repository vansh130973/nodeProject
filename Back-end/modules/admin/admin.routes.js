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
  getMyPermissions,
  getAdminProfile,
  editAdminProfile,
  changeAdminOwnPassword,
} from "./controllers/admin.controller.js";
import upload from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate, roleCheck, modulePermissionCheck } from "../../middlewares/authMiddleware.js";
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
router.get("/permissions", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), getMyPermissions);

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get(
  "/dashboard",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["dashboard"], "canView"),
  getDashboard
);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get(
  "/users",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["users", "user"], "canView"),
  showAllUsers
);
router.get(
  "/users/:id",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["users", "user"], "canView"),
  getUserById
);
router.put(
  "/users/:id",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["users", "user"], "canEdit"),
  validate(editUserSchema),
  editUser
);
router.patch(
  "/users/:id/status",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["users", "user"], "canEdit"),
  validate(updateUserStatusSchema),
  changeUserStatus
);
router.delete(
  "/users/:id",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["users", "user"], "canDelete"),
  deleteUser
);
router.post(
  "/users/:id/logout",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["users", "user"], "canEdit"),
  logoutUserByAdmin
);

// ─── Admins ───────────────────────────────────────────────────────────────────
router.post("/addAdmin",             authenticate, roleCheck("MASTER_ADMIN"), validate(addAdminSchema), addAdmin);
router.get("/showAllAdmins",         authenticate, roleCheck("MASTER_ADMIN"), showAllAdmins);
router.get("/admins",                authenticate, roleCheck("MASTER_ADMIN"), showAdminsWithPagination);
router.get("/admins/:id",            authenticate, roleCheck("MASTER_ADMIN"), getAdminById);
router.put("/admins/:id",            authenticate, roleCheck("MASTER_ADMIN"), validate(editAdminSchema), editAdmin);
router.delete("/admins/:id",         authenticate, roleCheck("MASTER_ADMIN"), deleteAdmin);

// ─── Own Profile ──────────────────────────────────────────────────────────────
router.get("/profile",          authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), getAdminProfile);
router.put("/profile",          authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), upload.single("profilePicture"), editAdminProfile);
router.put("/change-password",  authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), changeAdminOwnPassword);

export default router;