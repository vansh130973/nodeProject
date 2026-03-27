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

export const apiGetAllUsers = () =>
  fetch(`${BASE_URL}/admin/showAllUsers`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiGetAllAdmins = () =>
  fetch(`${BASE_URL}/admin/showAllAdmins`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);
