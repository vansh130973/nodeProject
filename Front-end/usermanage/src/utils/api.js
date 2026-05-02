import { toast } from "react-toastify";

export const BASE_URL = "http://localhost:3200";

export const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getBearerHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// ─── Central response handler ─────────────────────────────────────────────────
let sessionExpiredShown = false;

// Login endpoints — on these routes a 401 means "bad credentials",
// NOT an expired session, so we must never show the session-expired toast.
const LOGIN_PATHS = ["/admin/login", "/login"];

export const handleResponse = async (res, { suppressSessionToast = false } = {}) => {
  const data = await res.json();

  if (res.status === 401) {
    // Only treat as session expiry when we're NOT on a login endpoint
    if (!suppressSessionToast) {
      localStorage.removeItem("token");
      if (!sessionExpiredShown) {
        sessionExpiredShown = true;
        toast.error("Session expired. Please log in again.");
      }
    }
    // In all cases, throw so the caller's catch block can set inline errors
    const message = data.message || "Invalid credentials";
    const err = new Error(message);
    err.status = 401;
    throw err;
  }

  if (!res.ok || !data.success) {
    const message = data.message || "Something went wrong";
    const err = new Error(message);
    err.errors = Array.isArray(data.errors) ? data.errors : null;
    err.status  = res.status;
    throw err;
  }

  return data;
};

export const showApiError = (err, toastFn) => {
  if (err.errors && err.errors.length > 0) {
    err.errors.forEach((msg) => toastFn(msg));
  } else {
    toastFn(err.message);
  }
};

// Convenience: show any API error as a toast
export const toastApiError = (err) => showApiError(err, toast.error);