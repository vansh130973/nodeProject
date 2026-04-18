import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  apiGetTicketDetailUser,
  apiAddTicketMessageUser,
  apiUpdateTicketStatusUser,
} from "../services/ticket.service";
import { showApiError } from "../../../utils/api";

const UserTicketDetailSection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGetTicketDetailUser(id);
      setTicket(data.ticket);
      setMessages(data.messages ?? []);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
      navigate("/tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when id changes
  }, [id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!reply.trim() && !file) {
      toast.error("Enter a message or attach a file");
      return;
    }
    setSending(true);
    try {
      const data = await apiAddTicketMessageUser(id, { message: reply, file });
      setMessages(data.messages ?? []);
      setReply("");
      setFile(null);
      toast.success("Message sent");
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setSending(false);
    }
  };

  const handleStatus = async (next) => {
    if (!ticket || next === ticket.status) return;
    setStatusUpdating(true);
    try {
      const data = await apiUpdateTicketStatusUser(id, next);
      setTicket(data.ticket);
      toast.success(`Status: ${next}`);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-warning" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm mb-3"
        onClick={() => navigate("/tickets")}
      >
        ← Back to tickets
      </button>

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
        <div>
          <h5 className="fw-bold mb-1">{ticket.subject}</h5>
          <span className="text-muted small">
            Opened {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "—"}
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="small text-muted mb-0">Status</label>
          <select
            className="form-select form-select-sm"
            style={{ minWidth: 140 }}
            disabled={statusUpdating}
            value={ticket.status}
            onChange={(e) => handleStatus(e.target.value)}
          >
            <option value="open">open</option>
            <option value="pending">pending</option>
            <option value="closed">closed</option>
          </select>
        </div>
      </div>

      {ticket.description ? (
        <div className="card border-0 shadow-sm rounded-3 mb-3">
          <div className="card-body">
            <h6 className="small text-muted text-uppercase fw-bold mb-2">Original request</h6>
            <p className="mb-2" style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</p>
            {ticket.file && (
              <a href={ticket.file} target="_blank" rel="noreferrer" className="small">
                View attachment
              </a>
            )}
          </div>
        </div>
      ) : null}

      <h6 className="fw-semibold mb-2">Conversation</h6>
      <div className="d-flex flex-column gap-2 mb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-3 ${
              m.senderType === "admin" ? "bg-white border" : "bg-warning bg-opacity-25"
            }`}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="fw-semibold small">
                {m.senderType === "admin" ? "Support" : "You"}
              </span>
              <span className="text-muted small">
                {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
              </span>
            </div>
            <p className="mb-1 small" style={{ whiteSpace: "pre-wrap" }}>{m.message}</p>
            {m.file && (
              <a href={m.file} target="_blank" rel="noreferrer" className="small">
                Attachment
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          <h6 className="fw-semibold mb-2">Reply</h6>
          <form onSubmit={handleSend}>
            <textarea
              className="form-control mb-2"
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your message…"
            />
            <input
              type="file"
              className="form-control mb-2"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button type="submit" disabled={sending || ticket.status === "closed"} className="btn btn-warning fw-semibold">
              {ticket.status === "closed" ? "Ticket closed" : sending ? "Sending…" : "Send reply"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default UserTicketDetailSection;
