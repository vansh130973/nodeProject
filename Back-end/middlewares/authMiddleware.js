import jwt from "jsonwebtoken";
import { findUserToken } from "../services/userService.js";
import { findAdminToken } from "../services/adminService.js";

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized Access" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const isAdmin = decoded.role === "ADMIN" || decoded.role === "MASTER_ADMIN";

    const savedToken = isAdmin
      ? await findAdminToken(token)
      : await findUserToken(token);  

    if (!savedToken) {
      return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    next();
  };
};