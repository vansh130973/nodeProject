// components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, token } = useAuth();

  if (!token || !user) {
    // Not logged in – redirect to login
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Logged in but insufficient role
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;