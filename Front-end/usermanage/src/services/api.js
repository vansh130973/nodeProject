// services/api.js
const BASE_URL = "http://localhost:3200";

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const handleResponse = async (res) => {
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

// Public endpoints
export const apiRegisterUser = (body) =>
  fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiLoginUser = (body) =>
  fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiLoginAdmin = (body) =>
  fetch(`${BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handleResponse);

// Protected endpoints (token required)
export const apiGetUserProfile = () =>
  fetch(`${BASE_URL}/profile`, { headers: getHeaders() }).then(handleResponse);

export const apiAddAdmin = (body) =>
  fetch(`${BASE_URL}/admin/addAdmin`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiGetAllUsers = () =>
  fetch(`${BASE_URL}/admin/showAllUsers`, { headers: getHeaders() }).then(handleResponse);

export const apiGetAllAdmins = () =>
  fetch(`${BASE_URL}/admin/showAllAdmins`, { headers: getHeaders() }).then(handleResponse);