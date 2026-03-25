import express from "express";
import {
  addAdmin,
  loginAdmin,
  logoutAdmin,
  showAllUsers,
  showAllAdmins,
} from "./controllers/admin.controller.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate, roleCheck } from "../../middlewares/authMiddleware.js";
import { addAdminSchema, loginAdminSchema } from "./validations/admin.validation.js";

const router = express.Router();

router.post("/login", validate(loginAdminSchema), loginAdmin);
router.post("/logout", authenticate, logoutAdmin);
router.post("/addAdmin", authenticate, roleCheck("MASTER_ADMIN"), validate(addAdminSchema), addAdmin);
router.get("/showAllUsers", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), showAllUsers);
router.get("/showAllAdmins", authenticate, roleCheck("MASTER_ADMIN"), showAllAdmins);

export default router;