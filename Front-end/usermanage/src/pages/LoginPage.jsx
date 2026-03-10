// pages/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { apiLoginUser, showApiError } from "../services/api";
import InputField from "../components/InputField";

const validateLoginForm = (form) => {
  const errors = {};
  if (!form.userName.trim()) errors.userName = "Username is required";
  if (!form.password.trim()) errors.password = "Password is required";
  return errors;
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ userName: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateLoginForm(form);
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach((msg) => toast.error(msg));
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Signing in...");
    try {
      const data = await apiLoginUser(form);
      // Add default role for regular users
      const userWithRole = { ...data.user, role: "USER" };
      login(userWithRole, data.token);
      toast.update(toastId, {
        render: `Welcome back, ${data.user.userName}!`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      navigate("/dashboard");
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
          <h4 className="fw-bold mb-3">User Login</h4>

          <form onSubmit={handleSubmit} noValidate>
            <InputField
              label="Username"
              id="userName"
              name="userName"
              type="text"
              placeholder="Enter your username"
              value={form.userName}
              onChange={handleChange}
            />
            <InputField
              label="Password"
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
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
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <hr className="my-3" />

          <p className="text-center small mb-1">
            Don't have an account?{" "}
            <Link to="/register" className="text-decoration-none">
              Register
            </Link>
          </p>
          <p className="text-center small text-muted">
            Admin?{" "}
            <Link to="/admin/login" className="text-decoration-none text-secondary">
              Admin Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;