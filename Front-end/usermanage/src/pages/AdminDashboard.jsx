import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { apiAddAdmin, apiGetAllUsers, apiGetAllAdmins, showApiError } from "../services/api";
import InputField from "../components/InputField";

const INITIAL_FORM = {
  userName: "",
  email: "",
  phone: "",
  password: "",
  conformPassword: "",
};

const validateAdminForm = (form) => {
  const errors = {};

  if (!form.userName.trim())
    errors.userName = "Username is required";
  else if (form.userName.length < 3)
    errors.userName = "Username must be at least 3 characters";
  else if (form.userName.length > 20)
    errors.userName = "Username must not exceed 20 characters";

  if (!form.email.trim())
    errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Invalid email format";

  if (!form.phone.trim())
    errors.phone = "Phone number is required";
  else if (!/^[0-9]{10}$/.test(form.phone))
    errors.phone = "Phone number must be exactly 10 digits";

  if (!form.password)
    errors.password = "Password is required";
  else if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(form.password))
    errors.password =
      "Password must be 8+ characters with 1 uppercase, 1 number, and 1 special character (@$!%*?&)";

  if (!form.conformPassword)
    errors.conformPassword = "Confirm password is required";
  else if (form.password !== form.conformPassword)
    errors.conformPassword = "Passwords do not match";

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
  const { admin } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]                 = useState("dashboard");
  const [users, setUsers]             = useState([]);
  const [admins, setAdmins]           = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [form, setForm]               = useState(INITIAL_FORM);

  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!admin) navigate("/admin/login");
  }, [admin, navigate]);

  useEffect(() => {
    if (!admin) return;
    const loadAll = async () => {
      try {
        const [usersData, adminsData] = await Promise.all([
          apiGetAllUsers(),
          apiGetAllAdmins(),
        ]);
        setUsers(usersData.users);
        setAdmins(adminsData.admins);
      } catch (err) {
        showApiError(err, (msg) => toast.error(msg));
      }
    };
    loadAll();
  }, [admin]);

  useEffect(() => {
    if (tab === "dashboard" || tab === "addAdmin") return;
    const load = async () => {
      setLoadingData(true);
      try {
        if (tab === "users") {
          const data = await apiGetAllUsers();
          setUsers(data.users);
        } else if (tab === "admins") {
          const data = await apiGetAllAdmins();
          setAdmins(data.admins);
        }
      } catch (err) {
        showApiError(err, (msg) => toast.error(msg));
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [tab]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();

    const errors = validateAdminForm(form);
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach((msg) => toast.error(msg));
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
      const data = await apiGetAllAdmins();
      setAdmins(data.admins);
    } catch (err) {
      toast.dismiss(toastId);
      showApiError(err, (msg) => toast.error(msg));
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
          onClick={() => setTab("dashboard")}
          className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
            ${tab === "dashboard" ? "bg-primary text-white fw-semibold" : "bg-transparent text-white-50"}`}
          title={!sidebarOpen ? "Dashboard" : ""}
        >
          {sidebarOpen ? <span className="small">Dashboard</span> : "D"}
        </button>

        <button
          onClick={() => setTab("users")}
          className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
            ${tab === "users" ? "bg-primary text-white fw-semibold" : "bg-transparent text-white-50"}`}
          title={!sidebarOpen ? "All Users" : ""}
        >
          {sidebarOpen ? <span className="small">All Users</span> : "U"}
        </button>

        <button
          onClick={() => setTab("admins")}
          className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
            ${tab === "admins" ? "bg-primary text-white fw-semibold" : "bg-transparent text-white-50"}`}
          title={!sidebarOpen ? "All Admins" : ""}
        >
          {sidebarOpen ? <span className="small">All Admins</span> : "A"}
        </button>

        <button
          onClick={() => setTab("addAdmin")}
          className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
            ${tab === "addAdmin" ? "bg-primary text-white fw-semibold" : "bg-transparent text-white-50"}`}
          title={!sidebarOpen ? "Add Admin" : ""}
        >
          {sidebarOpen ? <span className="small">Add Admin</span> : "+"}
        </button>
      </nav>

      {/* Admin info at bottom */}
      {sidebarOpen && (
        <div className="p-3 border-top border-secondary">
          <p className="text-white-50 small mb-0">Logged in as</p>
          <p className="text-white fw-semibold small mb-0 text-truncate">{admin?.userName}</p>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (tab) {

      case "dashboard":
        return (
          <>
            <h5 className="fw-bold mb-4">Dashboard Overview</h5>
            <div className="row g-3 mb-4">
              <div className="col-sm-6 col-lg-4">
                <div
                  className="card border-0 shadow-sm rounded-3 h-100"
                  style={{ borderLeft: "4px solid #0d6efd", cursor: "pointer" }}
                  onClick={() => setTab("users")}
                >
                  <div className="card-body d-flex align-items-center gap-3">
                    <div>
                      <p className="text-muted small mb-1">Total Users</p>
                      <h3 className="fw-bold mb-0">{users.length}</h3>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-4">
                <div
                  className="card border-0 shadow-sm rounded-3 h-100"
                  style={{ borderLeft: "4px solid #ffc107", cursor: "pointer" }}
                  onClick={() => setTab("admins")}
                >
                  <div className="card-body d-flex align-items-center gap-3">
                    <div>
                      <p className="text-muted small mb-1">Total Admins</p>
                      <h3 className="fw-bold mb-0">{admins.length}</h3>
                    </div>
                  </div>
                </div>
              </div>
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
                      id: a.id, userName: a.userName, email: a.email, phone: a.phone,
                    }))}
                    emptyMsg="No admins found"
                  />
                )}
              </div>
            </div>
          </>
        );

      case "addAdmin":
        return (
          <>
            <h5 className="fw-bold mb-4">Add New Admin</h5>
            <div className="row justify-content-start">
              <div className="col-md-7 col-lg-5">
                <div className="card border-0 shadow-sm rounded-3">
                  <div className="card-body">
                    <form onSubmit={handleAddAdmin} noValidate>
                      <InputField
                        label="Username" id="userName" name="userName" type="text"
                        placeholder="adminuser" value={form.userName}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Email" id="email" name="email" type="email"
                        placeholder="admin@example.com" value={form.email}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Phone" id="phone" name="phone" type="tel"
                        placeholder="10-digit number" value={form.phone}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Password" id="password" name="password" type="password"
                        placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                        value={form.password} onChange={handleChange}
                      />
                      <InputField
                        label="Confirm Password" id="conformPassword" name="conformPassword"
                        type="password" placeholder="Repeat password"
                        value={form.conformPassword} onChange={handleChange}
                      />
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="btn btn-warning w-100 mt-2 fw-semibold"
                      >
                        {formLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Adding...
                          </>
                        ) : (
                          "Add Admin"
                        )}
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