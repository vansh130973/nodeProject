import express from "express";
import { authenticate, requireMasterAdmin } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.js";
import { createModuleSchema, updateModuleSchema } from "./validations/module.validation.js";
import { listModules, getModule, createModule, editModule, removeModule } from "./controllers/module.controller.js";

const router = express.Router();

router.get(   "/",     authenticate, requireMasterAdmin, listModules);
router.get(   "/:id",  authenticate, requireMasterAdmin, getModule);
router.post(  "/",     authenticate, requireMasterAdmin, validate(createModuleSchema), createModule);
router.put(   "/:id",  authenticate, requireMasterAdmin, validate(updateModuleSchema), editModule);
router.delete("/:id",  authenticate, requireMasterAdmin, removeModule);

export default router;
