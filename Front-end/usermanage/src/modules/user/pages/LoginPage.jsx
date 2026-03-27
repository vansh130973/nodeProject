import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { apiLoginUser } from "../services/user.service";
import { validateLoginForm } from "../validations/user.validation";
import { showApiError } from "../../../utils/api";
import InputField from "../../../components/InputField";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ userName: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateLoginForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    const toastId = toast.loading("Signing in...");
    try {
      const data = await apiLoginUser(form);
      login(data.token);
      const decoded = JSON.parse(atob(data.token.split(".")[1]));
      toast.update(toastId, {
        render: `Welcome back, ${decoded.userName}!`,
        type: "success", isLoading: false, autoClose: 3000,
      });
      navigate("/dashboard");
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.message || "";
      if (msg.toLowerCase().includes("username")) setErrors({ userName: msg });
      else if (msg.toLowerCase().includes("password")) setErrors({ password: msg });
      else showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
      <div className="card shadow-sm border-0 rounded-4 p-4" style={{ width: "100%", maxWidth: 420 }}>
        <div className="card-body">
          <h4 className="fw-bold mb-4">User Login</h4>
          <form onSubmit={handleSubmit} noValidate>
            <InputField label="Username" id="userName" name="userName"
              type="text" placeholder="Enter your username"
              value={form.userName} onChange={handleChange} error={errors.userName} />

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="password" className="form-label fw-semibold mb-0">Password</label>
              </div>
              <input
                id="password" name="password" type="password"
                placeholder="Enter your password"
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                value={form.password} onChange={handleChange}
              />
              {errors.password && <div className="invalid-feedback">{errors.password}</div>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-warning w-100 mt-2 fw-semibold">
              {loading ? <><span className="spinner-border spinner-border-sm me-2" />Signing in...</> : "Sign In"}
            </button>
          </form>
          <hr className="my-3" />
          <p className="text-center small mb-1">
            Don't have an account?{" "}
            <Link to="/register" className="text-decoration-none">Register</Link>
          </p>
          <p className="text-center small text-muted mb-1">
            Admin?{" "}
            <Link to="/admin/login" className="text-decoration-none text-secondary">Admin Login</Link>
          </p>
          <p className="text-center small text-muted">
            <Link to="/forgot-password" className="text-decoration-none small text-danger fw-semibold">Forgot password?</Link>
          </p>
          
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
