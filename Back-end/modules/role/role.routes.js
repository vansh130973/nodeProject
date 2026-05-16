import express from "express";
import { authenticate, requireMasterAdmin } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.js";
import { createRoleSchema, updateRoleSchema } from "./validations/role.validation.js";
import { listRoles, getRole, createRole, editRole, removeRole } from "./controllers/role.controller.js";

const router = express.Router();

router.get(   "/",     authenticate, requireMasterAdmin, listRoles);
router.get(   "/:id",  authenticate, requireMasterAdmin, getRole);
router.post(  "/",     authenticate, requireMasterAdmin, validate(createRoleSchema), createRole);
router.put(   "/:id",  authenticate, requireMasterAdmin, validate(updateRoleSchema), editRole);
router.delete("/:id",  authenticate, requireMasterAdmin, removeRole);

export default router;
