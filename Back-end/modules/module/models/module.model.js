import db from "../../../config/db.js";

export const getAllModules = async () => {
  const [rows] = await db.query(
    "SELECT id, name, status, isDeleted, createdAt, updatedAt FROM modules ORDER BY id DESC"
  );
  return rows;
};

export const getActiveModules = async () => {
  const [rows] = await db.query(
    "SELECT id, name FROM modules WHERE status = 'active' AND isDeleted = 0 ORDER BY name ASC"
  );
  return rows;
};

export const findModuleById = async (id) => {
  const [rows] = await db.query(
    "SELECT id, name, status, isDeleted, createdAt, updatedAt FROM modules WHERE id = ?",
    [id]
  );
  return rows[0] ?? null;
};

export const findModuleByName = async (name) => {
  const [rows] = await db.query(
    "SELECT id FROM modules WHERE LOWER(name) = LOWER(?) AND isDeleted = 0",
    [name]
  );
  return rows[0] ?? null;
};

export const insertModule = async (name, status = "active") => {
  const [result] = await db.query(
    "INSERT INTO modules (name, status, isDeleted) VALUES (?, ?, 0)",
    [name, status]
  );
  return findModuleById(result.insertId);
};

export const updateModule = async (id, name, status) => {
  await db.query(
    "UPDATE modules SET name = ?, status = ?, updatedAt = NOW() WHERE id = ? AND isDeleted = 0",
    [name, status, id]
  );
  return findModuleById(id);
};

export const deleteModule = async (id) => {
  await db.query(
    "UPDATE modules SET isDeleted = 1, status = 'inactive', updatedAt = NOW() WHERE id = ?",
    [id]
  );
};
