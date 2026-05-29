import { useState, useRef } from "react";
import { toast } from "react-toastify";
import { BASE_URL, getBearerHeader } from "../../../utils/api";

/**
 * BulkImportModal
 * Triggered by the "Bulk Import" button next to "Add User".
 * Opens a Bootstrap modal overlay — no sidebar section needed.
 */
const BulkImportModal = ({ onImportDone }) => {
  const [show,     setShow]     = useState(false);
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const inputRef = useRef(null);

  const open  = () => { setShow(true); setFile(null); setResult(null); };
  const close = () => { if (loading) return; setShow(false); setFile(null); setResult(null); };

  // ── File helpers ────────────────────────────────────────────────────────────
  const pickFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) { toast.error("Only CSV files are allowed"); return; }
    setFile(f);
    setResult(null);
  };

  const onInputChange = (e) => pickFile(e.target.files[0]);
  const onDrop        = (e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); };
  const onDragOver    = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave   = ()  => setDragging(false);
  const clearFile     = ()  => { setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = ""; };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!file) { toast.error("Please select a CSV file first"); return; }
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("csv", file);

      const res = await fetch(`${BASE_URL}/admin/users/bulk-import`, {
        method: "POST",
        headers: getBearerHeader(),
        body: form,
      });

      let data;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        toast.error("Server returned an unexpected response");
        return;
      }

      if (!res.ok || !data.success) {
        toast.error(data.message ?? "Import failed");
        return;
      }

      setResult(data);
      close(); // ← auto-close the modal on success
      toast.success(`Import complete — ${data.inserted} user(s) added`);
      if (data.inserted > 0 && onImportDone) onImportDone(); // refresh the user list
    } catch {
      toast.error("Could not reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const dropZoneStyle = {
    border: `2px dashed ${dragging ? "#0d6efd" : file ? "#198754" : "#ced4da"}`,
    borderRadius: 10,
    padding: "28px 16px",
    textAlign: "center",
    background: dragging ? "#f0f5ff" : file ? "#f0fff4" : "#fafafa",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        className="btn btn-outline-primary btn-sm fw-semibold"
        onClick={open}
        title="Bulk import users from CSV"
      >
        <i className="bi bi-file-earmark-arrow-up me-1" />
        Bulk Import
      </button>

      {/* ── Modal overlay ── */}
      {show && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1055,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            style={{
              background: "#fff", borderRadius: 14,
              width: "100%", maxWidth: 620,
              maxHeight: "90vh", overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "18px 24px 14px", borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div>
                <h5 className="fw-bold mb-0">Bulk Import Users</h5>
                <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                  Upload a CSV — existing usernames / emails are skipped automatically
                </p>
              </div>
              <button
                onClick={close}
                disabled={loading}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px" }}>

              {/* Drop zone */}
              <div
                style={dropZoneStyle}
                onClick={() => inputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
              >
                <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={onInputChange} />
                {file ? (
                  <>
                    <i className="bi bi-file-earmark-check-fill text-success" style={{ fontSize: 36 }} />
                    <p className="mb-0 mt-2 fw-semibold text-success">{file.name}</p>
                    <p className="text-muted mb-0" style={{ fontSize: 12 }}>{(file.size / 1024).toFixed(1)} KB — click to change</p>
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-upload text-secondary" style={{ fontSize: 36 }} />
                    <p className="mb-0 mt-2 fw-semibold text-secondary">Drag &amp; drop CSV here</p>
                    <p className="text-muted mb-0" style={{ fontSize: 12 }}>or click to browse — <strong>.csv only</strong></p>
                  </>
                )}
              </div>

              {/* Column info */}
              <div className="mt-3 p-3 rounded" style={{ background: "#f8f9fa", fontSize: 12 }}>
                <p className="fw-semibold mb-1 text-secondary">
                  <i className="bi bi-info-circle me-1" />Required columns:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginBottom: 6 }}>
                  {["First Name","Last Name","User Name","Mobile Number","Status","Gender","Email Address"].map((c) => (
                    <span key={c} className="badge bg-secondary fw-normal">{c}</span>
                  ))}
                  <span className="badge bg-light text-muted fw-normal border">Profile Picture (optional)</span>
                </div>
                <p className="mb-0 text-muted">
                  Statuses: <code>active</code> <code>inactive</code> <code>pending</code> <code>deleted</code>
                  &nbsp;|&nbsp; Genders: <code>male</code> <code>female</code> <code>other</code>
                </p>
                <p className="mb-0 text-muted mt-1">
                  <i className="bi bi-key me-1" />Password: <code>userName@123</code> &nbsp;(e.g. <code>user000001@123</code>)
                </p>
              </div>

              {/* Action buttons */}
              <div className="d-flex gap-2 mt-3">
                <button
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={!file || loading}
                >
                  {loading
                    ? <><span className="spinner-border spinner-border-sm me-2" />Importing...</>
                    : <><i className="bi bi-upload me-2" />Import Users</>}
                </button>
                {file && !loading && (
                  <button className="btn btn-outline-secondary" onClick={clearFile}>Clear</button>
                )}
              </div>

              {/* Result */}
              {result && (
                <div className="mt-4">
                  <div className="d-flex gap-3 mb-3">
                    <div className="rounded-3 px-4 py-3 text-center flex-fill" style={{ background: "#d1fae5" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: "#065f46" }}>{result.inserted}</div>
                      <div style={{ fontSize: 12, color: "#065f46" }}>Users Added</div>
                    </div>
                    <div className="rounded-3 px-4 py-3 text-center flex-fill" style={{ background: "#fef3c7" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: "#92400e" }}>{result.skipped}</div>
                      <div style={{ fontSize: 12, color: "#92400e" }}>Rows Skipped</div>
                    </div>
                  </div>

                  {result.skippedRecords?.length > 0 && (
                    <>
                      <p className="fw-semibold mb-2" style={{ fontSize: 13 }}>
                        <i className="bi bi-exclamation-triangle-fill text-warning me-1" />Skipped rows
                      </p>
                      <div style={{ overflowX: "auto" }}>
                        <table className="table table-sm table-bordered mb-0" style={{ fontSize: 12 }}>
                          <thead className="table-light">
                            <tr><th>Row</th><th>Username</th><th>Email</th><th>Reason</th></tr>
                          </thead>
                          <tbody>
                            {result.skippedRecords.map((rec, i) => (
                              <tr key={i}>
                                <td className="text-muted">{rec.row}</td>
                                <td>{rec.userName || "—"}</td>
                                <td>{rec.email || "—"}</td>
                                <td><span className="badge bg-warning text-dark fw-normal">{rec.reason}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkImportModal;