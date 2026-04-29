import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  // Wait for AuthContext's initial /me load to finish
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-warning" />
      </div>
    );
  }

  // No user → redirect to the right login page
  if (!user) {
    const isAdmin = allowedRoles.some((r) => r === "ADMIN" || r === "MASTER_ADMIN");
    return <Navigate to={isAdmin ? "/admin/login" : "/login"} replace />;
  }

  // Authenticated but wrong role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
