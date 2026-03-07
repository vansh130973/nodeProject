import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AppNavbar = () => {
  const { user, admin, logoutUser, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isAdminRoute = pathname.startsWith("/admin");

  const handleLogout = () => {
    if (isAdminRoute) {
      logoutAdmin();
      navigate("/admin/login");
    } else {
      logoutUser();
      navigate("/login");
    }
  };

  const activeSession = isAdminRoute ? admin : user;
  const brand = isAdminRoute ? "Admin Panel" : "MyPanel";
  const navbarClass = isAdminRoute
    ? "navbar-dark bg-dark"
    : "navbar-dark bg-dark";

  return (
    <nav className={`navbar navbar-expand-lg ${navbarClass} px-4 shadow-sm`}>
      <Link
        className="navbar-brand fw-bold"
        to={isAdminRoute ? "/admin/dashboard" : "/dashboard"}
      >
        {brand}
      </Link>

      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
      >
        <span className="navbar-toggler-icon" />
      </button>

      <div className="collapse navbar-collapse" id="mainNav">
        <ul className="navbar-nav me-auto">
          {!isAdminRoute && (
            <>
              {!user && (
                <>
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${pathname === "/login" ? "active fw-semibold" : ""}`}
                      to="/login"
                    >
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${pathname === "/register" ? "active fw-semibold" : ""}`}
                      to="/register"
                    >
                      Register
                    </Link>
                  </li>
                </>
              )}
              {user && (
                <li className="nav-item">
                  <Link
                    className={`nav-link ${pathname === "/dashboard" ? "active fw-semibold" : ""}`}
                    to="/dashboard"
                  >
                    Dashboard
                  </Link>
                </li>
              )}
            </>
          )}

          {isAdminRoute && admin && (
            <>
              <li className="nav-item">
                <Link
                  className={`nav-link ${pathname === "/admin/dashboard" ? "active fw-semibold" : ""}`}
                  to="/admin/dashboard"
                >
                  Dashboard
                </Link>
              </li>
            </>
          )}
        </ul>

        <div className="d-flex align-items-center gap-3">
          {activeSession && (
            <>
              <span className="text-light small d-none d-md-inline">
                Login as:- <strong>{activeSession.userName}</strong>
              </span>
              <button
                className="btn btn-sm btn-danger"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}

          {!isAdminRoute && !user && (
            <Link to="/admin/login" className="btn btn-outline-light btn-sm">
              Admin
            </Link>
          )}
          {isAdminRoute && !admin && (
            <Link to="/login" className="btn btn-outline-light btn-sm">
              User Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AppNavbar;
