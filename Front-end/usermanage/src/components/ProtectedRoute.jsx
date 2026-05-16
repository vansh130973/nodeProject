import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const isUserAccount = (user) => Boolean(user?.id && user.firstName !== undefined);
const isAdminAccount = (user) => Boolean(user?.id && user.firstName === undefined);
const isMasterAdmin = (user) => user?.userName === "admin" || user?.isMasterAdmin === true;

const ProtectedRoute = ({ children, userOnly = false, adminOnly = false, masterOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-warning" role="status" />
      </div>
    );
  }

  if (!user) {
    const loginPath = adminOnly || masterOnly ? "/admin/login" : "/login";
    return <Navigate to={loginPath} replace />;
  }

  if (userOnly && !isUserAccount(user)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if ((adminOnly || masterOnly) && !isAdminAccount(user)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (masterOnly && !isMasterAdmin(user)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
