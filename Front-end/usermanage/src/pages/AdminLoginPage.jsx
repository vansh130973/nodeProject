// pages/AdminLoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { apiLoginAdmin, showApiError } from "../services/api";
import InputField from "../components/InputField";

const validateForm = (form) => {
  const errors = {};
  if (!form.userName.trim()) errors.userName = "Username is required";
  if (!form.password.trim()) errors.password = "Password is required";
  return errors;
};

const AdminLoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ userName: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach((msg) => toast.error(msg));
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Signing in as admin...");
    try {
      const data = await apiLoginAdmin(form);
      // data.admin already contains role from backend
      login(data.admin, data.token);
      toast.update(toastId, {
        render: `Welcome, Admin ${data.admin.userName}!`,
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
      <div
        className="card shadow-sm border-0 rounded-4 p-4"
        style={{ width: "100%", maxWidth: 420 }}
      >
        <div className="card-body">
          <h4 className="fw-bold mb-3">Admin Login</h4>

          <form onSubmit={handleSubmit} noValidate>
            <InputField
              label="Username"
              id="userName"
              name="userName"
              type="text"
              placeholder="Admin username"
              value={form.userName}
              onChange={handleChange}
            />
            <InputField
              label="Password"
              id="password"
              name="password"
              type="password"
              placeholder="Admin password"
              value={form.password}
              onChange={handleChange}
            />

            <button
              type="submit"
              disabled={loading}
              className="btn btn-warning w-100 mt-2 fw-semibold"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Logging in...
                </>
              ) : (
                "Login as Admin"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;