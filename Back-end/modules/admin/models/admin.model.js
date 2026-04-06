import db from "../../../config/db.js";

export const findAdminByEmailOrUsername = async (email, userName) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM admins WHERE email = ? OR userName = ?",
      [email, userName]
    );
    return result;
  } catch (error) {
    console.error("findAdminByEmailOrUsername error:", error);
    throw error;
  }
};

export const insertAdmin = async (userName, password, email, phone) => {
  try {
    const [result] = await db.query(
      "INSERT INTO admins (userName, password, email, phone) VALUES (?, ?, ?, ?)",
      [userName, password, email, phone]
    );
    return { id: result.insertId, userName, email, phone };
  } catch (error) {
    console.error("insertAdmin error:", error);
    throw error;
  }
};

export const findAdminByUsername = async (userName) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM admins WHERE userName = ?",
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
      "SELECT * FROM admins WHERE id = ?",
      [id]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findAdminById error:", error);
    throw error;
  }
};

// ---------------- USERS ----------------

export const getUsersWithPaginationAndCount = async (page = 1, limit = 10, status = "", search = "") => {
  try {
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    // Status filter
    if (status && status !== "all") {
      conditions.push("status = ?");
      params.push(status);
    } else {
      // Default: hide deleted
      conditions.push("status != 'deleted'");
    }

    // Search filter
    if (search && search.trim()) {
      conditions.push(
        "(firstName LIKE ? OR lastName LIKE ? OR userName LIKE ? OR email LIKE ? OR phone LIKE ?)"
      );
      const like = `%${search.trim()}%`;
      params.push(like, like, like, like, like);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    // Run both queries in parallel
    const [rowsResult, countResult] = await Promise.all([
      db.query(
        `SELECT id, firstName, lastName, userName, phone, email, gender, status, profilePicture, createdAt
         FROM users
         ${where}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) AS total FROM users ${where}`, params)
    ]);

    const rows = rowsResult[0];
    const total = countResult[0][0]?.total ?? 0;

    return { rows, total };
  } catch (error) {
    console.error("getUsersWithPaginationAndCount error:", error);
    throw error;
  }
};

// export const getUsersCount = async (status = "", search = "") => {
//   try {
//     const conditions = [];
//     const params = [];

//     if (status && status !== "all") {
//       conditions.push("status = ?");
//       params.push(status);
//     }

//     if (!status || status === "all") {
//       conditions.push("status != 'deleted'");
//     }

//     if (search && search.trim()) {
//       conditions.push("(firstName LIKE ? OR lastName LIKE ? OR userName LIKE ? OR email LIKE ? OR phone LIKE ?)");
//       const like = `%${search.trim()}%`;
//       params.push(like, like, like, like, like);
//     }

//     const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

//     const [[{ total }]] = await db.query(
//       `SELECT COUNT(*) AS total FROM users ${where}`,
//       params
//     );

//     return total;
//   } catch (error) {
//     console.error("getUsersCount error:", error);
//     throw error;
//   }
// };

// ---------------- SINGLE USER ----------------

export const findUserByIdAdmin = async (id) => {
  try {
    const [result] = await db.query(
      "SELECT id, firstName, lastName, userName, email, phone, status, gender, profilePicture, createdAt FROM users WHERE id = ?",
      [id]
    );

    return result[0] ?? null;
  } catch (error) {
    console.error("findUserByIdAdmin error:", error);
    throw error;
  }
};

// ---------------- STATUS ----------------

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

// ---------------- DELETE ----------------

export const softDeleteUser = async (id) => {
  try {
    await db.query(
      "UPDATE users SET status = 'deleted', updatedAt = NOW() WHERE id = ?",
      [id]
    );

    await db.query("DELETE FROM userToken WHERE userId = ?", [id]);
  } catch (error) {
    console.error("softDeleteUser error:", error);
    throw error;
  }
};

// ---------------- FORCE LOGOUT ----------------

export const forceLogoutUser = async (userId) => {
  try {
    await db.query("DELETE FROM userToken WHERE userId = ?", [userId]);
  } catch (error) {
    console.error("forceLogoutUser error:", error);
    throw error;
  }
};

// ---------------- ADMINS ----------------

export const getAllAdmins = async () => {
  try {
    const [result] = await db.query(
      "SELECT id, userName, email, phone, role FROM admins WHERE role != 'MASTER_ADMIN'"
    );
    return result;
  } catch (error) {
    console.error("getAllAdmins error:", error);
    throw error;
  }
};

export const getDashboardCounts = async () => {
  try {
    const [[counts]] = await db.query(
      `SELECT
        COUNT(*) AS totalUsers,
        SUM(status = 'active') AS activeUsers,
        SUM(status = 'pending') AS pendingUsers,
        SUM(status = 'inactive') AS inactiveUsers,
        SUM(status = 'deleted') AS deletedUsers
       FROM users`
    );
    return counts;
  } catch (error) {
    console.error("getDashboardCounts error:", error);
    throw error;
  }
};

// ---------------- UPDATE USER ----------------

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

// ---------------- TOKEN ----------------

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
      "SELECT * FROM adminToken WHERE token = ?",
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