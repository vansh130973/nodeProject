import db from "../../../config/db.js";
import { parseLimit } from "../../../common/http/pagination.js";

/**
 * Create a new ticket and return its generated id.
 *
 * @param {number} userId
 * @param {string} subject
 * @param {string} description
 * @returns {Promise<number>} Inserted ticket id
 */
export const insertTicket = async (userId, subject, description) => {
  const [result] = await db.query(
    `INSERT INTO tickets (userId, subject, description) VALUES (?, ?, ?)`,
    [userId, subject, description]
  );
  return result.insertId;
};

/**
 * Attach an uploaded file path to an existing ticket.
 *
 * @param {number} ticketId
 * @param {string} filePath  Relative path stored in the DB
 * @returns {Promise<true>}  Always resolves true if no error is thrown
 */
export const updateTicketFile = async (ticketId, filePath) => {
  await db.query(
    "UPDATE tickets SET file = ?, updatedAt = NOW() WHERE id = ?",
    [filePath, ticketId]
  );

  return true;
};

/**
 * Fetch a ticket row by its id (no user join).
 *
 * @param {number} ticketId
 * @returns {Promise<object|null>} Ticket row, or null if not found
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
 * Fetch a ticket with the owner's profile columns for admin views.
 *
 * @param {number} ticketId
 * @returns {Promise<object|null>} Ticket + owner fields, or null if not found
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
 * Fetch a ticket only if it belongs to the given user.
 * Used to scope user actions to their own tickets.
 *
 * @param {number} ticketId
 * @param {number} userId
 * @returns {Promise<object|null>} Ticket row, or null if not found / not owned
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
 * List all tickets owned by a user, newest first.
 * Includes a computed isUnread flag that is 1 when the admin has replied.
 *
 * @param {number} userId
 * @returns {Promise<object[]>} Array of ticket summary rows
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
 * List tickets for the admin panel with optional status/search filters and pagination.
 *
 * @param {{ page?: number, limit?: number, status?: string, search?: string }} options
 * @returns {Promise<{ tickets: object[], pagination: object }>}
 */
export const listAllTickets = async ({ page = 1, limit = 20, status = "", search = "" }) => {
  const parsedLimit  = typeof parseLimit(limit, 20) === "number" ? parseLimit(limit, 20) : 100;
  const offset = (page - 1) * parsedLimit;
  const conditions = [];
  const params = [];

  if (status && status !== "all") { conditions.push("t.status = ?");                          params.push(status); }
  if (search?.trim()) { conditions.push("(t.subject LIKE ? OR t.description LIKE ?)"); const l = `%${search.trim()}%`; params.push(l, l); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [[{ total }], [rows]] = await Promise.all([
    db.query(`SELECT COUNT(*) AS total FROM tickets t ${where}`, params),
    db.query(
      `SELECT t.id, t.subject, t.status, t.createdAt, t.userId,
              u.firstName, u.lastName, u.userName, u.email
       FROM tickets t JOIN users u ON u.id = t.userId
       ${where} ORDER BY t.createdAt DESC LIMIT ? OFFSET ?`,
      [...params, parsedLimit, offset]
    ),
  ]);

  return {
    tickets: rows,
    pagination: {
      page: Number(page), limit: parsedLimit, total,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    },
  };
};

export const getTicketMessages = async (ticketId) => {
  const [rows] = await db.query(
    `SELECT id, ticketId, senderId, senderType, message, file, createdAt
     FROM ticketMessages WHERE ticketId = ? ORDER BY createdAt ASC`,
    [ticketId]
  );
  return rows;
};

/**
 * Insert a message. If status is provided it is written into the row at
 *
 * @param {number}      ticketId
 * @param {number}      senderId   User or admin id
 * @param {"user"|"admin"} senderType
 * @param {string}      message
 * @param {string|null} filePath
 * @param {string|null} status     Ticket status to stamp on the message row, or null
 * @returns {Promise<number>} Inserted message id
 */
export const insertTicketMessage = async (
  ticketId, senderId, senderType, message, filePath = null, status = null
) => {
  const query  = `INSERT INTO ticketMessages (ticketId, senderId, senderType, message, file${status ? ", status" : ""}) VALUES (?, ?, ?, ?, ?${status ? ", ?" : ""})`;
  const params = [ticketId, senderId, senderType, message, filePath];
  if (status) params.push(status);
  const [result] = await db.query(query, params);
  return result.insertId;
};

/**
 * Update a ticket's status and refresh updatedAt in one query.
 * Pass status=null to only touch updatedAt (e.g. message on closed ticket).
 *
 * @param {number} ticketId
 * @param {string|null}  status
 */
export const updateTicket = async (ticketId, status = null) => {
  const query  = `UPDATE tickets SET ${status ? "status = ?, " : ""}updatedAt = NOW() WHERE id = ?`;
  const params = status ? [status, ticketId] : [ticketId];
  await db.query(query, params);
};

export const getUnreadCount = async () => {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS total FROM tickets WHERE status = 'userReply'"
  );
  return row?.total ?? 0;
};