import express from "express";
import {
  authenticate,
  requireUser,
  requireMasterAdmin,
} from "../../middlewares/authMiddleware.js";
import {
  listNotifications,
  readNotification,
  readAllNotifications,
  listNotificationsAdmin,
  sendBroadcastNotification,
} from "./notification.controller.js";

export const userNotificationRouter = express.Router();

userNotificationRouter.get(   "/",          authenticate, requireUser, listNotifications);
userNotificationRouter.patch( "/read-all",  authenticate, requireUser, readAllNotifications);
userNotificationRouter.patch( "/:id/read",  authenticate, requireUser, readNotification);

export const adminNotificationRouter = express.Router();

adminNotificationRouter.get(  "/",          authenticate, requireMasterAdmin, listNotificationsAdmin);
adminNotificationRouter.post( "/broadcast", authenticate, requireMasterAdmin, sendBroadcastNotification);

export default userNotificationRouter;