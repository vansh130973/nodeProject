import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { findAdminById } from "./modules/admin/models/admin.model.js";
import { findAdminToken } from "./modules/admin/models/admin.model.js";
import { findUserToken } from "./modules/user/models/user.model.js";

export const SOCKET_EVENTS = {
  TICKET_MSG:    "ticket_msg",
  TICKET_STATUS: "ticket_status",
  TICKET_COUNT:  "ticket_count",
  TICKET_NEW:    "ticket_new",
  SESSION_ENDED: "session_ended",
  USER_STATUS:   "user_status",
  BROADCAST:     "broadcast",   // ← new: admin → all users + admin itself
};

/** The one and only master-admin socket (userName === "admin"). */
let mainAdminSocket = null;

/** userId → Set<Socket>  — regular users (sub-admins are rejected at connect time). */
const userSockets = new Map();

// helpers 

const addUserSocket = (userId, socket) => {
  let set = userSockets.get(userId);
  if (!set) { set = new Set(); userSockets.set(userId, set); }
  set.add(socket);
};

const removeSocket = (socket, userId, isMainAdmin) => {
  if (isMainAdmin) {
    if (mainAdminSocket?.id === socket.id) mainAdminSocket = null;
    return;
  }
  const set = userSockets.get(userId);
  set?.delete(socket);
  if (set?.size === 0) userSockets.delete(userId);
};

/** Emit directly to every socket a single user has open (multi-tab safe). */
const emitToUser = (userId, event, payload) => {
  const set = userSockets.get(userId);
  if (!set) return;
  for (const s of set) s.emit(event, payload);
};

/** Emit to ALL currently connected regular users (every tab of every user). */
const emitToAllUsers = (event, payload) => {
  for (const set of userSockets.values()) {
    for (const s of set) s.emit(event, payload);
  }
};

// init 

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true },
  });

  io.on("connection", async (socket) => {
    console.log("Socket connected:", socket.id);

    // 1. Extract token from auth
    const token = socket.handshake.auth?.token;
    if (!token) { socket.disconnect(true); return; }

    // 2. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      socket.disconnect(true);
      return;
    }

    const userId = Number(decoded?.id);
    if (!Number.isFinite(userId) || userId <= 0) { socket.disconnect(true); return; }

    // 3. Validate token is still alive in DB
    const isAdminPayload = decoded.id && !decoded.firstName;
    const savedToken = isAdminPayload
      ? await findAdminToken(token)
      : await findUserToken(token);

    if (!savedToken) { socket.disconnect(true); return; }

    // 4. Determine role
    const adminRow = isAdminPayload ? await findAdminById(userId) : null;
    let isMainAdmin = false;

    if (adminRow) {
      // Only the master admin (userName === "admin") may hold a socket.
      // Sub-admins are rejected immediately.
      if (adminRow.userName !== "admin") { socket.disconnect(true); return; }
      isMainAdmin = true;
      const prev = mainAdminSocket;
      mainAdminSocket = socket;
      if (prev && prev.id !== socket.id) prev.disconnect(true);
      console.log("Master admin socket registered:", socket.id);
    } else {
      // Regular user
      addUserSocket(userId, socket);
      console.log(`User ${userId} socket registered:`, socket.id);
    }

    // 5. Cleanup on disconnect
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, reason);
      removeSocket(socket, userId, isMainAdmin);
    });
  });

  return io;
};

/**
 * Called by controllers to push events.
 *
 * @param {string} event  One of SOCKET_EVENTS.*
 * @param {object} data   Payload object
 */
export const emitSocket = (event, data) => {
  switch (event) {
    case SOCKET_EVENTS.TICKET_MSG: {
      const ownerUserId = Number(data.ownerUserId);
      const body = { ticketId: Number(data.ticketId), message: data.message };
      emitToUser(ownerUserId, SOCKET_EVENTS.TICKET_MSG, body);
      mainAdminSocket?.emit(SOCKET_EVENTS.TICKET_MSG, body);
      break;
    }
    case SOCKET_EVENTS.TICKET_STATUS: {
      const ownerUserId = Number(data.ownerUserId);
      const body = { ticketId: Number(data.ticketId), status: String(data.status) };
      emitToUser(ownerUserId, SOCKET_EVENTS.TICKET_STATUS, body);
      mainAdminSocket?.emit(SOCKET_EVENTS.TICKET_STATUS, body);
      break;
    }
    case SOCKET_EVENTS.TICKET_COUNT: {
      const ownerUserId = Number(data.ownerUserId);
      const body = { ticketId: Number(data.ticketId) };
      emitToUser(ownerUserId, SOCKET_EVENTS.TICKET_COUNT, body);
      mainAdminSocket?.emit(SOCKET_EVENTS.TICKET_COUNT, body);
      break;
    }
    case SOCKET_EVENTS.TICKET_NEW:
      mainAdminSocket?.emit(SOCKET_EVENTS.TICKET_NEW, data);
      break;
    case SOCKET_EVENTS.SESSION_ENDED:
      emitToUser(Number(data.userId), SOCKET_EVENTS.SESSION_ENDED, {});
      break;
    case SOCKET_EVENTS.USER_STATUS:
      emitToUser(Number(data.userId), SOCKET_EVENTS.USER_STATUS, { status: data.status });
      break;

    // ── BROADCAST ────────────────────────────────────────────────────────────
    // Sends to every connected regular user AND the master admin.
    // Called by sendBroadcastNotification after the notification is saved to DB.
    case SOCKET_EVENTS.BROADCAST: {
      const body = {
        id:     data.id,
        title:  data.title,
        body:   data.body,
        sentAt: data.sentAt,
        sentBy: data.sentBy,
      };
      emitToAllUsers(SOCKET_EVENTS.BROADCAST, body);   // → all users
      mainAdminSocket?.emit(SOCKET_EVENTS.BROADCAST, body); // → admin itself
      break;
    }

    default:
      break;
  }
};
