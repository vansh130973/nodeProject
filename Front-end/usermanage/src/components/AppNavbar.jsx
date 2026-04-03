import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiLogoutUser } from "../modules/user/services/user.service";
import { apiLogoutAdmin } from "../modules/admin/services/admin.service";

const AppNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "ADMIN" || user?.role === "MASTER_ADMIN";

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Call the API to delete the server-side token — ignore errors (token may already be gone)
      if (isAdmin) await apiLogoutAdmin().catch(() => {});
      else         await apiLogoutUser().catch(() => {});
    } finally {
      // Always clear local state and redirect regardless of API result
      logout();
      navigate(isAdmin ? "/admin/login" : "/login", { replace: true });
      setLoading(false);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4 shadow-sm">
      <Link className="navbar-brand fw-bold" to={isAdmin ? "/admin/dashboard" : "/dashboard"}>
        {isAdmin ? "Admin Panel" : "MyPanel"}
      </Link>

      <button className="navbar-toggler" type="button"
        data-bs-toggle="collapse" data-bs-target="#mainNav">
        <span className="navbar-toggler-icon" />
      </button>

      <div className="collapse navbar-collapse" id="mainNav">
        <ul className="navbar-nav ms-auto">
          {!user && (
            <>
              <li className="nav-item"><Link className="nav-link" to="/login">Login</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/register">Register</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/admin/login">Admin Login</Link></li>
            </>
          )}
        </ul>

        {user && (
          <div className="d-flex align-items-center gap-3">
            <span className="text-light small">Login as: {user.userName}</span>
            <button className="btn btn-sm btn-danger" onClick={handleLogout} disabled={loading}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-1" />Logging out...</>
                : "Logout"}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default AppNavbar;
