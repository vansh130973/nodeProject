import db from "../../../config/db.js";

/**
 * Find non-deleted users matching email or username.
 * Used during registration to detect duplicates.
 *
 * @param {string} email
 * @param {string} userName
 * @returns {Promise<object[]>}
 */
export const findActiveUserByEmailOrUsername = async (email, userName) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM users WHERE (email = ? OR userName = ?) AND isDeleted != 1",
      [email, userName]
    );
    return result;
  } catch (error) {
    console.error("findActiveUserByEmailOrUsername error:", error);
    throw error;
  }
};

/**
 * Find a non-deleted user by username (used for login).
 *
 * @param {string} userName
 * @returns {Promise<object|null>}
 */
export const findUserByUsername = async (userName) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM users WHERE userName = ? AND isDeleted != 1",
      [userName]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findUserByUsername error:", error);
    throw error;
  }
};

/**
 * Find a non-deleted user by email (used for OTP / forgot-password flows).
 *
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export const findUserByEmail = async (email) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM users WHERE email = ? AND isDeleted != 1",
      [email]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findUserByEmail error:", error);
    throw error;
  }
};

/**
 * Find a user by id (no isDeleted filter — used internally).
 *
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export const findUserById = async (id) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findUserById error:", error);
    throw error;
  }
};

/**
 * Insert a new user row with pending status.
 *
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} userName
 * @param {string} password
 * @param {string} email
 * @param {string} phone
 * @param {string} gender
 * @param {string|null} profilePicture
 * @returns {Promise<object>} Partial user object with insertId
 */
export const insertUser = async (
  firstName, lastName, userName, password, email, phone, gender, profilePicture
) => {
  try {
    const [result] = await db.query(
      "INSERT INTO users (firstName, lastName, userName, password, email, phone, gender, profilePicture, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
      [firstName, lastName, userName, password, email, phone, gender, profilePicture]
    );
    return { id: result.insertId, firstName, lastName, userName, email, phone, gender, profilePicture, status: "pending" };
  } catch (error) {
    console.error("insertUser error:", error);
    throw error;
  }
};

/**
 * Update only the profilePicture column for a user.
 *
 * @param {number} id
 * @param {string} profilePicture
 * @returns {Promise<void>}
 */
export const updateProfilePicture = async (id, profilePicture) => {
  try {
    await db.query(
      "UPDATE users SET profilePicture = ?, updatedAt = NOW() WHERE id = ?",
      [profilePicture, id]
    );
  } catch (error) {
    console.error("updateProfilePicture error:", error);
    throw error;
  }
};

/**
 * Update a user's editable profile fields and return the refreshed row.
 *
 * @param {number} id
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} phone
 * @param {string} gender
 * @param {string|null} profilePicture
 * @returns {Promise<object>} Updated user row
 */
export const updateUserProfile = async (id, firstName, lastName, phone, gender, profilePicture) => {
  try {
    await db.query(
      "UPDATE users SET firstName = ?, lastName = ?, phone = ?, gender = ?, profilePicture = ?, updatedAt = NOW() WHERE id = ?",
      [firstName, lastName, phone, gender, profilePicture, id]
    );
    return findUserById(id);
  } catch (error) {
    console.error("updateUserProfile error:", error);
    throw error;
  }
};

/**
 * Overwrite a user's password hash.
 *
 * @param {number} id
 * @param {string} hashedPassword
 * @returns {Promise<void>}
 */
export const updateUserPassword = async (id, hashedPassword) => {
  try {
    await db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, id]
    );
  } catch (error) {
    console.error("updateUserPassword error:", error);
    throw error;
  }
};

/**
 * Persist a new JWT token for a user session.
 *
 * @param {number} userId
 * @param {string} token
 * @returns {Promise<void>}
 */
export const saveUserToken = async (userId, token) => {
  try {
    await db.query(
      "INSERT INTO userToken (userId, token) VALUES (?, ?)",
      [userId, token]
    );
  } catch (error) {
    console.error("saveUserToken error:", error);
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
export const findUserToken = async (token) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM userToken WHERE token = ?",
      [token]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findUserToken error:", error);
    throw error;
  }
};

/**
 * Delete a single token (used on logout).
 *
 * @param {string} token
 * @returns {Promise<void>}
 */
export const deleteUserToken = async (token) => {
  try {
    await db.query(
      "DELETE FROM userToken WHERE token = ?",
      [token]
    );
  } catch (error) {
    console.error("deleteUserToken error:", error);
    throw error;
  }
};

/**
 * Delete all tokens for a user, forcing re-authentication on all devices.
 *
 * @param {number} userId
 * @returns {Promise<void>}
 */
export const deleteAllUserTokens = async (userId) => {
  try {
    await db.query(
      "DELETE FROM userToken WHERE userId = ?",
      [userId]
    );
  } catch (error) {
    console.error("deleteAllUserTokens error:", error);
    throw error;
  }
};

/**
 * Upsert an OTP for a user (deletes any existing OTP first).
 *
 * @param {number} userId
 * @param {string} otp
 * @param {Date}   expiresAt
 * @returns {Promise<void>}
 */
export const saveOtp = async (userId, otp, expiresAt) => {
  try {
    await db.query("DELETE FROM userOtp WHERE userId = ?", [userId]);
    await db.query(
      "INSERT INTO userOtp (userId, otp, expiresAt) VALUES (?, ?, ?)",
      [userId, otp, expiresAt]
    );
  } catch (error) {
    console.error("saveOtp error:", error);
    throw error;
  }
};

/**
 * Fetch the active OTP record for a user.
 *
 * @param {number} userId
 * @returns {Promise<object|null>}
 */
export const findOtpByUserId = async (userId) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM userOtp WHERE userId = ?",
      [userId]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("findOtpByUserId error:", error);
    throw error;
  }
};

/**
 * Delete all OTP records for a user (called after successful password reset).
 *
 * @param {number} userId
 * @returns {Promise<void>}
 */
export const deleteOtp = async (userId) => {
  try {
    await db.query("DELETE FROM userOtp WHERE userId = ?", [userId]);
  } catch (error) {
    console.error("deleteOtp error:", error);
    throw error;
  }
};

/**
 * Given arrays of userNames + emails, return existing rows matching either.
 * Used by bulk import to detect duplicates in one query.
 */
export const bulkFindExistingUsernamesAndEmails = async (userNames, emails) => {
  if (!userNames.length && !emails.length) return [];
  try {
    const [rows] = await db.query(
      `SELECT userName, email, isDeleted FROM users WHERE userName IN (?) OR email IN (?)`,
      [userNames.length ? userNames : ["__none__"], emails.length ? emails : ["__none__"]]
    );
    return rows;
  } catch (error) {
    console.error("bulkFindExistingUsernamesAndEmails error:", error);
    throw error;
  }
};

/**
 * Given arrays of userNames + emails, return existing rows (id, userName, email, isDeleted).
 * Used by bulk import to split rows into insert vs update.
 */
export const bulkFindByUsernamesOrEmails = async (userNames, emails) => {
  if (!userNames.length && !emails.length) return [];
  try {
    const [rows] = await db.query(
      `SELECT id, userName, email, isDeleted FROM users WHERE userName IN (?) OR email IN (?)`,
      [userNames.length ? userNames : ["__none__"], emails.length ? emails : ["__none__"]]
    );
    return rows;
  } catch (error) {
    console.error("bulkFindByUsernamesOrEmails error:", error);
    throw error;
  }
};

/**
 * Update multiple users one-by-one (matched by userName).
 * Updates: firstName, lastName, phone, gender, status, isDeleted.
 * Returns array of { id, _remoteUrl } for updated rows.
 */
export const bulkUpdateUsers = async (users) => {
  if (!users.length) return { updatedIds: [], affectedRows: 0 };
  const updatedIds = [];
  for (const u of users) {
    try {
      await db.query(
        `UPDATE users
            SET firstName = ?, lastName = ?, phone = ?, gender = ?,
                status = ?, isDeleted = ?, updatedAt = NOW()
          WHERE userName = ?`,
        [u.firstName, u.lastName, u.phone, u.gender, u.status, u.isDeleted ?? 0, u.userName]
      );
      // Fetch the id so profile-picture logic can reuse it
      const [rows] = await db.query(
        "SELECT id FROM users WHERE userName = ? LIMIT 1",
        [u.userName]
      );
      if (rows[0]) updatedIds.push({ id: rows[0].id, _remoteUrl: u._remoteUrl ?? null });
    } catch (error) {
      console.error("bulkUpdateUsers row error:", error);
      // individual failure is tolerated — caller handles fallback
      throw error;
    }
  }
  return { updatedIds, affectedRows: updatedIds.length };
};

/**
 * Insert multiple users in a single query.
 */
export const bulkInsertUsers = async (users) => {
  if (!users.length) return { insertedIds: [], affectedRows: 0 };
  try {
    // Build one VALUES row per user: (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    const placeholders = users.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values = users.flatMap((u) => [
      u.firstName, u.lastName, u.userName, u.password, u.email,
      u.phone, u.gender, u.profilePicture ?? null, u.status, u.isDeleted ?? 0,
    ]);

    const [result] = await db.query(
      `INSERT INTO users
         (firstName, lastName, userName, password, email, phone, gender, profilePicture, status, isDeleted)
       VALUES ${placeholders}`,
      values
    );

    // Recover every insertId: MySQL guarantees firstId … firstId + affectedRows - 1
    const firstId     = result.insertId;
    const affectedRows = result.affectedRows;
    const insertedIds = users.map((u, i) => ({
      id:         firstId + i,
      _remoteUrl: u._remoteUrl ?? null,
    }));

    return { insertedIds, affectedRows };
  } catch (error) {
    console.error("bulkInsertUsers error:", error);
    throw error;
  }
};