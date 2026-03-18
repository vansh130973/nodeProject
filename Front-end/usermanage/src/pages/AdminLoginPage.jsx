import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { apiLoginAdmin, showApiError } from "../services/api";
import InputField from "../components/InputField";

const AdminLoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ userName: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userName.trim()) return toast.error("Username is required");
    if (!form.password.trim()) return toast.error("Password is required");

    setLoading(true);
    const toastId = toast.loading("Signing in...");
    try {
      const data = await apiLoginAdmin(form);

      login(data.token); 

      const decoded = JSON.parse(atob(data.token.split(".")[1]));
      toast.update(toastId, {
        render: `Welcome, ${decoded.userName}!`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      navigate("/admin/dashboard");
    } catch (err) {
      toast.dismiss(toastId);
      showApiError(err, (msg) => toast.error(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
      <div className="card shadow-sm border-0 rounded-4 p-4" style={{ width: "100%", maxWidth: 420 }}>
        <div className="card-body">
          <h4 className="fw-bold mb-1">Admin Login</h4>
          <p className="text-muted small mb-4">Sign in to your admin panel</p>

          <form onSubmit={handleSubmit} noValidate>
            <InputField label="Username" id="userName" name="userName"
              type="text" placeholder="Enter admin username"
              value={form.userName} onChange={handleChange} autocomplete="userName" />

            <InputField label="Password" id="password" name="password"
              type="password" placeholder="Enter your password"
              value={form.password} onChange={handleChange} autocomplete="password" />

            <button type="submit" disabled={loading} className="btn btn-dark w-100 mt-2 fw-semibold">
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Signing in...</>
              ) : "Admin Sign In"}
            </button>
          </form>

          <hr className="my-3" />
          <p className="text-center small text-muted mb-0">
            User?{" "}
            <Link to="/login" className="text-decoration-none">User Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;