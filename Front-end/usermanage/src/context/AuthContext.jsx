import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { setSessionExpiredHandler } from "../utils/api";

const TOKEN_KEY = "token";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);
  const onSessionExpiredRef   = useRef(null);

  // On page load — restore session from localStorage token via /me
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    fetch("http://localhost:3200/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.data);
        else localStorage.removeItem(TOKEN_KEY); // token invalid — clean up
      })
      .catch(() => {
        // Network error or non-JSON response (e.g. 404 on /me) —
        // the token is invalid/unreachable, so clear it to avoid
        // the ProtectedRoute spinner getting stuck forever.
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  // Call after successful login — stores token + decoded user data
  const login = useCallback((token) => {
    localStorage.setItem(TOKEN_KEY, token);
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setUser(decoded);
    } catch {
      // Fallback: let /me restore the user on next load
    }
  }, []);

  // Call on intentional logout — removes token
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // Called by the API layer when any response signals the session is dead
  const handleSessionExpired = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    if (onSessionExpiredRef.current) {
      onSessionExpiredRef.current();
    }
  }, []);

  const setOnSessionExpired = useCallback((fn) => {
    onSessionExpiredRef.current = fn;
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
  }, [handleSessionExpired]);

  // Merge partial updates into user (e.g. after profile edit)
  const updateUser = useCallback((fields) => {
    setUser((prev) => prev ? { ...prev, ...fields } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, handleSessionExpired, setOnSessionExpired, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
