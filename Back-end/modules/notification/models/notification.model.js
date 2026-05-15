import db from "../../../config/db.js";

/**
 * Insert a broadcast notification record.
 *
 * @param {{ title: string, body: string, sentBy: string }} param0
 * @returns {Promise<number>} Inserted notification id
 */
export const insertNotification = async ({ title, body, sentBy }) => {
  const [result] = await db.query(
    `INSERT INTO notifications (title, body, sentBy) VALUES (?, ?, ?)`,
    [title, body, sentBy]
  );
  return result.insertId;
};

/**
 * Mark a single notification as read for a user (idempotent).
 *
 * @param {number} notificationId
 * @param {number} userId
 * @returns {Promise<void>}
 */
export const markNotificationRead = async (notificationId, userId) => {
  await db.query(
    `INSERT IGNORE INTO notificationReads (notificationId, userId) VALUES (?, ?)`,
    [notificationId, userId]
  );
};

/**
 * Mark ALL current notifications as read for a user (idempotent).
 *
 * @param {number} userId
 * @returns {Promise<void>}
 */
export const markAllNotificationsRead = async (userId) => {
  await db.query(
    `INSERT IGNORE INTO notificationReads (notificationId, userId)
     SELECT id, ? FROM notifications`,
    [userId]
  );
};

/**
 * Fetch a paginated page of broadcast notifications for a user.
 * Each row includes an isRead flag derived from notificationReads.
 *
 * @param {number} userId
 * @param {number} [page=1]    1-based page number
 * @param {number} [limit=20]  Rows per page, clamped to 1–100
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export const getNotificationsForUser = async (userId, page = 1, limit = 20) => {
  const safeLimit  = Math.min(100, Math.max(1, Number(limit)  || 20));
  const safePage   = Math.max(1,               Number(page)   || 1);
  const offset     = (safePage - 1) * safeLimit;

  const [rows] = await db.query(
    `SELECT
       n.id,
       n.title,
       n.body,
       n.sentBy,
       n.sentAt,
       CASE WHEN nr.userId IS NOT NULL THEN 1 ELSE 0 END AS isRead
     FROM notifications n
     LEFT JOIN notificationReads nr
       ON nr.notificationId = n.id AND nr.userId = ?
     ORDER BY n.sentAt DESC
     LIMIT ? OFFSET ?`,
    [userId, safeLimit, offset]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM notifications`,
    []
  );

  return { rows, total };
};

/**
 * Count how many notifications the user has not yet read.
 * Used to populate the sidebar badge without fetching the full list.
 *
 * @param {number} userId
 * @returns {Promise<number>} Unread notification count
 */
export const getUnreadNotificationCount = async (userId) => {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM notifications n
     WHERE NOT EXISTS (
       SELECT 1 FROM notificationReads nr
       WHERE nr.notificationId = n.id AND nr.userId = ?
     )`,
    [userId]
  );
  return row?.total ?? 0;
};

/**
 * Fetch a paginated page of all sent broadcast notifications for the admin panel.
 *
 * @param {number} [page=1]    1-based page number
 * @param {number} [limit=20]  Rows per page, clamped to 1–100
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export const getNotificationsForAdmin = async (page = 1, limit = 20) => {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safePage  = Math.max(1,               Number(page)  || 1);
  const offset    = (safePage - 1) * safeLimit;

  const [rows] = await db.query(
    `SELECT id, title, body, sentBy, sentAt
     FROM notifications
     ORDER BY sentAt DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, offset]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM notifications`,
    []
  );

  return { rows, total };
};