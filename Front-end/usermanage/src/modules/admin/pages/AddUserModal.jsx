// AddUserModal.jsx
import { useState } from "react";
import { toast } from "react-toastify";
import { apiRegisterUser } from "../../user/services/user.service";
import { validateRegisterForm } from "../../user/validations/user.validation";
import { showApiError } from "../../../utils/api";
import InputField from "../../../components/InputField";

const INITIAL = {
  firstName: "", lastName: "", userName: "",
  email: "", phone: "", gender: "",
  password: "", confirmPassword: "",
};

const AddUserModal = ({ show, onClose, onUserAdded }) => {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateRegisterForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const formData = new FormData();
    Object.entries({
      firstName: form.firstName,
      lastName: form.lastName,
      userName: form.userName,
      email: form.email,
      phone: form.phone,
      gender: form.gender,
      password: form.password,
      confirmPassword: form.confirmPassword,
    }).forEach(([k, v]) => formData.append(k, v));
    if (profilePicture) formData.append("profilePicture", profilePicture);

    setLoading(true);
    const toastId = toast.loading("Creating user...");
    try {
      await apiRegisterUser(formData);
      toast.update(toastId, {
        render: "User created – pending admin approval.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      onUserAdded?.();   // refresh user list
      onClose();         // close modal
      // Reset form for next use
      setForm(INITIAL);
      setProfilePicture(null);
      setPreview(null);
      setErrors({});
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.message || "";
      if (msg.toLowerCase().includes("email"))         setErrors((p) => ({ ...p, email: msg }));
      else if (msg.toLowerCase().includes("username")) setErrors((p) => ({ ...p, userName: msg }));
      else showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  // Click on backdrop (outside the card) closes the modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1055,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14,
          width: "100%", maxWidth: 520,
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
          <h6 className="fw-bold mb-0">
            <i className="bi bi-person-plus me-2" /> Add New User
          </h6>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            disabled={loading}
          />
        </div>

        {/* Body */}
        <div className="p-4">
          <form onSubmit={handleSubmit} noValidate>
            {/* Profile picture */}
            <div className="mb-3 text-center">
              <div
                className="rounded-circle overflow-hidden mx-auto mb-2 border"
                style={{ width: 90, height: 90, background: "#f0f0f0" }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted small">
                    No Image
                  </div>
                )}
              </div>
              <label className="btn btn-sm btn-outline-secondary">
                Upload Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="row">
              <div className="col-6">
                <InputField
                  label="First Name"
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={handleChange}
                  error={errors.firstName}
                />
              </div>
              <div className="col-6">
                <InputField
                  label="Last Name"
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={handleChange}
                  error={errors.lastName}
                />
              </div>
            </div>

            <InputField
              label="Username"
              id="userName"
              name="userName"
              type="text"
              placeholder="Enter Username"
              value={form.userName}
              onChange={handleChange}
              error={errors.userName}
            />
            <InputField
              label="Email"
              id="email"
              name="email"
              type="email"
              placeholder="Enter Email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
            />
            <InputField
              label="Phone"
              id="phone"
              name="phone"
              type="tel"
              placeholder="10-digit number"
              value={form.phone}
              onChange={handleChange}
              error={errors.phone}
            />

            <div className="mb-3">
              <label className="form-label fw-semibold">Gender</label>
              <select
                name="gender"
                className={`form-select ${errors.gender ? "is-invalid" : ""}`}
                value={form.gender}
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
            </div>

            <InputField
              label="Password"
              id="password"
              name="password"
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
            />
            <InputField
              label="Confirm Password"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
            />

            <div className="d-flex gap-2 pt-2">
              <button
                type="button"
                className="btn btn-outline-secondary flex-fill"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-warning flex-fill fw-semibold"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;