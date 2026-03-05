import db from "../config/db.js";

export const findUserByEmailOrUsername = (email, userName) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM users WHERE email = ? OR userName = ?",
      [email, userName],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      },
    );
  });
};

export const findUserByUsername = (userName) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM users WHERE userName = ?",
      [userName],
      (err, result) => {
        if (err) return reject(err);
        resolve(result[0] ?? null);
      },
    );
  });
};

export const findUserById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM users WHERE id = ?", [id], (err, result) => {
      if (err) return reject(err);
      resolve(result[0] ?? null);
    });
  });
};

export const insertUser = (
  firstName,
  lastName,
  userName,
  password,
  email,
  phone,
) => {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO users (firstName, lastName, userName, password, email, phone) VALUES (?, ?, ?, ?, ?, ?)",
      [firstName, lastName, userName, password, email, phone],
      (err, result) => {
        if (err) return reject(err);

        resolve({
          id: result.insertId,
          firstName,
          lastName,
          userName,
          email,
          phone,
        });
      },
    );
  });
};
