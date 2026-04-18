import { BASE_URL, handleResponse, getAuthHeaders, getBearerHeader } from "../../../utils/api";

export const apiGetMyTickets = async () => {
  const res = await fetch(`${BASE_URL}/tickets`, { headers: getBearerHeader() });
  return handleResponse(res);
};

export const apiCreateTicket = async ({ subject, description, file }) => {
  const fd = new FormData();
  fd.append("subject", subject);
  fd.append("description", description ?? "");
  if (file) fd.append("file", file);
  const res = await fetch(`${BASE_URL}/tickets`, {
    method: "POST",
    headers: getBearerHeader(),
    body: fd,
  });
  return handleResponse(res);
};

export const apiGetTicketDetailUser = async (id) => {
  const res = await fetch(`${BASE_URL}/tickets/${id}`, { headers: getBearerHeader() });
  return handleResponse(res);
};

export const apiAddTicketMessageUser = async (id, { message, file }) => {
  const fd = new FormData();
  fd.append("message", message ?? "");
  if (file) fd.append("file", file);
  const res = await fetch(`${BASE_URL}/tickets/${id}/messages`, {
    method: "POST",
    headers: getBearerHeader(),
    body: fd,
  });
  return handleResponse(res);
};

export const apiUpdateTicketStatusUser = async (id, status) => {
  const res = await fetch(`${BASE_URL}/tickets/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
};

export const apiAdminListTickets = async ({ page = 1, limit = 10, status = "", search = "" } = {}) => {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status && status !== "all") q.set("status", status);
  if (search?.trim()) q.set("search", search.trim());
  const res = await fetch(`${BASE_URL}/admin/tickets?${q}`, { headers: getBearerHeader() });
  return handleResponse(res);
};

export const apiAdminGetTicket = async (id) => {
  const res = await fetch(`${BASE_URL}/admin/tickets/${id}`, { headers: getBearerHeader() });
  return handleResponse(res);
};

export const apiAdminAddMessage = async (id, { message, file }) => {
  const fd = new FormData();
  fd.append("message", message ?? "");
  if (file) fd.append("file", file);
  const res = await fetch(`${BASE_URL}/admin/tickets/${id}/messages`, {
    method: "POST",
    headers: getBearerHeader(),
    body: fd,
  });
  return handleResponse(res);
};

export const apiAdminUpdateTicketStatus = async (id, status) => {
  const res = await fetch(`${BASE_URL}/admin/tickets/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
};
