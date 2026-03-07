import db from "../config/db.js";

export const findAdminByEmailOrUsername = (email, userName) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM admins WHERE email = ? OR userName = ?",
      [email, userName],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      },
    );
  });
};

export const insertMasterAdmin = (userName, password, email, phone) => {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO admins (userName, password, email, phone) VALUES (?, ?, ?, ?)",
      [userName, password, email, phone],
      (err, result) => {
        if (err) return reject(err);
        resolve({
          id: result.insertId,
          userName,
          email,
          phone,
        });
      },
    );
  });
};

export const findAdminByUsername = (userName) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM admins WHERE userName = ?",
      [userName],
      (err, result) => {
        if (err) return reject(err);
        resolve(result[0] ?? null);
      },
    );
  });
};

export const getAllUsers = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT id,firstName, lastName, userName, email, phone FROM users", (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

export const getAllAdmins = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT id, userName, email, phone FROM admins WHERE role != 'MASTER_ADMIN'",
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      },
    );
  });
};
