import db from "../../../config/db.js";
import { normalize } from "../helpers/admin.helper.js";

// Column lists shared across queries — keeps SELECT lists DRY
const ADMIN_LIST = "a.id, a.userName, a.email, a.phone, a.roleId, r.name AS roleName, COALESCE(a.status, 'active') AS status, a.isDeleted, COALESCE(a.createdAt, NOW()) AS createdAt";
const ADMIN_LOGIN = "id, userName, password, email, phone, roleId, COALESCE(status, 'active') AS status, isDeleted";
const USER_LIST = "u.id, u.firstName, u.lastName, u.userName, u.phone, u.email, u.gender, u.status, u.isDeleted, u.profilePicture, u.createdAt";

/**
 * Find non-deleted admins matching either email or username.
 * Used for duplicate checks on register and edit.
 *
 * @param {string} email
 * @param {string} userName
 * @returns {Promise<object[]>}
 */
export const findAdminByEmailOrUsername = async (email, userName) => {
  try {
    const sql = "SELECT id, userName, email, roleId, COALESCE(status, 'active') AS status, isDeleted FROM admins WHERE isDeleted = 0 AND (email = ? OR userName = ?)";
    const [result] = await db.query(sql, [email, userName]);
    return result;
  } catch (error) {
    console.error("findAdminByEmailOrUsername error:", error);
    throw error;
  }
};

/**
 * Insert a new admin record and return the full row.
 *
 * @param {string:userName}
 * @param {string:password} Pre-hashed password
 * @param {string:email}
 * @param {string:phone}
 * @param {number|null:roleId}
 * @returns {Promise<object>} Newly created admin row
 */
export const insertAdmin = async (userName, password, email, phone, roleId) => {
  try {
    const sql = "INSERT INTO admins (userName, password, email, phone, roleId) VALUES (?, ?, ?, ?, ?)";
    const [result] = await db.query(sql, [userName, password, email, phone, roleId ?? null]);
    return findAdminById(result.insertId);
  } catch (error) {
    console.error("insertAdmin error:", error);
    throw error;
  }
};

/**
 * Find a non-deleted admin by username (used for login).
 *
 * @param {string} userName
 * @returns {Promise<object|null>}
 */
export const findAdminByUsername = async (userName) => {
  try {
    const sql = `SELECT ${ADMIN_LOGIN} FROM admins WHERE userName = ? AND isDeleted = 0`;
    const [result] = await db.query(sql, [userName]);
    return result[0] ?? null;
  } catch (error) {
    console.error("findAdminByUsername error:", error);
    throw error;
  }
};

/**
 * Find an admin by id with role name joined.
 *
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export const findAdminById = async (id) => {
  try {
    const sql = `SELECT ${ADMIN_LIST} FROM admins a LEFT JOIN roles r ON r.id = a.roleId WHERE a.id = ?`;
    const [result] = await db.query(sql, [id]);
    return result[0] ?? null;
  } catch (error) {
    console.error("findAdminById error:", error);
    throw error;
  }
};

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, searchable list of sub-admins (excludes the "admin" super-admin).
 *
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @param {string} [search=""]
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export const getAdminsWithPaginationAndCount = async (page = 1, limit = 10, search = "") => {
  try {
    const isAll = limit === "all" || Number(limit) <= 0;
    const limitNum = isAll ? null : Number(limit);
    const offset = isAll ? 0 : (page - 1) * limitNum;

    // Exclude the "admin" super-admin account from the managed list
    let where = "WHERE a.userName != 'admin'";
    const params = [];
    const searchTerm = normalize(search);

    if (searchTerm) {
      where += " AND (a.userName LIKE ? OR a.email LIKE ? OR a.phone LIKE ?)";
      const like = `%${searchTerm}%`;
      params.push(like, like, like);
    }

    let dataSql = `SELECT ${ADMIN_LIST} FROM admins a LEFT JOIN roles r ON r.id = a.roleId ${where} ORDER BY a.id DESC`;
    if (!isAll) dataSql += " LIMIT ? OFFSET ?";
    const dataParams = isAll ? params : [...params, limitNum, offset];
    const [rows] = await db.query(dataSql, dataParams);

    const countSql = `SELECT COUNT(*) AS total FROM admins a ${where}`;
    const [countResult] = await db.query(countSql, params);
    const total = countResult[0]?.total ?? 0;

    return { rows, total };
  } catch (error) {
    console.error("getAdminsWithPaginationAndCount error:", error);
    throw error;
  }
};

/**
 * Update an admin row as master admin. Skips password update when not provided.
 *
 * @param {number} id
 * @param {{ userName: string, email: string, phone: string, password?: string, roleId: number|null }} data
 * @returns {Promise<object>} Updated admin row
 */
export const updateAdminByMaster = async (id, data) => {
  try {
    const { userName, email, phone, password, roleId } = data;

    if (password) {
      const sql = "UPDATE admins SET userName=?, email=?, phone=?, password=?, roleId=?, updatedAt=NOW() WHERE id=? AND userName != 'admin'";
      await db.query(sql, [userName, email, phone, password, roleId ?? null, id]);
    } else {
      const sql = "UPDATE admins SET userName=?, email=?, phone=?, roleId=?, updatedAt=NOW() WHERE id=? AND userName != 'admin'";
      await db.query(sql, [userName, email, phone, roleId ?? null, id]);
    }
    return findAdminById(id);
  } catch (error) {
    console.error("updateAdminByMaster error:", error);
    throw error;
  }
};

/**
 * Soft-delete an admin and invalidate all their tokens.
 *
 * @param {number} id
 * @returns {Promise<void>}
 */
export const softDeleteAdmin = async (id) => {
  try {
    const sql1 = "UPDATE admins SET status='deleted', isDeleted=1, updatedAt=NOW() WHERE id=? AND userName != 'admin'";
    const sql2 = "DELETE FROM adminToken WHERE adminId=?";
    await db.query(sql1, [id]);
    await db.query(sql2, [id]);
  } catch (error) {
    console.error("softDeleteAdmin error:", error);
    throw error;
  }
};

/**
 * Fetch a paginated, filterable list of users for the admin panel.
 *
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @param {string} [status=""]  Filter by status; "all" or empty = no status filter
 * @param {string} [search=""]  Search across name, username, email, phone
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export const getUsersWithPaginationAndCount = async (page = 1, limit = 10, status = "", search = "") => {
  try {
    const isAll = limit === "all" || Number(limit) <= 0;
    const limitNum = isAll ? null : Number(limit);
    const offset = isAll ? 0 : (page - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (status && status !== "all") {
      conditions.push("u.status = ?");
      params.push(status);
    } else {
      conditions.push("u.status != 'deleted' AND u.isDeleted = 0");
    }

    const searchTerm = normalize(search);
    if (searchTerm) {
      conditions.push("(u.firstName LIKE ? OR u.lastName LIKE ? OR u.userName LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)");
      const like = `%${searchTerm}%`;
      params.push(like, like, like, like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    let dataSql = `SELECT ${USER_LIST} FROM users u ${where} ORDER BY u.id DESC`;
    if (!isAll) dataSql += " LIMIT ? OFFSET ?";
    const dataParams = isAll ? params : [...params, limitNum, offset];
    const [rows] = await db.query(dataSql, dataParams);

    const countSql = `SELECT COUNT(*) AS total FROM users u ${where}`;
    const [countResult] = await db.query(countSql, params);
    const total = countResult[0]?.total ?? 0;

    return { rows, total };
  } catch (error) {
    console.error("getUsersWithPaginationAndCount error:", error);
    throw error;
  }
};

/**
 * Find a user by id for admin views (no password column).
 *
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export const findUserByIdAdmin = async (id) => {
  try {
    const sql = "SELECT id, firstName, lastName, userName, email, phone, status, isDeleted, gender, profilePicture, createdAt FROM users WHERE id = ?";
    const [result] = await db.query(sql, [id]);
    return result[0] ?? null;
  } catch (error) {
    console.error("findUserByIdAdmin error:", error);
    throw error;
  }
};

/**
 * Update a user's status column.
 *
 * @param {number} id
 * @param {string} status  e.g. "active" | "inactive" | "deleted"
 * @returns {Promise<void>}
 */
export const updateUserStatus = async (id, status) => {
  try {
    const sql = "UPDATE users SET status = ?, updatedAt = NOW() WHERE id = ?";
    await db.query(sql, [status, id]);
  } catch (error) {
    console.error("updateUserStatus error:", error);
    throw error;
  }
};

/**
 * Soft-delete a user and invalidate all their tokens.
 *
 * @param {number} id
 * @returns {Promise<void>}
 */
export const softDeleteUser = async (id) => {
  try {
    const sql1 = "UPDATE users SET status = 'deleted', isDeleted = 1, updatedAt = NOW() WHERE id = ?";
    const sql2 = "DELETE FROM userToken WHERE userId = ?";
    await db.query(sql1, [id]);
    await db.query(sql2, [id]);
  } catch (error) {
    console.error("softDeleteUser error:", error);
    throw error;
  }
};

/**
 * Remove all tokens for a user, forcing them to re-authenticate.
 *
 * @param {number} userId
 * @returns {Promise<void>}
 */
export const forceLogoutUser = async (userId) => {
  try {
    const sql = "DELETE FROM userToken WHERE userId = ?";
    await db.query(sql, [userId]);
  } catch (error) {
    console.error("forceLogoutUser error:", error);
    throw error;
  }
};

/**
 * Return all sub-admins (excludes "admin" super-admin) with role name.
 *
 * @returns {Promise<object[]>}
 */
export const getAllAdmins = async () => {
  try {
    const sql = `SELECT ${ADMIN_LIST} FROM admins a LEFT JOIN roles r ON r.id = a.roleId WHERE a.userName != 'admin'`;
    const [result] = await db.query(sql);
    return result;
  } catch (error) {
    console.error("getAllAdmins error:", error);
    throw error;
  }
};

/**
 * Return aggregated user counts for the admin dashboard.
 *
 * @returns {Promise<{ totalUsers: number, activeUsers: number, pendingUsers: number, inactiveUsers: number, deletedUsers: number, totalAdmins: number }>}
 */
export const getDashboardCounts = async () => {
  try {
    const sql = `
      SELECT
        SUM(CASE WHEN u.isDeleted = 0 THEN 1 ELSE 0 END) AS totalUsers,
        SUM(CASE WHEN u.status = 'active'   AND u.isDeleted = 0 THEN 1 ELSE 0 END) AS activeUsers,
        SUM(CASE WHEN u.status = 'pending'  AND u.isDeleted = 0 THEN 1 ELSE 0 END) AS pendingUsers,
        SUM(CASE WHEN u.status = 'inactive' AND u.isDeleted = 0 THEN 1 ELSE 0 END) AS inactiveUsers,
        SUM(CASE WHEN u.status = 'deleted'  OR  u.isDeleted = 1 THEN 1 ELSE 0 END) AS deletedUsers,
        (SELECT COUNT(*) FROM admins WHERE userName != 'admin' AND isDeleted = 0) AS totalAdmins
      FROM users u
    `;
    const [[result]] = await db.query(sql);
    return result;
  } catch (error) {
    console.error("getDashboardCounts error:", error);
    throw error;
  }
};

/**
 * Update a user's profile fields. Skips password when not provided.
 *
 * @param {number} id
 * @param {{ firstName: string, lastName: string, email: string, phone: string, gender: string, password?: string }} data
 * @returns {Promise<object>} Updated user row
 */
export const updateUserByAdmin = async (id, data) => {
  try {
    const { firstName, lastName, email, phone, gender, password } = data;
    if (password) {
      const sql = "UPDATE users SET firstName=?, lastName=?, email=?, phone=?, gender=?, password=?, updatedAt=NOW() WHERE id=?";
      await db.query(sql, [firstName, lastName, email, phone, gender, password, id]);
    } else {
      const sql = "UPDATE users SET firstName=?, lastName=?, email=?, phone=?, gender=?, updatedAt=NOW() WHERE id=?";
      await db.query(sql, [firstName, lastName, email, phone, gender, id]);
    }
    return findUserByIdAdmin(id);
  } catch (error) {
    console.error("updateUserByAdmin error:", error);
    throw error;
  }
};

// ─── Tokens ───────────────────────────────────────────────────────────────────

/**
 * Persist a new JWT token for an admin session.
 *
 * @param {number} adminId
 * @param {string} token
 * @returns {Promise<void>}
 */
export const saveAdminToken = async (adminId, token) => {
  try {
    const sql = "INSERT INTO adminToken (adminId, token) VALUES (?, ?)";
    await db.query(sql, [adminId, token]);
  } catch (error) {
    console.error("saveAdminToken error:", error);
    throw error;
  }
};

/**
 * Look up a token row by its value.
 * Returns null when the token has been deleted (e.g. after logout).
 *
 * @param {string} token
 * @returns {Promise<object|null>}
 */
export const findAdminToken = async (token) => {
  try {
    const sql = "SELECT adminId, token FROM adminToken WHERE token = ?";
    const [result] = await db.query(sql, [token]);
    return result[0] ?? null;
  } catch (error) {
    console.error("findAdminToken error:", error);
    throw error;
  }
};

/**
 * Delete a single token (used on logout).
 *
 * @param {string} token
 * @returns {Promise<void>}
 */
export const deleteAdminToken = async (token) => {
  try {
    const sql = "DELETE FROM adminToken WHERE token = ?";
    await db.query(sql, [token]);
  } catch (error) {
    console.error("deleteAdminToken error:", error);
    throw error;
  }
};

/**
 * Delete all tokens for an admin, forcing re-authentication on all devices.
 *
 * @param {number} adminId
 * @returns {Promise<void>}
 */
export const deleteAllAdminTokens = async (adminId) => {
  try {
    const sql = "DELETE FROM adminToken WHERE adminId = ?";
    await db.query(sql, [adminId]);
  } catch (error) {
    console.error("deleteAllAdminTokens error:", error);
    throw error;
  }
};

/**
 * Fetch the role-based permissions for an admin.
 * Returns an empty array for super-admin or when no roleId is set.
 *
 * @param {number|null} roleId
 * @returns {Promise<object[]>} Array of { moduleName, canView, canAdd, canEdit, canDelete }
 */
export const getAdminPermissions = async (roleId) => {
  try {
    if (!roleId) return [];

    const sql = `
      SELECT m.name AS moduleName, rp.canView, rp.canAdd, rp.canEdit, rp.canDelete
      FROM rolePermissions rp
      JOIN modules m ON m.id = rp.moduleId
      JOIN roles r ON r.id = rp.roleId
      WHERE rp.roleId = ? AND m.status = 'active' AND m.isDeleted = 0 AND r.status = 'active' AND r.isDeleted = 0
    `;
    const [rows] = await db.query(sql, [roleId]);
    return rows;
  } catch (error) {
    console.error("getAdminPermissions error:", error);
    throw error;
  }
};

/**
 * Update an admin's own profile fields (userName, email, phone, optionally profilePicture).
 *
 * @param {number} id
 * @param {{ userName: string, email: string, phone: string, profilePicture?: string }} data
 * @returns {Promise<object>} Updated admin row
 */
export const updateAdminOwnProfile = async (id, data) => {
  try {
    const { userName, email, phone, profilePicture } = data;
    const fields = ["userName=?", "email=?", "phone=?"];
    const params = [userName, email, phone];

    if (profilePicture !== undefined) {
      fields.push("profilePicture=?");
      params.push(profilePicture);
    }

    params.push(id);
    const sql = `UPDATE admins SET ${fields.join(", ")} WHERE id=?`;
    await db.query(sql, params);
    return findAdminById(id);
  } catch (error) {
    console.error("updateAdminOwnProfile error:", error);
    throw error;
  }
};

/**
 * Overwrite an admin's password hash.
 *
 * @param {number} id
 * @param {string} hashedPassword
 * @returns {Promise<void>}
 */
export const updateAdminPassword = async (id, hashedPassword) => {
  try {
    const sql = "UPDATE admins SET password=? WHERE id=?";
    await db.query(sql, [hashedPassword, id]);
  } catch (error) {
    console.error("updateAdminPassword error:", error);
    throw error;
  }
};

/**
 * Fetch an admin row that includes the password hash.
 * Used only for password-change flows — never returned to the client.
 *
 * @param {number} id
 * @returns {Promise<{ id: number, password: string }|null>}
 */
export const findAdminWithPasswordById = async (id) => {
  try {
    const sql = "SELECT id, password FROM admins WHERE id = ?";
    const [result] = await db.query(sql, [id]);
    return result[0] ?? null;
  } catch (error) {
    console.error("findAdminWithPasswordById error:", error);
    throw error;
  }
};

/**
 * Delete all tokens for every admin assigned to a given role.
 * Called when a role is edited so affected admins must re-authenticate.
 *
 * @param {number} roleId
 * @returns {Promise<void>}
 */
export const deleteTokensByRoleId = async (roleId) => {
  try {
    const sql = "DELETE FROM adminToken WHERE adminId IN (SELECT id FROM admins WHERE roleId = ? AND userName != 'admin')";
    await db.query(sql, [roleId]);
  } catch (error) {
    console.error("deleteTokensByRoleId error:", error);
    throw error;
  }
};