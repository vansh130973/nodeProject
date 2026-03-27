export const BASE_URL = "http://localhost:3200";

export const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getBearerHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.message || "Something went wrong");
    err.errors = Array.isArray(data.errors) ? data.errors : null;
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
