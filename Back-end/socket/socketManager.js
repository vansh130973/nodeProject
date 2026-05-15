import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { findUserToken } from "../modules/user/models/user.model.js";
import { findAdminToken } from "../modules/admin/models/admin.model.js";

let io = null;

// ─── Room name builders ───────────────────────────────────────────────────────
const ROOMS = {
  user: (id) => `user:${id}`,
  admin: (id) => `admin:${id}`,
  ticket: (id) => `ticket:${id}`,          // 1-to-1 live chat room
  notifications: "notifications:broadcast",        // one-to-many broadcast room (all users)
  admins: "admins",                         // all connected admins
};

// ─── All socket event names in one place — no magic strings anywhere ──────────
export const SOCKET_EVENTS = Object.freeze({
  // Ticket — 1-to-1 live chat
  TICKET_NEW_MESSAGE: "ticket:newMessage",
  TICKET_USER_REPLY: "ticket:userReply",
  TICKET_LIVE_MESSAGE: "ticket:liveMessage",
  TICKET_STATUS_CHANGED: "ticket:statusChanged",
  // Notifications — one-to-many broadcast
  NOTIFICATION_BROADCAST: "notification:broadcast",
  // Account
  USER_STATUS_CHANGED: "user:statusChanged",
  ADMIN_STATUS_CHANGED: "admin:statusChanged",
  FORCE_LOGOUT: "auth:forceLogout",
});

// ─── Force-logout reasons ─────────────────────────────────────────────────────
const LOGOUT_REASONS = Object.freeze({
  user:  "Session terminated by admin.",
  admin: "Your account was modified. Please log in again.",
});

// ─── Helper: determine if JWT payload belongs to an admin ─────────────────────
const isAdminPayload = (decoded) => decoded?.id && !decoded?.firstName;

// ─── Core reusable emitter ────────────────────────────────────────────────────
/**
 * Emit a socket event to a resolved room.
 *
 * @param {"user"|"admin"|"admins"|"ticket"|"notifications"|"all"} target
 * @param {number|null} id   — room id (userId/adminId/ticketId). null for rooms without id
 * @param {string} event
 * @param {object} payload
 */
const emitTo = (target, id, event, payload) => {
  const _io = getIO();

  switch (target) {
    case "user":
      _io.to(ROOMS.user(id)).emit(event, payload);
      break;
    case "admin":
      _io.to(ROOMS.admin(id)).emit(event, payload);
      break;
    case "admins":
      _io.to(ROOMS.admins).emit(event, payload);
      break;
    case "ticket":
      // 1-to-1: only sockets that have joined this specific ticket room receive this
      _io.to(ROOMS.ticket(id)).emit(event, payload);
      break;
    case "notifications":
      // one-to-many: all sockets in the broadcast room (all logged-in users)
      _io.to(ROOMS.notifications).emit(event, payload);
      break;
    case "all":
      _io.emit(event, payload);
      break;
    default:
      console.warn(`[socket] emitTo — unknown target: "${target}"`);
  }
};

// ─── Init ─────────────────────────────────────────────────────────────────────
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
  });

  // Auth middleware — verify JWT + confirm token is still live in DB
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const saved   = isAdminPayload(decoded)
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

  io.on("connection", (socket) => {
    const { user } = socket;
    const isAdmin  = isAdminPayload(user);

    // ── Auto-join identity rooms ──────────────────────────────────────────────
    if (isAdmin) {
      socket.join(ROOMS.admin(user.id));
      socket.join(ROOMS.admins);
    } else {
      socket.join(ROOMS.user(user.id));
      // All users auto-join the broadcast room so they receive one-to-many
      // notifications the moment they connect — no client opt-in needed.
      socket.join(ROOMS.notifications);
    }

    // ── Ticket 1-to-1 chat rooms — join/leave on demand ──────────────────────
    // Client emits ticket:join when it opens a ticket detail page.
    // Client emits ticket:leave when it navigates away (or component unmounts).
    // This keeps the live-chat room tight: only the two parties in this ticket
    // receive TICKET_LIVE_MESSAGE, not every socket in the system.
    socket.on("ticket:join",  ({ ticketId } = {}) => {
      if (ticketId) socket.join(ROOMS.ticket(ticketId));
    });
    socket.on("ticket:leave", ({ ticketId } = {}) => {
      if (ticketId) socket.leave(ROOMS.ticket(ticketId));
    });

    // Socket.io automatically removes the socket from all rooms it joined,
    // so no manual room.leave() is needed here.
    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected — user:${user.id} role:${isAdmin ? "admin" : "user"} reason:${reason}`);
    });
  });

  return io;
};

// Get IO instance
export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialised — call initSocket() first");
  return io;
};

// Utility
export const getConnectedCount = () => io?.engine?.clientsCount ?? 0;

/**
 * Ticket emitters (1-to-1 live chat)
 * Admin replied → badge/toast to ticket owner + live message in chat room.
 * TICKET_NEW_MESSAGE   → user's personal room (navbar badge, toast when not viewing ticket)
 * TICKET_LIVE_MESSAGE  → ticket room (live chat update when viewing the ticket)
 */
export const emitNewMessageBadge = (userId, payload) => {
  emitTo("user",   userId,           SOCKET_EVENTS.TICKET_NEW_MESSAGE,  payload);
  emitTo("ticket", payload.ticketId, SOCKET_EVENTS.TICKET_LIVE_MESSAGE, payload);
};

/**
 * User replied → badge/toast to all admins + live message in chat room.
 * TICKET_USER_REPLY   → admins room (sidebar badge, toast when not viewing ticket)
 * TICKET_LIVE_MESSAGE → ticket room (live chat update when admin has ticket open)
 */
export const emitAdminNewReply = (payload) => {
  emitTo("admins", null,             SOCKET_EVENTS.TICKET_USER_REPLY,   payload);
  emitTo("ticket", payload.ticketId, SOCKET_EVENTS.TICKET_LIVE_MESSAGE, payload);
};

/**
 * Notification emitter (one-to-many broadcast)
 * MasterAdmin broadcasts a notification to every connected user.
 * Uses the shared "notifications:broadcast" room — all users auto-join on connect.
 * Admins do NOT receive this; they're not in the notifications room.
 */
export const emitBroadcastNotification = (payload) =>
  emitTo("notifications", null, SOCKET_EVENTS.NOTIFICATION_BROADCAST, payload);

/**
 * Emit an account-level event.
 * Account emitters (switch-case dispatch)
 * @param {"userStatus"|"adminStatus"|"ticketStatus"|"forceLogoutUser"|"forceLogoutAdmin"} type
 * @param {object} params
 *
 * emitAccountEvent("userStatus",       { userId: 5,  status: "inactive" })
 * emitAccountEvent("adminStatus",      { adminId: 2, status: "inactive" })
 * emitAccountEvent("ticketStatus",     { userId: 5,  ticketId: 12, status: "closed" })
 * emitAccountEvent("forceLogoutUser",  { userId: 5  })
 * emitAccountEvent("forceLogoutAdmin", { adminId: 2 })
 */
export const emitAccountEvent = (type, params) => {
  switch (type) {
    case "userStatus":
      emitTo("user", params.userId, SOCKET_EVENTS.USER_STATUS_CHANGED, { status: params.status });
      break;
    case "adminStatus":
      emitTo("admin", params.adminId, SOCKET_EVENTS.ADMIN_STATUS_CHANGED, { status: params.status });
      break;
    case "ticketStatus":
      emitTo("user", params.userId, SOCKET_EVENTS.TICKET_STATUS_CHANGED, {
        ticketId: params.ticketId,
        status:   params.status,
      });
      break;
    case "forceLogoutUser":
      emitTo("user", params.userId, SOCKET_EVENTS.FORCE_LOGOUT, { reason: LOGOUT_REASONS.user });
      break;
    case "forceLogoutAdmin":
      emitTo("admin", params.adminId, SOCKET_EVENTS.FORCE_LOGOUT, { reason: LOGOUT_REASONS.admin });
      break;
    default:
      console.warn(`[socket] emitAccountEvent — unknown type: "${type}"`);
  }
};

// Named backward-compat wrappers
export const emitUserStatusChanged = (userId, status) => emitAccountEvent("userStatus", { userId,  status });
export const emitAdminStatusChanged = (adminId, status) => emitAccountEvent("adminStatus", { adminId, status });
export const emitTicketStatusChanged = (userId, ticketId, status) => emitAccountEvent("ticketStatus", { userId,  ticketId, status });
export const emitForceLogoutUser = (userId) => emitAccountEvent("forceLogoutUser", { userId  });
export const emitForceLogoutAdmin = (adminId) => emitAccountEvent("forceLogoutAdmin", { adminId });