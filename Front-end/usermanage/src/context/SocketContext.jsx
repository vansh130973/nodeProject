import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { BASE_URL } from "../utils/api";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, logout } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // ── Disconnect when no user / no token ────────────────────────────────────
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // ── Avoid duplicate connections on re-renders ─────────────────────────────
    if (socketRef.current?.connected) return;

    // ── Connect ───────────────────────────────────────────────────────────────
    const s = io(BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = s;
    setSocket(s);

    // ── Connection lifecycle handlers ─────────────────────────────────────────
    s.on("connect", () => {
      // Socket successfully connected / reconnected — nothing extra needed.
    });

    s.on("disconnect", (reason) => {
      // If the server disconnected us (e.g. token revoked), don't auto-reconnect.
      if (reason === "io server disconnect") {
        s.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    });

    s.on("connect_error", (err) => {
      // Auth failures (token revoked / expired) surface here.
      if (err?.message === "Token revoked" || err?.message === "Unauthorized") {
        s.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    });

    // ── Global forced-logout handler ──────────────────────────────────────────
    // Fires when: admin deactivates/deletes user, master admin edits/deletes admin
    s.on("auth:forceLogout", () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      logout();
    });

    // ── Cleanup on identity change / unmount ──────────────────────────────────
    return () => {
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.off("auth:forceLogout");
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
    // Re-run only when the logged-in identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
