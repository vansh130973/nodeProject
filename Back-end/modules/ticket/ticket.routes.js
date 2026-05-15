import express from "express";
import { authenticate, roleCheck, modulePermissionCheck } from "../../middlewares/authMiddleware.js";
import upload from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import {
  createTicketSchema,
  addMessageSchema,
  updateTicketStatusSchema,
} from "./validations/ticket.validation.js";
import {
  createTicket,
  getMyTickets,
  getTicketDetailUser,
  addMessageUser,
  patchTicketStatusUser,
  listTicketsAdmin,
  getTicketDetailAdmin,
  addMessageAdmin,
  patchTicketStatusAdmin,
} from "./controllers/ticket.controller.js";

// ─── User ticket router — mounted at /tickets ─────────────────────────────────
export const userTicketRouter = express.Router();

userTicketRouter.post(  "/",              authenticate, roleCheck("USER"), upload.single("file"), validate(createTicketSchema), createTicket);
userTicketRouter.get(   "/",              authenticate, roleCheck("USER"), getMyTickets);
userTicketRouter.get(   "/:id",          authenticate, roleCheck("USER"), getTicketDetailUser);
userTicketRouter.post(  "/:id/messages", authenticate, roleCheck("USER"), upload.single("file"), validate(addMessageSchema), addMessageUser);
userTicketRouter.patch( "/:id/status",   authenticate, roleCheck("USER"), validate(updateTicketStatusSchema), patchTicketStatusUser);

// ─── Admin ticket router — mounted at /admin/tickets ─────────────────────────
export const adminTicketRouter = express.Router();

adminTicketRouter.get(
  "/",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["tickets", "ticket"], "canView"),
  listTicketsAdmin
);
adminTicketRouter.get(
  "/:id",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["tickets", "ticket"], "canView"),
  getTicketDetailAdmin
);
adminTicketRouter.post(
  "/:id/messages",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["tickets", "ticket"], "canEdit"),
  upload.single("file"),
  validate(addMessageSchema),
  addMessageAdmin
);
adminTicketRouter.patch(
  "/:id/status",
  authenticate,
  roleCheck("MASTER_ADMIN", "ADMIN"),
  modulePermissionCheck(["tickets", "ticket"], "canEdit"),
  validate(updateTicketStatusSchema),
  patchTicketStatusAdmin
);

export default userTicketRouter;