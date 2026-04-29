import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  apiAdminGetTicket,
  apiAdminAddMessage,
  apiAdminUpdateTicketStatus,
} from "../services/ticket.service";
import { showApiError } from "../../../utils/api";

const STATUS_META = {
  open:{ cls:"bg-success",label:"Open" },
  closed:{ cls:"bg-secondary",label:"Closed" },
  adminReply:{ cls:"bg-info text-dark",label:"Admin Replied" },
  userReply:{ cls:"bg-danger",label:"User Replied" },
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] ?? { cls: "bg-light text-dark", label: status };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
};

const BUBBLE_OWN = {
  background: "#d1f4cc",
  borderRadius: "18px 18px 4px 18px",
  maxWidth: "72%",
  padding: "10px 14px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
};
const BUBBLE_OTHER = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "18px 18px 18px 4px",
  maxWidth: "72%",
  padding: "10px 14px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
};

const AdminTicketDetailSection = ({ onTicketViewed }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);

  const [ticket,         setTicket]         = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [reply,          setReply]          = useState("");
  const [file,           setFile]           = useState(null);
  const [sending,        setSending]        = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiAdminGetTicket(id);
      setTicket(data.ticket);
      setMessages(data.messages ?? []);
      if (data.ticket?.status === "userReply") {
        onTicketViewed?.(Number(id));
      }
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
      navigate("/admin/tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!reply.trim() && !file) { toast.error("Enter a message or attach a file"); return; }
    setSending(true);
    try {
      const data = await apiAdminAddMessage(id, { message: reply, file });
      setMessages(data.messages ?? []);
      setTicket((prev) => ({ ...prev, status: "adminReply" }));
      setReply("");
      setFile(null);
      toast.success("Reply sent");
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
      const data = await apiAdminUpdateTicketStatus(id, next);
      setTicket(data.ticket);
      toast.success(`Status updated to ${next}`);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading || !ticket) {
    return <div className="text-center py-5"><div className="spinner-border text-warning" /></div>;
  }

  const isClosed = ticket.status === "closed";

  return (
    <>
      <button type="button" className="btn btn-outline-secondary btn-sm mb-3"
        onClick={() => navigate("/admin/tickets")}>
        ← All tickets
      </button>

      {/* ── Header ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <span className="small text-muted text-uppercase">Subject</span>
          <h5 className="fw-bold mb-1">{ticket.subject}</h5>
          <div className="small text-muted">
            Ticket #{ticket.id} · Created{" "}
            {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "—"}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <StatusBadge status={ticket.status} />
          <select
            className="form-select form-select-sm"
            style={{ minWidth: 140 }}
            disabled={statusUpdating}
            value={ticket.status}
            onChange={(e) => handleStatus(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* ── User info ── */}
      {ticket.owner && (
        <div className="card border-0 shadow-sm rounded-3 mb-3">
          <div className="card-body py-2">
            <span className="small text-muted text-uppercase fw-bold">User</span>
            <div className="fw-semibold">
              {ticket.owner.firstName} {ticket.owner.lastName} (@{ticket.owner.userName})
            </div>
            <div className="small text-muted">{ticket.owner.email}</div>
          </div>
        </div>
      )}

      {/* ── Original description ── */}
      {ticket.description && (
        <div className="card border-0 shadow-sm rounded-3 mb-3">
          <div className="card-body">
            <h6 className="small text-muted text-uppercase fw-bold mb-2">Ticket description</h6>
            <p className="mb-2" style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</p>
            {ticket.file && (
              <a href={ticket.file} target="_blank" rel="noreferrer" className="small">
                📎 View attachment
              </a>
            )}
          </div>
        </div>
      )}

      <h6 className="fw-semibold mb-2">Conversation</h6>
      <div
        className="rounded-3 p-3 mb-3"
        style={{ background: "#ece5dd", minHeight: 200, maxHeight: 480, overflowY: "auto" }}
      >
        {messages.length === 0 && (
          <p className="text-center text-muted small mt-4 mb-0">No messages yet.</p>
        )}
        {messages.map((m) => {
          const isOwn = m.senderType === "admin";
          return (
            <div key={m.id} className={`d-flex mb-2 ${isOwn ? "justify-content-end" : "justify-content-start"}`}>
              <div style={isOwn ? BUBBLE_OWN : BUBBLE_OTHER}>
                <div className="d-flex justify-content-between align-items-center gap-3 mb-1">
                  <span className="fw-semibold" style={{ fontSize: 12 }}>
                    {isOwn ? "You (Admin)" : "User"}
                  </span>
                  <span className="text-muted" style={{ fontSize: 11 }}>
                    {m.createdAt
                      ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </span>
                </div>
                <p className="mb-1 small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {m.message}
                </p>
                {m.file && (
                  <a href={m.file} target="_blank" rel="noreferrer" className="small d-block mt-1">
                    📎 Attachment
                  </a>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Reply input – hidden when closed ── */}
      {isClosed ? (
        <div className="alert alert-secondary text-center small mb-0">
          This ticket is closed. No further replies can be sent.
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-3">
          <div className="card-body">
            <h6 className="fw-semibold mb-2">Reply as admin</h6>
            <form onSubmit={handleSend}>
              <textarea
                className="form-control mb-2"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply…"
              />
              <input
                ref={fileRef}
                type="file"
                className="form-control mb-2"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button type="submit" disabled={sending} className="btn btn-warning fw-semibold me-2">
                {sending ? "Sending…" : "Send"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary fw-semibold"
                disabled={sending}
                onClick={() => { setReply(""); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              >
                Clear
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminTicketDetailSection;