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
  editUser,
} from "./controllers/admin.controller.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate, roleCheck } from "../../middlewares/authMiddleware.js";
import {
  addAdminSchema,
  loginAdminSchema,
  updateUserStatusSchema,
  editUserSchema,
} from "./validations/admin.validation.js";

const router = express.Router();

router.post("/login",   validate(loginAdminSchema), loginAdmin);
router.post("/logout",  authenticate, logoutAdmin);
router.get("/dashboard", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), getDashboard);
router.post("/addAdmin", authenticate, roleCheck("MASTER_ADMIN"), validate(addAdminSchema), addAdmin);
router.get("/showAllAdmins", authenticate, roleCheck("MASTER_ADMIN"), showAllAdmins);
router.get("/users", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), showAllUsers);
router.get("/users/:id", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), getUserById);
router.patch("/users/:id/status", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), validate(updateUserStatusSchema), changeUserStatus);
router.delete("/users/:id", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), deleteUser);
router.put("/users/:id", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), validate(editUserSchema), editUser);
router.post("/users/:id/logout", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), logoutUserByAdmin);

export default router;