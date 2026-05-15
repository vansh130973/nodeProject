import express from "express";
import { authenticate, roleCheck } from "../../middlewares/authMiddleware.js";
import {
  listNotifications,
  readNotification,
  readAllNotifications,
  listNotificationsAdmin,
  sendBroadcastNotification,
} from "./notification.controller.js";

// ─── User notification router — mounted at /notifications ─────────────────────
export const userNotificationRouter = express.Router();

userNotificationRouter.get(   "/",          authenticate, roleCheck("USER"), listNotifications);
userNotificationRouter.patch( "/read-all",  authenticate, roleCheck("USER"), readAllNotifications);
userNotificationRouter.patch( "/:id/read",  authenticate, roleCheck("USER"), readNotification);

// ─── Admin notification router — mounted at /admin/notifications ──────────────
export const adminNotificationRouter = express.Router();

adminNotificationRouter.get(  "/",          authenticate, roleCheck("MASTER_ADMIN"), listNotificationsAdmin);
adminNotificationRouter.post( "/broadcast", authenticate, roleCheck("MASTER_ADMIN"), sendBroadcastNotification);

// Default export keeps backward compat for any direct import
export default userNotificationRouter;