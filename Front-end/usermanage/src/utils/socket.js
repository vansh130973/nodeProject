import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3200";

let socket = null;

export const connectSocket = () => {
  if (socket && (socket.connected || socket.active)) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const token = localStorage.getItem("token");
  if (!token) return null;

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: false,
    auth: { token },
  });

  socket.on("connect", () => {
    console.log("[socket] connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason);

    if (reason === "io server disconnect") {
      socket = null;
      return;
    }

    setTimeout(() => {
      const t = localStorage.getItem("token");
      if (!t) return;
      socket.auth = { token: t };
      socket?.connect();
    }, 2000);
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] connect error:", err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const getSocket  = () => socket;
export const onSocket   = (event, handler) => socket?.on(event, handler);
export const offSocket  = (event, handler) => socket?.off(event, handler);

export const SOCKET_EVENTS = {
  TICKET_MSG:    "ticket_msg",
  TICKET_STATUS: "ticket_status",
  TICKET_COUNT:  "ticket_count",
  TICKET_NEW:    "ticket_new",
  SESSION_ENDED: "session_ended",
  USER_STATUS:   "user_status",
  BROADCAST:     "broadcast",   // ← new
};
