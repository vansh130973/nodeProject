import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

const BASE_URL = "http://localhost:3200";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  // true while we are verifying the token with /me on this navigation
  const [checking, setChecking] = useState(true);
  // null = not yet checked, true = valid, false = invalid
  const [sessionValid, setSessionValid] = useState(null);

  useEffect(() => {
    // Wait for AuthContext's initial /me load to finish first
    if (loading) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setSessionValid(false);
      setChecking(false);
      return;
    }

    // Fresh /me check on every page hit / reload / navigation
    setChecking(true);
    fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSessionValid(true);
        } else {
          // Token rejected by server — clear it and show message
          logout();
          toast.error(data.message || "Session expired. Please log in again.");
          setSessionValid(false);
        }
      })
      .catch(() => {
        // Network error — don't kick the user out, let the page load
        // They'll see API errors on individual requests instead
        setSessionValid(true);
      })
      .finally(() => setChecking(false));
  // Re-run on every navigation (location.pathname changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, location.pathname]);

  // Spinner while AuthContext loads OR while /me is being verified
  if (loading || checking) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-warning" />
      </div>
    );
  }

  // Session invalid → redirect to the right login page
  if (!sessionValid || !user) {
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