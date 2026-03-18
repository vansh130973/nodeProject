import db from "../config/db.js";

export const findAdminByEmailOrUsername = async (email, userName) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM admins WHERE email = ? OR userName = ?",
      [email, userName]
    );
    return result;
  } catch (err) {
    throw err;
  }
};

export const insertAdmin = async (userName, password, email, phone) => {
  try {
    const [result] = await db.query(
      "INSERT INTO admins (userName, password, email, phone) VALUES (?, ?, ?, ?)",
      [userName, password, email, phone]
    );

    return {
      id: result.insertId,
      userName,
      email,
      phone,
    };
  } catch (err) {
    throw err;
  }
};

export const findAdminByUsername = async (userName) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM admins WHERE userName = ?",
      [userName]
    );
    return result[0] ?? null;
  } catch (err) {
    throw err;
  }
};

export const getAllUsers = async () => {
  try {
    const [result] = await db.query(
      "SELECT id, firstName, lastName, userName, email, phone FROM users"
    );
    return result;
  } catch (err) {
    throw err;
  }
};

export const getAllAdmins = async () => {
  try {
    const [result] = await db.query(
      "SELECT id, userName, email, phone FROM admins WHERE role != 'MASTER_ADMIN'"
    );
    return result;
  } catch (err) {
    throw err;
  }
};