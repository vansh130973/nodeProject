import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { findUserToken } from "../modules/user/models/user.model.js";
import { findAdminToken } from "../modules/admin/models/admin.model.js";

let io = null;

// ─── Room helpers ─────────────────────────────────────────────────────────────
// Each authenticated client joins two rooms:
//   • "user:<id>"  or  "admin:<id>"   → target a specific account
//   • "admins"                         → broadcast to all connected admins

const userRoom  = (id) => `user:${id}`;
const adminRoom = (id) => `admin:${id}`;
const ADMINS_ROOM = "admins";

// ─── Determine if decoded JWT payload is an admin ────────────────────────────
const isAdminPayload = (decoded) => decoded && decoded.id && !decoded.firstName;

// ─── Init ─────────────────────────────────────────────────────────────────────
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verify the token is still alive in the DB (not logged out)
      const saved = isAdminPayload(decoded)
        ? await findAdminToken(token)
        : await findUserToken(token);

      if (!saved) return next(new Error("Token revoked"));

      socket.user  = decoded;
      socket.token = token;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  // ── Connection ───────────────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const { user } = socket;
    const isAdmin  = isAdminPayload(user);

    if (isAdmin) {
      socket.join(adminRoom(user.id));
      socket.join(ADMINS_ROOM);
    } else {
      socket.join(userRoom(user.id));
    }
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialised");
  return io;
};

// ─── Emitters (called from controllers) ──────────────────────────────────────

/**
 * Notify a specific user of a new admin reply on their ticket.
 * Payload: { ticketId, subject, unreadCount? }
 */
export const emitNewMessageBadge = (userId, payload) =>
  getIO().to(userRoom(userId)).emit("ticket:newMessage", payload);

/**
 * Notify all connected admins of a new user reply.
 * Payload: { ticketId, subject, userName }
 */
export const emitAdminNewReply = (payload) =>
  getIO().to(ADMINS_ROOM).emit("ticket:userReply", payload);

/**
 * Notify a specific user that their account status changed.
 * If the new status is not "active" the frontend will force-logout.
 * Payload: { status }
 */
export const emitUserStatusChanged = (userId, status) =>
  getIO().to(userRoom(userId)).emit("user:statusChanged", { status });

/**
 * Notify a specific admin that their status changed (edited/deactivated by master admin).
 * Payload: { status }
 */
export const emitAdminStatusChanged = (adminId, status) =>
  getIO().to(adminRoom(adminId)).emit("admin:statusChanged", { status });

/**
 * Force-logout a specific user by socket (admin deactivated / deleted / force-logout action).
 */
export const emitForceLogoutUser = (userId) =>
  getIO().to(userRoom(userId)).emit("auth:forceLogout", { reason: "Session terminated by admin." });

/**
 * Force-logout a specific admin by socket.
 */
export const emitForceLogoutAdmin = (adminId) =>
  getIO().to(adminRoom(adminId)).emit("auth:forceLogout", { reason: "Your account was modified. Please log in again." });

/**
 * Notify a specific user their ticket status changed (e.g. closed by admin).
 * Payload: { ticketId, status }
 */
export const emitTicketStatusChanged = (userId, ticketId, status) =>
  getIO().to(userRoom(userId)).emit("ticket:statusChanged", { ticketId, status });
