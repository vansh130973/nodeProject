import express from "express";
import { addAdmin, loginAdmin, showAllUsers, showAllAdmins } from "../controllers/adminsController.js";
import { validate } from "../middlewares/validate.js";
import { authenticate, roleCheck } from "../middlewares/authMiddleware.js";
import { addAdminSchema, loginSchema } from "../validations/adminValidation.js";

const router = express.Router();

router.post("/addAdmin", authenticate, roleCheck("MASTER_ADMIN"), validate(addAdminSchema), addAdmin);

router.post("/login", validate(loginSchema), loginAdmin);

router.get("/showAllUsers", authenticate, roleCheck("MASTER_ADMIN", "ADMIN"), showAllUsers);

router.get("/showAllAdmins", authenticate, roleCheck("MASTER_ADMIN"), showAllAdmins);

export default router;