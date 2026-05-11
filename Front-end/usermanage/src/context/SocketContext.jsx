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

    // Only connect when a user is logged in
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Avoid duplicate connections on re-renders
    if (socketRef.current?.connected) return;

    const s = io(BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = s;
    setSocket(s);

    // ── Global forced-logout handler ──────────────────────────────────────────
    // Fires when: admin deactivates/deletes user, master admin edits/deletes admin
    s.on("auth:forceLogout", () => {
      s.disconnect();
      logout();
    });

    return () => {
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
