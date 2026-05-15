import { BASE_URL, getAuthHeaders, getBearerHeader, handleResponse } from "../../../utils/api";

export const apiRegisterUser = (formData) =>
  fetch(`${BASE_URL}/register`, {
    method: "POST",
    body: formData,
  }).then(handleResponse);

export const apiLoginUser = (body) =>
  fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => handleResponse(res, { suppressSessionToast: true }));

export const apiLogoutUser = () =>
  fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiGetUserProfile = () =>
  fetch(`${BASE_URL}/profile`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiUpdateUserProfile = (formData) =>
  fetch(`${BASE_URL}/profile`, {
    method: "PUT",
    headers: getBearerHeader(),
    body: formData,
  }).then(handleResponse);

export const apiChangePassword = (body) =>
  fetch(`${BASE_URL}/changePassword`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiForgotPassword = (body) =>
  fetch(`${BASE_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiVerifyOtp = (body) =>
  fetch(`${BASE_URL}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiResetPassword = (body) =>
  fetch(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handleResponse);
// ─── Notifications ────────────────────────────────────────────────────────────
export const apiGetNotifications = (page = 1, limit = 5) =>
  fetch(`${BASE_URL}/notifications?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiReadNotification = (id) =>
  fetch(`${BASE_URL}/notifications/${id}/read`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiReadAllNotifications = () =>
  fetch(`${BASE_URL}/notifications/read-all`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  }).then(handleResponse);