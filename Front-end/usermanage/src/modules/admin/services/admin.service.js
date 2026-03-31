import { BASE_URL, getAuthHeaders, handleResponse } from "../../../utils/api";

export const apiLoginAdmin = (body) =>
  fetch(`${BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handleResponse);

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

// Dashboard — single API, returns all counts
export const apiGetDashboard = () =>
  fetch(`${BASE_URL}/admin/dashboard`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

// User listing with pagination  ?page=1&limit=10
export const apiGetAllUsers = ({ page = 1, limit = 10 } = {}) =>
  fetch(`${BASE_URL}/admin/users?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

// Single user
export const apiGetUserById = (id) =>
  fetch(`${BASE_URL}/admin/users/${id}`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

// Update status: status = "active" | "inactive" | "pending"
export const apiUpdateUserStatus = (id, status) =>
  fetch(`${BASE_URL}/admin/users/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  }).then(handleResponse);

// Soft delete
export const apiDeleteUser = (id) =>
  fetch(`${BASE_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  }).then(handleResponse);

// Force logout user
export const apiLogoutUserByAdmin = (id) =>
  fetch(`${BASE_URL}/admin/users/${id}/logout`, {
    method: "POST",
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiGetAllAdmins = () =>
  fetch(`${BASE_URL}/admin/showAllAdmins`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);