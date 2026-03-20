import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { apiAddAdmin, apiGetAllUsers, apiGetAllAdmins, showApiError } from "../services/api";
import InputField from "../components/InputField";
import "bootstrap-icons/font/bootstrap-icons.css";

const INITIAL_FORM = {
  userName: "",
  email: "",
  phone: "",
  password: "",
  conformPassword: "",
};

const validateAdminForm = (form) => {
  const errors = {};
  if (!form.userName.trim()) errors.userName = "Username is required";
  else if (form.userName.length < 3) errors.userName = "Username must be at least 3 characters";
  else if (form.userName.length > 20) errors.userName = "Username must not exceed 20 characters";

  if (!form.email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email format";

  if (!form.phone.trim()) errors.phone = "Phone number is required";
  else if (!/^[0-9]{10}$/.test(form.phone)) errors.phone = "Phone number must be exactly 10 digits";

  if (!form.password) errors.password = "Password is required";
  else if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(form.password))
    errors.password = "Must be 8+ chars with 1 uppercase, 1 number, 1 special character";

  if (!form.conformPassword) errors.conformPassword = "Confirm password is required";
  else if (form.password !== form.conformPassword) errors.conformPassword = "Passwords do not match";

  return errors;
};

const DataTable = ({ columns, rows, emptyMsg }) => (
  <div className="table-responsive">
    <table className="table table-bordered table-hover align-middle mb-0">
      <thead className="table-dark">
        <tr>
          {columns.map((col) => (
            <th key={col} className="text-uppercase small fw-semibold">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="text-center text-muted py-4">
              {emptyMsg}
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={i}>
              {Object.values(row).map((val, j) => (
                <td key={j}>{val}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const getActiveTab = () => {
    if (pathname === "/admin/dashboard") return "dashboard";
    if (pathname === "/admin/users") return "users";
    if (pathname === "/admin/admins") return "admins";
    if (pathname === "/admin/add-admin") return "addAdmin";
    return "dashboard";
  };
  const activeTab = getActiveTab();

  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!user || !(user.role === "ADMIN" || user.role === "MASTER_ADMIN")) {
      navigate("/admin/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const loadInitial = async () => {
      try {
        const usersData = await apiGetAllUsers();
        setUsers(usersData.users);
      } catch (err) {
        showApiError(err, (msg) => toast.error(msg));
      }
      if (user.role === "MASTER_ADMIN") {
        try {
          const adminsData = await apiGetAllAdmins();
          setAdmins(adminsData.admins);
        } catch (err) {
          showApiError(err, (msg) => toast.error(msg));
        }
      }
    };
    loadInitial();
  }, [user]);

  useEffect(() => {
    if (activeTab === "dashboard" || activeTab === "addAdmin") return;
    const load = async () => {
      setLoadingData(true);
      try {
        if (activeTab === "users") {
          const data = await apiGetAllUsers();
          setUsers(data.users);
        } else if (activeTab === "admins") {
          if (user?.role !== "MASTER_ADMIN") throw new Error("Only Master Admin can see this!!!");
          const data = await apiGetAllAdmins();
          setAdmins(data.admins);
        }
      } catch (err) {
        showApiError(err, (msg) => toast.error(msg));
        navigate("/admin/dashboard");
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [activeTab, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();

    const errors = validateAdminForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormLoading(true);
    const toastId = toast.loading("Adding admin...");
    try {
      await apiAddAdmin(form);
      toast.update(toastId, {
        render: "Admin added successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      setForm(INITIAL_FORM);
      setFormErrors({});
      const data = await apiGetAllAdmins();
      setAdmins(data.admins);
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.message || "";
      if (msg.toLowerCase().includes("email"))
        setFormErrors((p) => ({ ...p, email: msg }));
      else if (msg.toLowerCase().includes("username"))
        setFormErrors((p) => ({ ...p, userName: msg }));
      else
        showApiError(err, (m) => toast.error(m));
    } finally {
      setFormLoading(false);
    }
  };

  const Sidebar = () => (
    <div
      className="d-flex flex-column bg-dark text-white"
      style={{
        width: sidebarOpen ? 240 : 64,
        minHeight: "calc(100vh - 56px)",
        transition: "width 0.25s ease",
        flexShrink: 0,
      }}
    >
      <nav className="flex-grow-1 py-2">
        <button
          onClick={() => navigate("/admin/dashboard")}
          className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
            ${activeTab === "dashboard" ? "bg-warning text-black fw-semibold" : "bg-transparent text-white-50"}`}
          title={!sidebarOpen ? "Dashboard" : ""}
        >
          <i className="bi bi-speedometer2 fs-5 flex-shrink-0" />
          {sidebarOpen && <span className="small">Dashboard</span>}
        </button>

        <button
          onClick={() => navigate("/admin/users")}
          className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
            ${activeTab === "users" ? "bg-warning text-black fw-semibold" : "bg-transparent text-white-50"}`}
          title={!sidebarOpen ? "All Users" : ""}
        >
          <i className="bi bi-people fs-5 flex-shrink-0" />
          {sidebarOpen && <span className="small">All Users</span>}
        </button>

        {user?.role === "MASTER_ADMIN" && (
          <button
            onClick={() => navigate("/admin/admins")}
            className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
              ${activeTab === "admins" ? "bg-warning text-black fw-semibold" : "bg-transparent text-white-50"}`}
            title={!sidebarOpen ? "All Admins" : ""}
          >
            <i className="bi bi-shield-lock fs-5 flex-shrink-0" />
            {sidebarOpen && <span className="small">All Admins</span>}
          </button>
        )}

        {user?.role === "MASTER_ADMIN" && (
          <button
            onClick={() => navigate("/admin/add-admin")}
            className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
              ${activeTab === "addAdmin" ? "bg-warning text-black fw-semibold" : "bg-transparent text-white-50"}`}
            title={!sidebarOpen ? "Add Admin" : ""}
          >
            <i className="bi bi-person-plus fs-5 flex-shrink-0" />
            {sidebarOpen && <span className="small">Add Admin</span>}
          </button>
        )}
      </nav>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {

      case "dashboard":
        return (
          <>
            <h5 className="fw-bold mb-4">Dashboard</h5>
            <div className="row g-3 mb-4">
              <div className="col-sm-6 col-lg-4">
                <div
                  className="card border-0 shadow-sm rounded-3 h-100"
                  style={{ borderLeft: "4px solid #0d6efd", cursor: "pointer" }}
                  onClick={() => navigate("/admin/users")}
                >
                  <div className="card-body d-flex align-items-center gap-3">
                    <div>
                      <p className="text-muted small mb-1">Total Users</p>
                      <h3 className="fw-bold mb-0">{users.length}</h3>
                    </div>
                  </div>
                </div>
              </div>
              {user?.role === "MASTER_ADMIN" && (
                <div className="col-sm-6 col-lg-4">
                  <div
                    className="card border-0 shadow-sm rounded-3 h-100"
                    style={{ borderLeft: "4px solid rgba(255, 193, 7, 1)", cursor: "pointer" }}
                    onClick={() => navigate("/admin/admins")}
                  >
                    <div className="card-body d-flex align-items-center gap-3">
                      <div>
                        <p className="text-muted small mb-1">Total Admins</p>
                        <h3 className="fw-bold mb-0">{admins.length}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        );

      case "users":
        return (
          <>
            <h5 className="fw-bold mb-4">All Users</h5>
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-header bg-white border-bottom fw-semibold">
                Registered Users
                <span className="badge bg-primary ms-2">{users.length}</span>
              </div>
              <div className="card-body p-0">
                {loadingData ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" />
                  </div>
                ) : (
                  <DataTable
                    columns={["ID", "First Name", "Last Name", "Username", "Phone", "Email"]}
                    rows={users.map((u) => ({
                      id: u.id,
                      firstName: u.firstName,
                      lastName: u.lastName,
                      userName: u.userName,
                      phone: u.phone,
                      email: u.email,
                    }))}
                    emptyMsg="No users found"
                  />
                )}
              </div>
            </div>
          </>
        );

      case "admins":
        if (user?.role !== "MASTER_ADMIN") {
          navigate("/admin/dashboard");
          return null;
        }
        return (
          <>
            <h5 className="fw-bold mb-4">All Admins</h5>
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-header bg-white border-bottom fw-semibold">
                Admin Accounts
                <span className="badge bg-primary text-white ms-2">{admins.length}</span>
              </div>
              <div className="card-body p-0">
                {loadingData ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-warning" />
                  </div>
                ) : (
                  <DataTable
                    columns={["ID", "Username", "Email", "Phone"]}
                    rows={admins.map((a) => ({
                      id: a.id,
                      userName: a.userName,
                      email: a.email,
                      phone: a.phone,
                    }))}
                    emptyMsg="No admins found"
                  />
                )}
              </div>
            </div>
          </>
        );

      case "addAdmin":
        if (user?.role !== "MASTER_ADMIN") {
          navigate("/admin/dashboard");
          return null;
        }
        return (
          <>
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                <div className="card border-0 shadow-sm rounded-3">
                  <h5 className="card-header p-4">Add New Admin</h5>
                  <div className="card-body p-4">
                    <form onSubmit={handleAddAdmin} noValidate>
                      <InputField
                        label="Username" id="userName" name="userName" type="text"
                        placeholder="adminuser" value={form.userName}
                        onChange={handleChange}
                        error={formErrors.userName}
                      />
                      <InputField
                        label="Email" id="email" name="email" type="email"
                        placeholder="admin@example.com" value={form.email}
                        onChange={handleChange}
                        error={formErrors.email}
                      />
                      <InputField
                        label="Phone" id="phone" name="phone" type="tel"
                        placeholder="10-digit number" value={form.phone}
                        onChange={handleChange}
                        error={formErrors.phone}
                      />
                      <InputField
                        label="Password" id="password" name="password" type="password"
                        placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                        value={form.password} onChange={handleChange}
                        error={formErrors.password}
                      />
                      <InputField
                        label="Confirm Password" id="conformPassword" name="conformPassword"
                        type="password" placeholder="Repeat password"
                        value={form.conformPassword} onChange={handleChange}
                        error={formErrors.conformPassword}
                      />
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="btn btn-warning w-100 py-2 mt-2 fw-semibold"
                      >
                        {formLoading ? (
                          <><span className="spinner-border spinner-border-sm me-2" />Adding...</>
                        ) : "Add Admin"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
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

export default AdminDashboard;