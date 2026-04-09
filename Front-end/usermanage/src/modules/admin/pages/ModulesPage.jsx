import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { showApiError } from "../../../utils/api";
import {
  apiGetAllModules,
  apiCreateModule,
  apiUpdateModule,
  apiDeleteModule,
} from "../services/module.service";

// helpers

const StatusBadge = ({ status }) =>
  status === "active"
    ? <span className="badge bg-success">Active</span>
    : <span className="badge bg-secondary">Inactive</span>;

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// Modal

const ModuleModal = ({ mode, initial, onClose, onSaved }) => {
  const [name,   setName]   = useState(initial?.name   ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [busy,   setBusy]   = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Module name is required");

    setBusy(true);
    try {
      if (mode === "add") {
        const res = await apiCreateModule({ name: name.trim(), status });
        toast.success("Module created");
        onSaved(res.data.module);
      } else {
        const res = await apiUpdateModule(initial.id, { name: name.trim(), status });
        toast.success("Module updated");
        onSaved(res.data.module);
      }
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
      <div className="card border-0 shadow-lg rounded-3" style={{ width: 440 }}>
        <div className="card-header bg-warning fw-bold d-flex justify-content-between align-items-center">
          <span>{mode === "add" ? "Add Module" : "Edit Module"}</span>
          <button className="btn-close" onClick={onClose} />
        </div>
        <div className="card-body p-4">
          <div className="mb-3">
            <label className="form-label fw-semibold">Module Name <span className="text-danger">*</span></label>
            <input
              className="form-control"
              placeholder="e.g. Ticket Management"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
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

// Confirm Delete

const ConfirmDelete = ({ module, onClose, onDeleted }) => {
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await apiDeleteModule(module.id);
      toast.success("Module deleted");
      onDeleted(module.id);
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
          <h6 className="fw-bold mb-2">Delete Module</h6>
          <p className="text-muted small mb-1">
            Are you sure you want to delete <strong>{module.name}</strong>?
          </p>
          <p className="text-danger small mb-4">
            ⚠ This will also remove all role permissions linked to this module.
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

// Main Page

const ModulesPage = () => {
  const [modules, setModules]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal,   setModal]     = useState(null);
  const [search,  setSearch]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetAllModules();
      setModules(res.data.modules);
    } catch (err) {
      showApiError(err, toast.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = modules.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaved = (saved) => {
    setModules((prev) => {
      const idx = prev.findIndex((m) => m.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const updated = [...prev];
      updated[idx] = saved;
      return updated;
    });
  };

  const handleDeleted = (id) => setModules((prev) => prev.filter((m) => m.id !== id));

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-0">Modules</h5>
          <small className="text-muted">Manage system modules and their availability</small>
        </div>
        <button className="btn btn-warning fw-semibold" onClick={() => setModal({ type: "add" })}>
          <i className="bi bi-plus-lg me-1" /> Add Module
        </button>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: 320 }}>
        <input
          className="form-control"
          placeholder="Search modules..."
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
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <span className="spinner-border text-warning" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    {search ? "No modules match your search." : "No modules found. Add one to get started."}
                  </td>
                </tr>
              ) : (
                filtered.map((m, i) => (
                  <tr key={m.id}>
                    <td className="text-muted small">{i + 1}</td>
                    <td className="fw-semibold">{m.name}</td>
                    <td><StatusBadge status={m.status} /></td>
                    <td className="text-muted small">{fmtDate(m.createdAt)}</td>
                    <td className="text-muted small">{fmtDate(m.updatedAt)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-warning me-1"
                        title="Edit"
                        onClick={() => setModal({ type: "edit", target: m })}
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        title="Delete"
                        onClick={() => setModal({ type: "delete", target: m })}
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
          {filtered.length} module{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === "add" && (
        <ModuleModal mode="add" initial={null} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.type === "edit" && (
        <ModuleModal mode="edit" initial={modal.target} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.type === "delete" && (
        <ConfirmDelete module={modal.target} onClose={() => setModal(null)} onDeleted={handleDeleted} />
      )}
    </div>
  );
};

export default ModulesPage;
