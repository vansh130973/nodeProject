import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiLogoutUser } from "../modules/user/services/user.service";
import { apiLogoutAdmin } from "../modules/admin/services/admin.service";

const DropdownItem = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: "9px 16px", background: "none", border: "none", cursor: "pointer",
      fontSize: 14, color: danger ? "#dc2626" : "#374151", textAlign: "left",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = danger ? "#fef2f2" : "#f9fafb"}
    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
  >
    <i className={`bi ${icon}`} style={{ fontSize: 15, flexShrink: 0 }} />
    {label}
  </button>
);

const AppNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "MASTER_ADMIN";

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    setDropdownOpen(false);
    try {
      if (isAdmin) await apiLogoutAdmin().catch(() => {});
      else         await apiLogoutUser().catch(() => {});
    } finally {
      logout();
      navigate(isAdmin ? "/admin/login" : "/login", { replace: true });
      setLoading(false);
    }
  };

  const Avatar = ({ size = 36 }) => {
    const src = user?.profilePicture ?? null;
    
    if (src) {
      return (
        <img src={src} alt="profile" style={{
          width: size, height: size, borderRadius: "50%", objectFit: "cover",
          border: "2px solid rgba(255,255,255,0.3)", display: "block",
        }} />
      );
    }
    
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", background: "#e5e7eb",
        color: "#4b5563", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.5, border: "2px solid rgba(255,255,255,0.3)",
        flexShrink: 0, userSelect: "none",
      }}>
        👤
      </div>
    );
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4 shadow-sm" style={{ height: 56 }}>
      <Link className="navbar-brand fw-bold" to={isAdmin ? "/admin/dashboard" : "/dashboard"}>
        {isAdmin ? "Admin Panel" : "MyPanel"}
      </Link>

      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
        <span className="navbar-toggler-icon" />
      </button>

      <div className="collapse navbar-collapse" id="mainNav">
        <ul className="navbar-nav ms-auto align-items-center">
          {!user && (
            <>
              <li className="nav-item"><Link className="nav-link" to="/login">Login</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/register">Register</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/admin/login">Admin Login</Link></li>
            </>
          )}
        </ul>

        {user && (
          <div className="ms-auto" ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((p) => !p)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                padding: "4px 8px", borderRadius: 8,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
            >
              <Avatar size={36} />
              <span className="text-white fw-semibold small d-none d-md-inline">{user.userName}</span>
              <i className={`bi bi-chevron-${dropdownOpen ? "up" : "down"} text-white-50`} style={{ fontSize: 11 }} />
            </button>

            {dropdownOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                background: "#fff", borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)", minWidth: 210,
                zIndex: 9999, border: "1px solid #e5e7eb",
              }}>
                {/* Header */}
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar size={40} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {user.userName}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{user.role?.replace("_", " ")}</div>
                  </div>
                </div>

                <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  PROFILE
                </div>

                {isAdmin ? (
                  <>
                    <DropdownItem icon="bi-key" label="Change Password" onClick={() => { setDropdownOpen(false); navigate("/admin/change-password"); }} />
                    <DropdownItem icon="bi-pencil-square" label="Edit Profile" onClick={() => { setDropdownOpen(false); navigate("/admin/profile"); }} />
                  </>
                ) : (
                  <>
                    <DropdownItem icon="bi-key" label="Change Password" onClick={() => { setDropdownOpen(false); navigate("/change-password"); }} />
                    <DropdownItem icon="bi-pencil-square" label="Edit Profile" onClick={() => { setDropdownOpen(false); navigate("/edit-profile"); }} />
                  </>
                )}

                <div style={{ borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />
                <DropdownItem icon="bi-box-arrow-right" label={loading ? "Logging out…" : "Logout"} onClick={handleLogout} danger />
                <div style={{ height: 4 }} />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default AppNavbar;
