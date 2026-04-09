import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { showApiError } from "../../../utils/api";
import {
  apiGetAllRoles,
  apiGetRole,
  apiCreateRole,
  apiUpdateRole,
  apiDeleteRole,
} from "../services/role.service";
import { apiGetAllModules } from "../services/module.service";

// helpers

const StatusBadge = ({ status }) =>
  status === "active"
    ? <span className="badge bg-success">Active</span>
    : <span className="badge bg-secondary">Inactive</span>;

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const PERM_KEYS = ["canView", "canAdd", "canEdit", "canDelete"];
const PERM_LABELS = { canView: "View", canAdd: "Add", canEdit: "Edit", canDelete: "Delete" };

// Permission Grid

const PermissionGrid = ({ modules, permissions, onChange }) => {
  // permissions: { [moduleId]: { canView, canAdd, canEdit, canDelete } }

  const toggle = (moduleId, key) => {
    const current = permissions[moduleId] ?? { canView: false, canAdd: false, canEdit: false, canDelete: false };
    onChange(moduleId, { ...current, [key]: !current[key] });
  };

  const toggleAll = (moduleId) => {
    const current = permissions[moduleId] ?? {};
    const allOn = PERM_KEYS.every((k) => current[k]);
    const next = PERM_KEYS.reduce((acc, k) => ({ ...acc, [k]: !allOn }), {});
    onChange(moduleId, next);
  };

  if (modules.length === 0) {
    return (
      <p className="text-muted small text-center py-3">
        No active modules found. Add modules first.
      </p>
    );
  }

  return (
    <div className="table-responsive" style={{ maxHeight: 340, overflowY: "auto" }}>
      <table className="table table-sm table-bordered align-middle mb-0">
        <thead className="table-light sticky-top">
          <tr>
            <th style={{ width: "40%" }}>Module</th>
            <th className="text-center">All</th>
            {PERM_KEYS.map((k) => (
              <th key={k} className="text-center">{PERM_LABELS[k]}</th>
            ))}
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
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={allOn}
                    onChange={() => toggleAll(mod.id)}
                  />
                </td>
                {PERM_KEYS.map((k) => (
                  <td key={k} className="text-center">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={!!p[k]}
                      onChange={() => toggle(mod.id, k)}
                    />
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

// Role Modal

const RoleModal = ({ mode, roleId, allModules, onClose, onSaved }) => {
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [status,      setStatus]      = useState("active");
  const [permissions, setPermissions] = useState({});
  const [loadingRole, setLoadingRole] = useState(mode === "edit");
  const [busy,        setBusy]        = useState(false);

  // Load existing role data when editing
  useEffect(() => {
    if (mode !== "edit" || !roleId) return;
    (async () => {
      try {
        const res = await apiGetRole(roleId);
        const role = res.data.role;
        setName(role.name);
        setDescription(role.description ?? "");
        setStatus(role.status);

        // Convert permissions array → map keyed by moduleId
        const map = {};
        role.permissions.forEach((p) => {
          map[p.moduleId] = {
            canView:   !!p.canView,
            canAdd:    !!p.canAdd,
            canEdit:   !!p.canEdit,
            canDelete: !!p.canDelete,
          };
        });
        setPermissions(map);
      } catch (err) {
        showApiError(err, toast.error);
        onClose();
      } finally {
        setLoadingRole(false);
      }
    })();
  }, [mode, roleId, onClose]);

  const handlePermChange = (moduleId, updated) => {
    setPermissions((prev) => ({ ...prev, [moduleId]: updated }));
  };

  const buildPermissionsArray = () =>
    Object.entries(permissions)
      .map(([moduleId, p]) => ({ moduleId: Number(moduleId), ...p }))
      .filter((p) => p.canView || p.canAdd || p.canEdit || p.canDelete);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Role name is required");

    setBusy(true);
    try {
      const payload = {
        name:        name.trim(),
        description: description.trim() || null,
        status,
        permissions: buildPermissionsArray(),
      };

      let res;
      if (mode === "add") {
        res = await apiCreateRole(payload);
        toast.success("Role created");
      } else {
        res = await apiUpdateRole(roleId, payload);
        toast.success("Role updated");
      }
      onSaved(res.data.role);
      onClose();
    } catch (err) {
      showApiError(err, toast.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.5)", zIndex: 9999 }}
    >
      <div
        className="card border-0 shadow-lg rounded-3"
        style={{ width: 600, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
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
              {/* Role Name */}
              <div className="row g-3 mb-3">
                <div className="col-8">
                  <label className="form-label fw-semibold">Role Name <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    placeholder="e.g. Support Agent"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label fw-semibold">Status</label>
                  <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="form-label fw-semibold">Description <span className="text-muted small fw-normal">(optional)</span></label>
                <input
                  className="form-control"
                  placeholder="Short note about this role"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Permissions Grid */}
              <div>
                <label className="form-label fw-semibold mb-2">
                  Module Permissions
                  <span className="text-muted small fw-normal ms-2">
                    — tick what this role can do inside each module
                  </span>
                </label>
                <PermissionGrid
                  modules={allModules}
                  permissions={permissions}
                  onChange={handlePermChange}
                />
              </div>
            </div>

            {/* Footer */}
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

// Confirm Delete

const ConfirmDelete = ({ role, onClose, onDeleted }) => {
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await apiDeleteRole(role.id);
      toast.success("Role deleted");
      onDeleted(role.id);
      onClose();
    } catch (err) {
      showApiError(err, toast.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.45)", zIndex: 9999 }}
    >
      <div className="card border-0 shadow-lg rounded-3" style={{ maxWidth: 420, width: "90%" }}>
        <div className="card-body p-4">
          <h6 className="fw-bold mb-2">Delete Role</h6>
          <p className="text-muted small mb-1">
            Are you sure you want to delete <strong>{role.name}</strong>?
          </p>
          <p className="text-danger small mb-4">
            ⚠ All permissions linked to this role will be permanently removed.
            Admins assigned this role will lose their access.
          </p>
          <div className="d-flex gap-2 justify-content-end">
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={busy}>
              {busy ? <span className="spinner-border spinner-border-sm" /> : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// View Permissions Modal

const ViewPermissionsModal = ({ role, allModules, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [permsMap, setPermsMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGetRole(role.id);
        const map = {};
        res.data.role.permissions.forEach((p) => { map[p.moduleId] = p; });
        setPermsMap(map);
      } catch (err) {
        showApiError(err, toast.error);
      } finally {
        setLoading(false);
      }
    })();
  }, [role.id]);

  const check = (has) =>
    has
      ? <i className="bi bi-check-circle-fill text-success" />
      : <i className="bi bi-x-circle text-light-emphasis" style={{ opacity: 0.3 }} />;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.45)", zIndex: 9999 }}
    >
      <div className="card border-0 shadow-lg rounded-3" style={{ width: 560, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="card-header bg-dark text-white fw-bold d-flex justify-content-between align-items-center">
          <span>Permissions — {role.name}</span>
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
                      <td className="small fw-semibold">{mod.name}</td>
                      {PERM_KEYS.map((k) => (
                        <td key={k} className="text-center">{check(p[k])}</td>
                      ))}
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

// Main Page 

const RolesPage = () => {
  const [roles,      setRoles]      = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null); // { type, target? }
  const [search,     setSearch]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, modulesRes] = await Promise.all([
        apiGetAllRoles(),
        apiGetAllModules(),
      ]);
      setRoles(rolesRes.data.roles);
      // Only active modules shown in the permission grid
      setAllModules(modulesRes.data.modules.filter((m) => m.status === "active"));
    } catch (err) {
      showApiError(err, toast.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSaved = (saved) => {
    setRoles((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const updated = [...prev];
      updated[idx] = saved;
      return updated;
    });
  };

  const handleDeleted = (id) => setRoles((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-0">Roles</h5>
          <small className="text-muted">Create roles and assign module-level permissions</small>
        </div>
        <button className="btn btn-warning fw-semibold" onClick={() => setModal({ type: "add" })}>
          <i className="bi bi-plus-lg me-1" /> Add Role
        </button>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: 320 }}>
        <input
          className="form-control"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th style={{ width: 150 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <span className="spinner-border text-warning" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    {search ? "No roles match your search." : "No roles found. Add one to get started."}
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.id}>
                    <td className="text-muted small">{i + 1}</td>
                    <td className="fw-semibold">{r.name}</td>
                    <td className="text-muted small">{r.description || <span className="fst-italic">—</span>}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-muted small">{fmtDate(r.createdAt)}</td>
                    <td className="text-muted small">{fmtDate(r.updatedAt)}</td>
                    <td>
                      {/* View permissions */}
                      <button
                        className="btn btn-sm btn-outline-dark me-1"
                        title="View Permissions"
                        onClick={() => setModal({ type: "view", target: r })}
                      >
                        <i className="bi bi-eye" />
                      </button>
                      {/* Edit */}
                      <button
                        className="btn btn-sm btn-outline-warning me-1"
                        title="Edit"
                        onClick={() => setModal({ type: "edit", target: r })}
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      {/* Delete */}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        title="Delete"
                        onClick={() => setModal({ type: "delete", target: r })}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer text-muted small bg-white">
          {filtered.length} role{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === "add" && (
        <RoleModal
          mode="add"
          roleId={null}
          allModules={allModules}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.type === "edit" && (
        <RoleModal
          mode="edit"
          roleId={modal.target.id}
          allModules={allModules}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.type === "view" && (
        <ViewPermissionsModal
          role={modal.target}
          allModules={allModules}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmDelete
          role={modal.target}
          onClose={() => setModal(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
};

export default RolesPage;
