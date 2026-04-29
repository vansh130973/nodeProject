import { BASE_URL, getAuthHeaders, handleResponse } from "../../../utils/api";

export const apiGetAllModules = () =>
  fetch(`${BASE_URL}/admin/modules`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);


export const apiCreateModule = (body) =>
  fetch(`${BASE_URL}/admin/modules`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiUpdateModule = (id, body) =>
  fetch(`${BASE_URL}/admin/modules/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiDeleteModule = (id) =>
  fetch(`${BASE_URL}/admin/modules/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  }).then(handleResponse);