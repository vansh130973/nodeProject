import { sendSuccessResponse, sendErrorResponse } from "../../common/http/response.js";
import { parsePage, parseLimit, buildPaginationMeta } from "../../common/http/pagination.js";
import { emitBroadcastNotification } from "../../socket/socketManager.js";
import {
  insertNotification,
  getNotificationsForUser,
  getNotificationsForAdmin,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from "./models/notification.model.js";

/**
 * Wraps a socket emit call so a socket error never fails the HTTP response.
 */
const safeNotify = (fn) => {
  try { fn(); } catch (e) { console.error("[socket] notify error:", e?.message || e); }
};

/**
 * GET /notifications?page=1&limit=20
 * Returns a paginated list of broadcast notifications with per-row isRead flag,
 * plus the current unread badge count for the sidebar.
 *
 * @param {object} req HTTP request — query: page, limit (authenticated user)
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const listNotifications = async (req, res) => {
  try {
    const page  = parsePage(req.query.page,  1);
    const limit = parseLimit(req.query.limit, 20, 100);

    const [{ rows: notifications, total }, unreadCount] = await Promise.all([
      getNotificationsForUser(req.user.id, page, limit),
      getUnreadNotificationCount(req.user.id),
    ]);

    return sendSuccessResponse(res, "Notifications fetched", {
      notifications,
      unreadCount,
      pagination: buildPaginationMeta({ total, page, limit }),
    });
  } catch (error) {
    console.error("listNotifications error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

/**
 * PATCH /notifications/:id/read
 * Marks a single notification as read for the authenticated user.
 * Returns the updated unread count so the badge can update immediately.
 *
 * @param {object} req HTTP request — params.id: notification id
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const readNotification = async (req, res) => {
  try {
    await markNotificationRead(Number(req.params.id), req.user.id);
    const unreadCount = await getUnreadNotificationCount(req.user.id);
    return sendSuccessResponse(res, "Marked as read", { unreadCount });
  } catch (error) {
    console.error("readNotification error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

/**
 * PATCH /notifications/read-all
 * Marks every notification as read for the authenticated user.
 * Returns unreadCount: 0 so the badge clears immediately.
 *
 * @param {object} req HTTP request (authenticated user)
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const readAllNotifications = async (req, res) => {
  try {
    await markAllNotificationsRead(req.user.id);
    return sendSuccessResponse(res, "All marked as read", { unreadCount: 0 });
  } catch (error) {
    console.error("readAllNotifications error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

/**
 * GET /admin/notifications?page=1&limit=20
 * Returns a paginated history of all sent broadcast notifications.
 *
 * @param {object} req HTTP request — query: page, limit
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const listNotificationsAdmin = async (req, res) => {
  try {
    const page  = parsePage(req.query.page,  1);
    const limit = parseLimit(req.query.limit, 20, 100);

    const { rows: notifications, total } = await getNotificationsForAdmin(page, limit);

    return sendSuccessResponse(res, "Notifications fetched", {
      notifications,
      pagination: buildPaginationMeta({ total, page, limit }),
    });
  } catch (error) {
    console.error("listNotificationsAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

/**
 * POST /admin/notifications/broadcast
 * Persists a broadcast notification to the DB, then pushes it live to all
 * connected users via the "notifications:broadcast" socket room.
 * safeNotify ensures a socket error never fails the HTTP response.
 *
 * @param {object} req HTTP request — body: { title, body }
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const sendBroadcastNotification = async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return sendErrorResponse(res, "title and body are required", 400);
    }

    const sentBy  = req.user?.userName ?? "MasterAdmin";
    const notifId = await insertNotification({ title: title.trim(), body: body.trim(), sentBy });

    const payload = {
      id:     notifId,
      title:  title.trim(),
      body:   body.trim(),
      sentAt: new Date().toISOString(),
      sentBy,
    };

    // Push to the "notifications:broadcast" room — all connected users are in this room.
    // safeNotify ensures a socket error never fails the HTTP response.
    safeNotify(() => emitBroadcastNotification(payload));

    return sendSuccessResponse(res, "Broadcast notification sent", { notification: payload });
  } catch (error) {
    console.error("sendBroadcastNotification error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};