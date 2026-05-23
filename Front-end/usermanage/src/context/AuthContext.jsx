import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { BASE_URL } from "../utils/api";
import { connectSocket, disconnectSocket, onSocket, offSocket, SOCKET_EVENTS } from "../utils/socket";

const TOKEN_KEY = "token";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // App-load session restore via /me
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.data);
        else localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token) => {
    localStorage.setItem(TOKEN_KEY, token);
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setUser(decoded);
    } catch { /* let /me restore on next load */ }
    // Establish socket connection after login
    connectSocket();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    disconnectSocket();
  }, []);

  // Socket event listeners (session ended + broadcast)
  useEffect(() => {
    if (!user) return;

    connectSocket();

    // ── Forced logout by admin ───────────────────────────────────────────────
    const onSessionEnded = () => {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setUnreadCount(0);
      disconnectSocket();
    };

    // ── Broadcast notification from master admin ─────────────────────────────
    // AuthContext only handles the toast. Badge + list updates are handled
    // inside UserDashboard which owns the notification state.
    const onBroadcast = (notification) => {
      toast.info(
        <div>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            New Notification arrived: {notification.title}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {notification.body}
          </div>
        </div>,
        { autoClose: 6000 }
      );
    };

    onSocket(SOCKET_EVENTS.SESSION_ENDED, onSessionEnded);
    onSocket(SOCKET_EVENTS.BROADCAST,     onBroadcast);

    return () => {
      offSocket(SOCKET_EVENTS.SESSION_ENDED, onSessionEnded);
      offSocket(SOCKET_EVENTS.BROADCAST,     onBroadcast);
    };
  }, [user]);

  const updateUser = useCallback((fields) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};