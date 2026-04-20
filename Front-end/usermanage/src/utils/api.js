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
export const handleResponse = async (res) => {
  const data = await res.json();

  if (res.status === 401) {
    localStorage.removeItem("token");

    if (!sessionExpiredShown) {
      sessionExpiredShown = true;
      toast.error("Session expired. Please log in again.");
    }
    return;
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