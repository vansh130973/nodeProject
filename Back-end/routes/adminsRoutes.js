import express from "express";
import { addAdmin, loginAdmin, showAllUsers, showAllAdmins } from "../controllers/adminsController.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { addAdminSchema, loginSchema } from "../validations/adminValidation.js";

const router = express.Router();

router.post("/addAdmin", validate(addAdminSchema), addAdmin);

router.post("/login", validate(loginSchema), loginAdmin);

router.get("/showAllUsers", authenticate, showAllUsers);

router.get("/showAllAdmins", authenticate, showAllAdmins);

export default router;