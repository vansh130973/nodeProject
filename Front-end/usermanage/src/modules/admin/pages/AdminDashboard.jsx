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
  apiEditUser,
} from "../services/admin.service";
import { validateAddAdminForm } from "../validations/admin.validation";
import { showApiError } from "../../../utils/api";
import useAdminData from "../hooks/useAdminData";
import InputField from "../../../components/InputField";
import "bootstrap-icons/font/bootstrap-icons.css";

const INITIAL_ADMIN_FORM = { userName: "", email: "", phone: "", password: "", conformPassword: "" };
const EDIT_EMPTY = { firstName: "", lastName: "", email: "", phone: "", gender: "", password: "" };
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    active:   { cls: "bg-success",          label: "Active"   },
    pending:  { cls: "bg-warning text-dark", label: "Pending"  },
    inactive: { cls: "bg-secondary",         label: "Inactive" },
    deleted:  { cls: "bg-danger",            label: "Deleted"  },
  };
  const { cls, label } = map[status] ?? { cls: "bg-light text-dark", label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
};

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ pagination, onPageChange }) => {
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;
  return (
    <nav className="d-flex justify-content-end align-items-center gap-2 px-3 py-2 border-top bg-white">
      <button className="btn btn-sm btn-outline-secondary"
        disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        <i className="bi bi-chevron-left" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
      style={{ background: "rgba(0,0,0,0.45)", zIndex: 9998 }}>
      <div className="card border-0 shadow-lg rounded-3" style={{ maxWidth: 420, width: "90%" }}>
        <div className="card-body p-4">
          <h6 className="fw-bold mb-2">{title}</h6>
          <p className="text-muted small mb-4">{message}</p>
          <div className="d-flex gap-2 justify-content-end">
            <button className="btn btn-sm btn-outline-secondary" onClick={onCancel}>Cancel</button>
            <button className={`btn btn-sm ${danger ? "btn-danger" : "btn-warning"}`} onClick={onConfirm}>Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Edit User Modal ───────────────────────────────────────────────────────────
const EditUserModal = ({ user: editTarget, onClose, onSaved }) => {
  const [form, setForm] = useState({
    firstName: editTarget.firstName || "",
    lastName:  editTarget.lastName  || "",
    email:     editTarget.email     || "",
    phone:     editTarget.phone     || "",
    gender:    editTarget.gender    || "",
    password:  "",
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim())  errs.lastName  = "Last name is required";
    if (!form.email.trim())     errs.email     = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    if (!/^[0-9]{10}$/.test(form.phone)) errs.phone = "Phone must be 10 digits";
    if (!form.gender)           errs.gender    = "Gender is required";
    if (form.password && !PASSWORD_REGEX.test(form.password))
      errs.password = "Must be 8+ chars with 1 uppercase, 1 number, 1 special char";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      // Single PUT — backend handles password only if non-empty
      const payload = {
        firstName: form.firstName,
        lastName:  form.lastName,
        email:     form.email,
        phone:     form.phone,
        gender:    form.gender,
        ...(form.password ? { password: form.password } : {}),
      };
      const res = await apiEditUser(editTarget.id, payload);
      toast.success("User updated successfully");
      onSaved(res.user); // update row in parent without refetch
      onClose();
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.45)", zIndex: 9999, overflowY: "auto" }}>
      <div className="card border-0 shadow-lg rounded-3 my-3" style={{ width: "100%", maxWidth: 520 }}>
        <div className="card-header d-flex align-items-center justify-content-between py-3 px-4">
          <h6 className="fw-bold mb-0">
            <i className="bi bi-pencil-square me-2 text-warning" />
            Edit User — <span className="text-muted fw-normal">@{editTarget.userName}</span>
          </h6>
          <button className="btn-close" onClick={onClose} />
        </div>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3 mb-2">
              <div className="col-6">
                <InputField label="First Name" id="firstName" name="firstName" type="text"
                  value={form.firstName} onChange={handleChange} error={errors.firstName} />
              </div>
              <div className="col-6">
                <InputField label="Last Name" id="lastName" name="lastName" type="text"
                  value={form.lastName} onChange={handleChange} error={errors.lastName} />
              </div>
            </div>

            <InputField label="Email" id="email" name="email" type="email"
              value={form.email} onChange={handleChange} error={errors.email} />
            <InputField label="Phone" id="phone" name="phone" type="tel"
              placeholder="10-digit number"
              value={form.phone} onChange={handleChange} error={errors.phone} />

            <div className="mb-3">
              <label className="form-label fw-semibold">Gender</label>
              <select name="gender"
                className={`form-select ${errors.gender ? "is-invalid" : ""}`}
                value={form.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
            </div>

            {/* Password — optional, only sent if filled */}
            <div className="mb-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="form-label fw-semibold mb-0">New Password</label>
                <button type="button" className="btn btn-link btn-sm p-0 text-muted"
                  onClick={() => setShowPw((p) => !p)}>
                  <i className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"} me-1`} />
                  {showPw ? "Hide" : "Set password"}
                </button>
              </div>
              {showPw && (
                <>
                  <input type="password" name="password"
                    className={`form-control ${errors.password ? "is-invalid" : ""}`}
                    placeholder="Leave blank to keep current password"
                    value={form.password} onChange={handleChange} />
                  {errors.password
                    ? <div className="invalid-feedback">{errors.password}</div>
                    : <div className="form-text text-muted">Leave blank to keep the existing password.</div>
                  }
                </>
              )}
              {!showPw && (
                <div className="text-muted small">
                  <i className="bi bi-lock me-1" />Password unchanged unless you expand this.
                </div>
              )}
            </div>

            <div className="d-flex gap-2 pt-2">
              <button type="button" className="btn btn-outline-secondary flex-fill" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-warning flex-fill fw-semibold">
                {loading ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── Status dropdown ───────────────────────────────────────────────────────────
const StatusDropdown = ({ userId, currentStatus, onChanged }) => {
  const [loading, setLoading] = useState(false);

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
      {["active", "inactive", "pending"].map((s) => (
        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
      ))}
    </select>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
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
  const [adminForm, setAdminForm]     = useState(INITIAL_ADMIN_FORM);
  const [adminFormErrors, setAdminFormErrors] = useState({});
  const [adminFormLoading, setAdminFormLoading] = useState(false);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null, danger: false });
  const closeConfirm = () => setConfirmModal((p) => ({ ...p, show: false }));

  // Edit modal — stores the user row being edited (pre-filled from list, no extra GET)
  const [editTarget, setEditTarget] = useState(null);

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

  // Status changed inline — update local state only, no refetch
  const handleStatusChanged = useCallback((userId, newStatus) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
    // Refresh counts (single query, cheap)
    apiGetDashboard().then((r) => setDashboardCounts(r.data)).catch(() => {});
  }, []);

  // Edit saved — update the row in the list directly, no refetch
  const handleEditSaved = useCallback((updatedUser) => {
    setUsers((prev) => prev.map((u) => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
  }, []);

  const handleDeleteUser = useCallback((userId, userName) => {
    setConfirmModal({
      show: true, title: "Delete User", danger: true,
      message: `Delete "${userName}"? This soft-deletes the account and logs them out.`,
      onConfirm: async () => {
        closeConfirm();
        try {
          await apiDeleteUser(userId);
          toast.success("User deleted");
          // Remove from list + refresh counts — two minimal calls
          setUsers((prev) => prev.filter((u) => u.id !== userId));
          apiGetDashboard().then((r) => setDashboardCounts(r.data)).catch(() => {});
        } catch (err) {
          showApiError(err, (m) => toast.error(m));
        }
      },
    });
  }, []);

  const handleLogoutUser = useCallback((userId, userName) => {
    setConfirmModal({
      show: true, title: "Logout User", danger: false,
      message: `Force logout "${userName}"? All their active sessions will end.`,
      onConfirm: async () => {
        closeConfirm();
        try {
          await apiLogoutUserByAdmin(userId);
          toast.success(`${userName} logged out`);
        } catch (err) {
          showApiError(err, (m) => toast.error(m));
        }
      },
    });
  }, []);

  const handleAdminFormChange = (e) => {
    const { name, value } = e.target;
    setAdminForm((p) => ({ ...p, [name]: value }));
    setAdminFormErrors((p) => ({ ...p, [name]: "" }));
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    const errors = validateAddAdminForm(adminForm);
    if (Object.keys(errors).length) { setAdminFormErrors(errors); return; }
    setAdminFormLoading(true);
    const toastId = toast.loading("Adding admin...");
    try {
      await apiAddAdmin(adminForm);
      toast.update(toastId, { render: "Admin added!", type: "success", isLoading: false, autoClose: 3000 });
      setAdminForm(INITIAL_ADMIN_FORM);
      setAdminFormErrors({});
      const data = await apiGetAllAdmins();
      setAdmins(data.admins);
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.message || "";
      if (msg.toLowerCase().includes("email"))         setAdminFormErrors((p) => ({ ...p, email: msg }));
      else if (msg.toLowerCase().includes("username")) setAdminFormErrors((p) => ({ ...p, userName: msg }));
      else showApiError(err, (m) => toast.error(m));
    } finally {
      setAdminFormLoading(false);
    }
  };

  // ── Sidebar ───────────────────────────────────────────────────────────────
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

      // Dashboard
      case "dashboard":
        return (
          <>
            <h5 className="fw-bold mb-4">Dashboard</h5>
            {!dashboardCounts ? (
              <div className="text-center py-5"><div className="spinner-border text-warning" /></div>
            ) : (
              <div className="row g-3">
                {[
                  { label: "Total Users",    value: dashboardCounts.totalUsers,    color: "#0d6efd", path: "/admin/users" },
                  { label: "Active Users",   value: dashboardCounts.activeUsers,   color: "#198754", path: "/admin/users" },
                  { label: "Pending Users",  value: dashboardCounts.pendingUsers,  color: "#ffc107", path: "/admin/users" },
                  { label: "Inactive Users", value: dashboardCounts.inactiveUsers, color: "#6c757d", path: null },
                  { label: "Deleted Users",  value: dashboardCounts.deletedUsers,  color: "#dc3545", path: null },
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

      // Users
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
                            <th className="text-uppercase small">#</th>
                            <th className="text-uppercase small">Name</th>
                            <th className="text-uppercase small">Phone</th>
                            <th className="text-uppercase small">Email</th>
                            <th className="text-uppercase small">Status</th>
                            <th className="text-uppercase small text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr><td colSpan={6} className="text-center text-muted py-4">No users found</td></tr>
                          ) : users.map((u, i) => (
                            <tr key={u.id}>
                              <td className="text-muted small">{(pagination.page - 1) * pagination.limit + i + 1}</td>
                              <td>
                                <div className="fw-semibold small">{u.firstName} {u.lastName}</div>
                                <div className="text-muted" style={{ fontSize: 12 }}>({u.userName})</div>
                              </td>
                              <td className="small">{u.phone}</td>
                              <td className="small">{u.email}</td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <StatusBadge status={u.status} />
                                  <StatusDropdown userId={u.id} currentStatus={u.status} onChanged={handleStatusChanged} />
                                </div>
                              </td>
                              <td>
                                <div className="d-flex gap-1 justify-content-center">
                                  {/* Edit — pre-fills from list row, zero extra API call */}
                                  <button className="btn btn-sm btn-outline-primary" title="Edit user"
                                    onClick={() => setEditTarget(u)}>
                                    <i className="bi bi-pencil" />
                                  </button>
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

      // Admins
      case "admins":
        if (user?.role !== "MASTER_ADMIN") { navigate("/admin/dashboard"); return null; }
        return (
          <>
            <h5 className="fw-bold mb-4">All Admins</h5>
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-header bg-white fw-semibold">
                Admin Accounts <span className="badge bg-primary ms-2">{admins.length}</span>
              </div>
              <div className="card-body p-0">
                {loadingData ? (
                  <div className="text-center py-5"><div className="spinner-border text-warning" /></div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle mb-0">
                      <thead className="table-dark">
                        <tr>{["ID", "Username", "Email", "Phone"].map((c) => (
                          <th key={c} className="text-uppercase small">{c}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {admins.length === 0
                          ? <tr><td colSpan={4} className="text-center text-muted py-4">No admins found</td></tr>
                          : admins.map((a) => (
                            <tr key={a.id}>
                              <td>{a.id}</td><td>{a.userName}</td><td>{a.email}</td><td>{a.phone}</td>
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

      // Add Admin
      case "addAdmin":
        if (user?.role !== "MASTER_ADMIN") { navigate("/admin/dashboard"); return null; }
        return (
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <div className="card border-0 shadow-sm rounded-3">
                <h5 className="card-header p-4">Add New Admin</h5>
                <div className="card-body p-4">
                  <form onSubmit={handleAddAdmin} noValidate>
                    <InputField label="Username" id="userName" name="userName" type="text"
                      placeholder="adminuser" value={adminForm.userName}
                      onChange={handleAdminFormChange} error={adminFormErrors.userName} />
                    <InputField label="Email" id="email" name="email" type="email"
                      placeholder="admin@example.com" value={adminForm.email}
                      onChange={handleAdminFormChange} error={adminFormErrors.email} />
                    <InputField label="Phone" id="phone" name="phone" type="tel"
                      placeholder="10-digit number" value={adminForm.phone}
                      onChange={handleAdminFormChange} error={adminFormErrors.phone} />
                    <InputField label="Password" id="password" name="password" type="password"
                      placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                      value={adminForm.password} onChange={handleAdminFormChange} error={adminFormErrors.password} />
                    <InputField label="Confirm Password" id="conformPassword" name="conformPassword"
                      type="password" placeholder="Repeat password"
                      value={adminForm.conformPassword} onChange={handleAdminFormChange} error={adminFormErrors.conformPassword} />
                    <button type="submit" disabled={adminFormLoading}
                      className="btn btn-warning w-100 py-2 mt-2 fw-semibold">
                      {adminFormLoading
                        ? <><span className="spinner-border spinner-border-sm me-2" />Adding...</>
                        : "Add Admin"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="d-flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      <ConfirmModal {...confirmModal} onCancel={closeConfirm} />
      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      )}
      <Sidebar />
      <div className="flex-grow-1 p-4 bg-light overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;