import db from "../../../config/db.js";
import { normalize } from "../helpers/admin.helper.js";

const ADMIN_LIST_COLUMNS = [
  "a.id",
  "a.userName",
  "a.email",
  "a.phone",
  "a.role",
  "a.roleId",
  "r.name AS roleName",
  "COALESCE(a.status, 'active') AS status",
  "a.isDeleted",
  "COALESCE(a.createdAt, NOW()) AS createdAt",
].join(", ");

const ADMIN_LOGIN_COLUMNS = [
  "id",
  "userName",
  "password",
  "email",
  "phone",
  "role",
  "roleId",
  "COALESCE(status, 'active') AS status",
  "isDeleted",
].join(", ");

const USER_LIST_COLUMNS = [
  "u.id",
  "u.firstName",
  "u.lastName",
  "u.userName",
  "u.phone",
  "u.email",
  "u.gender",
  "u.status",
  "u.isDeleted",
  "u.profilePicture",
  "u.createdAt",
].join(", ");

export const findAdminByEmailOrUsername = async (email, userName) => {
  try {
    const [result] = await db.query(
      `SELECT id, userName, email, role, roleId, COALESCE(status, 'active') AS status, isDeleted
       FROM admins
       WHERE isDeleted = 0 AND (email = ? OR userName = ?)`,
      [email, userName]
    );
    return result;
  } catch (error) {
    console.error("findAdminByEmailOrUsername error:", error);
    throw error;
  }
};

export const insertAdmin = async (userName, password, email, phone, roleId) => {
  try {
    const [result] = await db.query(
      "INSERT INTO admins (userName, password, email, phone, roleId) VALUES (?, ?, ?, ?, ?)",
      [userName, password, email, phone, roleId ?? null]
    );
    return findAdminById(result.insertId);
  } catch (error) {
    console.error("insertAdmin error:", error);
    throw error;
  }
};

export const findAdminByUsername = async (userName) => {
  try {
    const [result] = await db.query(
      `SELECT ${ADMIN_LOGIN_COLUMNS}
       FROM admins
       WHERE userName = ? AND isDeleted = 0`,
      [userName]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findAdminByUsername error:", error);
    throw error;
  }
};

export const findAdminById = async (id) => {
  try {
    const [result] = await db.query(
      `SELECT ${ADMIN_LIST_COLUMNS}
       FROM admins a
       LEFT JOIN roles r ON r.id = a.roleId
       WHERE a.id = ?`,
      [id]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findAdminById error:", error);
    throw error;
  }
};

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export const getAdminsWithPaginationAndCount = async (page = 1, limit = 10, search = "") => {
  try {
    const isAll = limit === "all" || Number(limit) <= 0;
    const numericLimit = isAll ? null : Number(limit);
    const offset = isAll ? 0 : (page - 1) * numericLimit;
    const conditions = ["a.role != 'MASTER_ADMIN'"];
    const params = [];
    const normalizedSearch = normalize(search);

    if (normalizedSearch) {
      conditions.push("(a.userName LIKE ? OR a.email LIKE ? OR a.phone LIKE ?)");
      const like = `%${normalizedSearch}%`;
      params.push(like, like, like);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [rowsResult, countResult] = await Promise.all([
      db.query(
        `SELECT ${ADMIN_LIST_COLUMNS}
         FROM admins a
         LEFT JOIN roles r ON r.id = a.roleId
         ${whereClause}
         ORDER BY a.id DESC
         ${isAll ? "" : "LIMIT ? OFFSET ?"}`,
        isAll ? params : [...params, numericLimit, offset]
      ),
      db.query(
        `SELECT COUNT(*) AS total
         FROM admins a
         ${whereClause}`,
        params
      ),
    ]);

    const rows = rowsResult[0];
    const total = countResult[0][0]?.total ?? 0;

    return { rows, total };
  } catch (error) {
    console.error("getAdminsWithPaginationAndCount error:", error);
    throw error;
  }
};

export const updateAdminByMaster = async (id, { userName, email, phone, password, roleId }) => {
  try {
    if (password) {
      await db.query(
        "UPDATE admins SET userName=?, email=?, phone=?, password=?, roleId=?, updatedAt=NOW() WHERE id=? AND role != 'MASTER_ADMIN'",
        [userName, email, phone, password, roleId ?? null, id]
      );
    } else {
      await db.query(
        "UPDATE admins SET userName=?, email=?, phone=?, roleId=?, updatedAt=NOW() WHERE id=? AND role != 'MASTER_ADMIN'",
        [userName, email, phone, roleId ?? null, id]
      );
    }
    return findAdminById(id);
  } catch (error) {
    console.error("updateAdminByMaster error:", error);
    throw error;
  }
};


export const softDeleteAdmin = async (id) => {
  try {
    await db.query(
      "UPDATE admins SET status='deleted', isDeleted=1, updatedAt=NOW() WHERE id=? AND role != 'MASTER_ADMIN'",
      [id]
    );
    await db.query("DELETE FROM adminToken WHERE adminId=?", [id]);
  } catch (error) {
    console.error("softDeleteAdmin error:", error);
    throw error;
  }
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const getUsersWithPaginationAndCount = async (page = 1, limit = 10, status = "", search = "") => {
  try {
    const isAll = limit === "all" || Number(limit) <= 0;
    const numericLimit = isAll ? null : Number(limit);
    const offset = isAll ? 0 : (page - 1) * numericLimit;
    const conditions = [];
    const params = [];

    if (status && status !== "all") {
      conditions.push("u.status = ?");
      params.push(status);
    } else {
      conditions.push("u.status != 'deleted' AND u.isDeleted = 0");
    }

    const normalizedSearch = normalize(search);
    if (normalizedSearch) {
      conditions.push(
        "(u.firstName LIKE ? OR u.lastName LIKE ? OR u.userName LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"
      );
      const like = `%${normalizedSearch}%`;
      params.push(like, like, like, like, like);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rowsResult, countResult] = await Promise.all([
      db.query(
        `SELECT ${USER_LIST_COLUMNS}
         FROM users u
         ${whereClause}
         ORDER BY u.id DESC
         ${isAll ? "" : "LIMIT ? OFFSET ?"}`,
        isAll ? params : [...params, numericLimit, offset]
      ),
      db.query(`SELECT COUNT(*) AS total FROM users u ${whereClause}`, params),
    ]);

    const rows = rowsResult[0];
    const total = countResult[0][0]?.total ?? 0;

    return { rows, total };
  } catch (error) {
    console.error("getUsersWithPaginationAndCount error:", error);
    throw error;
  }
};

export const findUserByIdAdmin = async (id) => {
  try {
    const [result] = await db.query(
      `SELECT id, firstName, lastName, userName, email, phone, status, isDeleted, gender, profilePicture, createdAt
       FROM users
       WHERE id = ?`,
      [id]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findUserByIdAdmin error:", error);
    throw error;
  }
};

export const updateUserStatus = async (id, status) => {
  try {
    await db.query(
      "UPDATE users SET status = ?, updatedAt = NOW() WHERE id = ?",
      [status, id]
    );
  } catch (error) {
    console.error("updateUserStatus error:", error);
    throw error;
  }
};

export const softDeleteUser = async (id) => {
  try {
    await db.query(
      "UPDATE users SET status = 'deleted', isDeleted = 1, updatedAt = NOW() WHERE id = ?",
      [id]
    );
    await db.query("DELETE FROM userToken WHERE userId = ?", [id]);
  } catch (error) {
    console.error("softDeleteUser error:", error);
    throw error;
  }
};

export const forceLogoutUser = async (userId) => {
  try {
    await db.query("DELETE FROM userToken WHERE userId = ?", [userId]);
  } catch (error) {
    console.error("forceLogoutUser error:", error);
    throw error;
  }
};

export const getAllAdmins = async () => {
  try {
    const [result] = await db.query(
      `SELECT ${ADMIN_LIST_COLUMNS}
       FROM admins a
       LEFT JOIN roles r ON r.id = a.roleId
       WHERE a.role != 'MASTER_ADMIN'`
    );
    return result;
  } catch (error) {
    console.error("getAllAdmins error:", error);
    throw error;
  }
};

export const getDashboardCounts = async () => {
  try {
    const [[result]] = await db.query(`
      SELECT
        SUM(CASE WHEN u.isDeleted = 0 THEN 1 ELSE 0 END) AS totalUsers,
        SUM(CASE WHEN u.status = 'active' AND u.isDeleted = 0 THEN 1 ELSE 0 END) AS activeUsers,
        SUM(CASE WHEN u.status = 'pending' AND u.isDeleted = 0 THEN 1 ELSE 0 END) AS pendingUsers,
        SUM(CASE WHEN u.status = 'inactive' AND u.isDeleted = 0 THEN 1 ELSE 0 END) AS inactiveUsers,
        SUM(CASE WHEN u.status = 'deleted' OR u.isDeleted = 1 THEN 1 ELSE 0 END) AS deletedUsers,
        (SELECT COUNT(*) FROM admins WHERE role != 'MASTER_ADMIN' AND isDeleted = 0) AS totalAdmins
      FROM users u
    `);
    return result;
  } catch (error) {
    console.error("getDashboardCounts error:", error);
    throw error;
  }
};

export const updateUserByAdmin = async (id, { firstName, lastName, email, phone, gender, password }) => {
  try {
    if (password) {
      await db.query(
        "UPDATE users SET firstName=?, lastName=?, email=?, phone=?, gender=?, password=?, updatedAt=NOW() WHERE id=?",
        [firstName, lastName, email, phone, gender, password, id]
      );
    } else {
      await db.query(
        "UPDATE users SET firstName=?, lastName=?, email=?, phone=?, gender=?, updatedAt=NOW() WHERE id=?",
        [firstName, lastName, email, phone, gender, id]
      );
    }
    return findUserByIdAdmin(id);
  } catch (error) {
    console.error("updateUserByAdmin error:", error);
    throw error;
  }
};

// ─── Tokens ───────────────────────────────────────────────────────────────────

export const saveAdminToken = async (adminId, token) => {
  try {
    await db.query(
      "INSERT INTO adminToken (adminId, token) VALUES (?, ?)",
      [adminId, token]
    );
  } catch (error) {
    console.error("saveAdminToken error:", error);
    throw error;
  }
};

export const findAdminToken = async (token) => {
  try {
    const [result] = await db.query(
      "SELECT adminId, token FROM adminToken WHERE token = ?",
      [token]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findAdminToken error:", error);
    throw error;
  }
};

export const deleteAdminToken = async (token) => {
  try {
    await db.query(
      "DELETE FROM adminToken WHERE token = ?",
      [token]
    );
  } catch (error) {
    console.error("deleteAdminToken error:", error);
    throw error;
  }
};

export const deleteAllAdminTokens = async (adminId) => {
  try {
    await db.query(
      "DELETE FROM adminToken WHERE adminId = ?",
      [adminId]
    );
  } catch (error) {
    console.error("deleteAllAdminTokens error:", error);
    throw error;
  }
};

export const getAdminPermissions = async (roleId) => {
  if (!roleId) return [];
  try {
    const [rows] = await db.query(
      `SELECT m.name AS moduleName, rp.canView, rp.canAdd, rp.canEdit, rp.canDelete
       FROM rolePermissions rp
       JOIN modules m ON m.id = rp.moduleId
       JOIN roles r ON r.id = rp.roleId
       WHERE rp.roleId = ?
         AND m.status = 'active'
         AND m.isDeleted = 0
         AND r.status = 'active'
         AND r.isDeleted = 0`,
      [roleId]
    );
    return rows;
  } catch (error) {
    console.error("getAdminPermissions error:", error);
    throw error;
  }
};
// ─── Admin Own Profile ────────────────────────────────────────────────────────

export const updateAdminOwnProfile = async (id, { userName, email, phone, profilePicture }) => {
  try {
    const fields = ["userName=?", "email=?", "phone=?"];
    const params = [userName, email, phone];
    if (profilePicture !== undefined) { fields.push("profilePicture=?"); params.push(profilePicture); }
    params.push(id);
    await db.query(`UPDATE admins SET ${fields.join(", ")} WHERE id=?`, params);
    return findAdminById(id);
  } catch (error) {
    console.error("updateAdminOwnProfile error:", error);
    throw error;
  }
};

export const updateAdminPassword = async (id, hashedPassword) => {
  try {
    await db.query("UPDATE admins SET password=? WHERE id=?", [hashedPassword, id]);
  } catch (error) {
    console.error("updateAdminPassword error:", error);
    throw error;
  }
};

export const findAdminWithPasswordById = async (id) => {
  try {
    const [result] = await db.query(
      "SELECT id, password FROM admins WHERE id = ?",
      [id]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findAdminWithPasswordById error:", error);
    throw error;
  }
};

export const deleteTokensByRoleId = async (roleId) => {
  try {
    await db.query(
      "DELETE FROM adminToken WHERE adminId IN (SELECT id FROM admins WHERE roleId = ? AND role != 'MASTER_ADMIN')",
      [roleId]
    );
  } catch (error) {
    console.error("deleteTokensByRoleId error:", error);
    throw error; 
  }
};