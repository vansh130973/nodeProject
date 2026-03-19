import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import {
  apiGetUserProfile, apiUpdateUserProfile,
  apiChangePassword, apiLogoutUser, showApiError,
} from "../services/api";
import InputField from "../components/InputField";

const BASE_URL = "http://localhost:3200";

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const getActiveTab = () => {
    if (pathname === "/dashboard") return "profile";
    if (pathname === "/edit-profile") return "edit";
    if (pathname === "/change-password") return "password";
    return "profile";
  };
  const activeTab = getActiveTab();

  const [profile, setProfile] = useState(null);

  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "", gender: "" });
  const [editErrors, setEditErrors] = useState({});
  const [newImage, setNewImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const [pwForm, setPwForm] = useState({ newPassword: "", confirmNewPassword: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    apiGetUserProfile()
      .then((res) => {
        setProfile(res.data);
        setEditForm({
          firstName: res.data.firstName,
          lastName: res.data.lastName,
          phone: res.data.phone,
          gender: res.data.gender ?? "",
        });
      })
      .catch(() => toast.error("Failed to load profile"));
  }, [user, navigate]);

  const handleEditChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setEditErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handlePwChange = (e) => {
    setPwForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPwErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setNewImage(file); setPreview(URL.createObjectURL(file)); }
  };

  const validateEdit = () => {
    const errs = {};
    if (!editForm.firstName.trim()) errs.firstName = "First name is required";
    if (!editForm.lastName.trim()) errs.lastName = "Last name is required";
    if (!/^[0-9]{10}$/.test(editForm.phone)) errs.phone = "Phone must be exactly 10 digits";
    if (!editForm.gender) errs.gender = "Gender is required";
    return errs;
  };

  const validatePw = () => {
    const errs = {};
    if (!pwForm.newPassword) errs.newPassword = "New password is required";
    else if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(pwForm.newPassword))
      errs.newPassword = "Must be 8+ chars with 1 uppercase, 1 number, 1 special character";
    if (!pwForm.confirmNewPassword) errs.confirmNewPassword = "Please confirm your password";
    else if (pwForm.newPassword !== pwForm.confirmNewPassword)
      errs.confirmNewPassword = "Passwords do not match";
    return errs;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errs = validateEdit();
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }

    const formData = new FormData();
    formData.append("firstName", editForm.firstName);
    formData.append("lastName", editForm.lastName);
    formData.append("phone", editForm.phone);
    formData.append("gender", editForm.gender);
    if (newImage) formData.append("profilePicture", newImage);
    else if (profile.profilePicture) formData.append("profilePicture", profile.profilePicture);

    setEditLoading(true);
    try {
      const res = await apiUpdateUserProfile(formData);
      setProfile(res.data);
      setPreview(null); setNewImage(null);
      toast.success("Profile updated successfully");
      navigate("/dashboard");
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setEditLoading(false);
    }
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    const errs = validatePw();
    if (Object.keys(errs).length > 0) { setPwErrors(errs); return; }

    setPwLoading(true);
    try {
      await apiChangePassword(pwForm);
      toast.success("Password changed! Please login again.");
      await apiLogoutUser().catch(() => {});
      logout();
      navigate("/login");
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await apiLogoutUser(); } catch (_) {}
    logout();
    navigate("/login");
  };

  const imgSrc = preview
    ? preview
    : profile?.profilePicture
    ? `${BASE_URL}/${profile.profilePicture}`
    : null;

  const Sidebar = () => (
    <div className="d-flex flex-column bg-dark text-white"
      style={{ width: 240, minHeight: "calc(100vh - 56px)", flexShrink: 0 }}>
      <nav className="flex-grow-1 py-2">
        {[
          { label: "Profile", path: "/dashboard", tab: "profile" },
          { label: "Edit Profile", path: "/edit-profile", tab: "edit" },
          { label: "Change Password", path: "/change-password", tab: "password" },
        ].map(({ label, path, tab }) => (
          <button key={tab} onClick={() => navigate(path)}
            className={`d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start
              ${activeTab === tab ? "bg-warning text-black fw-semibold" : "bg-transparent text-white-50"}`}>
            <span className="small">{label}</span>
          </button>
        ))}
        <button onClick={handleLogout}
          className="d-flex align-items-center gap-3 w-100 border-0 px-3 py-3 text-start bg-transparent text-danger">
          <span className="small">Logout</span>
        </button>
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
                        value={pwForm.newPassword} onChange={handlePwChange}
                        error={pwErrors.newPassword} />

                      <div className="mb-4">
                        <InputField label="Confirm New Password" id="confirmNewPassword" name="confirmNewPassword"
                          type="password" placeholder="Repeat new password"
                          value={pwForm.confirmNewPassword} onChange={handlePwChange}
                          error={pwErrors.confirmNewPassword} />
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

      default: return null;
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