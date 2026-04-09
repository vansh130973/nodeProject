import { BASE_URL, getAuthHeaders, handleResponse } from "../../../utils/api";

export const apiGetAllRoles = () =>
  fetch(`${BASE_URL}/admin/roles`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiGetRole = (id) =>
  fetch(`${BASE_URL}/admin/roles/${id}`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const apiCreateRole = (body) =>
  fetch(`${BASE_URL}/admin/roles`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiUpdateRole = (id, body) =>
  fetch(`${BASE_URL}/admin/roles/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiDeleteRole = (id) =>
  fetch(`${BASE_URL}/admin/roles/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  }).then(handleResponse);
