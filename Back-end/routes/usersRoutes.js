import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
} from "../controllers/usersController.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { addUserSchema, loginUserSchema } from "../validations/userValidation.js";

const router = express.Router();

router.post("/register", validate(addUserSchema), registerUser);

router.post("/login", validate(loginUserSchema), loginUser);

router.get("/profile", authenticate, getUserProfile);

export default router;