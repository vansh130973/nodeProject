import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import {
  apiUpdateUserProfile,
  apiChangePassword,
  apiLogoutUser,
  apiGetNotifications,
  apiReadAllNotifications,
} from "../services/user.service";
import { validateEditProfileForm, validateChangePasswordForm } from "../validations/user.validation";
import { showApiError } from "../../../utils/api";
import useUserProfile from "../hooks/useUserProfile";
import InputField from "../../../components/InputField";
import { connectSocket, onSocket, offSocket, SOCKET_EVENTS } from "../../../utils/socket";
import { useNotification } from "../../../context/NotificationContext";
import UserTicketsSection from "../../ticket/components/UserTicketsSection";
import UserTicketDetailSection from "../../ticket/components/UserTicketDetailSection";
import "bootstrap-icons/font/bootstrap-icons.css";

const UserDashboard = () => {
  const { logout, updateUser } = useAuth();
  const { incrementNotifCount, resetNotifCount, syncNotifCount } = useNotification();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { profile, setProfile, guardedCall } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getActiveTab = () => {
    if (pathname === "/dashboard")       return "profile";
    if (pathname === "/edit-profile")    return "edit";
    if (pathname === "/change-password") return "password";
    if (pathname.startsWith("/tickets/")) return "ticketDetail";
    if (pathname === "/tickets")         return "tickets";
    if (pathname === "/notifications")   return "notifications";
    return "profile";
  };
  const activeTab = getActiveTab();

  const [unreadCount,    setUnreadCount]    = useState(0);
  const [seenTicketIds, setSeenTicketIds] = useState(() => {
    try {
      const raw = sessionStorage.getItem("user_seenTicketIds");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  const addSeenTicket = (ticketId) => {
    setSeenTicketIds((prev) => {
      if (prev.has(ticketId)) return prev;
      const next = new Set(prev);
      next.add(ticketId);
      try { sessionStorage.setItem("user_seenTicketIds", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const removeSeenTicket = (ticketId) => {
    setSeenTicketIds((prev) => {
      if (!prev.has(ticketId)) return prev;
      const next = new Set(prev);
      next.delete(ticketId);
      try { sessionStorage.setItem("user_seenTicketIds", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // ── Broadcast notifications — loaded from DB ─────────────────────────────────
  const [broadcastNotifs,   setBroadcastNotifs]   = useState([]);
  const [unreadNotifCount,  setUnreadNotifCount]  = useState(0);
  const [notifLoading,      setNotifLoading]      = useState(false);
  const [markingAllRead,    setMarkingAllRead]     = useState(false);
  // Pagination state for notifications
  const [notifPage,         setNotifPage]         = useState(1);
  const [notifTotalPages,   setNotifTotalPages]   = useState(1);
  const [notifTotal,        setNotifTotal]        = useState(0);

  // Fetch notifications with pagination
  const fetchUserNotifications = useCallback(async (page = 1) => {
    setNotifLoading(true);
    try {
      const data = await apiGetNotifications(page);
      setBroadcastNotifs(data.notifications ?? []);
      setUnreadNotifCount(data.unreadCount ?? 0);
      syncNotifCount(data.unreadCount ?? 0);  // ← keep Navbar badge in sync
      setNotifPage(data.pagination.page);
      setNotifTotalPages(data.pagination.totalPages);
      setNotifTotal(data.pagination.total);
    } catch {
      // silently ignore
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // Load notifications on mount
  useEffect(() => {
    fetchUserNotifications(1);
  }, [fetchUserNotifications]);

  // Clear notification badge when user opens the Notifications tab
  useEffect(() => {
    if (activeTab === "notifications" && unreadNotifCount > 0) {
      setUnreadNotifCount(0);
      resetNotifCount();   // ← clear Navbar bell badge too
      setBroadcastNotifs((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
      apiReadAllNotifications().catch(() => {});
    }
  }, [activeTab]);

  const handleTicketsLoaded = (tickets) => {
    const count = tickets.filter(
      (t) => t.status === "adminReply" && !seenTicketIds.has(t.id)
    ).length;
    setUnreadCount(count);
  };

  const handleTicketViewed = (ticketId) => {
    addSeenTicket(ticketId);
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  // ── Real-time badge: bump whenever admin sends a message (any tab) ────────
  useEffect(() => {
    connectSocket();

    // Admin replied → mark ticket as unseen again so badge shows, then bump count
    const onMsg = (payload) => {
      const ticketId = Number(payload.ticketId);
      // Always remove from seen so the NewReplyBadge re-appears on the list row
      removeSeenTicket(ticketId);
      setUnreadCount((prev) => prev + 1);
    };

    // Status changed to "open" means user opened the ticket → clear badge for it
    const onStatus = (payload) => {
      if (payload.status === "open") {
        const ticketId = Number(payload.ticketId);
        addSeenTicket(ticketId);
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    };

    // Broadcast notification from master admin → bump badge + prepend to list
    const onBroadcast = (notification) => {
      // Only update badge if user is NOT already on the notifications tab
      setUnreadNotifCount((prev) => {
        const isOnNotifTab = window.location.pathname === "/notifications";
        return isOnNotifTab ? prev : prev + 1;
      });
      if (window.location.pathname !== "/notifications") {
        incrementNotifCount();  // ← update Navbar bell badge
      }
      // Prepend the new notification to page 1 of the list (only if on page 1)
      setBroadcastNotifs((prev) => {
        if (notifPage !== 1) return prev; // don't mess up pagination
        const newEntry = {
          id:     notification.id,
          title:  notification.title,
          body:   notification.body,
          sentAt: notification.sentAt,
          sentBy: notification.sentBy,
          isRead: 0,
        };
        return [newEntry, ...prev];
      });
      setNotifTotal((prev) => prev + 1);
    };

    onSocket(SOCKET_EVENTS.TICKET_MSG,    onMsg);
    onSocket(SOCKET_EVENTS.TICKET_STATUS, onStatus);
    onSocket(SOCKET_EVENTS.BROADCAST,     onBroadcast);

    return () => {
      offSocket(SOCKET_EVENTS.TICKET_MSG,    onMsg);
      offSocket(SOCKET_EVENTS.TICKET_STATUS, onStatus);
      offSocket(SOCKET_EVENTS.BROADCAST,     onBroadcast);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenTicketIds]);

  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "", gender: "" });
  const [editErrors, setEditErrors] = useState({});
  const [newImage, setNewImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const [pwForm, setPwForm] = useState({ newPassword: "", confirmNewPassword: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);

  if (profile && !editForm.firstName && profile.firstName) {
    setEditForm({
      firstName: profile.firstName,
      lastName:  profile.lastName,
      phone:     profile.phone,
      gender:    profile.gender ?? "",
    });
  }

  const handleEditChange = (e) => {
    setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setEditErrors((p) => ({ ...p, [e.target.name]: "" }));
  };

  const handlePwChange = (e) => {
    setPwForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setPwErrors((p) => ({ ...p, [e.target.name]: "" }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setNewImage(file); setPreview(URL.createObjectURL(file)); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errs = validateEditProfileForm(editForm);
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    const formData = new FormData();
    formData.append("firstName", editForm.firstName);
    formData.append("lastName",  editForm.lastName);
    formData.append("phone",     editForm.phone);
    formData.append("gender",    editForm.gender);
    if (newImage) formData.append("profilePicture", newImage);
    else if (profile.profilePicture) formData.append("profilePicture", profile.profilePicture);

    setEditLoading(true);
    try {
      await guardedCall(
        () => apiUpdateUserProfile(formData),
        (res) => {
          setProfile(res.data);
          updateUser({ profilePicture: res.data.profilePicture, userName: res.data.userName });
          setPreview(null);
          setNewImage(null);
          toast.success("Profile updated successfully");
          navigate("/dashboard");
        }
      );
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setEditLoading(false);
    }
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    const errs = validateChangePasswordForm(pwForm);
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setPwLoading(true);
    try {
      await guardedCall(
        () => apiChangePassword(pwForm),
        async () => {
          toast.success("Password changed! Please login again.");
          await apiLogoutUser().catch(() => {});
          logout();
          navigate("/login");
        }
      );
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setPwLoading(false);
    }
  };

  const imgSrc = preview ?? profile?.profilePicture ?? null;

  const Sidebar = () => (
    <div
      className="d-flex flex-column bg-dark text-white"
      style={{
        width: sidebarOpen ? 240 : 64,
        minHeight: "calc(100vh - 56px)",
        transition: "width 0.25s ease",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div className="d-flex justify-content-end p-2">
        <button
          className="btn btn-dark border border-secondary"
          onClick={() => setSidebarOpen((p) => !p)}
          style={{
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
          }}
        >
          <i className={`bi ${sidebarOpen ? "bi-chevron-left" : "bi-chevron-right"}`} />
        </button>
      </div>
      <nav className="flex-grow-1 py-2">
        {[
          { label: "Profile", path: "/dashboard", tab: "profile", icon: "bi-person-circle" },
          { label: "My Tickets", path: "/tickets", tab: "tickets", icon: "bi-ticket-perforated" },
          { label: "Notifications", path: "/notifications", tab: "notifications", icon: "bi-bell" },
        ].map(({ label, path, tab, icon }) => {
          const isTicketTab =
            tab === "tickets" && (activeTab === "tickets" || activeTab === "ticketDetail");
          const isActive = tab === "tickets" ? isTicketTab : activeTab === tab;
          const showBadge  = tab === "tickets"      && unreadCount > 0;
          const showNotifB = tab === "notifications" && unreadNotifCount > 0;
          return (
            <button
              key={tab}
              onClick={() => navigate(path)}
              title={!sidebarOpen ? label : ""}
              className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
                ${isActive ? "bg-warning text-black fw-semibold" : "bg-transparent text-white-50"}`}
              style={{ whiteSpace: "nowrap", overflow: "hidden" }}
            >
              <i className={`bi ${icon} fs-5 flex-shrink-0`} />
              {sidebarOpen && <span className="small flex-grow-1">{label}</span>}
              {showBadge && (
                <span className="badge rounded-pill bg-danger" style={{ fontSize: 11 }}>{unreadCount}</span>
              )}
              {showNotifB && (
                <span className="badge rounded-pill bg-warning text-dark" style={{ fontSize: 11 }}>{unreadNotifCount}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );

  const renderContent = () => {
    if (!profile) {
      return (
        <div className="d-flex align-items-center justify-content-center h-100">
          <div className="spinner-border text-warning" />
        </div>
      );
    }

    switch (activeTab) {
      case "profile":
        return (
          <>
            <h5 className="fw-bold mb-4">Profile</h5>
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body">
                <div className="d-flex align-items-center gap-4 mb-4 pb-3 border-bottom">
                  <div className="rounded-circle overflow-hidden border flex-shrink-0"
                    style={{ width: 80, height: 80, background: "#f0f0f0" }}>
                    {imgSrc
                      ? <img src={imgSrc} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div className="d-flex align-items-center justify-content-center h-100 text-muted" style={{ fontSize: 32 }}>👤</div>
                    }
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">{profile.firstName} {profile.lastName}</h5>
                    <small className="text-muted">@{profile.userName}</small>
                  </div>
                </div>
                <dl className="row mb-0">
                  {[
                    ["First Name", profile.firstName],
                    ["Last Name", profile.lastName],
                    ["Username", profile.userName],
                    ["Email", profile.email],
                    ["Phone", profile.phone],
                    ["Gender", profile.gender ?? "—"],
                    ["Status", profile.status],
                  ].map(([label, value]) => (
                    <div key={label} className="row mb-3">
                      <dt className="col-4 text-muted fw-normal small">{label}</dt>
                      <dd className="col-8 fw-semibold mb-0">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </>
        );

      case "edit":
        return (
          <>
            <h5 className="fw-bold mb-4">Edit Profile</h5>
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                <div className="card border-0 shadow-sm rounded-3">
                  <div className="card-body p-4">
                    <form onSubmit={handleEditSubmit} noValidate>
                      <div className="mb-4 text-center">
                        <div className="rounded-circle overflow-hidden mx-auto mb-3 border"
                          style={{ width: 100, height: 100, background: "#f0f0f0" }}>
                          {imgSrc
                            ? <img src={imgSrc} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div className="d-flex align-items-center justify-content-center h-100 text-muted" style={{ fontSize: 36 }}>👤</div>
                          }
                        </div>
                        <label className="btn btn-sm btn-outline-secondary px-3">
                          Change Photo
                          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleImageChange} />
                        </label>
                      </div>

                      <div className="row">
                        <div className="col-6">
                          <InputField label="First Name" id="firstName" name="firstName"
                            type="text" value={editForm.firstName}
                            onChange={handleEditChange} error={editErrors.firstName} />
                        </div>
                        <div className="col-6">
                          <InputField label="Last Name" id="lastName" name="lastName"
                            type="text" value={editForm.lastName}
                            onChange={handleEditChange} error={editErrors.lastName} />
                        </div>
                      </div>

                      <InputField label="Phone" id="phone" name="phone"
                        type="tel" value={editForm.phone}
                        onChange={handleEditChange} error={editErrors.phone} />

                      <div className="mb-4">
                        <label className="form-label fw-semibold">Gender</label>
                        <select name="gender"
                          className={`form-select ${editErrors.gender ? "is-invalid" : ""}`}
                          value={editForm.gender} onChange={handleEditChange}>
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                        {editErrors.gender && <div className="invalid-feedback">{editErrors.gender}</div>}
                      </div>

                      <button type="submit" disabled={editLoading} className="btn btn-warning w-100 py-2 fw-semibold">
                        {editLoading ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : "Save Changes"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      case "tickets":
        return <UserTicketsSection onTicketsLoaded={handleTicketsLoaded} seenTicketIds={seenTicketIds} />;

      case "ticketDetail":
        return <UserTicketDetailSection onTicketViewed={handleTicketViewed} />;

      case "password":
        return (
          <>
            <h5 className="fw-bold mb-4">Change Password</h5>
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                <div className="card border-0 shadow-sm rounded-3">
                  <div className="card-body p-4">
                    <form onSubmit={handlePwSubmit} noValidate>
                      <InputField label="New Password" id="newPassword" name="newPassword"
                        type="password" placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                        value={pwForm.newPassword} onChange={handlePwChange} error={pwErrors.newPassword} />
                      <div className="mb-4">
                        <InputField label="Confirm New Password" id="confirmNewPassword" name="confirmNewPassword"
                          type="password" placeholder="Repeat new password"
                          value={pwForm.confirmNewPassword} onChange={handlePwChange} error={pwErrors.confirmNewPassword} />
                      </div>
                      <button type="submit" disabled={pwLoading} className="btn btn-danger w-100 py-2 fw-semibold">
                        {pwLoading ? <><span className="spinner-border spinner-border-sm me-2" />Changing...</> : "Change Password"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      case "notifications":
        return (
          <>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-bell me-2 text-warning" />
                Notifications
              </h5>
              <div className="d-flex align-items-center gap-2">
                {unreadNotifCount > 0 && (
                  <span className="badge bg-warning text-dark">{unreadNotifCount} unread</span>
                )}
                {broadcastNotifs.length > 0 && unreadNotifCount > 0 && (
                  <button
                    className="btn btn-sm btn-outline-secondary fw-semibold"
                    disabled={markingAllRead}
                    onClick={async () => {
                      setMarkingAllRead(true);
                      try {
                        await apiReadAllNotifications();
                        fetchUserNotifications(notifPage);
                      } catch {
                        toast.error("Failed to mark all as read");
                      } finally {
                        setMarkingAllRead(false);
                      }
                    }}
                  >
                    {markingAllRead
                      ? <span className="spinner-border spinner-border-sm" />
                      : "Mark all read"
                    }
                  </button>
                )}
              </div>
            </div>

            {notifLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-warning" />
              </div>
            ) : broadcastNotifs.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-3">
                <div className="card-body text-center py-5">
                  <i className="bi bi-bell-slash fs-1 text-muted mb-3 d-block" />
                  <p className="text-muted mb-0">No notifications yet.</p>
                  <p className="text-muted small">Admin broadcasts will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {broadcastNotifs.map((n, i) => (
                  <div
                    key={n.id ?? i}
                    className={`card border-0 shadow-sm rounded-3 border-start border-4 ${
                      n.isRead ? "border-secondary" : "border-warning"
                    }`}
                    style={{ opacity: n.isRead ? 0.75 : 1 }}
                  >
                    <div className="card-body px-4 py-3">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="d-flex align-items-center gap-2">
                          {!n.isRead && (
                            <span className="badge bg-warning text-dark" style={{ fontSize: 10 }}>NEW</span>
                          )}
                          <h6 className="fw-bold mb-0">{n.title}</h6>
                        </div>
                        <span className="text-muted ms-3" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                          <i className="bi bi-clock me-1" />
                          {n.sentAt ? new Date(n.sentAt).toLocaleString() : ""}
                        </span>
                      </div>
                      <p className="mb-0 text-secondary" style={{ fontSize: 14 }}>{n.body}</p>
                    </div>
                  </div>
                ))}

                {/* Pagination – same design as admin tables, no search/limit controls */}
                {notifTotalPages > 1 && (
                  <nav className="d-flex justify-content-end align-items-center gap-2 px-3 py-2 border-top bg-white">
                    <button className="btn btn-sm btn-outline-secondary"
                      disabled={notifPage === 1} onClick={() => fetchUserNotifications(notifPage - 1)}>
                      <i className="bi bi-chevron-left" />
                    </button>
                    {Array.from({ length: notifTotalPages }, (_, i) => i + 1).map((p) => (
                      <button key={p}
                        className={`btn btn-sm ${p === notifPage ? "btn-warning fw-bold" : "btn-outline-secondary"}`}
                        onClick={() => fetchUserNotifications(p)}>{p}</button>
                    ))}
                    <button className="btn btn-sm btn-outline-secondary"
                      disabled={notifPage === notifTotalPages} onClick={() => fetchUserNotifications(notifPage + 1)}>
                      <i className="bi bi-chevron-right" />
                    </button>
                  </nav>
                )}
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="d-flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      <Sidebar />
      <div className="flex-grow-1 p-4 bg-light overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default UserDashboard;