import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wraps a route and redirects if the required session is missing.
// Usage:
//   <ProtectedRoute role="user"  redirectTo="/login">
//   <ProtectedRoute role="admin" redirectTo="/admin/login">

const ProtectedRoute = ({ children, role = "user", redirectTo = "/login" }) => {
  const { user, admin } = useAuth();
  const isAllowed = role === "admin" ? !!admin : !!user;
  return isAllowed ? children : <Navigate to={redirectTo} replace />;
};

export default ProtectedRoute;