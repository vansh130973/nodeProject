import db from "../../../config/db.js";

export const findUserByEmailOrUsername = async (email, userName) => {
  const [result] = await db.query(
    "SELECT * FROM users WHERE email = ? OR userName = ?",
    [email, userName]
  );
  return result;
};

export const findUserByUsername = async (userName) => {
  const [result] = await db.query(
    "SELECT * FROM users WHERE userName = ?",
    [userName]
  );
  return result[0] ?? null;
};

export const findUserByEmail = async (email) => {
  const [result] = await db.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
  return result[0] ?? null;
};

export const findUserById = async (id) => {
  const [result] = await db.query(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );
  return result[0] ?? null;
};

export const insertUser = async (
  firstName, lastName, userName, password, email, phone, gender, profilePicture
) => {
  const [result] = await db.query(
    "INSERT INTO users (firstName, lastName, userName, password, email, phone, gender, profilePicture) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [firstName, lastName, userName, password, email, phone, gender, profilePicture]
  );
  return { id: result.insertId, firstName, lastName, userName, email, phone, gender, profilePicture };
};

export const updateUserProfile = async (id, firstName, lastName, phone, gender, profilePicture) => {
  await db.query(
    "UPDATE users SET firstName = ?, lastName = ?, phone = ?, gender = ?, profilePicture = ?, updatedAt = NOW() WHERE id = ?",
    [firstName, lastName, phone, gender, profilePicture, id]
  );
  return findUserById(id);
};

export const updateUserPassword = async (id, hashedPassword) => {
  await db.query(
    "UPDATE users SET password = ? WHERE id = ?",
    [hashedPassword, id]
  );
};

export const saveUserToken = async (userId, token) => {
  await db.query(
    "INSERT INTO userToken (userId, token) VALUES (?, ?)",
    [userId, token]
  );
};

export const findUserToken = async (token) => {
  const [result] = await db.query(
    "SELECT * FROM userToken WHERE token = ?",
    [token]
  );
  return result[0] ?? null;
};

export const deleteUserToken = async (token) => {
  await db.query(
    "DELETE FROM userToken WHERE token = ?",
    [token]
  );
};

export const saveOtp = async (userId, otp, expiresAt) => {
  await db.query("DELETE FROM userOtp WHERE userId = ?", [userId]);
  await db.query(
    "INSERT INTO userOtp (userId, otp, expiresAt) VALUES (?, ?, ?)",
    [userId, otp, expiresAt]
  );
};

export const findOtpByUserId = async (userId) => {
  const [result] = await db.query(
    "SELECT * FROM userOtp WHERE userId = ?",
    [userId]
  );
  return result[0] ?? null;
};

export const deleteOtp = async (userId) => {
  await db.query("DELETE FROM userOtp WHERE userId = ?", [userId]);
};