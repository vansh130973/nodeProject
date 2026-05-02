import db from "../../../config/db.js";

export const insertTicket = async (userId, subject, description, status = "open", filePath = null) => {
  const [result] = await db.query(
    `INSERT INTO tickets (userId, subject, description, status, file)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, subject, description ?? null, status, filePath]
  );
  return result.insertId;
};

export const updateTicketFile = async (ticketId, filePath) => {
  await db.query(
    "UPDATE tickets SET file = ?, updatedAt = NOW() WHERE id = ?",
    [filePath, ticketId]
  );
};

export const findTicketById = async (ticketId) => {
  const [rows] = await db.query(
    `SELECT t.id, t.userId, t.subject, t.description, t.file, t.status, t.createdAt, t.updatedAt
     FROM tickets t
     WHERE t.id = ?`,
    [ticketId]
  );
  return rows[0] ?? null;
};

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

export const findTicketForUser = async (ticketId, userId) => {
  const [rows] = await db.query(
    `SELECT t.id, t.userId, t.subject, t.description, t.file, t.status, t.createdAt, t.updatedAt
     FROM tickets t
     WHERE t.id = ? AND t.userId = ?`,
    [ticketId, userId]
  );
  return rows[0] ?? null;
};

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

export const listAllTickets = async ({ page = 1, limit = 20, status = "", search = "" }) => {
  const numericLimit = Math.min(100, Math.max(1, Number(limit) || 20));
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

export const insertTicketMessage = async (ticketId, senderId, senderType, message, filePath = null) => {
  const [result] = await db.query(
    `INSERT INTO ticketMessages (ticketId, senderId, senderType, message, file)
     VALUES (?, ?, ?, ?, ?)`,
    [ticketId, senderId, senderType, message, filePath]
  );
  return result.insertId;
};

export const updateTicketStatus = async (ticketId, status) => {
  await db.query(
    "UPDATE tickets SET status = ?, updatedAt = NOW() WHERE id = ?",
    [status, ticketId]
  );
};

export const touchTicket = async (ticketId) => {
  await db.query("UPDATE tickets SET updatedAt = NOW() WHERE id = ?", [ticketId]);
};

export const getUnreadCount = async () => {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS total FROM tickets WHERE status = 'userReply'"
  );
  return row?.total ?? 0;
};