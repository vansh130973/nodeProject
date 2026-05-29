import express from "express";
import upload from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import {
  authenticate,
  requireAdmin,
  requireMasterAdmin,
  modulePermissionCheck,
} from "../../middlewares/authMiddleware.js";
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
import { bulkImportUsers } from "./controllers/bulkImport.controller.js";
import {
  addAdminSchema,
  loginAdminSchema,
  updateUserStatusSchema,
  editUserSchema,
  editAdminSchema,
} from "./validations/admin.validation.js";

const router = express.Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/login",        validate(loginAdminSchema), loginAdmin);
router.post("/logout",       authenticate, logoutAdmin);
router.get( "/permissions",  authenticate, requireAdmin, getMyPermissions);

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard",
  authenticate,
  requireAdmin,
  modulePermissionCheck(["dashboard"], "canView"),
  getDashboard
);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get(    "/users",            authenticate, requireAdmin, modulePermissionCheck(["users", "user"], "canView"),   showAllUsers);
router.get(    "/users/:id",        authenticate, requireAdmin, modulePermissionCheck(["users", "user"], "canView"),   getUserById);
router.put(    "/users/:id",        authenticate, requireAdmin, modulePermissionCheck(["users", "user"], "canEdit"),   validate(editUserSchema), editUser);
router.patch(  "/users/:id/status", authenticate, requireAdmin, modulePermissionCheck(["users", "user"], "canEdit"),   validate(updateUserStatusSchema), changeUserStatus);
router.delete( "/users/:id",        authenticate, requireAdmin, modulePermissionCheck(["users", "user"], "canDelete"), deleteUser);
router.post(   "/users/:id/logout", authenticate, requireAdmin, modulePermissionCheck(["users", "user"], "canEdit"),   logoutUserByAdmin);
router.post(   "/users/bulk-import", authenticate, requireMasterAdmin, upload.single("csv"), bulkImportUsers);

// ─── Admins (master only) ─────────────────────────────────────────────────────
router.post(   "/addAdmin",       authenticate, requireMasterAdmin, validate(addAdminSchema), addAdmin);
router.get(    "/showAllAdmins",  authenticate, requireMasterAdmin, showAllAdmins);
router.get(    "/admins",         authenticate, requireMasterAdmin, showAdminsWithPagination);
router.get(    "/admins/:id",     authenticate, requireMasterAdmin, getAdminById);
router.put(    "/admins/:id",     authenticate, requireMasterAdmin, validate(editAdminSchema), editAdmin);
router.delete( "/admins/:id",     authenticate, requireMasterAdmin, deleteAdmin);

// ─── Own profile ──────────────────────────────────────────────────────────────
router.get("/profile",          authenticate, requireAdmin, getAdminProfile);
router.put("/profile",          authenticate, requireAdmin, upload.single("profilePicture"), editAdminProfile);
router.put("/change-password",  authenticate, requireAdmin, changeAdminOwnPassword);

export default router;