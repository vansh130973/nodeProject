import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { BASE_URL, getBearerHeader, getAuthHeaders } from "../../../utils/api";
import { useSocket } from "../../../context/SocketContext";

/**
 * Phase flow:
 *   idle        → dropzone ready
 *   validating  → POST /bulk-validate in flight
 *   validated   → summary shown, user decides whether to proceed
 *   importing   → POST /bulk-import sent; live socket progress
 *   done        → final summary from bulkImport:done socket event
 */

// ─── Small presentational helpers ────────────────────────────────────────────
const Badge = ({ color, children }) => (
  <span className={`badge bg-${color} fw-normal`}>{children}</span>
);

const IconCircle = ({ icon, bg, color, size = 28 }) => (
  <div style={{
    width: 64, height: 64, borderRadius: "50%", background: bg,
    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
  }}>
    <i className={`bi ${icon} ${color}`} style={{ fontSize: size }} />
  </div>
);

const StatBox = ({ label, value, color }) => (
  <div style={{
    flex: 1, minWidth: 80, textAlign: "center",
    padding: "10px 6px", borderRadius: 8,
    background: color === "success" ? "#f0fdf4" : color === "danger" ? "#fef2f2"
              : color === "warning" ? "#fffbeb" : "#f8f9fa",
  }}>
    <div style={{ fontSize: 22, fontWeight: 700,
      color: color === "success" ? "#16a34a" : color === "danger" ? "#dc2626"
           : color === "warning" ? "#d97706" : "#6b7280" }}>
      {value}
    </div>
    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{label}</div>
  </div>
);

const SkipTable = ({ rows, maxHeight = 180 }) => {
  if (!rows?.length) return null;
  return (
    <div style={{ maxHeight, overflowY: "auto", borderRadius: 6, border: "1px solid #e5e7eb" }}>
      <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
        <thead className="table-light" style={{ position: "sticky", top: 0 }}>
          <tr><th>Row</th><th>Username</th><th>Email</th><th>Reason</th></tr>
        </thead>
        <tbody>
          {rows.map((rec, i) => (
            <tr key={i}>
              <td className="text-muted">{rec.row}</td>
              <td>{rec.userName || "—"}</td>
              <td>{rec.email || "—"}</td>
              <td><Badge color="secondary">{rec.reason}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const BulkImportModal = ({ onImportDone }) => {
  const [show,             setShow]             = useState(false);
  const [file,             setFile]             = useState(null);
  const [dragging,         setDragging]         = useState(false);
  const [phase,            setPhase]            = useState("idle");
  const [validationResult, setValidationResult] = useState(null);
  const [importProgress,   setImportProgress]   = useState(null);
  const [importResult,     setImportResult]     = useState(null);

  const inputRef = useRef(null);
  const socket   = useSocket();

  // ── Reset all state ─────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setPhase("idle");
    setFile(null);
    setValidationResult(null);
    setImportProgress(null);
    setImportResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const open  = () => { reset(); setShow(true); };
  const close = () => { setShow(false); };

  // ── Socket listeners ─────────────────────────────────────────────────────────
  // All three listeners live at component level (not inside modal render) so
  // they keep firing even after the modal is closed.
  useEffect(() => {
    if (!socket) return;

    const onStarted = (data) => {
      setPhase("importing");
      setImportProgress({
        phase:     "started",
        processed: 0,
        total:     data.total ?? 0,
        percent:   0,
        message:   data.message ?? "Import started…",
      });
    };

    const onProgress = (data) => {
      setImportProgress(data);
    };

    const onDone = (data) => {
      setImportResult(data);
      setPhase("done");
      if (data.success && onImportDone) onImportDone();
      // Show toast regardless of modal open state
      if (data.success) {
        toast.success(data.message ?? "Import completed!", { autoClose: 5000 });
      } else {
        toast.error(data.message ?? "Import failed.", { autoClose: 6000 });
      }
    };

    socket.on("bulkImport:started",  onStarted);
    socket.on("bulkImport:progress", onProgress);
    socket.on("bulkImport:done",     onDone);

    return () => {
      socket.off("bulkImport:started",  onStarted);
      socket.off("bulkImport:progress", onProgress);
      socket.off("bulkImport:done",     onDone);
    };
  }, [socket, onImportDone]);

  // ── File selection ───────────────────────────────────────────────────────────
  const pickFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only CSV files are allowed"); return;
    }
    setFile(f);
    setValidationResult(null);
    setPhase("idle");
  };

  const onInputChange = (e) => pickFile(e.target.files[0]);
  const onDrop        = (e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); };
  const onDragOver    = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave   = () => setDragging(false);

  // ── Step 1: Validate ─────────────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!file) { toast.error("Please select a CSV file first"); return; }
    setPhase("validating");

    try {
      const form = new FormData();
      form.append("csv", file);

      const res  = await fetch(`${BASE_URL}/admin/users/bulk-validate`, {
        method: "POST", headers: getBearerHeader(), body: form,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        toast.error(data.message ?? "Validation failed");
        setPhase("idle"); return;
      }

      setValidationResult(data);
      setPhase("validated");

    } catch {
      toast.error("Could not reach the server. Check your connection.");
      setPhase("idle");
    }
  };

  // ── Step 2: Import ───────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!validationResult?.csvPath) return;
    setPhase("importing");
    setImportProgress({ phase: "queuing", processed: 0, total: validationResult.valid, percent: 0, message: "Sending import request…" });

    try {
      const res  = await fetch(`${BASE_URL}/admin/users/bulk-import`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ csvPath: validationResult.csvPath }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        toast.error(data.message ?? "Failed to start import");
        setPhase("validated"); return;
      }
      // 202 accepted — socket will drive the rest of the UI

    } catch {
      toast.error("Could not reach the server. Check your connection.");
      setPhase("validated");
    }
  };

  // ── Shared styles ────────────────────────────────────────────────────────────
  const dropStyle = {
    border: `2px dashed ${dragging ? "#0d6efd" : file ? "#198754" : "#ced4da"}`,
    borderRadius: 10, padding: "28px 16px", textAlign: "center",
    background: dragging ? "#f0f5ff" : file ? "#f0fff4" : "#fafafa",
    cursor: "pointer", transition: "all 0.2s",
  };

  const isLocked = phase === "validating" || phase === "importing";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Trigger */}
      <button className="btn btn-outline-primary btn-sm fw-semibold" onClick={open}
        title="Bulk import users from CSV">
        <i className="bi bi-file-earmark-arrow-up me-1" />Bulk Import
      </button>

      {/* Modal */}
      {show && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1055,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={(e) => { if (!isLocked && e.target === e.currentTarget) close(); }}
        >
          <div style={{
            background: "#fff", borderRadius: 14, width: "100%", maxWidth: 660,
            maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}>

            {/* ── Header ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 24px 14px", borderBottom: "1px solid #f0f0f0",
            }}>
              <div>
                <h5 className="fw-bold mb-0">Bulk Import Users</h5>
                <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                  {phase === "idle" || phase === "validating"
                    ? "Upload a CSV to validate before importing"
                    : phase === "validated"
                    ? "Review validation results before starting the import"
                    : phase === "importing"
                    ? "Import is running in the background…"
                    : "Import complete"}
                </p>
              </div>
              {/* Step indicator */}
              <div className="d-flex align-items-center gap-2 me-3" style={{ fontSize: 12 }}>
                {[["1", "Validate"], ["2", "Import"], ["3", "Done"]].map(([num, label], i) => {
                  const active = i === 0 ? ["idle","validating","validated"].includes(phase)
                               : i === 1 ? phase === "importing"
                               : phase === "done";
                  return (
                    <div key={num} className="d-flex align-items-center gap-1">
                      {i > 0 && <div style={{ width: 20, height: 1, background: "#d1d5db" }} />}
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 600,
                        background: active ? "#0d6efd" : "#e5e7eb",
                        color: active ? "#fff" : "#9ca3af",
                      }}>{num}</div>
                      <span style={{ color: active ? "#0d6efd" : "#9ca3af" }}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={close} disabled={isLocked} style={{
                background: "none", border: "none", fontSize: 20, cursor: isLocked ? "not-allowed" : "pointer",
                color: "#6b7280", opacity: isLocked ? 0.3 : 1,
              }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: "20px 24px" }}>

              {/* ════ PHASE: idle / validating ════ */}
              {(phase === "idle" || phase === "validating") && (
                <>
                  <div style={dropStyle}
                    onClick={() => phase !== "validating" && inputRef.current?.click()}
                    onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
                    <input ref={inputRef} type="file" accept=".csv"
                      style={{ display: "none" }} onChange={onInputChange} />
                    {file ? (
                      <>
                        <i className="bi bi-file-earmark-check-fill text-success" style={{ fontSize: 36 }} />
                        <p className="mb-0 mt-2 fw-semibold text-success">{file.name}</p>
                        <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                          {(file.size / 1024).toFixed(1)} KB — click to change
                        </p>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-upload text-secondary" style={{ fontSize: 36 }} />
                        <p className="mb-0 mt-2 fw-semibold text-secondary">Drag &amp; drop CSV here</p>
                        <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                          or click to browse — <strong>.csv only</strong>
                        </p>
                      </>
                    )}
                  </div>

                  <div className="mt-3 p-3 rounded" style={{ background: "#f8f9fa", fontSize: 12 }}>
                    <p className="fw-semibold mb-1 text-secondary">
                      <i className="bi bi-info-circle me-1" />Required columns:
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginBottom: 6 }}>
                      {["First Name","Last Name","User Name","Mobile Number","Status","Gender","Email Address"].map((c) => (
                        <Badge key={c} color="secondary">{c}</Badge>
                      ))}
                      <span className="badge bg-light text-muted fw-normal border">Profile Picture (optional)</span>
                    </div>
                    <p className="mb-0 text-muted">
                      Statuses: <code>active</code> <code>inactive</code> <code>pending</code> <code>deleted</code>
                      &nbsp;|&nbsp; Genders: <code>male</code> <code>female</code> <code>other</code>
                    </p>
                  </div>

                  <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-primary" onClick={handleValidate}
                      disabled={!file || phase === "validating"}>
                      {phase === "validating"
                        ? <><span className="spinner-border spinner-border-sm me-2" />Validating…</>
                        : <><i className="bi bi-shield-check me-2" />Validate CSV</>}
                    </button>
                    {file && phase !== "validating" && (
                      <button className="btn btn-outline-secondary" onClick={() => {
                        setFile(null); setValidationResult(null);
                        if (inputRef.current) inputRef.current.value = "";
                      }}>Clear</button>
                    )}
                  </div>
                </>
              )}

              {/* ════ PHASE: validated ════ */}
              {phase === "validated" && validationResult && (() => {
                const { total, valid, invalid, canImport, errors } = validationResult;
                const hasErrors = invalid > 0;

                return (
                  <>
                    {/* Summary stats */}
                    <div className="d-flex gap-2 mb-4">
                      <StatBox label="Total rows"  value={total}   color="neutral" />
                      <StatBox label="Will import" value={valid}   color="success" />
                      <StatBox label="Invalid"     value={invalid} color="danger"  />
                    </div>

                    {/* Issues section */}
                    {hasErrors && (
                      <div className="mb-4">
                        <div className="d-flex gap-1 mb-2" style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ borderRadius: "6px 6px 0 0", borderBottom: "none" }}>
                            <i className="bi bi-x-circle me-1" />{invalid} Invalid row{invalid !== 1 ? "s" : ""}
                          </button>
                        </div>
                        <SkipTable rows={errors} />
                        {valid > 0 && (
                          <p className="text-muted mt-2 mb-0" style={{ fontSize: 12 }}>
                            <i className="bi bi-info-circle me-1" />
                            Invalid rows will be automatically skipped — only the{" "}
                            <strong>{valid} valid row{valid !== 1 ? "s" : ""}</strong> will be imported (insert or update).
                          </p>
                        )}
                      </div>
                    )}

                    {/* All-invalid message */}
                    {!canImport && (
                      <div className="alert alert-warning d-flex align-items-center gap-2 mb-3">
                        <i className="bi bi-exclamation-triangle-fill" />
                        <span>All rows have validation errors. Fix the CSV and re-upload.</span>
                      </div>
                    )}

                    <div className="d-flex gap-2">
                      <button className="btn btn-success" onClick={handleImport} disabled={!canImport}>
                        <i className="bi bi-upload me-2" />
                        {canImport
                          ? `Import ${valid} user${valid !== 1 ? "s" : ""}`
                          : "Nothing to import"}
                      </button>
                      <button className="btn btn-outline-secondary" onClick={reset}>
                        <i className="bi bi-arrow-left me-1" />Re-upload
                      </button>
                    </div>
                  </>
                );
              })()}

              {/* ════ PHASE: importing ════ */}
              {phase === "importing" && importProgress && (
                <div className="text-center py-2">
                  <IconCircle icon="bi-arrow-repeat" bg="#eff6ff" color="text-primary" />
                  <h6 className="fw-bold mb-1">Import In Progress</h6>
                  <p className="text-muted mb-3" style={{ fontSize: 13 }}>
                    {importProgress.message ?? "Processing…"}
                  </p>

                  {/* Progress bar */}
                  <div style={{ height: 10, background: "#e5e7eb", borderRadius: 6, overflow: "hidden", margin: "0 auto 8px", maxWidth: 400 }}>
                    <div style={{
                      height: "100%", background: "#3b82f6", borderRadius: 6,
                      width: `${importProgress.percent ?? 0}%`,
                      transition: "width 0.5s ease",
                    }} />
                  </div>

                  <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                    {importProgress.percent ?? 0}% —{" "}
                    {importProgress.processed ?? 0} / {importProgress.total ?? "?"} rows
                  </p>

                  {/* Phase label pills */}
                  <div className="d-flex justify-content-center gap-2 mt-3">
                    {[
                      { key: "inserting", icon: "bi-database-fill-add", label: "Inserting" },
                      { key: "pictures",  icon: "bi-image-fill",         label: "Pictures"  },
                    ].map(({ key, icon, label }) => (
                      <span key={key} className={`badge ${importProgress.phase === key ? "bg-primary" : "bg-light text-muted border"}`}>
                        <i className={`bi ${icon} me-1`} />{label}
                      </span>
                    ))}
                  </div>

                  <p className="text-muted mt-3 mb-0" style={{ fontSize: 11 }}>
                    <i className="bi bi-bell me-1" />You can close this window — a notification will appear when import finishes.
                  </p>
                  <button className="btn btn-sm btn-outline-secondary mt-2" onClick={close}>
                    Close &amp; continue working
                  </button>
                </div>
              )}

              {/* ════ PHASE: done ════ */}
              {phase === "done" && importResult && (
                <div>
                  <div className="text-center mb-4">
                    {importResult.success
                      ? <IconCircle icon="bi-check-circle-fill" bg="#f0fdf4" color="text-success" />
                      : <IconCircle icon="bi-x-circle-fill"     bg="#fef2f2" color="text-danger"  />}
                    <h6 className="fw-bold mb-1">
                      {importResult.success ? "Import Complete" : "Import Failed"}
                    </h6>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                      {importResult.message}
                    </p>
                  </div>

                  {/* Result stats */}
                  <div className="d-flex gap-2 mb-4">
                    <StatBox label="Total in CSV" value={importResult.total ?? "—"}   color="neutral" />
                    <StatBox label="Inserted"     value={importResult.inserted ?? 0}  color="success" />
                    <StatBox label="Updated"      value={importResult.updated ?? 0}   color="warning" />
                    <StatBox label="Failed"       value={importResult.failed ?? 0}    color="danger"  />
                  </div>

                  {/* Failed rows detail */}
                  {importResult.errors?.length > 0 && (
                    <div className="mb-3">
                      <p className="fw-semibold mb-2" style={{ fontSize: 13 }}>
                        <i className="bi bi-x-circle text-danger me-1" />
                        Failed rows ({importResult.errors.length})
                      </p>
                      <SkipTable rows={importResult.errors} />
                    </div>
                  )}

                  <div className="d-flex gap-2">
                    <button className="btn btn-primary" onClick={() => { close(); onImportDone?.(); }}>
                      <i className="bi bi-check me-1" />Done
                    </button>
                    <button className="btn btn-outline-secondary" onClick={reset}>
                      Import Another File
                    </button>
                  </div>
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