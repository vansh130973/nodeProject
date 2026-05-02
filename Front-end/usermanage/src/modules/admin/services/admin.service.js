import { BASE_URL, getAuthHeaders, handleResponse } from "../../../utils/api";

export const apiLoginAdmin = (body) =>
  fetch(`${BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => handleResponse(res, { suppressSessionToast: true }));

export const apiLogoutAdmin = () =>
  fetch(`${BASE_URL}/admin/logout`, {
    method: "POST",
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiAddAdmin = (body) =>
  fetch(`${BASE_URL}/admin/addAdmin`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiGetDashboard = () =>
  fetch(`${BASE_URL}/admin/dashboard`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiGetAdminPermissions = () =>
  fetch(`${BASE_URL}/admin/permissions`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

// ─── Users ────────────────────────────────────────────────────────────────────

export const apiGetAllUsers = ({ page = 1, limit = 10, status = "", search = "" } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  return fetch(`${BASE_URL}/admin/users?${params}`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);
};

export const apiEditUser = (id, body) =>
  fetch(`${BASE_URL}/admin/users/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiUpdateUserStatus = (id, status) =>
  fetch(`${BASE_URL}/admin/users/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  }).then(handleResponse);

export const apiDeleteUser = (id) =>
  fetch(`${BASE_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  }).then(handleResponse);


// ─── Admins ───────────────────────────────────────────────────────────────────

export const apiGetAllAdmins = () =>
  fetch(`${BASE_URL}/admin/showAllAdmins`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiGetAdminsWithPagination = ({ page = 1, limit = 10, search = "" } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set("search", search);
  return fetch(`${BASE_URL}/admin/admins?${params}`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);
};

export const apiEditAdmin = (id, body) =>
  fetch(`${BASE_URL}/admin/admins/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiUpdateAdminStatus = (id, status) =>
  fetch(`${BASE_URL}/admin/admins/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  }).then(handleResponse);

export const apiDeleteAdmin = (id) =>
  fetch(`${BASE_URL}/admin/admins/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  }).then(handleResponse);


// ─── Own Profile ──────────────────────────────────────────────────────────────


export const apiEditAdminProfile = (formData) =>
  fetch(`${BASE_URL}/admin/profile`, {
    method: "PUT",
    headers: { Authorization: getAuthHeaders().Authorization },
    body: formData,
  }).then(handleResponse);

export const apiChangeAdminPassword = (body) =>
  fetch(`${BASE_URL}/admin/change-password`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);