import db from "../../../config/db.js";

// Registration: allow if username doesn't exist OR only exists as deleted
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

// Update only the profilePicture column
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

export const deleteOtp = async (userId) => {
  try {
    await db.query("DELETE FROM userOtp WHERE userId = ?", [userId]);
  } catch (error) {
    console.error("deleteOtp error:", error);
    throw error;
  }
};