import db from "../../../config/db.js";
import { parseLimit } from "../../../common/http/pagination.js";

/**
 * Create a ticket and return its generated id.
 */
export const insertTicket = async (userId, subject, description) => {
  const [result] = await db.query(
    `INSERT INTO tickets (userId, subject, description)
     VALUES (?, ?, ?)`,
    [userId, subject, description]
  );
  return result.insertId;
};

/**
 * Attach uploaded file path to an existing ticket.
 */
export const updateTicketFile = async (ticketId, filePath) => {
  await db.query(
    "UPDATE tickets SET file = ?, updatedAt = NOW() WHERE id = ?",
    [filePath, ticketId]
  );
};

/**
 * Fetch ticket by id without owner join.
 */
export const findTicketById = async (ticketId) => {
  const [rows] = await db.query(
    `SELECT t.id, t.userId, t.subject, t.description, t.file, t.status, t.createdAt, t.updatedAt
     FROM tickets t
     WHERE t.id = ?`,
    [ticketId]
  );
  return rows[0] ?? null;
};

/**
 * Fetch ticket with owner profile data for admin views.
 */
export const findTicketWithOwner = async (ticketId) => {
  const [rows] = await db.query(
    `SELECT t.id, t.userId, t.subject, t.description, t.file, t.status, t.createdAt, t.updatedAt,
            u.firstName, u.lastName, u.userName, u.email AS ownerEmail
     FROM tickets t
     JOIN users u ON u.id = t.userId
     WHERE t.id = ?`,
    [ticketId]
  );
  return rows[0] ?? null;
};

/**
 * Fetch ticket only if it belongs to the given user.
 */
export const findTicketForUser = async (ticketId, userId) => {
  const [rows] = await db.query(
    `SELECT t.id, t.userId, t.subject, t.description, t.file, t.status, t.createdAt, t.updatedAt
     FROM tickets t
     WHERE t.id = ? AND t.userId = ?`,
    [ticketId, userId]
  );
  return rows[0] ?? null;
};

/**
 * List user's own tickets with unread marker for admin replies.
 */
export const listTicketsForUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT id, subject, status, createdAt,
            CASE WHEN status = 'adminReply' THEN 1 ELSE 0 END AS isUnread
     FROM tickets
     WHERE userId = ?
     ORDER BY createdAt DESC`,
    [userId]
  );
  return rows;
};

/**
 * List tickets for admin panel with optional filters and pagination.
 */
export const listAllTickets = async ({ page = 1, limit = 20, status = "", search = "" }) => {
  const parsedLimit = parseLimit(limit, 20);
  const numericLimit = typeof parsedLimit === "number" ? parsedLimit : 100;
  const offset = (page - 1) * numericLimit;
  const conditions = [];
  const params = [];

  if (status && status !== "all") {
    conditions.push("t.status = ?");
    params.push(status);
  }

  const q = search?.trim();
  if (q) {
    conditions.push("(t.subject LIKE ? OR t.description LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await db.query(
    `SELECT t.id, t.subject, t.status, t.createdAt, t.userId,
            u.firstName, u.lastName, u.userName, u.email
     FROM tickets t
     JOIN users u ON u.id = t.userId
     ${whereClause}
     ORDER BY t.createdAt DESC
     LIMIT ? OFFSET ?`,
    [...params, numericLimit, offset]
  );

  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM tickets t ${whereClause}`,
    params
  );

  return {
    tickets: rows,
    pagination: {
      page: Number(page),
      limit: numericLimit,
      total: countRow?.total ?? 0,
      totalPages: Math.ceil((countRow?.total ?? 0) / numericLimit) || 1,
    },
  };
};

/**
 * Get all messages for a ticket in chronological order.
 */
export const getTicketMessages = async (ticketId) => {
  const [rows] = await db.query(
    `SELECT id, ticketId, senderId, senderType, message, file, createdAt
     FROM ticketMessages
     WHERE ticketId = ?
     ORDER BY createdAt ASC`,
    [ticketId]
  );
  return rows;
};

/**
 * Insert a chat-style message under a ticket.
 */
export const insertTicketMessage = async (ticketId, senderId, senderType, message, filePath = null) => {
  const [result] = await db.query(
    `INSERT INTO ticketMessages (ticketId, senderId, senderType, message, file)
     VALUES (?, ?, ?, ?, ?)`,
    [ticketId, senderId, senderType, message, filePath]
  );
  return result.insertId;
};

/**
 * Update current ticket status and refresh update timestamp.
 */
export const updateTicketStatus = async (ticketId, status) => {
  await db.query(
    "UPDATE tickets SET status = ?, updatedAt = NOW() WHERE id = ?",
    [status, ticketId]
  );
};

/**
 * Refresh ticket timestamp without changing its status.
 */
export const touchTicket = async (ticketId) => {
  await db.query("UPDATE tickets SET updatedAt = NOW() WHERE id = ?", [ticketId]);
};

/**
 * Count tickets waiting for admin action.
 */
export const getUnreadCount = async () => {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS total FROM tickets WHERE status = 'userReply'"
  );
  return row?.total ?? 0;
};