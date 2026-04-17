import db from "../../../config/db.js";

export const getAllRoles = async () => {
  const [rows] = await db.query(
    "SELECT id, name, description, status, isDeleted, createdAt, updatedAt FROM roles ORDER BY id DESC"
  );
  return rows;
};

export const findRoleById = async (id) => {
  const [rows] = await db.query(
    "SELECT id, name, description, status, isDeleted, createdAt, updatedAt FROM roles WHERE id = ?",
    [id]
  );
  return rows[0] ?? null;
};

export const findRoleByName = async (name) => {
  const [rows] = await db.query(
    "SELECT id FROM roles WHERE LOWER(name) = LOWER(?) AND isDeleted = 0",
    [name]
  );
  return rows[0] ?? null;
};

export const insertRole = async (name, description, status) => {
  const [result] = await db.query(
    "INSERT INTO roles (name, description, status, isDeleted) VALUES (?, ?, ?, 0)",
    [name, description ?? null, status]
  );
  return findRoleById(result.insertId);
};

export const updateRole = async (id, name, description, status) => {
  await db.query(
    "UPDATE roles SET name = ?, description = ?, status = ?, updatedAt = NOW() WHERE id = ? AND isDeleted = 0",
    [name, description ?? null, status, id]
  );
  return findRoleById(id);
};

export const deleteRole = async (id) => {
  await db.query(
    "UPDATE roles SET isDeleted = 1, status = 'inactive', updatedAt = NOW() WHERE id = ?",
    [id]
  );
};

export const getPermissionsByRoleId = async (roleId) => {
  const [rows] = await db.query(
    `SELECT rp.id, rp.moduleId, m.name AS moduleName,
            rp.canView, rp.canAdd, rp.canEdit, rp.canDelete
     FROM rolePermissions rp
     JOIN modules m ON m.id = rp.moduleId
     WHERE rp.roleId = ? AND m.isDeleted = 0
     ORDER BY m.name ASC`,
    [roleId]
  );
  return rows;
};

export const upsertPermissions = async (roleId, permissions) => {
  await db.query("DELETE FROM rolePermissions WHERE roleId = ?", [roleId]);

  if (!permissions || permissions.length === 0) return;

  const values = permissions.map((p) => [
    roleId,
    p.moduleId,
    p.canView   ? 1 : 0,
    p.canAdd    ? 1 : 0,
    p.canEdit   ? 1 : 0,
    p.canDelete ? 1 : 0,
  ]);

  await db.query(
    `INSERT INTO rolePermissions (roleId, moduleId, canView, canAdd, canEdit, canDelete)
     VALUES ?`,
    [values]
  );
};

export const getPermission = async (roleId, moduleName) => {
  const [rows] = await db.query(
    `SELECT rp.canView, rp.canAdd, rp.canEdit, rp.canDelete
     FROM rolePermissions rp
     JOIN modules m ON m.id = rp.moduleId
     JOIN roles r ON r.id = rp.roleId
     WHERE rp.roleId = ?
       AND LOWER(m.name) = LOWER(?)
       AND m.status = 'active'
       AND m.isDeleted = 0
       AND r.status = 'active'
       AND r.isDeleted = 0`,
    [roleId, moduleName]
  );
  return rows[0] ?? null;
};
