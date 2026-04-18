import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiGetMyTickets, apiCreateTicket } from "../services/ticket.service";
import { showApiError } from "../../../utils/api";
import InputField from "../../../components/InputField";

const statusBadge = (status) => {
  const map = {
    open: "bg-success",
    pending: "bg-warning text-dark",
    closed: "bg-secondary",
  };
  const cls = map[status] ?? "bg-light text-dark";
  return <span className={`badge ${cls}`}>{status}</span>;
};

const UserTicketsSection = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: "", description: "" });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGetMyTickets();
      setTickets(data.tickets ?? []);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    setSubmitting(true);
    try {
      await apiCreateTicket({
        subject: form.subject.trim(),
        description: form.description.trim(),
        file,
      });
      toast.success("Ticket created");
      setForm({ subject: "", description: "" });
      setFile(null);
      load();
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h5 className="fw-bold mb-4">My Tickets</h5>

      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">Open a new ticket</h6>
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
                type="file"
                className="form-control"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn btn-warning fw-semibold">
              {submitting ? "Submitting…" : "Submit ticket"}
            </button>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          <h6 className="fw-semibold mb-3">Your tickets</h6>
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-warning" />
            </div>
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
                      <td className="fw-semibold">{t.subject}</td>
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
