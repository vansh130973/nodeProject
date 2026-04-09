import express from "express";
import { authenticate, roleCheck } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.js";
import { createModuleSchema, updateModuleSchema } from "./validations/module.validation.js";
import { listModules, getModule, createModule, editModule, removeModule } from "./module.controller.js";

const router = express.Router();

router.get(   "/",     authenticate, roleCheck("MASTER_ADMIN"), listModules);
router.get(   "/:id",  authenticate, roleCheck("MASTER_ADMIN"), getModule);
router.post(  "/",     authenticate, roleCheck("MASTER_ADMIN"), validate(createModuleSchema), createModule);
router.put(   "/:id",  authenticate, roleCheck("MASTER_ADMIN"), validate(updateModuleSchema), editModule);
router.delete("/:id",  authenticate, roleCheck("MASTER_ADMIN"), removeModule);

export default router;
