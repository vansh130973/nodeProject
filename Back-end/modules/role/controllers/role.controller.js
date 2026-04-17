import {
  getAllRoles,
  findRoleById,
  findRoleByName,
  insertRole,
  updateRole,
  deleteRole,
  getPermissionsByRoleId,
  upsertPermissions,
} from "../models/role.model.js";
import { sendSuccessResponse, sendErrorResponse } from "../../../utils/response.js";
import { deleteTokensByRoleId } from "../../admin/models/admin.model.js";

export const listRoles = async (req, res) => {
  try {
    const roles = await getAllRoles();
    return sendSuccessResponse(res, "Roles fetched successfully", { roles });
  } catch (err) {
    console.error("listRoles error:", err);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const getRole = async (req, res) => {
  try {
    const role = await findRoleById(req.params.id);
    if (!role || role.isDeleted) return sendErrorResponse(res, "Role not found", 404);

    const permissions = await getPermissionsByRoleId(role.id);
    return sendSuccessResponse(res, "Role fetched successfully", { role: { ...role, permissions } });
  } catch (err) {
    console.error("getRole error:", err);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description, status, permissions } = req.body;

    const existing = await findRoleByName(name);
    if (existing) return sendErrorResponse(res, "Role name already exists", 409);

    const role = await insertRole(name, description, status);
    await upsertPermissions(role.id, permissions);

    const savedPermissions = await getPermissionsByRoleId(role.id);
    return sendSuccessResponse(
      res, "Role created successfully",
      { role: { ...role, permissions: savedPermissions } },
      undefined, 201
    );
  } catch (err) {
    console.error("createRole error:", err);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const editRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, permissions } = req.body;

    const existing = await findRoleById(id);
    if (!existing || existing.isDeleted) return sendErrorResponse(res, "Role not found", 404);

    const duplicate = await findRoleByName(name);
    if (duplicate && duplicate.id !== Number(id))
      return sendErrorResponse(res, "Role name already exists", 409);

    const updated = await updateRole(id, name, description, status);
    await upsertPermissions(id, permissions);
    // Force-logout all admins assigned this role so they re-authenticate with new permissions
    await deleteTokensByRoleId(id);

    const savedPermissions = await getPermissionsByRoleId(id);
    return sendSuccessResponse(res, "Role updated successfully", {
      role: { ...updated, permissions: savedPermissions },
    });
  } catch (err) {
    console.error("editRole error:", err);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const removeRole = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await findRoleById(id);
    if (!existing || existing.isDeleted) return sendErrorResponse(res, "Role not found", 404);

    await deleteRole(id);
    return sendSuccessResponse(res, "Role deleted successfully");
  } catch (err) {
    console.error("removeRole error:", err);
    return sendErrorResponse(res, "Server error", 500);
  }
};