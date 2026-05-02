import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import {
  apiAddAdmin,
  apiGetAllAdmins,
  apiGetAdminsWithPagination,
  apiEditAdmin,
  apiUpdateAdminStatus,
  apiDeleteAdmin,
  apiUpdateUserStatus,
  apiDeleteUser,
  apiEditUser,
  apiGetAdminPermissions,
  apiEditAdminProfile,
  apiChangeAdminPassword,
} from "../services/admin.service";
import {
  apiGetAllModules,
  apiCreateModule,
  apiUpdateModule,
  apiDeleteModule,
} from "../services/module.service";
import {
  apiGetAllRoles,
  apiGetRole,
  apiCreateRole,
  apiUpdateRole,
  apiDeleteRole,
} from "../services/role.service";
import { validateAddAdminForm } from "../validations/admin.validation";
import { showApiError } from "../../../utils/api";
import useAdminData from "../hooks/useAdminData";
import InputField from "../../../components/InputField";
import AdminTicketsSection from "../../ticket/components/AdminTicketsSection";
import AdminTicketDetailSection from "../../ticket/components/AdminTicketDetailSection";
// ticket API is called inside AdminTicketsSection — no direct import needed here
import "bootstrap-icons/font/bootstrap-icons.css";

const INITIAL_ADMIN_FORM = { userName: "", email: "", phone: "", roleId: "", password: "", conformPassword: "" };
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const PERM_KEYS = ["canView", "canAdd", "canEdit", "canDelete"];
const PERM_LABELS = { canView: "View", canAdd: "Add", canEdit: "Edit", canDelete: "Delete" };
const PAGE_SIZE_OPTIONS = [5, 10, 50, "all"];
const normalizeModuleName = (value = "") =>
  String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");

// ─── Status Badge ─────────────────────────────────────────────────────────────

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

const StatusBadgeDropdown = ({ userId, currentStatus, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const statusMap = {
    active:   { cls: "bg-success",          label: "Active"   },
    pending:  { cls: "bg-warning text-dark", label: "Pending"  },
    inactive: { cls: "bg-secondary",         label: "Inactive" },
    deleted:  { cls: "bg-danger",            label: "Deleted"  },
  };
  const { cls, label } = statusMap[currentStatus] ?? { cls: "bg-light text-dark", label: currentStatus };
  const STATUS_OPTIONS = ["active", "inactive", "pending"];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = async (newStatus) => {
    if (newStatus === currentStatus) {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      await apiUpdateUserStatus(userId, newStatus);
      toast.success(`Status changed to "${newStatus}"`);
      onChanged(userId, newStatus);
      setOpen(false);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="position-relative d-inline-block" ref={dropdownRef}>
      <span
        className={`badge ${cls} py-2 px-3`}
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setOpen(prev => !prev)}
      >
        {loading ? (
          <span className="spinner-border spinner-border-sm me-1" role="status" />
        ) : (
          <i className={`bi ${open ? "bi-caret-up-fill" : "bi-caret-down-fill"} me-1`} />
        )}
        {label}
      </span>

      {open && (
        <div
          className="position-absolute mt-1 bg-white border rounded shadow-sm"
          style={{ zIndex: 1000, minWidth: "130px" }}
        >
          {STATUS_OPTIONS.map(option => {
            const optMap = statusMap[option] || { label: option };
            return (
              <div
                key={option}
                className={`px-3 py-2 ${option === currentStatus ? "bg-light fw-semibold" : ""}`}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                onClick={() => handleSelect(option)}
              >
                <span className="me-2">•</span>
                {optMap.label}
                {option === currentStatus && (
                  <i className="bi bi-check-lg ms-2 text-success" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

// ─── Pagination ───────────────────────────────────────────────────────────────

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

// ─── Confirm Modal ────────────────────────────────────────────────────────────

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

// ─── Edit User Modal ──────────────────────────────────────────────────────────

const EditUserModal = ({ user: editTarget, onClose, onSaved }) => {
  const [form, setForm] = useState({
    firstName: editTarget.firstName || "",
    lastName:  editTarget.lastName  || "",
    email:     editTarget.email     || "",
    phone:     editTarget.phone     || "",
    gender:    editTarget.gender ?? "",
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
      const payload = {
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, phone: form.phone, gender: form.gender,
        ...(form.password ? { password: form.password } : {}),
      };
      const res = await apiEditUser(editTarget.id, payload);
      toast.success("User updated successfully");
      onSaved(res.user);
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
                <InputField label="First Name" id="eu_firstName" name="firstName" type="text"
                  autoComplete="given-name"
                  value={form.firstName} onChange={handleChange} error={errors.firstName} />
              </div>
              <div className="col-6">
                <InputField label="Last Name" id="eu_lastName" name="lastName" type="text"
                  autoComplete="family-name"
                  value={form.lastName} onChange={handleChange} error={errors.lastName} />
              </div>
            </div>

            <InputField label="Email" id="eu_email" name="email" type="email"
              autoComplete="email"
              value={form.email} onChange={handleChange} error={errors.email} />
            <InputField label="Phone" id="eu_phone" name="phone" type="tel"
              placeholder="10-digit number" autoComplete="tel"
              value={form.phone} onChange={handleChange} error={errors.phone} />

            <div className="mb-3">
              <label htmlFor="eu_gender" className="form-label fw-semibold">Gender</label>
              <select id="eu_gender" name="gender" autoComplete="sex"
                className={`form-select ${errors.gender ? "is-invalid" : ""}`}
                value={form.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
            </div>

            <div className="mb-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="form-label fw-semibold mb-0">New Password</label>
                <button type="button" className="btn btn-link btn-sm p-0 text-muted"
                  onClick={() => setShowPw((p) => !p)}>
                  <i className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"} me-1`} />
                  {showPw ? "Hide" : "Set password"}
                </button>
              </div>
              {showPw ? (
                <>
                  <input id="eu_password" type="password" name="password"
                    autoComplete="new-password"
                    className={`form-control ${errors.password ? "is-invalid" : ""}`}
                    placeholder="Leave blank to keep current password"
                    value={form.password} onChange={handleChange} />
                  {errors.password
                    ? <div className="invalid-feedback">{errors.password}</div>
                    : <div className="form-text text-muted">Leave blank to keep existing password.</div>
                  }
                </>
              ) : (
                <div className="text-muted small">
                  <i className="bi bi-lock me-1" />Password unchanged unless you expand this.
                </div>
              )}
            </div>

            <div className="d-flex gap-2 pt-2">
              <button type="button" className="btn btn-outline-secondary flex-fill" onClick={onClose}>Cancel</button>
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

// ─── Edit Admin Modal ─────────────────────────────────────────────────────────

const EditAdminModal = ({ admin: editTarget, availableRoles, onClose, onSaved }) => {
  const [form, setForm] = useState({
    userName: editTarget.userName || "",
    email:    editTarget.email    || "",
    phone:    editTarget.phone    || "",
    roleId:   editTarget.roleId   || "",
    password: "",
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
    if (!form.userName.trim() || form.userName.length < 3) errs.userName = "Username must be at least 3 characters";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Valid email is required";
    if (!/^[0-9]{10}$/.test(form.phone)) errs.phone = "Phone must be exactly 10 digits";
    if (!form.roleId) errs.roleId = "Role is required";
    if (form.password && !PASSWORD_REGEX.test(form.password))
      errs.password = "Must be 8+ chars with 1 uppercase, 1 number, 1 special char (@$!%*?&)";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const payload = {
        userName: form.userName, email: form.email, phone: form.phone,
        roleId: Number(form.roleId),
        ...(form.password ? { password: form.password } : {}),
      };
      const res = await apiEditAdmin(editTarget.id, payload);
      toast.success("Admin updated successfully");
      onSaved(res.admin);
      onClose();
    } catch (err) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("email"))         setErrors((p) => ({ ...p, email: msg }));
      else if (msg.toLowerCase().includes("username")) setErrors((p) => ({ ...p, userName: msg }));
      else showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.45)", zIndex: 9999, overflowY: "auto" }}>
      <div className="card border-0 shadow-lg rounded-3 my-3" style={{ width: "100%", maxWidth: 480 }}>
        <div className="card-header d-flex align-items-center justify-content-between py-3 px-4">
          <h6 className="fw-bold mb-0">
            <i className="bi bi-shield-lock me-2 text-warning" />
            Edit Admin — <span className="text-muted fw-normal">@{editTarget.userName}</span>
          </h6>
          <button className="btn-close" onClick={onClose} />
        </div>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit} noValidate>
            <InputField label="Username" id="ea_userName" name="userName" type="text"
              autoComplete="username"
              value={form.userName} onChange={handleChange} error={errors.userName} />
            <InputField label="Email" id="ea_email" name="email" type="email"
              autoComplete="email"
              value={form.email} onChange={handleChange} error={errors.email} />
            <InputField label="Phone" id="ea_phone" name="phone" type="tel"
              placeholder="10-digit number" autoComplete="tel"
              value={form.phone} onChange={handleChange} error={errors.phone} />
            <div className="mb-3">
              <label htmlFor="ea_roleId" className="form-label fw-semibold">Access Role</label>
              <select
                id="ea_roleId"
                name="roleId"
                className={`form-select ${errors.roleId ? "is-invalid" : ""}`}
                value={form.roleId}
                onChange={handleChange}
              >
                <option value="">Select role</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {errors.roleId && <div className="invalid-feedback">{errors.roleId}</div>}
            </div>

            <div className="mb-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="form-label fw-semibold mb-0">New Password</label>
                <button type="button" className="btn btn-link btn-sm p-0 text-muted"
                  onClick={() => setShowPw((p) => !p)}>
                  <i className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"} me-1`} />
                  {showPw ? "Hide" : "Set password"}
                </button>
              </div>
              {showPw ? (
                <>
                  <input id="ea_password" type="password" name="password"
                    autoComplete="new-password"
                    className={`form-control ${errors.password ? "is-invalid" : ""}`}
                    placeholder="Leave blank to keep current password"
                    value={form.password} onChange={handleChange} />
                  {errors.password
                    ? <div className="invalid-feedback">{errors.password}</div>
                    : <div className="form-text text-muted">Leave blank to keep existing password.</div>
                  }
                </>
              ) : (
                <div className="text-muted small">
                  <i className="bi bi-lock me-1" />Password unchanged unless you expand this.
                </div>
              )}
            </div>

            <div className="d-flex gap-2 pt-2">
              <button type="button" className="btn btn-outline-secondary flex-fill" onClick={onClose}>Cancel</button>
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

// ─── User Status Dropdown ─────────────────────────────────────────────────────

const StatusDropdown = ({ userId, currentStatus, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const STATUS_OPTIONS = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
  ];

  useEffect(() => {
    if (!open) return;
    const onOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [open]);

  const handleSelect = async (newStatus) => {
    if (newStatus === currentStatus) return;
    setLoading(true);
    try {
      await apiUpdateUserStatus(userId, newStatus);
      toast.success(`Status → "${newStatus}"`);
      onChanged(userId, newStatus);
      setOpen(false);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="position-relative" style={{ minWidth: 130 }} ref={dropdownRef}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary w-100 d-flex justify-content-between align-items-center"
        onClick={() => setOpen((p) => !p)}
        disabled={loading}
      >
        <span className="small text-capitalize">{currentStatus}</span>
        <i className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`} />
      </button>

      {open && (
        <div className="position-absolute mt-1 p-2 border rounded bg-white shadow-sm" style={{ zIndex: 10, minWidth: 180 }}>
          <div className="small fw-semibold text-muted px-1 mb-2">Status</div>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`btn btn-sm w-100 text-start d-flex align-items-center justify-content-between mb-1 ${option.value === currentStatus ? "btn-light fw-semibold" : "btn-white"}`}
              onClick={() => handleSelect(option.value)}
              disabled={loading}
            >
              <span className="d-flex align-items-center gap-2">
                <i className={`bi ${option.value === currentStatus ? "bi-dot text-primary" : "bi-circle"} small`} />
                <span className="small">{option.label}</span>
              </span>
              {option.value === currentStatus && <span className="text-danger small">*</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Admin Status Dropdown ────────────────────────────────────────────────────

const AdminStatusDropdown = ({ adminId, currentStatus, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const handleChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;
    setLoading(true);
    try {
      await apiUpdateAdminStatus(adminId, newStatus);
      toast.success(`Admin status → "${newStatus}"`);
      onChanged(adminId, newStatus);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };
  return (
    <select id={`admin_status_${adminId}`} name="adminStatus" autoComplete="off"
      className="form-select form-select-sm" style={{ minWidth: 110 }}
      value={currentStatus} onChange={handleChange} disabled={loading}>
      {["active", "inactive"].map((s) => (
        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
      ))}
    </select>
  );
};

// ─── Modules Tab ──────────────────────────────────────────────────────────────

const ModuleFormModal = ({ mode, initial, onClose, onSaved }) => {
  const [name,   setName]   = useState(initial?.name   ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [busy,   setBusy]   = useState(false);

  useEffect(() => {
    setName(initial?.name ?? "");
    setStatus(initial?.status ?? "active");
  }, [mode, initial?.id]);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Module name is required");
    if (mode === "edit" && initial?.id == null) return toast.error("Missing module id — refresh the page and try again.");
    setBusy(true);
    try {
      if (mode === "add") {
        const res = await apiCreateModule({ name: name.trim(), status });
        toast.success("Module created");
        onSaved(res.module);
      } else {
        const res = await apiUpdateModule(initial.id, { name: name.trim(), status });
        toast.success("Module updated");
        onSaved(res.module);
      }
      onClose();
    } catch (err) { showApiError(err, toast.error); }
    finally { setBusy(false); }
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.45)", zIndex: 9999 }}>
      <div className="card border-0 shadow-lg rounded-3" style={{ width: 440 }}>
        <div className="card-header bg-warning fw-bold d-flex justify-content-between align-items-center">
          <span>{mode === "add" ? "Add Module" : "Edit Module"}</span>
          <button className="btn-close" onClick={onClose} />
        </div>
        <div className="card-body p-4">
          <div className="mb-3">
            <label htmlFor="mod_name" className="form-label fw-semibold">Module Name <span className="text-danger">*</span></label>
            <input id="mod_name" name="moduleName" autoComplete="off" className="form-control"
              placeholder="e.g. Ticket Management"
              value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-4">
            <label htmlFor="mod_status" className="form-label fw-semibold">Status</label>
            <select id="mod_status" name="moduleStatus" autoComplete="off"
              className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn btn-warning fw-semibold" onClick={handleSubmit} disabled={busy}>
              {busy ? <span className="spinner-border spinner-border-sm" /> : mode === "add" ? "Add Module" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModulesTab = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [pageSize,setPageSize]= useState(10);

  useEffect(() => {
    apiGetAllModules()
      .then((r) => setModules(r.modules))
      .catch((err) => showApiError(err, toast.error))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (saved) =>
    setModules((prev) => {
      const idx = prev.findIndex((m) => m.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const u = [...prev]; u[idx] = saved; return u;
    });

  const handleDelete = (mod) => {
    if (!window.confirm(`Delete "${mod.name}"?\nThis removes all role permissions linked to it.`)) return;
    apiDeleteModule(mod.id)
      .then(() => { toast.success("Module deleted"); setModules((p) => p.filter((m) => m.id !== mod.id)); })
      .catch((err) => showApiError(err, toast.error));
  };

  const filtered = modules.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = pageSize === "all"
    ? filtered
    : filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-0">Modules</h5>
          <small className="text-muted">Manage system modules and their availability</small>
        </div>
        <button className="btn btn-warning fw-semibold" onClick={() => setModal({ type: "add" })}>
          <i className="bi bi-plus-lg me-1" /> Add Module
        </button>
      </div>

      <div className="mb-3" style={{ maxWidth: 300 }}>
        <input id="mod_search" name="moduleSearch" autoComplete="off"
          className="form-control" placeholder="Search modules..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="mb-3 d-flex align-items-center gap-2" style={{ maxWidth: 220 }}>
        <label htmlFor="modules_page_size" className="form-label fw-semibold mb-0 small text-muted">Rows</label>
        <select
          id="modules_page_size"
          className="form-select form-select-sm"
          value={String(pageSize)}
          onChange={(e) => {
            const next = e.target.value === "all" ? "all" : Number(e.target.value);
            setPageSize(next);
            setPage(1);
          }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size === "all" ? "All" : size}
            </option>
          ))}
        </select>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Name</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th style={{ width: 110 }} className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-5"><span className="spinner-border text-warning" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-5 text-muted">
                  {search ? "No modules match." : "No modules yet. Add one."}
                </td></tr>
              ) : visibleRows.map((m, i) => (
                <tr key={m.id}>
                  <td className="text-muted small">{pageSize === "all" ? i + 1 : (safePage - 1) * pageSize + i + 1}</td>
                  <td className="fw-semibold">{m.name}</td>
                  <td><StatusBadge status={m.status} /></td>
                  <td className="text-muted small">{fmtDate(m.createdAt)}</td>
                  <td className="text-muted small">{fmtDate(m.updatedAt)}</td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-outline-warning me-1"
                      onClick={() => setModal({ type: "edit", target: m })}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(m)}>
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer text-muted small bg-white">{filtered.length} module{filtered.length !== 1 ? "s" : ""}</div>
      </div>
      {totalPages > 1 && (
        <Pagination pagination={{ page: safePage, totalPages }} onPageChange={setPage} />
      )}

      {modal?.type === "add" && (
        <ModuleFormModal key="module-add" mode="add" initial={null} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.type === "edit" && (
        <ModuleFormModal
          key={modal.target?.id}
          mode="edit"
          initial={modal.target}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

// ─── Roles Tab ────────────────────────────────────────────────────────────────

const PermissionGrid = ({ modules, permissions, onChange }) => {
  const toggle = (moduleId, key) => {
    const current = permissions[moduleId] ?? { canView: false, canAdd: false, canEdit: false, canDelete: false };
    onChange(moduleId, { ...current, [key]: !current[key] });
  };
  const toggleAll = (moduleId) => {
    const current = permissions[moduleId] ?? {};
    const allOn = PERM_KEYS.every((k) => current[k]);
    onChange(moduleId, PERM_KEYS.reduce((acc, k) => ({ ...acc, [k]: !allOn }), {}));
  };

  if (modules.length === 0)
    return <p className="text-muted small text-center py-3">No active modules. Add modules first.</p>;

  return (
    <div className="table-responsive" style={{ maxHeight: 300, overflowY: "auto" }}>
      <table className="table table-sm table-bordered align-middle mb-0">
        <thead className="table-light" style={{ position: "sticky", top: 0 }}>
          <tr>
            <th style={{ width: "40%" }}>Module</th>
            <th className="text-center">All</th>
            {PERM_KEYS.map((k) => <th key={k} className="text-center">{PERM_LABELS[k]}</th>)}
          </tr>
        </thead>
        <tbody>
          {modules.map((mod) => {
            const p = permissions[mod.id] ?? {};
            const allOn = PERM_KEYS.every((k) => p[k]);
            return (
              <tr key={mod.id}>
                <td className="fw-semibold small">{mod.name}</td>
                <td className="text-center">
                  <input type="checkbox" className="form-check-input" checked={allOn} onChange={() => toggleAll(mod.id)} />
                </td>
                {PERM_KEYS.map((k) => (
                  <td key={k} className="text-center">
                    <input type="checkbox" className="form-check-input" checked={!!p[k]} onChange={() => toggle(mod.id, k)} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const RoleFormModal = ({ mode, roleId, allModules, onClose, onSaved }) => {
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [status,      setStatus]      = useState("active");
  const [permissions, setPermissions] = useState({});
  const [loadingRole, setLoadingRole] = useState(mode === "edit");
  const [busy,        setBusy]        = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !roleId) return;
    apiGetRole(roleId)
      .then((res) => {
        const r = res.role;
        setName(r.name);
        setDescription(r.description ?? "");
        setStatus(r.status);
        const map = {};
        r.permissions.forEach((p) => {
          map[p.moduleId] = { canView: !!p.canView, canAdd: !!p.canAdd, canEdit: !!p.canEdit, canDelete: !!p.canDelete };
        });
        setPermissions(map);
      })
      .catch((err) => { showApiError(err, toast.error); onClose(); })
      .finally(() => setLoadingRole(false));
  }, [mode, roleId, onClose]);

  const buildPermArray = () =>
    Object.entries(permissions)
      .map(([moduleId, p]) => ({ moduleId: Number(moduleId), ...p }))
      .filter((p) => p.canView || p.canAdd || p.canEdit || p.canDelete);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Role name is required");
    setBusy(true);
    try {
      const payload = { name: name.trim(), description: description.trim() || null, status, permissions: buildPermArray() };
      const res = mode === "add" ? await apiCreateRole(payload) : await apiUpdateRole(roleId, payload);
      toast.success(mode === "add" ? "Role created" : "Role updated");
      onSaved(res.role);
      onClose();
    } catch (err) { showApiError(err, toast.error); }
    finally { setBusy(false); }
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.5)", zIndex: 9999 }}>
      <div className="card border-0 shadow-lg rounded-3"
        style={{ width: 600, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="card-header bg-warning fw-bold d-flex justify-content-between align-items-center">
          <span>{mode === "add" ? "Add Role" : "Edit Role"}</span>
          <button className="btn-close" onClick={onClose} />
        </div>

        {loadingRole ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <span className="spinner-border text-warning" />
          </div>
        ) : (
          <>
            <div className="card-body overflow-auto p-4">
              <div className="row g-3 mb-3">
                <div className="col-8">
                  <label htmlFor="role_name" className="form-label fw-semibold">Role Name <span className="text-danger">*</span></label>
                  <input id="role_name" name="roleName" autoComplete="off"
                    className="form-control" placeholder="e.g. Support Agent"
                    value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="col-4">
                  <label htmlFor="role_status" className="form-label fw-semibold">Status</label>
                  <select id="role_status" name="roleStatus" autoComplete="off"
                    className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="role_desc" className="form-label fw-semibold">
                  Description <span className="text-muted fw-normal small">(optional)</span>
                </label>
                <input id="role_desc" name="roleDescription" autoComplete="off"
                  className="form-control" placeholder="Short note about this role"
                  value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <label className="form-label fw-semibold mb-2">
                Module Permissions
                <span className="text-muted fw-normal small ms-2">— tick what this role can do</span>
              </label>
              <PermissionGrid
                modules={allModules}
                permissions={permissions}
                onChange={(moduleId, updated) => setPermissions((p) => ({ ...p, [moduleId]: updated }))}
              />
            </div>
            <div className="card-footer bg-white d-flex gap-2 justify-content-end p-3">
              <button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn btn-warning fw-semibold" onClick={handleSubmit} disabled={busy}>
                {busy
                  ? <span className="spinner-border spinner-border-sm" />
                  : mode === "add" ? "Create Role" : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ViewPermModal = ({ role, allModules, onClose }) => {
  const [loading,  setLoading]  = useState(true);
  const [permsMap, setPermsMap] = useState({});

  useEffect(() => {
    apiGetRole(role.id)
      .then((res) => {
        const map = {};
        res.role.permissions.forEach((p) => { map[p.moduleId] = p; });
        setPermsMap(map);
      })
      .catch((err) => showApiError(err, toast.error))
      .finally(() => setLoading(false));
  }, [role.id]);

  const icon = (has) =>
    has
      ? <i className="bi bi-check-circle-fill text-success" />
      : <i className="bi bi-dash text-muted" />;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.45)", zIndex: 9999 }}>
      <div className="card border-0 shadow-lg rounded-3"
        style={{ width: 540, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="card-header bg-dark text-white fw-bold d-flex justify-content-between align-items-center">
          <span><i className="bi bi-shield-check me-2" />Permissions — {role.name}</span>
          <button className="btn-close btn-close-white" onClick={onClose} />
        </div>
        <div className="card-body overflow-auto p-0">
          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <span className="spinner-border text-warning" />
            </div>
          ) : (
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Module</th>
                  {PERM_KEYS.map((k) => <th key={k} className="text-center">{PERM_LABELS[k]}</th>)}
                </tr>
              </thead>
              <tbody>
                {allModules.map((mod) => {
                  const p = permsMap[mod.id] ?? {};
                  return (
                    <tr key={mod.id}>
                      <td className="fw-semibold small">{mod.name}</td>
                      {PERM_KEYS.map((k) => <td key={k} className="text-center">{icon(p[k])}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="card-footer bg-white text-end p-3">
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const RolesTab = () => {
  const [roles,      setRoles]      = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(10);

  useEffect(() => {
    Promise.all([apiGetAllRoles(), apiGetAllModules()])
      .then(([rolesRes, modRes]) => {
        setRoles(rolesRes.roles);
        setAllModules(modRes.modules.filter((m) => m.status === "active"));
      })
      .catch((err) => showApiError(err, toast.error))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (saved) =>
    setRoles((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const u = [...prev]; u[idx] = saved; return u;
    });

  const handleDelete = (role) => {
    if (!window.confirm(`Delete "${role.name}"?\nAll permissions linked to this role will be removed.`)) return;
    apiDeleteRole(role.id)
      .then(() => { toast.success("Role deleted"); setRoles((p) => p.filter((r) => r.id !== role.id)); })
      .catch((err) => showApiError(err, toast.error));
  };

  const filtered = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = pageSize === "all"
    ? filtered
    : filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-0">Roles</h5>
          <small className="text-muted">Create roles and assign module-level permissions</small>
        </div>
        <button className="btn btn-warning fw-semibold" onClick={() => setModal({ type: "add" })}>
          <i className="bi bi-plus-lg me-1" /> Add Role
        </button>
      </div>

      <div className="mb-3" style={{ maxWidth: 300 }}>
        <input id="role_search" name="roleSearch" autoComplete="off"
          className="form-control" placeholder="Search roles..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="mb-3 d-flex align-items-center gap-2" style={{ maxWidth: 220 }}>
        <label htmlFor="roles_page_size" className="form-label fw-semibold mb-0 small text-muted">Rows</label>
        <select
          id="roles_page_size"
          className="form-select form-select-sm"
          value={String(pageSize)}
          onChange={(e) => {
            const next = e.target.value === "all" ? "all" : Number(e.target.value);
            setPageSize(next);
            setPage(1);
          }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size === "all" ? "All" : size}
            </option>
          ))}
        </select>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th style={{ width: 140 }} className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-5"><span className="spinner-border text-warning" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-5 text-muted">
                  {search ? "No roles match." : "No roles yet. Add one."}
                </td></tr>
              ) : visibleRows.map((r, i) => (
                <tr key={r.id}>
                  <td className="text-muted small">{pageSize === "all" ? i + 1 : (safePage - 1) * pageSize + i + 1}</td>
                  <td className="fw-semibold">{r.name}</td>
                  <td className="text-muted small">{r.description || <span className="fst-italic">—</span>}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-muted small">{fmtDate(r.createdAt)}</td>
                  <td className="text-muted small">{fmtDate(r.updatedAt)}</td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-outline-dark me-1" title="View Permissions"
                      onClick={() => setModal({ type: "view", target: r })}>
                      <i className="bi bi-eye" />
                    </button>
                    <button className="btn btn-sm btn-outline-warning me-1" title="Edit"
                      onClick={() => setModal({ type: "edit", target: r })}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" title="Delete"
                      onClick={() => handleDelete(r)}>
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer text-muted small bg-white">{filtered.length} role{filtered.length !== 1 ? "s" : ""}</div>
      </div>
      {totalPages > 1 && (
        <Pagination pagination={{ page: safePage, totalPages }} onPageChange={setPage} />
      )}

      {modal?.type === "add" && (
        <RoleFormModal mode="add" roleId={null} allModules={allModules}
          onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.type === "edit" && (
        <RoleFormModal mode="edit" roleId={modal.target.id} allModules={allModules}
          onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.type === "view" && (
        <ViewPermModal role={modal.target} allModules={allModules} onClose={() => setModal(null)} />
      )}
    </>
  );
};

// ─── Admin Own Profile Tab ────────────────────────────────────────────────────

const AdminProfileTab = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    userName: user?.userName ?? "",
    email:    user?.email    ?? "",
    phone:    user?.phone    ?? "",
  });
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.userName.trim() || form.userName.length < 3) errs.userName = "Username must be at least 3 characters";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Valid email is required";
    if (!/^[0-9]{10}$/.test(form.phone)) errs.phone = "Phone must be exactly 10 digits";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const fd = new FormData();
    fd.append("userName", form.userName);
    fd.append("email",    form.email);
    fd.append("phone",    form.phone);

    setLoading(true);
    try {
      const res = await apiEditAdminProfile(fd);
      updateUser({
        userName: res.admin.userName,
        email:    res.admin.email,
        phone:    res.admin.phone,
      });
      setForm({
        userName: res.admin.userName,
        email:    res.admin.email,
        phone:    res.admin.phone,
      });
      toast.success("Profile updated!");
    } catch (err) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("email"))         setErrors((p) => ({ ...p, email: msg }));
      else if (msg.toLowerCase().includes("username")) setErrors((p) => ({ ...p, userName: msg }));
      else showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h5 className="fw-bold mb-4">Edit Profile</h5>
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit} noValidate>
                <InputField label="Username" id="ap_userName" name="userName" type="text"
                  autoComplete="username"
                  value={form.userName} onChange={handleChange} error={errors.userName} />
                <InputField label="Email" id="ap_email" name="email" type="email"
                  autoComplete="email"
                  value={form.email} onChange={handleChange} error={errors.email} />
                <InputField label="Phone" id="ap_phone" name="phone" type="tel"
                  placeholder="10-digit number" autoComplete="tel"
                  value={form.phone} onChange={handleChange} error={errors.phone} />

                <button type="submit" disabled={loading} className="btn btn-warning w-100 py-2 fw-semibold mt-2">
                  {loading ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Admin Change Password Tab ─────────────────────────────────────────────────

const AdminChangePasswordTab = () => {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = "Current password is required";
    if (!PASSWORD_REGEX.test(form.newPassword))
      errs.newPassword = "Must be 8+ chars with 1 uppercase, 1 number, 1 special char";
    if (form.newPassword !== form.confirmNewPassword)
      errs.confirmNewPassword = "Passwords do not match";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await apiChangeAdminPassword({
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
      });
      toast.success("Password changed! Please login again.");
      logout();
      navigate("/admin/login");
    } catch (err) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("current") || msg.toLowerCase().includes("incorrect"))
        setErrors((p) => ({ ...p, currentPassword: msg }));
      else showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h5 className="fw-bold mb-4">Change Password</h5>
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit} noValidate>
                <InputField label="Current Password" id="cp_current" name="currentPassword"
                  type="password" autoComplete="current-password"
                  placeholder="Your current password"
                  value={form.currentPassword} onChange={handleChange} error={errors.currentPassword} />
                <InputField label="New Password" id="cp_new" name="newPassword"
                  type="password" autoComplete="new-password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                  value={form.newPassword} onChange={handleChange} error={errors.newPassword} />
                <InputField label="Confirm New Password" id="cp_confirm" name="confirmNewPassword"
                  type="password" autoComplete="new-password"
                  placeholder="Repeat new password"
                  value={form.confirmNewPassword} onChange={handleChange} error={errors.confirmNewPassword} />
                <button type="submit" disabled={loading} className="btn btn-danger w-100 py-2 fw-semibold mt-2">
                  {loading ? <><span className="spinner-border spinner-border-sm me-2" />Changing...</> : "Change Password"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Main AdminDashboard ──────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const {
    users, setUsers,
    pagination, fetchUsers,
    admins, setAdmins,
    dashboardCounts,
    fetchDashboard,
  } = useAdminData();
  const permissionMap = useMemo(() => user?.permissions ?? {}, [user]);
  const [livePermissions, setLivePermissions] = useState(permissionMap);
  const isMasterAdmin = user?.userName === "admin";
  useEffect(() => {
    setLivePermissions(permissionMap);
  }, [permissionMap]);

  useEffect(() => {
    if (!user || isMasterAdmin) return;

    const syncPermissions = async () => {
      try {
        const res = await apiGetAdminPermissions();
        setLivePermissions(res.permissions || {});
      } catch (err) {
        showApiError(err, (m) => toast.error(m));
      }
    };

    syncPermissions();
  }, [user, isMasterAdmin]);

  const canAccess = useCallback((moduleKey, action = "canView") => {
    if (isMasterAdmin) return true;
    if (normalizeModuleName(moduleKey) === "dashboard") return true;

    const normalizedTarget = normalizeModuleName(moduleKey);
    const hasMatch = Object.entries(livePermissions).some(([key, perms]) => {
      const normalizedKey = normalizeModuleName(key);
      const singularOrPluralMatch =
        normalizedKey === normalizedTarget ||
        `${normalizedKey}s` === normalizedTarget ||
        normalizedKey === `${normalizedTarget}s`;
      return singularOrPluralMatch && !!perms?.[action];
    });

    return hasMatch;
  }, [isMasterAdmin, livePermissions]);

  const getActiveTab = () => {
    if (pathname === "/admin/dashboard")       return "dashboard";
    if (pathname === "/admin/users")           return "users";
    if (pathname === "/admin/admins")          return "admins";
    if (pathname === "/admin/add-admin")       return "addAdmin";
    if (pathname === "/admin/modules")         return "modules";
    if (pathname === "/admin/roles")           return "roles";
    if (pathname === "/admin/profile")         return "profile";
    if (pathname === "/admin/change-password") return "changePassword";
    if (pathname.startsWith("/admin/tickets/") && pathname !== "/admin/tickets") return "ticketDetail";
    if (pathname === "/admin/tickets")          return "tickets";
    return "dashboard";
  };
  const activeTab = getActiveTab();

  const [loadingData,     setLoadingData]     = useState(false);
  const [sidebarOpen,     setSidebarOpen]     = useState(true);
  const [unreadCount,     setUnreadCount]     = useState(0);
  const [seenTicketIds,   setSeenTicketIds]   = useState(new Set());

  // unreadCount is now returned by apiAdminListTickets — updated via onUnreadChange from AdminTicketsSection
  const [adminForm,       setAdminForm]       = useState(INITIAL_ADMIN_FORM);
  const [adminFormErrors, setAdminFormErrors] = useState({});
  const [adminFormLoading,setAdminFormLoading]= useState(false);
  const [availableRoles,  setAvailableRoles]  = useState([]);
  const [filterStatus,    setFilterStatus]    = useState("all");
  const [searchQuery,     setSearchQuery]     = useState("");
  const [adminSearch,     setAdminSearch]     = useState("");
  const [adminPagination, setAdminPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [confirmModal,    setConfirmModal]    = useState({ show: false });
  const [editTarget,      setEditTarget]      = useState(null);
  const [editAdminTarget, setEditAdminTarget] = useState(null);
  const searchDebounce      = useRef(null);
  const adminSearchDebounce = useRef(null);

  const closeConfirm = () => setConfirmModal((p) => ({ ...p, show: false }));

  // ─── Fetch data on tab change ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboard();
    } else if (activeTab === "users") {
      setLoadingData(true);
      fetchUsers(1, pagination.limit, filterStatus === "all" ? "" : filterStatus, searchQuery)
        .finally(() => setLoadingData(false));
    } else if (activeTab === "admins") {
      setLoadingData(true);
      fetchAdminsPaginated(1, adminPagination.limit, "").finally(() => setLoadingData(false));
    }
  }, [activeTab]); // eslint-disable-line

  useEffect(() => {
    if (user?.userName !== "admin") return;
    if (activeTab !== "addAdmin" && activeTab !== "admins") return;
    if (availableRoles.length > 0) return; // already loaded
    apiGetAllRoles()
      .then((res) => {
        const roleOptions = (res.roles || []).filter((role) => role.status === "active" && !role.isDeleted);
        setAvailableRoles(roleOptions);
      })
      .catch((err) => showApiError(err, toast.error));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Fetch only when the relevant tabs are opened

  // ─── Users helpers ──────────────────────────────────────────────────────────
  const applyFilter = useCallback((status, search, page = 1) => {
    setLoadingData(true);
    fetchUsers(page, pagination.limit, status === "all" ? "" : status, search)
      .finally(() => setLoadingData(false));
  }, [pagination.limit]); // eslint-disable-line

  const handleFilterChange = (status) => { setFilterStatus(status); applyFilter(status, searchQuery); };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => applyFilter(filterStatus, val), 350);
  };

  const handlePageChange = useCallback((page) => {
    setLoadingData(true);
    fetchUsers(page, pagination.limit, filterStatus === "all" ? "" : filterStatus, searchQuery)
      .finally(() => setLoadingData(false));
  }, [pagination.limit, filterStatus, searchQuery]); // eslint-disable-line

  const handleUserLimitChange = useCallback((nextLimit) => {
    setLoadingData(true);
    fetchUsers(1, nextLimit, filterStatus === "all" ? "" : filterStatus, searchQuery)
      .finally(() => setLoadingData(false));
  }, [filterStatus, searchQuery]); // eslint-disable-line

  const handleStatusChanged = useCallback((userId, newStatus) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
    fetchDashboard();
  }, [setUsers, fetchDashboard]);

  const handleEditSaved = useCallback((updatedUser) => {
    setUsers((prev) => prev.map((u) => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
  }, [setUsers]);

  const handleDeleteUser = useCallback((userId, userName) => {
    setConfirmModal({
      show: true, title: "Delete User", danger: true,
      message: `Delete "${userName}"? This soft-deletes the account and logs them out.`,
      onConfirm: async () => {
        closeConfirm();
        try {
          await apiDeleteUser(userId);
          toast.success("User deleted");
          setUsers((prev) => prev.filter((u) => u.id !== userId));
          fetchDashboard();
        } catch (err) { showApiError(err, (m) => toast.error(m)); }
      },
    });
  }, [setUsers, fetchDashboard]);

  // ─── Add Admin form ─────────────────────────────────────────────────────────
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
      await apiAddAdmin({ ...adminForm, roleId: Number(adminForm.roleId) });
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

  // ─── Admins CRUD helpers ────────────────────────────────────────────────────
  const fetchAdminsPaginated = useCallback(async (page = 1, limit = 10, search = "") => {
    try {
      const res = await apiGetAdminsWithPagination({ page, limit, search });
      setAdmins(res.admins);
      setAdminPagination(res.pagination);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    }
  }, [setAdmins]);

  const handleAdminSearchChange = (e) => {
    const val = e.target.value;
    setAdminSearch(val);
    clearTimeout(adminSearchDebounce.current);
    adminSearchDebounce.current = setTimeout(() => {
      setLoadingData(true);
      fetchAdminsPaginated(1, adminPagination.limit, val).finally(() => setLoadingData(false));
    }, 350);
  };

  const handleAdminPageChange = useCallback((page) => {
    setLoadingData(true);
    fetchAdminsPaginated(page, adminPagination.limit, adminSearch).finally(() => setLoadingData(false));
  }, [adminPagination.limit, adminSearch]); // eslint-disable-line

  const handleAdminLimitChange = useCallback((nextLimit) => {
    setLoadingData(true);
    fetchAdminsPaginated(1, nextLimit, adminSearch).finally(() => setLoadingData(false));
  }, [adminSearch]); // eslint-disable-line

  const handleEditAdminSaved = useCallback((updatedAdmin) => {
    setAdmins((prev) => prev.map((a) => a.id === updatedAdmin.id ? { ...a, ...updatedAdmin } : a));
  }, [setAdmins]);

  const handleDeleteAdmin = useCallback((adminId, adminName) => {
    setConfirmModal({
      show: true, title: "Delete Admin", danger: true,
      message: `Delete admin "${adminName}"? This soft-deletes the account and logs them out.`,
      onConfirm: async () => {
        closeConfirm();
        try {
          await apiDeleteAdmin(adminId);
          toast.success("Admin deleted");
          setAdmins((prev) => prev.filter((a) => a.id !== adminId));
          fetchDashboard();
        } catch (err) { showApiError(err, (m) => toast.error(m)); }
      },
    });
  }, []); // eslint-disable-line

  // ─── Unread ticket helpers ───────────────────────────────────────────────────
  const handleAdminUnreadChange = (count) => setUnreadCount(count);

  const handleAdminTicketViewed = (ticketId) => {
    setSeenTicketIds((prev) => {
      if (prev.has(ticketId)) return prev;
      const next = new Set(prev);
      next.add(ticketId);
      return next;
    });
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  // ─── Sidebar ────────────────────────────────────────────────────────────────
  const NAV_ITEMS = [
    { label: "Dashboard",  path: "/admin/dashboard", tab: "dashboard", icon: "bi-speedometer2", moduleKey: "dashboard", action: "canView", roles: ["ADMIN", "MASTER_ADMIN"] },
    { label: "All Users",  path: "/admin/users",     tab: "users",     icon: "bi-people", moduleKey: "users", action: "canView", roles: ["ADMIN", "MASTER_ADMIN"] },
    { label: "Tickets",    path: "/admin/tickets",   tab: "tickets",   icon: "bi-ticket-perforated", moduleKey: "tickets", action: "canView", roles: ["ADMIN", "MASTER_ADMIN"] },
    { label: "All Admins", path: "/admin/admins",    tab: "admins",    icon: "bi-shield-lock", moduleKey: "admins", action: "canView", roles: ["MASTER_ADMIN"] },
    { label: "Add Admin",  path: "/admin/add-admin", tab: "addAdmin",  icon: "bi-person-plus", moduleKey: "admins", action: "canAdd", roles: ["MASTER_ADMIN"] },
    { label: "Modules",    path: "/admin/modules",   tab: "modules",   icon: "bi-grid", moduleKey: "modules", action: "canView", roles: ["MASTER_ADMIN"] },
    { label: "Roles",      path: "/admin/roles",     tab: "roles",     icon: "bi-person-badge", moduleKey: "roles", action: "canView", roles: ["MASTER_ADMIN"] },
  ];

  const Sidebar = () => (
    <div className="d-flex flex-column bg-dark text-white"
      style={{ width: sidebarOpen ? 240 : 64, minHeight: "calc(100vh - 56px)", transition: "width 0.25s ease", flexShrink: 0 }}>
      <button className="btn btn-sm btn-outline-secondary m-2 align-self-end"
        onClick={() => setSidebarOpen((p) => !p)}>
        <i className={`bi ${sidebarOpen ? "bi-chevron-left" : "bi-chevron-right"}`} />
      </button>
      <nav className="flex-grow-1 py-2">
        {NAV_ITEMS
          .filter(({ roles, moduleKey, action }) => roles.includes(user?.role) && canAccess(moduleKey, action))
          .map(({ label, path, tab, icon }) => {
            const navActive =
              tab === "tickets"
                ? activeTab === "tickets" || activeTab === "ticketDetail"
                : activeTab === tab;
            const showBadge = tab === "tickets" && unreadCount > 0;
            return (
            <button key={tab} onClick={() => navigate(path)}
              className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
                ${navActive ? "bg-warning text-black fw-semibold" : "bg-transparent text-white-50"}`}
              title={!sidebarOpen ? label : ""}>
              <i className={`bi ${icon} fs-5 flex-shrink-0`} />
              {sidebarOpen && <span className="small flex-grow-1">{label}</span>}
              {showBadge && (
                <span className="badge rounded-pill bg-danger" style={{ fontSize: 11 }}>
                  {unreadCount}
                </span>
              )}
            </button>
            );
          })}
      </nav>
    </div>
  );

  // ─── Content ────────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {

      // ── Dashboard ──────────────────────────────────────────────────────────
      case "dashboard":
        if (!canAccess("dashboard", "canView")) { navigate("/unauthorized"); return null; }
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
                  ...(user?.userName === "admin"
                    ? [{ label: "Total Admins", value: dashboardCounts.totalAdmins, color: "#fd7e14", path: "/admin/admins" }]
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

      // ── Users ──────────────────────────────────────────────────────────────
      case "users":
        if (!canAccess("users", "canView")) { navigate("/unauthorized"); return null; }
        return (
          <>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0">All Users</h5>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary">{pagination.total} total</span>
                {canAccess("users", "canAdd") && (
                  <button
                    className="btn btn-warning btn-sm fw-semibold"
                    onClick={() => navigate("/register")}
                  >
                    <i className="bi bi-person-plus me-1" />
                    Add User
                  </button>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-3 mb-3">
              <div className="card-body py-2 px-3 d-flex flex-wrap gap-2 align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <label htmlFor="user_filter_status" className="form-label fw-semibold mb-0 small text-muted">Status</label>
                  <select id="user_filter_status" name="filterStatus" autoComplete="off"
                    className="form-select form-select-sm" style={{ minWidth: 140 }}
                    value={filterStatus} onChange={(e) => handleFilterChange(e.target.value)}>
                    <option value="all">All Users</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="deleted">Deleted</option>
                  </select>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <label htmlFor="users_page_size" className="form-label fw-semibold mb-0 small text-muted">Rows</label>
                  <select
                    id="users_page_size"
                    className="form-select form-select-sm"
                    style={{ minWidth: 100 }}
                    value={String(pagination.limit)}
                    onChange={(e) => handleUserLimitChange(e.target.value === "all" ? "all" : Number(e.target.value))}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size === "all" ? "All" : size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ms-auto d-flex align-items-center gap-2" style={{ minWidth: 220 }}>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white"><i className="bi bi-search text-muted" /></span>
                    <input id="user_search" name="userSearch" type="text" autoComplete="off"
                      className="form-control border-start-0"
                      placeholder="Search name, email, phone..."
                      value={searchQuery} onChange={handleSearchChange} />
                    {searchQuery && (
                      <button className="btn btn-outline-secondary btn-sm"
                        onClick={() => { setSearchQuery(""); applyFilter(filterStatus, ""); }}>
                        <i className="bi bi-x" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
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
                            {[
                              "#", "Name", "Phone", "Email", "Status",
                              ...(canAccess("users", "canEdit") || canAccess("users", "canDelete") ? ["Actions"] : []),
                            ].map((c) => (
                              <th key={c} className="text-uppercase small">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr><td colSpan={canAccess("users", "canEdit") || canAccess("users", "canDelete") ? 6 : 5} className="text-center text-muted py-5">
                              <i className="bi bi-inbox fs-3 d-block mb-2" />No users found
                            </td></tr>
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
                                {canAccess("users", "canEdit") && u.status !== "deleted" ? (
                                  <StatusBadgeDropdown
                                    userId={u.id}
                                    currentStatus={u.status}
                                    onChanged={handleStatusChanged}
                                  />
                                ) : (
                                  <StatusBadge status={u.status} />
                                )}
                              </td>
                              {(canAccess("users", "canEdit") || canAccess("users", "canDelete")) && (
                                <td>
                                  <div className="d-flex gap-1 justify-content-center">
                                    {canAccess("users", "canEdit") && (
                                      <button className="btn btn-sm btn-outline-primary" title="Edit user"
                                        onClick={() => setEditTarget(u)}>
                                        <i className="bi bi-pencil" />
                                      </button>
                                    )}
                                    {u.status !== "deleted" && (
                                      <>
                                        {canAccess("users", "canDelete") && (
                                          <button className="btn btn-sm btn-outline-danger" title="Delete user"
                                            onClick={() => handleDeleteUser(u.id, u.userName)}>
                                            <i className="bi bi-trash" />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              )}
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

      // ── All Admins (Full CRUD) ─────────────────────────────────────────────
      case "admins":
        if (user?.userName !== "admin") { navigate("/admin/dashboard"); return null; }
        return (
          <>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0">All Admins</h5>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary">{adminPagination.total} total</span>
                <button className="btn btn-warning btn-sm fw-semibold"
                  onClick={() => navigate("/admin/add-admin")}>
                  <i className="bi bi-person-plus me-1" />Add Admin
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="card border-0 shadow-sm rounded-3 mb-3">
              <div className="card-body py-2 px-3">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <label htmlFor="admins_page_size" className="form-label fw-semibold mb-0 small text-muted">Rows</label>
                    <select
                      id="admins_page_size"
                      className="form-select form-select-sm"
                      style={{ minWidth: 100 }}
                      value={String(adminPagination.limit)}
                      onChange={(e) => handleAdminLimitChange(e.target.value === "all" ? "all" : Number(e.target.value))}
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size === "all" ? "All" : size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group input-group-sm ms-auto" style={{ maxWidth: 320 }}>
                    <span className="input-group-text bg-white"><i className="bi bi-search text-muted" /></span>
                    <input id="admin_search" name="adminSearch" type="text" autoComplete="off"
                      className="form-control border-start-0"
                      placeholder="Search username, email, phone..."
                      value={adminSearch} onChange={handleAdminSearchChange} />
                    {adminSearch && (
                      <button className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                          setAdminSearch("");
                          setLoadingData(true);
                          fetchAdminsPaginated(1, adminPagination.limit, "").finally(() => setLoadingData(false));
                        }}>
                        <i className="bi bi-x" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body p-0">
                {loadingData ? (
                  <div className="text-center py-5"><div className="spinner-border text-warning" /></div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            {["#", "Username", "Access Role", "Email", "Phone", "Created", "Actions"].map((c) => (
                              <th key={c} className="text-uppercase small">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {admins.length === 0 ? (
                            <tr><td colSpan={7} className="text-center text-muted py-5">
                              <i className="bi bi-inbox fs-3 d-block mb-2" />
                              {adminSearch ? "No admins match your search" : "No admins found"}
                            </td></tr>
                          ) : admins.map((a, i) => (
                            <tr key={a.id}>
                              <td className="text-muted small">{(adminPagination.page - 1) * adminPagination.limit + i + 1}</td>
                              <td>
                                <div className="fw-semibold small">{a.userName}</div>
                                <div className="text-muted" style={{ fontSize: 11 }}>{a.role}</div>
                              </td>
                              <td className="small">{a.roleName || "—"}</td>
                              <td className="small">{a.email}</td>
                              <td className="small">{a.phone}</td>
                              <td className="text-muted small">{fmtDate(a.createdAt)}</td>
                              <td>
                                <div className="d-flex gap-1 justify-content-center">
                                  <button className="btn btn-sm btn-outline-primary" title="Edit admin"
                                    onClick={() => setEditAdminTarget(a)}>
                                    <i className="bi bi-pencil" />
                                  </button>
                                  {a.status !== "deleted" && (
                                    <>
                                      <button className="btn btn-sm btn-outline-danger" title="Delete admin"
                                        onClick={() => handleDeleteAdmin(a.id, a.userName)}>
                                        <i className="bi bi-trash" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination pagination={adminPagination} onPageChange={handleAdminPageChange} />
                  </>
                )}
              </div>
            </div>
          </>
        );

      // ── Add Admin ──────────────────────────────────────────────────────────
      case "addAdmin":
        if (user?.userName !== "admin") { navigate("/admin/dashboard"); return null; }
        return (
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <div className="card border-0 shadow-sm rounded-3">
                <h5 className="card-header p-4">Add New Admin</h5>
                <div className="card-body p-4">
                  <form onSubmit={handleAddAdmin} noValidate>
                    <InputField label="Username" id="aa_userName" name="userName" type="text"
                      autoComplete="username" placeholder="adminuser"
                      value={adminForm.userName} onChange={handleAdminFormChange} error={adminFormErrors.userName} />
                    <InputField label="Email" id="aa_email" name="email" type="email"
                      autoComplete="email" placeholder="admin@example.com"
                      value={adminForm.email} onChange={handleAdminFormChange} error={adminFormErrors.email} />
                    <InputField label="Phone" id="aa_phone" name="phone" type="tel"
                      autoComplete="tel" placeholder="10-digit number"
                      value={adminForm.phone} onChange={handleAdminFormChange} error={adminFormErrors.phone} />
                    <div className="mb-3">
                      <label htmlFor="aa_roleId" className="form-label fw-semibold">Access Role</label>
                      <select
                        id="aa_roleId"
                        name="roleId"
                        className={`form-select ${adminFormErrors.roleId ? "is-invalid" : ""}`}
                        value={adminForm.roleId}
                        onChange={handleAdminFormChange}
                      >
                        <option value="">Select role</option>
                        {availableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      {adminFormErrors.roleId && <div className="invalid-feedback">{adminFormErrors.roleId}</div>}
                    </div>
                    <InputField label="Password" id="aa_password" name="password" type="password"
                      autoComplete="new-password" placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                      value={adminForm.password} onChange={handleAdminFormChange} error={adminFormErrors.password} />
                    <InputField label="Confirm Password" id="aa_conformPassword" name="conformPassword"
                      type="password" autoComplete="new-password" placeholder="Repeat password"
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

      case "modules":
        if (user?.userName !== "admin") { navigate("/admin/dashboard"); return null; }
        return <ModulesTab />;

      case "tickets":
        if (!canAccess("tickets", "canView")) { navigate("/unauthorized"); return null; }
        return <AdminTicketsSection onUnreadChange={handleAdminUnreadChange} />;

      case "ticketDetail":
        if (!canAccess("tickets", "canView")) { navigate("/unauthorized"); return null; }
        return <AdminTicketDetailSection onTicketViewed={handleAdminTicketViewed} canEdit={canAccess("tickets", "canEdit")} />;

      case "roles":
        if (user?.userName !== "admin") { navigate("/admin/dashboard"); return null; }
        return <RolesTab />;

      case "profile":
        return <AdminProfileTab />;

      case "changePassword":
        return <AdminChangePasswordTab />;

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
      {editAdminTarget && (
        <EditAdminModal
          admin={editAdminTarget}
          availableRoles={availableRoles}
          onClose={() => setEditAdminTarget(null)}
          onSaved={handleEditAdminSaved}
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