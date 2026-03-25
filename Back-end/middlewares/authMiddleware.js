import jwt from "jsonwebtoken";
import { findUserToken } from "../modules/user/models/user.model.js";
import { findAdminToken } from "../modules/admin/models/admin.model.js";
import { sendErrorResponse } from "../utils/response.js";

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendErrorResponse(res, "Unauthorized Access", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const isAdmin = decoded.role === "ADMIN" || decoded.role === "MASTER_ADMIN";

    const savedToken = isAdmin
      ? await findAdminToken(token)
      : await findUserToken(token);  

    if (!savedToken) {
      return sendErrorResponse(res, "Session expired. Please log in again.", 401);
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return sendErrorResponse(res, "Invalid token. Please log in again.", 401);
  }
};

export const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendErrorResponse(res, "Access denied.", 403);
    }
    next();
  };
};