import db from "../../../config/db.js";

export const findAdminByEmailOrUsername = async (email, userName) => {
  const [result] = await db.query(
    "SELECT * FROM admins WHERE email = ? OR userName = ?",
    [email, userName]
  );
  return result;
};

export const insertAdmin = async (userName, password, email, phone) => {
  const [result] = await db.query(
    "INSERT INTO admins (userName, password, email, phone) VALUES (?, ?, ?, ?)",
    [userName, password, email, phone]
  );
  return { id: result.insertId, userName, email, phone };
};

export const findAdminByUsername = async (userName) => {
  const [result] = await db.query(
    "SELECT * FROM admins WHERE userName = ?",
    [userName]
  );
  return result[0] ?? null;
};

export const findAdminById = async (id) => {
  const [result] = await db.query(
    "SELECT * FROM admins WHERE id = ?",
    [id]
  );
  return result[0] ?? null;
};

// ─── User listing with pagination ────────────────────────────────────────────

export const getUsersWithPagination = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const [rows] = await db.query(
    `SELECT
       id,
       CONCAT(firstName, ' ', lastName, ' (', userName, ')') AS name,
       firstName,
       lastName,
       userName,
       phone,
       email,
       status,
       profilePicture,
       createdAt
     FROM users
     WHERE status != 'deleted'
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
};

export const getUsersCount = async () => {
  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) AS total FROM users WHERE status != 'deleted'"
  );
  return total;
};

// ─── Single user ──────────────────────────────────────────────────────────────

export const findUserByIdAdmin = async (id) => {
  const [result] = await db.query(
    "SELECT id, firstName, lastName, userName, email, phone, status, gender, profilePicture, createdAt FROM users WHERE id = ?",
    [id]
  );
  return result[0] ?? null;
};

// ─── Status update ───────────────────────────────────────────────────────────

export const updateUserStatus = async (id, status) => {
  await db.query(
    "UPDATE users SET status = ?, updatedAt = NOW() WHERE id = ?",
    [status, id]
  );
};

// ─── Soft delete + kill all sessions ─────────────────────────────────────────

export const softDeleteUser = async (id) => {
  await db.query(
    "UPDATE users SET status = 'deleted', updatedAt = NOW() WHERE id = ?",
    [id]
  );
  await db.query("DELETE FROM userToken WHERE userId = ?", [id]);
};

// ─── Force logout user (kill all sessions) ───────────────────────────────────

export const forceLogoutUser = async (userId) => {
  await db.query("DELETE FROM userToken WHERE userId = ?", [userId]);
};

// ─── Admin listing ───────────────────────────────────────────────────────────

export const getAllAdmins = async () => {
  const [result] = await db.query(
    "SELECT id, userName, email, phone, role FROM admins WHERE role != 'MASTER_ADMIN'"
  );
  return result;
};

// ─── Dashboard counts (single query) ─────────────────────────────────────────

export const getDashboardCounts = async () => {
  const [[counts]] = await db.query(
    `SELECT
       COUNT(*) AS totalUsers,
       SUM(status = 'active')   AS activeUsers,
       SUM(status = 'pending')  AS pendingUsers,
       SUM(status = 'inactive') AS inactiveUsers,
       SUM(status = 'deleted')  AS deletedUsers
     FROM users`
  );
  return counts;
};

// ─── Token management ─────────────────────────────────────────────────────────

export const saveAdminToken = async (adminId, token) => {
  await db.query(
    "INSERT INTO adminToken (adminId, token) VALUES (?, ?)",
    [adminId, token]
  );
};

export const findAdminToken = async (token) => {
  const [result] = await db.query(
    "SELECT * FROM adminToken WHERE token = ?",
    [token]
  );
  return result[0] ?? null;
};

export const deleteAdminToken = async (token) => {
  await db.query(
    "DELETE FROM adminToken WHERE token = ?",
    [token]
  );
};

export const deleteAllAdminTokens = async (adminId) => {
  await db.query(
    "DELETE FROM adminToken WHERE adminId = ?",
    [adminId]
  );
};