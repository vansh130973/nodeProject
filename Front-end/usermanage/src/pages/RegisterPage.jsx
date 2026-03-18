import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { apiRegisterUser, apiLoginUser, showApiError } from "../services/api";
import InputField from "../components/InputField";

const INITIAL = {
  firstName: "", lastName: "", userName: "",
  email: "", phone: "", gender: "",
  password: "", confirmPassword: "",
};

const validate = (form) => {
  const errors = [];
  if (!form.firstName.trim()) errors.push("First name is required");
  if (!form.lastName.trim()) errors.push("Last name is required");
  if (!form.userName.trim()) errors.push("Username is required");
  if (!form.email.trim()) errors.push("Email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.push("Invalid email format");
  if (!/^[0-9]{10}$/.test(form.phone))
    errors.push("Phone must be exactly 10 digits");
  if (!form.gender) errors.push("Gender is required");
  if (!form.password) errors.push("Password is required");
  else if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(form.password))
    errors.push("Password must be 8+ characters with 1 uppercase, 1 number, and 1 special character");
  if (!form.confirmPassword) errors.push("Confirm password is required");
  else if (form.password !== form.confirmPassword)
    errors.push("Passwords do not match");
  return errors;
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate(form);
    if (errors.length > 0) {
      errors.forEach((msg) => toast.error(msg));
      return;
    }

    const formData = new FormData();
    formData.append("firstName", form.firstName);
    formData.append("lastName", form.lastName);
    formData.append("userName", form.userName);
    formData.append("email", form.email);
    formData.append("phone", form.phone);
    formData.append("gender", form.gender);
    formData.append("password", form.password);
    formData.append("confirmPassword", form.confirmPassword);
    if (profilePicture) formData.append("profilePicture", profilePicture);

    setLoading(true);
    const toastId = toast.loading("Creating your account...");
    try {
      await apiRegisterUser(formData);

      const loginData = await apiLoginUser({
        userName: form.userName,
        password: form.password,
      });

      login(loginData.token);

      const decoded = JSON.parse(atob(loginData.token.split(".")[1]));
      toast.update(toastId, {
        render: `Welcome, ${decoded.userName}!`,
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
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center py-5">
      <div className="card shadow-sm border-0 rounded-4 p-4" style={{ width: "100%", maxWidth: 520 }}>
        <div className="card-body">
          <h4 className="fw-bold mb-3">Create account</h4>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3 text-center">
              <div className="rounded-circle overflow-hidden mx-auto mb-2 border"
                style={{ width: 90, height: 90, background: "#f0f0f0" }}>
                {preview ? (
                  <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted small">
                    No Image
                  </div>
                )}
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
                  value={form.firstName} onChange={handleChange} autocomplete="firstName" />
              </div>
              <div className="col-6">
                <InputField label="Last Name" id="lastName" name="lastName"
                  type="text" placeholder="Last Name"
                  value={form.lastName} onChange={handleChange} autocomplete="lastName" />
              </div>
            </div>

            <InputField label="Username" id="userName" name="userName"
              type="text" placeholder="Enter your Username"
              value={form.userName} onChange={handleChange} autocomplete="userName" />

            <InputField label="Email" id="email" name="email"
              type="email" placeholder="Enter your Email"
              value={form.email} onChange={handleChange} autocomplete="email" />

            <InputField label="Phone" id="phone" name="phone"
              type="tel" placeholder="10-digit number"
              value={form.phone} onChange={handleChange} autocomplete="phone" />

            <div className="mb-3">
              <label className="form-label fw-semibold">Gender</label>
              <select name="gender" className="form-select" value={form.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <InputField label="Password" id="password" name="password"
              type="password" placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
              value={form.password} onChange={handleChange} autocomplete="password" />

            <InputField label="Confirm Password" id="confirmPassword" name="confirmPassword"
              type="password" placeholder="Repeat your password"
              value={form.confirmPassword} onChange={handleChange} autocomplete="confirmPassword" />

            <button type="submit" disabled={loading} className="btn btn-warning w-100 mt-2 fw-semibold">
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Registering...</>
              ) : "Create Account"}
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