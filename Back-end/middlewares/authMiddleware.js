import jwt from "jsonwebtoken";
import { findUserToken } from "../modules/user/models/user.model.js";
import { findAdminToken } from "../modules/admin/models/admin.model.js";
import { getPermission } from "../modules/role/models/role.model.js";
import { sendErrorResponse } from "../utils/response.js";

const isSuperAdmin = (user) => user?.userName === "admin";

const isAdminPayload = (decoded) =>
  decoded && decoded.id && !decoded.firstName;

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendErrorResponse(res, "Unauthorized Access", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const savedToken = isAdminPayload(decoded)
      ? await findAdminToken(token)
      : await findUserToken(token);

    if (!savedToken) {
      return sendErrorResponse(res, "Session expired. Please log in again.", 401);
    }

    req.user  = decoded;
    req.token = token;
    next();
  } catch (err) {
    return sendErrorResponse(res, "Invalid token. Please log in again.", 401);
  }
};

export const roleCheck = (...roles) => {
  return (req, res, next) => {
    const user = req.user;

    // "admin" username always passes any check that includes an admin role
    if (isSuperAdmin(user)) {
      const adminRoles = ["ADMIN", "MASTER_ADMIN"];
      if (roles.some((r) => adminRoles.includes(r))) return next();
    }

    if (!roles.includes(user.role)) {
      return sendErrorResponse(res, "Access denied.", 403);
    }
    next();
  };
};

const normalizeModuleName = (value = "") =>
  String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");

const buildModuleAliases = (moduleNames) => {
  const names = Array.isArray(moduleNames) ? moduleNames : [moduleNames];
  const aliases = new Set();

  names.forEach((name) => {
    const normalized = normalizeModuleName(name);
    if (!normalized) return;
    aliases.add(normalized);
    if (normalized.endsWith("s")) aliases.add(normalized.slice(0, -1));
    else aliases.add(`${normalized}s`);
  });

  return [...aliases];
};

export const modulePermissionCheck = (moduleNames, action = "canView") => {
  return async (req, res, next) => {
    try {
      // "admin" username — unrestricted access to everything
      if (isSuperAdmin(req.user)) return next();

      // Dashboard is always reachable for any authenticated admin
      const aliases = buildModuleAliases(moduleNames);
      if (aliases.includes("dashboard")) return next();

      // Regular admins must have a roleId and the correct permission
      if (!req.user.roleId) {
        return sendErrorResponse(res, "No role assigned to this admin.", 403);
      }

      let hasPermission = false;
      for (const alias of aliases) {
        const permission = await getPermission(req.user.roleId, alias);
        if (permission?.[action]) {
          hasPermission = true;
          break;
        }
      }

      if (!hasPermission) {
        return sendErrorResponse(res, "Access denied for this module/action.", 403);
      }

      next();
    } catch (err) {
      console.error("modulePermissionCheck error:", err);
      return sendErrorResponse(res, "Server error", 500);
    }
  };
};