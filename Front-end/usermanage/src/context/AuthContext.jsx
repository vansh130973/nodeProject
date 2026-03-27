import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem("token");
    return savedToken ? decodeToken(savedToken) : null;
  });

  const login = useCallback((token) => {
    localStorage.setItem("token", token);
    localStorage.removeItem("user");
    setToken(token);
    setUser(decodeToken(token));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
