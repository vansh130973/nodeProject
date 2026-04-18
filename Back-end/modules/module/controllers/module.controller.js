import {
  getAllModules,
  findModuleById,
  findModuleByName,
  insertModule,
  updateModule,
  deleteModule,
} from "../models/module.model.js";
import { sendSuccessResponse, sendErrorResponse } from "../../../utils/response.js";

export const listModules = async (req, res) => {
  try {
    const modules = await getAllModules();
    return sendSuccessResponse(res, "Modules fetched successfully", { modules });
  } catch (err) {
    console.error("listModules error:", err);
    return sendErrorResponse(res, "Server error", 500);
  }
};

const parseModuleId = (raw) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const getModule = async (req, res) => {
  try {
    const id = parseModuleId(req.params.id);
    if (!id) return sendErrorResponse(res, "Invalid module id", 400);

    const module = await findModuleById(id);
    if (!module) return sendErrorResponse(res, "Module not found", 404);
    return sendSuccessResponse(res, "Module fetched successfully", { module });
  } catch (err) {
    console.error("getModule error:", err);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const createModule = async (req, res) => {
  try {
    const { name, status } = req.body;

    // Duplicate name check
    const existing = await findModuleByName(name);
    if (existing) return sendErrorResponse(res, "Module name already exists", 409);

    const module = await insertModule(name, status);
    return sendSuccessResponse(res, "Module created successfully", { module }, undefined, 201);
  } catch (err) {
    console.error("createModule error:", err);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const editModule = async (req, res) => {
  try {
    const id = parseModuleId(req.params.id);
    if (!id) return sendErrorResponse(res, "Invalid module id", 400);

    const { name, status } = req.body;

    const existing = await findModuleById(id);
    if (!existing) return sendErrorResponse(res, "Module not found", 404);

    // Duplicate name among non-deleted modules (same id allowed when restoring a soft-deleted row)
    const duplicate = await findModuleByName(name);
    if (duplicate && duplicate.id !== id)
      return sendErrorResponse(res, "Module name already exists", 409);

    const updated = await updateModule(id, name, status);
    return sendSuccessResponse(res, "Module updated successfully", { module: updated });
  } catch (err) {
    console.error("editModule error:", err);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const removeModule = async (req, res) => {
  try {
    const id = parseModuleId(req.params.id);
    if (!id) return sendErrorResponse(res, "Invalid module id", 400);

    const existing = await findModuleById(id);
    if (!existing || existing.isDeleted) return sendErrorResponse(res, "Module not found", 404);

    await deleteModule(id);
    return sendSuccessResponse(res, "Module deleted successfully");
  } catch (err) {
    console.error("removeModule error:", err);
    return sendErrorResponse(res, "Server error", 500);
  }
};
