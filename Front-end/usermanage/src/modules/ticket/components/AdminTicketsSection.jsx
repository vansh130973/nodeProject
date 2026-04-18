import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiAdminListTickets } from "../services/ticket.service";
import { showApiError } from "../../../utils/api";

const PAGE_OPTS = [5, 10, 25, 50];

const statusBadge = (status) => {
  const map = {
    open: "bg-success",
    pending: "bg-warning text-dark",
    closed: "bg-secondary",
  };
  const cls = map[status] ?? "bg-light text-dark";
  return <span className={`badge ${cls}`}>{status}</span>;
};

const AdminTicketsSection = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const searchDebounce = useRef(null);

  const load = async (page = pagination.page, limitVal = pagination.limit, st = filterStatus, q = searchQuery) => {
    setLoading(true);
    try {
      const data = await apiAdminListTickets({
        page,
        limit: limitVal,
        status: st,
        search: q,
      });
      setTickets(data.tickets ?? []);
      if (data.pagination) setPagination(data.pagination);
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

  const handlePageChange = (page) => load(page, pagination.limit, filterStatus, searchQuery);

  const handleLimitChange = (limitVal) => load(1, limitVal, filterStatus, searchQuery);

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h5 className="fw-bold mb-0">Support tickets</h5>
        <span className="badge bg-primary">{pagination.total ?? 0} total</span>
      </div>

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
            <option value="pending">Pending</option>
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

      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning" />
            </div>
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
                        <td className="fw-semibold">{t.subject}</td>
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
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Prev
                  </button>
                  <span className="small text-muted">
                    Page {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminTicketsSection;
