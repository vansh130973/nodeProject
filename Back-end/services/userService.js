import db from "../config/db.js";

export const findUserByEmailOrUsername = async (email, userName) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM users WHERE email = ? OR userName = ?",
      [email, userName]
    );
    return result;
  } catch (err) {
    throw err;
  }
};

export const findUserByUsername = async (userName) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM users WHERE userName = ?",
      [userName]
    );
    return result[0] ?? null;
  } catch (err) {
    throw err;
  }
};

export const findUserById = async (id) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    return result[0] ?? null;
  } catch (err) {
    throw err;
  }
};

export const insertUser = async (
  firstName,
  lastName,
  userName,
  password,
  email,
  phone
) => {
  try {
    const [result] = await db.query(
      "INSERT INTO users (firstName, lastName, userName, password, email, phone) VALUES (?, ?, ?, ?, ?, ?)",
      [firstName, lastName, userName, password, email, phone]
    );

    return {
      id: result.insertId,
      firstName,
      lastName,
      userName,
      email,
      phone,
    };
  } catch (err) {
    throw err;
  }
};