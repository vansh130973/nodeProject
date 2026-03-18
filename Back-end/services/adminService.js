import db from "../config/db.js";

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

export const getAllUsers = async () => {
  const [result] = await db.query(
    "SELECT id, firstName, lastName, userName, email, phone, gender, profilePicture FROM users"
  );
  return result;
};

export const getAllAdmins = async () => {
  const [result] = await db.query(
    "SELECT id, userName, email, phone, role FROM admins WHERE role != 'MASTER_ADMIN'"
  );
  return result;
};

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