import express from "express";
import { authenticate, roleCheck } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.js";
import { createRoleSchema, updateRoleSchema } from "./validations/role.validation.js";
import { listRoles, getRole, createRole, editRole, removeRole } from "./controllers/role.controller.js";

const router = express.Router();

router.get(   "/",     authenticate, roleCheck("MASTER_ADMIN"), listRoles);
router.get(   "/:id",  authenticate, roleCheck("MASTER_ADMIN"), getRole);
router.post(  "/",     authenticate, roleCheck("MASTER_ADMIN"), validate(createRoleSchema), createRole);
router.put(   "/:id",  authenticate, roleCheck("MASTER_ADMIN"), validate(updateRoleSchema), editRole);
router.delete("/:id",  authenticate, roleCheck("MASTER_ADMIN"), removeRole);

export default router;
