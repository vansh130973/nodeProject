import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiAdminListTickets } from "../services/ticket.service";
import { showApiError } from "../../../utils/api";
import { useSocket } from "../../../context/SocketContext";

const PAGE_OPTS = [5, 10, 25, 50];

const STATUS_META = {
  open:       { cls: "bg-success",        label: "Open" },
  closed:     { cls: "bg-secondary",      label: "Closed" },
  adminReply: { cls: "bg-info text-dark", label: "Admin Replied" },
  userReply:  { cls: "bg-danger",         label: "User Replied" },
};

const statusBadge = (status) => {
  const m = STATUS_META[status] ?? { cls: "bg-light text-dark", label: status };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
};

const NewReplyBadge = () => (
  <>
    <style>{`
      .nr-num-badge-admin {
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
        margin-left: 7px;
        flex-shrink: 0;
        line-height: 1;
      }
    `}</style>
    <span className="nr-num-badge-admin">1</span>
  </>
);

// ─── Pagination (reusable, with truncation) ────────────────────────────────────
const Pagination = ({ pagination, onPageChange }) => {
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    pages.push(1); // always first

    let start = Math.max(2, page - 1);
    let end = Math.min(totalPages - 1, page + 1);

    if (page <= 3) {
      start = 2;
      end = Math.min(totalPages - 1, 4);
    } else if (page >= totalPages - 2) {
      start = Math.max(2, totalPages - 3);
      end = totalPages - 1;
    }

    if (start > 2) pages.push('...');

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < totalPages - 1) pages.push('...');

    pages.push(totalPages); // always last
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="d-flex align-items-center gap-2">
      <button
        className="btn btn-sm btn-outline-secondary"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        <i className="bi bi-chevron-left" />
      </button>

      {pageNumbers.map((p, idx) => {
        if (p === '...') {
          return (
            <span key={`ellipsis-${idx}`} className="text-muted px-2" style={{ userSelect: 'none' }}>
              …
            </span>
          );
        }
        return (
          <button
            key={p}
            className={`btn btn-sm ${p === page ? 'btn-warning fw-bold' : 'btn-outline-secondary'}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        );
      })}

      <button
        className="btn btn-sm btn-outline-secondary"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <i className="bi bi-chevron-right" />
      </button>
    </div>
  );
};

const AdminTicketsSection = ({ onUnreadChange, seenTicketIds = new Set() }) => {
  const navigate = useNavigate();
  const socket   = useSocket();

  const [tickets,      setTickets]      = useState([]);
  const [pagination,   setPagination]   = useState({ page: 1, limit: 5, total: 0, totalPages: 1 });
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [loading,      setLoading]      = useState(true);
  const searchDebounce = useRef(null);

  const load = async (
    page     = pagination.page,
    limitVal = pagination.limit,
    st       = filterStatus,
    q        = searchQuery,
  ) => {
    setLoading(true);
    try {
      const data = await apiAdminListTickets({ page, limit: limitVal, status: st, search: q });
      const list = data.tickets ?? [];
      setTickets(list);
      if (data.pagination) setPagination(data.pagination);
      if (typeof data.unreadCount === "number") {
        const seenCount = list.filter(
          (t) => t.status === "userReply" && seenTicketIds.has(t.id)
        ).length;
        onUnreadChange?.(Math.max(0, data.unreadCount - seenCount));
      }
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, pagination.limit, filterStatus, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Live socket update: update ticket row instantly on new user reply ──────
  useEffect(() => {
    if (!socket) return;

    const onUserReply = ({ ticketId }) => {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, status: "userReply" } : t
        )
      );
    };

    // When admin sends a reply (from another tab/admin), update status to adminReply
    const onLiveMessage = ({ ticketId, senderType }) => {
      if (senderType === "admin") {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, status: "adminReply" } : t
          )
        );
      }
    };

    socket.on("ticket:userReply",  onUserReply);
    socket.on("ticket:liveMessage", onLiveMessage);
    return () => {
      socket.off("ticket:userReply",  onUserReply);
      socket.off("ticket:liveMessage", onLiveMessage);
    };
  }, [socket]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      load(1, pagination.limit, filterStatus, val);
    }, 350);
  };

  const handleFilterChange = (st) => {
    setFilterStatus(st);
    load(1, pagination.limit, st, searchQuery);
  };

  const handlePageChange  = (page)     => load(page, pagination.limit, filterStatus, searchQuery);
  const handleLimitChange = (limitVal) => load(1, limitVal, filterStatus, searchQuery);

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h5 className="fw-bold mb-0"><span className="bi-ticket-perforated me-2"></span> Tickets</h5>
        <span className="badge bg-primary">{pagination.total ?? 0} total</span>
      </div>

      {/* ── Filters ── */}
      <div className="card border-0 shadow-sm rounded-3 mb-3">
        <div className="card-body py-2 px-3 d-flex flex-wrap gap-2 align-items-center">
          <label className="small text-muted mb-0">Status</label>
          <select
            className="form-select form-select-sm"
            style={{ width: "auto" }}
            value={filterStatus}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="userReply">User Replied</option>
            <option value="adminReply">Admin Replied</option>
            <option value="closed">Closed</option>
          </select>
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ maxWidth: 260 }}
            placeholder="Search subject or description…"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-warning" /></div>
          ) : tickets.length === 0 ? (
            <p className="text-muted mb-0">No tickets match your filters.</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>User</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/admin/tickets/${t.id}`)}
                      >
                        <td className="fw-semibold">
                          <span>{t.subject}</span>
                          {t.status === "userReply" && !seenTicketIds.has(t.id) && (
                            <NewReplyBadge />
                          )}
                        </td>
                        <td className="small">
                          <div>{t.userName}</div>
                          <div className="text-muted">{t.email}</div>
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

              {/* ── Pagination ── */}
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 pt-3 border-top">
                <div className="d-flex align-items-center gap-2">
                  <span className="small text-muted">Rows</span>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={pagination.limit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                  >
                    {PAGE_OPTS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <Pagination pagination={pagination} onPageChange={handlePageChange} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminTicketsSection;