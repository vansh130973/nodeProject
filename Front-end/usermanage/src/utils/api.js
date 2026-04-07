export const BASE_URL = "http://localhost:3200";

export const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getBearerHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// ─── Session-expiry callback ──────────────────────────────────────────────────
// api.js is a plain module (no hooks), so we accept a callback registered by
// the app at startup. AuthContext calls setSessionExpiredHandler() once mounted.

let _onSessionExpired = null;

export const setSessionExpiredHandler = (fn) => {
  _onSessionExpired = fn;
};

const SESSION_MESSAGES = ["session expired", "please log in again", "unauthorized access"];

const isSessionError = (message = "") => {
  const lower = message.toLowerCase();
  return SESSION_MESSAGES.some((phrase) => lower.includes(phrase));
};

// ─── Central response handler ─────────────────────────────────────────────────
export const handleResponse = async (res) => {
  const data = await res.json();

  if (!res.ok || !data.success) {
    const message = data.message || "Something went wrong";

    // Intercept session-expired errors globally — no polling needed.
    if (res.status === 401 || isSessionError(message)) {
      localStorage.removeItem("token");
      if (_onSessionExpired) _onSessionExpired();
      const err = new Error(message);
      err.isSessionExpired = true;
      throw err;
    }

    const err = new Error(message);
    err.errors = Array.isArray(data.errors) ? data.errors : null;
    throw err;
  }

  return data;
};

export const showApiError = (err, toastFn) => {
  if (err.isSessionExpired) return; // already handled globally
  if (err.errors && err.errors.length > 0) {
    err.errors.forEach((msg) => toastFn(msg));
  } else {
    toastFn(err.message);
  }
};