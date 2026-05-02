import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiGetMyTickets, apiCreateTicket } from "../services/ticket.service";
import { showApiError } from "../../../utils/api";
import InputField from "../../../components/InputField";

const STATUS_META = {
  open:       { cls: "bg-success",        label: "Open" },
  closed:     { cls: "bg-secondary",      label: "Closed" },
  adminReply: { cls: "bg-info text-dark", label: "Admin Replied" },
  userReply:  { cls: "bg-primary",        label: "You Replied" },
};

const statusBadge = (status) => {
  const m = STATUS_META[status] ?? { cls: "bg-light text-dark", label: status };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
};

/* ── New-reply number bubble ── */
const NewReplyBadge = () => (
  <>
    <style>{`
      .nr-num-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        background: #dc3545;
        vertical-align: middle;
        margin-right: 7px;
        animation: nrPop 0.3s ease-out forwards;
        flex-shrink: 0;
        line-height: 1;
      }
    `}</style>
    <span className="nr-num-badge">1</span>
  </>
);

const EMPTY_FORM = { subject: "", description: "" };

const UserTicketsSection = ({ onTicketsLoaded }) => {
  const navigate   = useNavigate();
  const fileRef    = useRef(null);

  const [tickets,    setTickets]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [file,       setFile]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm,   setShowForm]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGetMyTickets();
      const list = data.tickets ?? [];
      setTickets(list);
      onTicketsLoaded?.(list);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setShowForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) { toast.error("Subject is required"); return; }
    setSubmitting(true);
    try {
      await apiCreateTicket({
        subject:     form.subject.trim(),
        description: form.description.trim(),
        file,
      });
      toast.success("Ticket created");
      handleCancel();
      load();
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h5 className="fw-bold mb-0">My Tickets</h5>
        {!showForm && (
          <button
            type="button"
            className="btn btn-warning btn-sm fw-semibold"
            onClick={() => setShowForm(true)}
          >
            + New Ticket
          </button>
        )}
      </div>

      {/* ── Create ticket form ── */}
      {showForm && (
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-body">
            <h6 className="fw-semibold mb-3">Create a new ticket</h6>
            <form onSubmit={handleCreate} noValidate>
              <InputField
                label="Subject"
                id="ticketSubject"
                name="subject"
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              />
              <div className="mb-3">
                <label className="form-label fw-semibold">Description</label>
                <textarea
                  name="description"
                  className="form-control"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Attachment (optional)</label>
                <input
                  ref={fileRef}
                  type="file"
                  className="form-control"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="d-flex gap-2">
                <button type="submit" disabled={submitting} className="btn btn-warning fw-semibold">
                  {submitting ? "Submitting…" : "Submit"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary fw-semibold"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Ticket list ── */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">Your tickets</h6>
          {loading ? (
            <div className="text-center py-4"><div className="spinner-border text-warning" /></div>
          ) : tickets.length === 0 ? (
            <p className="text-muted mb-0">No tickets yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <td className="fw-semibold">
                        {t.subject}&nbsp;
                        {t.isUnread === 1 && <NewReplyBadge />}
                      </td>
                      <td>{statusBadge(t.status)}</td>
                      <td className="text-muted small">
                        {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                      </td>
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
};

export default UserTicketsSection;