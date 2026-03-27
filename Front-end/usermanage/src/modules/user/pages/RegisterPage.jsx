import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { apiRegisterUser, apiLoginUser } from "../services/user.service";
import { validateRegisterForm } from "../validations/user.validation";
import { showApiError } from "../../../utils/api";
import InputField from "../../../components/InputField";

const INITIAL = {
  firstName: "", lastName: "", userName: "",
  email: "", phone: "", gender: "",
  password: "", confirmPassword: "",
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setProfilePicture(file); setPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateRegisterForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const formData = new FormData();
    Object.entries({
      firstName: form.firstName, lastName: form.lastName,
      userName: form.userName, email: form.email,
      phone: form.phone, gender: form.gender,
      password: form.password, confirmPassword: form.confirmPassword,
    }).forEach(([k, v]) => formData.append(k, v));
    if (profilePicture) formData.append("profilePicture", profilePicture);

    setLoading(true);
    const toastId = toast.loading("Creating your account...");
    try {
      await apiRegisterUser(formData);
      const loginData = await apiLoginUser({ userName: form.userName, password: form.password });
      login(loginData.token);
      const decoded = JSON.parse(atob(loginData.token.split(".")[1]));
      toast.update(toastId, {
        render: `Welcome, ${decoded.userName}!`,
        type: "success", isLoading: false, autoClose: 3000,
      });
      navigate("/dashboard");
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.message || "";
      if (msg.toLowerCase().includes("email")) setErrors((p) => ({ ...p, email: msg }));
      else if (msg.toLowerCase().includes("username")) setErrors((p) => ({ ...p, userName: msg }));
      else showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center py-5">
      <div className="card shadow-sm border-0 rounded-4 p-4" style={{ width: "100%", maxWidth: 520 }}>
        <div className="card-body">
          <h4 className="fw-bold mb-3">Create account</h4>
          <form onSubmit={handleSubmit} noValidate>

            <div className="mb-3 text-center">
              <div className="rounded-circle overflow-hidden mx-auto mb-2 border"
                style={{ width: 90, height: 90, background: "#f0f0f0" }}>
                {preview
                  ? <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div className="d-flex align-items-center justify-content-center h-100 text-muted small">No Image</div>
                }
              </div>
              <label className="btn btn-sm btn-outline-secondary">
                Upload Photo
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFileChange} />
              </label>
            </div>

            <div className="row">
              <div className="col-6">
                <InputField label="First Name" id="firstName" name="firstName"
                  type="text" placeholder="First Name"
                  value={form.firstName} onChange={handleChange} error={errors.firstName} />
              </div>
              <div className="col-6">
                <InputField label="Last Name" id="lastName" name="lastName"
                  type="text" placeholder="Last Name"
                  value={form.lastName} onChange={handleChange} error={errors.lastName} />
              </div>
            </div>

            <InputField label="Username" id="userName" name="userName"
              type="text" placeholder="Enter your Username"
              value={form.userName} onChange={handleChange} error={errors.userName} />
            <InputField label="Email" id="email" name="email"
              type="email" placeholder="Enter your Email"
              value={form.email} onChange={handleChange} error={errors.email} />
            <InputField label="Phone" id="phone" name="phone"
              type="tel" placeholder="10-digit number"
              value={form.phone} onChange={handleChange} error={errors.phone} />

            <div className="mb-3">
              <label className="form-label fw-semibold">Gender</label>
              <select name="gender"
                className={`form-select ${errors.gender ? "is-invalid" : ""}`}
                value={form.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
            </div>

            <InputField label="Password" id="password" name="password"
              type="password" placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
              value={form.password} onChange={handleChange} error={errors.password} />
            <InputField label="Confirm Password" id="confirmPassword" name="confirmPassword"
              type="password" placeholder="Repeat your password"
              value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />

            <button type="submit" disabled={loading} className="btn btn-warning w-100 mt-2 fw-semibold">
              {loading ? <><span className="spinner-border spinner-border-sm me-2" />Registering...</> : "Create Account"}
            </button>
          </form>

          <p className="text-center small mt-3 mb-0">
            Already have an account?{" "}
            <Link to="/login" className="text-decoration-none">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
