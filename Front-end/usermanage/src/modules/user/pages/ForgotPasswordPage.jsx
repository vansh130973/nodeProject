import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiForgotPassword, apiVerifyOtp, apiResetPassword } from "../services/user.service";
import {
  validateForgotPasswordForm,
  validateOtpForm,
  validateResetPasswordForm,
} from "../validations/user.validation";
import { showApiError } from "../../../utils/api";
import InputField from "../../../components/InputField";



// ─── Step 1: Enter Email ───────────────────────────────────────────────────────
const EmailStep = ({ onNext }) => {
  const [form, setForm] = useState({ email: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ email: e.target.value });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForgotPasswordForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      await apiForgotPassword(form);
      toast.success("OTP sent! Check your email.");
      onNext(form.email);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="text-muted small mb-3">
        Enter your registered email address and we'll send you a 6-digit OTP.
      </p>
      <InputField
        label="Email Address" id="email" name="email"
        type="email" placeholder="you@example.com"
        value={form.email} onChange={handleChange} error={errors.email}
      />
      <button type="submit" disabled={loading} className="btn btn-warning w-100 fw-semibold mt-1">
        {loading ? <><span className="spinner-border spinner-border-sm me-2" />Sending OTP...</> : "Send OTP"}
      </button>
    </form>
  );
};

// ─── Step 2: Verify OTP ────────────────────────────────────────────────────────
const OtpStep = ({ email, onNext, onResend }) => {
  const [form, setForm] = useState({ otp: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (e) => {
    // Allow only digits, max 6
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setForm({ otp: val });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateOtpForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      await apiVerifyOtp({ email, otp: form.otp });
      toast.success("OTP verified!");
      onNext(form.otp);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await apiForgotPassword({ email });
      toast.success("New OTP sent!");
      setForm({ otp: "" });
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="text-muted small mb-3">
        A 6-digit OTP was sent to <strong>{email}</strong>. It expires in 10 minutes.
      </p>
      <div className="mb-3">
        <label className="form-label fw-semibold">OTP</label>
        <input
          type="text" inputMode="numeric" maxLength={6}
          className={`form-control form-control-lg text-center fw-bold ls-wide ${errors.otp ? "is-invalid" : ""}`}
          style={{ letterSpacing: 12, fontSize: 28 }}
          placeholder="------"
          value={form.otp} onChange={handleChange}
        />
        {errors.otp && <div className="invalid-feedback">{errors.otp}</div>}
      </div>
      <button type="submit" disabled={loading} className="btn btn-warning w-100 fw-semibold">
        {loading ? <><span className="spinner-border spinner-border-sm me-2" />Verifying...</> : "Verify OTP"}
      </button>
      <div className="text-center mt-3">
        <button
          type="button" className="btn btn-link btn-sm text-muted p-0"
          onClick={handleResend} disabled={resending}
        >
          {resending ? "Resending..." : "Didn't receive it? Resend OTP"}
        </button>
      </div>
    </form>
  );
};

// ─── Step 3: New Password ──────────────────────────────────────────────────────
const ResetStep = ({ email, otp, onDone }) => {
  const [form, setForm] = useState({ newPassword: "", confirmNewPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateResetPasswordForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      await apiResetPassword({ email, otp, newPassword: form.newPassword, confirmNewPassword: form.confirmNewPassword });
      toast.success("Password reset successfully!");
      onDone();
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="text-muted small mb-3">Choose a strong new password.</p>
      <InputField
        label="New Password" id="newPassword" name="newPassword"
        type="password" placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
        value={form.newPassword} onChange={handleChange} error={errors.newPassword}
      />
      <InputField
        label="Confirm New Password" id="confirmNewPassword" name="confirmNewPassword"
        type="password" placeholder="Repeat your new password"
        value={form.confirmNewPassword} onChange={handleChange} error={errors.confirmNewPassword}
      />
      <button type="submit" disabled={loading} className="btn btn-warning w-100 fw-semibold">
        {loading ? <><span className="spinner-border spinner-border-sm me-2" />Resetting...</> : "Reset Password"}
      </button>
    </form>
  );
};

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const handleEmailDone = (submittedEmail) => {
    setEmail(submittedEmail);
    setStep(1);
  };

  const handleOtpDone = (verifiedOtp) => {
    setOtp(verifiedOtp);
    setStep(2);
  };

  const handleResetDone = () => {
    navigate("/login");
  };

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
      <div className="card shadow-sm border-0 rounded-4 p-4" style={{ width: "100%", maxWidth: 440 }}>
        <div className="card-body">
          <h4 className="fw-bold mb-4">Forgot Password</h4>

          {step === 0 && <EmailStep onNext={handleEmailDone} />}
          {step === 1 && <OtpStep email={email} onNext={handleOtpDone} />}
          {step === 2 && <ResetStep email={email} otp={otp} onDone={handleResetDone} />}

          <hr className="my-3" />
          <p className="text-center small mb-0">
            Remember your password?{" "}
            <Link to="/login" className="text-decoration-none">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;