import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import {
  apiAddAdmin,
  apiGetAllAdmins,
  apiUpdateUserStatus,
  apiDeleteUser,
  apiLogoutUserByAdmin,
  apiGetDashboard,
} from "../services/admin.service";
import { validateAddAdminForm } from "../validations/admin.validation";
import { showApiError } from "../../../utils/api";
import useAdminData from "../hooks/useAdminData";
import InputField from "../../../components/InputField";
import "bootstrap-icons/font/bootstrap-icons.css";

const INITIAL_FORM = { userName: "", email: "", phone: "", password: "", conformPassword: "" };

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    active:   { cls: "bg-success",           label: "Active"   },
    pending:  { cls: "bg-warning text-dark",  label: "Pending"  },
    inactive: { cls: "bg-secondary",          label: "Inactive" },
    deleted:  { cls: "bg-danger",             label: "Deleted"  },
  };
  const { cls, label } = map[status] ?? { cls: "bg-light text-dark", label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
};

// ── Pagination bar ────────────────────────────────────────────────────────────
const Pagination = ({ pagination, onPageChange }) => {
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav className="d-flex justify-content-end align-items-center gap-2 px-3 py-2 border-top bg-white">
      <button className="btn btn-sm btn-outline-secondary"
        disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        <i className="bi bi-chevron-left" />
      </button>
      {pages.map((p) => (
        <button key={p}
          className={`btn btn-sm ${p === page ? "btn-warning fw-bold" : "btn-outline-secondary"}`}
          onClick={() => onPageChange(p)}>{p}</button>
      ))}
      <button className="btn btn-sm btn-outline-secondary"
        disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
        <i className="bi bi-chevron-right" />
      </button>
    </nav>
  );
};

// ── Confirm modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ show, title, message, onConfirm, onCancel, danger = false }) => {
  if (!show) return null;
  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 9999 }}>
      <div className="card border-0 shadow-lg rounded-3" style={{ maxWidth: 420, width: "100%" }}>
        <div className="card-body p-4">
          <h6 className="fw-bold mb-2">{title}</h6>
          <p className="text-muted small mb-4">{message}</p>
          <div className="d-flex gap-2 justify-content-end">
            <button className="btn btn-sm btn-outline-secondary" onClick={onCancel}>Cancel</button>
            <button className={`btn btn-sm ${danger ? "btn-danger" : "btn-warning"}`} onClick={onConfirm}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Status dropdown for a row ─────────────────────────────────────────────────
const StatusDropdown = ({ userId, currentStatus, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const options = ["active", "inactive", "pending"];

  const handleChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;
    setLoading(true);
    try {
      await apiUpdateUserStatus(userId, newStatus);
      toast.success(`Status changed to "${newStatus}"`);
      onChanged(userId, newStatus);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <select className="form-select form-select-sm" style={{ minWidth: 110 }}
      value={currentStatus} onChange={handleChange} disabled={loading}>
      {options.map((s) => (
        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
      ))}
    </select>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const {
    users, setUsers,
    pagination, fetchUsers,
    admins, setAdmins, fetchAdmins,
    dashboardCounts, setDashboardCounts,
  } = useAdminData();

  const getActiveTab = () => {
    if (pathname === "/admin/dashboard") return "dashboard";
    if (pathname === "/admin/users")     return "users";
    if (pathname === "/admin/admins")    return "admins";
    if (pathname === "/admin/add-admin") return "addAdmin";
    return "dashboard";
  };
  const activeTab = getActiveTab();

  const [loadingData, setLoadingData] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null, danger: false });

  useEffect(() => {
    if (activeTab === "users") {
      setLoadingData(true);
      fetchUsers(1, 10).finally(() => setLoadingData(false));
    } else if (activeTab === "admins") {
      setLoadingData(true);
      fetchAdmins().finally(() => setLoadingData(false));
    }
  }, [activeTab]);

  const handlePageChange = useCallback((page) => {
    setLoadingData(true);
    fetchUsers(page, pagination.limit).finally(() => setLoadingData(false));
  }, [pagination.limit]);

  const handleStatusChanged = useCallback(async (userId, newStatus) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
    try {
      const res = await apiGetDashboard();
      setDashboardCounts(res.data);
    } catch (_) {}
  }, []);

  const handleDeleteUser = useCallback((userId, userName) => {
    setConfirmModal({
      show: true,
      title: "Delete User",
      message: `Are you sure you want to delete "${userName}"? This marks the user as deleted and logs them out.`,
      danger: true,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, show: false }));
        try {
          await apiDeleteUser(userId);
          toast.success("User deleted successfully");
          setUsers((prev) => prev.filter((u) => u.id !== userId));
          const res = await apiGetDashboard();
          setDashboardCounts(res.data);
        } catch (err) {
          showApiError(err, (m) => toast.error(m));
        }
      },
    });
  }, []);

  const handleLogoutUser = useCallback((userId, userName) => {
    setConfirmModal({
      show: true,
      title: "Logout User",
      message: `Force logout "${userName}"? All their active sessions will be terminated.`,
      danger: false,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, show: false }));
        try {
          await apiLogoutUserByAdmin(userId);
          toast.success(`${userName} has been logged out`);
        } catch (err) {
          showApiError(err, (m) => toast.error(m));
        }
      },
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    const errors = validateAddAdminForm(form);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormLoading(true);
    const toastId = toast.loading("Adding admin...");
    try {
      await apiAddAdmin(form);
      toast.update(toastId, { render: "Admin added successfully!", type: "success", isLoading: false, autoClose: 3000 });
      setForm(INITIAL_FORM);
      setFormErrors({});
      const data = await apiGetAllAdmins();
      setAdmins(data.admins);
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.message || "";
      if (msg.toLowerCase().includes("email"))         setFormErrors((p) => ({ ...p, email: msg }));
      else if (msg.toLowerCase().includes("username")) setFormErrors((p) => ({ ...p, userName: msg }));
      else showApiError(err, (m) => toast.error(m));
    } finally {
      setFormLoading(false);
    }
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div className="d-flex flex-column bg-dark text-white"
      style={{ width: sidebarOpen ? 240 : 64, minHeight: "calc(100vh - 56px)", transition: "width 0.25s ease", flexShrink: 0 }}>
      <button className="btn btn-sm btn-outline-secondary m-2 align-self-end"
        onClick={() => setSidebarOpen((p) => !p)}>
        <i className={`bi ${sidebarOpen ? "bi-chevron-left" : "bi-chevron-right"}`} />
      </button>
      <nav className="flex-grow-1 py-2">
        {[
          { label: "Dashboard", path: "/admin/dashboard", tab: "dashboard", icon: "bi-speedometer2", roles: ["ADMIN", "MASTER_ADMIN"] },
          { label: "All Users",  path: "/admin/users",     tab: "users",     icon: "bi-people",       roles: ["ADMIN", "MASTER_ADMIN"] },
          { label: "All Admins", path: "/admin/admins",    tab: "admins",    icon: "bi-shield-lock",  roles: ["MASTER_ADMIN"] },
          { label: "Add Admin",  path: "/admin/add-admin", tab: "addAdmin",  icon: "bi-person-plus",  roles: ["MASTER_ADMIN"] },
        ]
          .filter(({ roles }) => roles.includes(user?.role))
          .map(({ label, path, tab, icon }) => (
            <button key={tab} onClick={() => navigate(path)}
              className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
                ${activeTab === tab ? "bg-warning text-black fw-semibold" : "bg-transparent text-white-50"}`}
              title={!sidebarOpen ? label : ""}>
              <i className={`bi ${icon} fs-5 flex-shrink-0`} />
              {sidebarOpen && <span className="small">{label}</span>}
            </button>
          ))}
      </nav>
    </div>
  );

  // ── Content ───────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {

      case "dashboard":
        return (
          <>
            <h5 className="fw-bold mb-4">Dashboard</h5>
            {!dashboardCounts ? (
              <div className="text-center py-5"><div className="spinner-border text-warning" /></div>
            ) : (
              <div className="row g-3 mb-4">
                {[
                  { label: "Total Users",    value: dashboardCounts.totalUsers,    color: "#0d6efd", path: "/admin/users" },
                  { label: "Active Users",   value: dashboardCounts.activeUsers,   color: "#198754", path: "/admin/users" },
                  { label: "Pending Users",  value: dashboardCounts.pendingUsers,  color: "#ffc107", path: "/admin/users" },
                  { label: "Inactive Users", value: dashboardCounts.inactiveUsers, color: "#6c757d", path: null          },
                  { label: "Deleted Users",  value: dashboardCounts.deletedUsers,  color: "#dc3545", path: null          },
                  ...(user?.role === "MASTER_ADMIN"
                    ? [{ label: "Total Admins", value: admins.length, color: "#fd7e14", path: "/admin/admins" }]
                    : []),
                ].map(({ label, value, color, path }) => (
                  <div key={label} className="col-sm-6 col-lg-4">
                    <div className="card border-0 shadow-sm rounded-3 h-100"
                      style={{ borderLeft: `4px solid ${color}`, cursor: path ? "pointer" : "default" }}
                      onClick={() => path && navigate(path)}>
                      <div className="card-body">
                        <p className="text-muted small mb-1">{label}</p>
                        <h3 className="fw-bold mb-0">{value ?? "—"}</h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );

      case "users":
        return (
          <>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 className="fw-bold mb-0">All Users</h5>
              <span className="badge bg-primary">{pagination.total} total</span>
            </div>
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body p-0">
                {loadingData ? (
                  <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th className="text-uppercase small fw-semibold">#</th>
                            <th className="text-uppercase small fw-semibold">Name</th>
                            <th className="text-uppercase small fw-semibold">Phone</th>
                            <th className="text-uppercase small fw-semibold">Email</th>
                            <th className="text-uppercase small fw-semibold">Status</th>
                            <th className="text-uppercase small fw-semibold text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center text-muted py-4">No users found</td>
                            </tr>
                          ) : users.map((u, i) => (
                            <tr key={u.id}>
                              <td className="text-muted small">
                                {(pagination.page - 1) * pagination.limit + i + 1}
                              </td>
                              <td>
                                <div className="fw-semibold small">{u.firstName} {u.lastName}</div>
                                <div className="text-muted" style={{ fontSize: 12 }}>({u.userName})</div>
                              </td>
                              <td className="small">{u.phone}</td>
                              <td className="small">{u.email}</td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <StatusBadge status={u.status} />
                                  <StatusDropdown
                                    userId={u.id}
                                    currentStatus={u.status}
                                    onChanged={handleStatusChanged}
                                  />
                                </div>
                              </td>
                              <td>
                                <div className="d-flex gap-1 justify-content-center">
                                  <button className="btn btn-sm btn-outline-danger" title="Delete user"
                                    onClick={() => handleDeleteUser(u.id, u.userName)}>
                                    <i className="bi bi-trash" />
                                  </button>
                                  <button className="btn btn-sm btn-outline-warning" title="Force logout"
                                    onClick={() => handleLogoutUser(u.id, u.userName)}>
                                    <i className="bi bi-box-arrow-right" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination pagination={pagination} onPageChange={handlePageChange} />
                  </>
                )}
              </div>
            </div>
          </>
        );

      case "admins":
        if (user?.role !== "MASTER_ADMIN") { navigate("/admin/dashboard"); return null; }
        return (
          <>
            <h5 className="fw-bold mb-4">All Admins</h5>
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-header bg-white border-bottom fw-semibold">
                Admin Accounts
                <span className="badge bg-primary text-white ms-2">{admins.length}</span>
              </div>
              <div className="card-body p-0">
                {loadingData ? (
                  <div className="text-center py-5"><div className="spinner-border text-warning" /></div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle mb-0">
                      <thead className="table-dark">
                        <tr>
                          {["ID", "Username", "Email", "Phone"].map((col) => (
                            <th key={col} className="text-uppercase small fw-semibold">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {admins.length === 0 ? (
                          <tr><td colSpan={4} className="text-center text-muted py-4">No admins found</td></tr>
                        ) : admins.map((a) => (
                          <tr key={a.id}>
                            <td>{a.id}</td>
                            <td>{a.userName}</td>
                            <td>{a.email}</td>
                            <td>{a.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        );

      case "addAdmin":
        if (user?.role !== "MASTER_ADMIN") { navigate("/admin/dashboard"); return null; }
        return (
          <>
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                <div className="card border-0 shadow-sm rounded-3">
                  <h5 className="card-header p-4">Add New Admin</h5>
                  <div className="card-body p-4">
                    <form onSubmit={handleAddAdmin} noValidate>
                      <InputField label="Username" id="userName" name="userName" type="text"
                        placeholder="adminuser" value={form.userName}
                        onChange={handleChange} error={formErrors.userName} />
                      <InputField label="Email" id="email" name="email" type="email"
                        placeholder="admin@example.com" value={form.email}
                        onChange={handleChange} error={formErrors.email} />
                      <InputField label="Phone" id="phone" name="phone" type="tel"
                        placeholder="10-digit number" value={form.phone}
                        onChange={handleChange} error={formErrors.phone} />
                      <InputField label="Password" id="password" name="password" type="password"
                        placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                        value={form.password} onChange={handleChange} error={formErrors.password} />
                      <InputField label="Confirm Password" id="conformPassword" name="conformPassword"
                        type="password" placeholder="Repeat password"
                        value={form.conformPassword} onChange={handleChange} error={formErrors.conformPassword} />
                      <button type="submit" disabled={formLoading}
                        className="btn btn-warning w-100 py-2 mt-2 fw-semibold">
                        {formLoading
                          ? <><span className="spinner-border spinner-border-sm me-2" />Adding...</>
                          : "Add Admin"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      default: return null;
    }
  };

  return (
    <div className="d-flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      <ConfirmModal
        {...confirmModal}
        onCancel={() => setConfirmModal((p) => ({ ...p, show: false }))}
      />
      <Sidebar />
      <div className="flex-grow-1 p-4 bg-light overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;