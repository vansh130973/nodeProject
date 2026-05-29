import { moveTicketAttachment } from "../../../middlewares/upload.js";
import { findUserById } from "../../user/models/user.model.js";
import { findAdminById } from "../../admin/models/admin.model.js";
import {
  emitNewMessageBadge,
  emitAdminNewReply,
  emitTicketStatusChanged,
} from "../../../socket/socketManager.js";
import {
  insertTicket,
  updateTicketFile,
  findTicketById,
  findTicketForUser,
  findTicketWithOwner,
  listTicketsForUser,
  listAllTickets,
  getTicketMessages,
  insertTicketMessage,
  updateTicket,
  getUnreadCount,
} from "../models/ticket.model.js";
import {
  notifySupportNewTicket,
  notifyUserTicketCreated,
  notifyTicketMessage,
} from "../helpers/ticket.helper.js";
import { buildFileUrl } from "../../../common/url/file-url.js";
import { sendSuccessResponse, sendErrorResponse } from "../../../common/http/response.js";

const formatTicketRow = (ticket) =>
  ticket ? { ...ticket, file: buildFileUrl(ticket.file) } : null;

const formatMessages = (messages) =>
  messages.map((m) => ({ ...m, file: buildFileUrl(m.file) }));

const safeNotify = async (fn) => {
  try { await fn(); } catch (e) { console.error("ticket notification error:", e?.message || e); }
};

const getNormalizedMessageText = (req) => {
  let text = (req.body.message ?? "").trim();
  if (!text && req.file) text = "(attachment)";
  return { text, isValid: Boolean(text || req.file) };
};

const buildTicketOwner = (ticket) => ({
  email:     ticket.ownerEmail,
  userName:  ticket.userName,
  firstName: ticket.firstName,
  lastName:  ticket.lastName,
});

// ─── User controllers ─────────────────────────────────────────────────────────

export const createTicket = async (req, res) => {
  try {
    const { id: userId, email, userName } = req.user;
    const { subject, description } = req.body;

    const ticketId = await insertTicket(userId, subject, description);

    let fullTicketFilePath = null;
    if (req.file) {
      const filePath = await moveTicketAttachment(req.file, ticketId);
      await updateTicketFile(ticketId, filePath);
      fullTicketFilePath = buildFileUrl(filePath);
    }

    await safeNotify(() => notifyUserTicketCreated({ toEmail: email, ticketId, subject }));
    await safeNotify(() => notifySupportNewTicket({ userEmail: email, userName, ticketId, subject }));

    return sendSuccessResponse(res, "Ticket created", {
      ticket: formatTicketRow({ ticketId, userId, subject, description, file: fullTicketFilePath }),
    }, 201);
  } catch (error) {
    console.error("createTicket error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const rows = await listTicketsForUser(req.user.id);
    return sendSuccessResponse(res, "Tickets loaded", { tickets: rows });
  } catch (error) {
    console.error("getMyTickets error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const getTicketDetailUser = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketForUser(ticketId, req.user.id);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    // Clear adminReply status when user opens the ticket
    if (ticket.status === "adminReply") {
      await updateTicket(ticketId, "open");
      ticket.status = "open";
    }

    const messages = await getTicketMessages(ticketId);
    return sendSuccessResponse(res, "Ticket loaded", {
      ticket:   formatTicketRow(ticket),
      messages: formatMessages(messages),
    });
  } catch (error) {
    console.error("getTicketDetailUser error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const addMessageUser = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketForUser(ticketId, req.user.id);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    const { text, isValid } = getNormalizedMessageText(req);
    if (!isValid) return sendErrorResponse(res, "Message or attachment is required", 400);

    let filePath = null;
    if (req.file) filePath = await moveTicketAttachment(req.file, ticketId, "messages");

    // Determine new ticket status — null if closed (touch only via updateTicket)
    const newStatus = ticket.status !== "closed" ? "userReply" : null;

    // Single INSERT: stamps status on the message row + no extra UPDATE needed
    const messageId = await insertTicketMessage(ticketId, req.user.id, "user", text, filePath, newStatus);

    // Only touch/update the ticket row itself (updatedAt always, status if not closed)
    await updateTicket(ticketId, newStatus);

    const [owner, createdAt] = [await findUserById(req.user.id), new Date().toISOString()];

    await safeNotify(() => notifyTicketMessage({
      toEmail:   process.env.TICKET_NOTIFY_EMAIL || process.env.MAIL_USER,
      subject:   ticket.subject,
      preview:   text,
      ticketId,
      fromLabel: `User ${owner?.userName ?? req.user.id}`,
    }));

    safeNotify(() => emitAdminNewReply({
      ticketId,
      subject:    ticket.subject,
      userName:   owner?.userName ?? req.user.id,
      messageId,
      message:    text,
      senderType: "user",
      file:       filePath ? buildFileUrl(filePath) : null,
      createdAt,
    }));

    const messages = await getTicketMessages(ticketId);
    return sendSuccessResponse(res, "Message sent", { messages: formatMessages(messages) });
  } catch (error) {
    console.error("addMessageUser error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const patchTicketStatusUser = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketForUser(ticketId, req.user.id);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    await updateTicket(ticketId, req.body.status);
    const updated = await findTicketForUser(ticketId, req.user.id);
    return sendSuccessResponse(res, "Status updated", { ticket: formatTicketRow(updated) });
  } catch (error) {
    console.error("patchTicketStatusUser error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── Admin controllers ────────────────────────────────────────────────────────

export const listTicketsAdmin = async (req, res) => {
  try {
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 20;
    const status = req.query.status ?? "";
    const search = req.query.search ?? "";

    const [{ tickets, pagination }, unreadCount] = await Promise.all([
      listAllTickets({ page, limit, status, search }),
      getUnreadCount(),
    ]);

    const enriched = tickets.map(({ id, subject, status, createdAt, userId, userName, firstName, lastName, email }) => ({
      id, subject, status, createdAt, userId, userName, firstName, lastName, email,
    }));

    return sendSuccessResponse(res, "Tickets loaded", { tickets: enriched, pagination, unreadCount });
  } catch (error) {
    console.error("listTicketsAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const getTicketDetailAdmin = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketWithOwner(ticketId);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    // Clear userReply status when admin opens the ticket
    if (ticket.status === "userReply") {
      await updateTicket(ticketId, "open");
      ticket.status = "open";
    }

    const messages            = await getTicketMessages(ticketId);
    const { ownerEmail, ...rest } = ticket;
    return sendSuccessResponse(res, "Ticket loaded", {
      ticket:   { ...formatTicketRow(rest), owner: buildTicketOwner({ ...ticket, ownerEmail }) },
      messages: formatMessages(messages),
    });
  } catch (error) {
    console.error("getTicketDetailAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const addMessageAdmin = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketWithOwner(ticketId);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    const { text, isValid } = getNormalizedMessageText(req);
    if (!isValid) return sendErrorResponse(res, "Message or attachment is required", 400);

    let filePath = null;
    if (req.file) filePath = await moveTicketAttachment(req.file, ticketId, "messages");

    // Determine new ticket status — null if closed (touch only via updateTicket)
    const newStatus = ticket.status !== "closed" ? "adminReply" : null;

    // Single INSERT: stamps status on the message row + no extra UPDATE needed
    const messageId = await insertTicketMessage(ticketId, req.user.id, "admin", text, filePath, newStatus);

    // Only touch/update the ticket row itself (updatedAt always, status if not closed)
    await updateTicket(ticketId, newStatus);

    const [adminRow, createdAt] = [await findAdminById(req.user.id), new Date().toISOString()];

    await safeNotify(() => notifyTicketMessage({
      toEmail:   ticket.ownerEmail,
      subject:   ticket.subject,
      preview:   text,
      ticketId,
      fromLabel: `Support (${adminRow?.userName ?? "admin"})`,
    }));

    safeNotify(() => emitNewMessageBadge(ticket.userId, {
      ticketId,
      subject:    ticket.subject,
      messageId,
      message:    text,
      senderType: "admin",
      file:       filePath ? buildFileUrl(filePath) : null,
      createdAt,
    }));

    const messages = await getTicketMessages(ticketId);
    return sendSuccessResponse(res, "Message sent", { messages: formatMessages(messages) });
  } catch (error) {
    console.error("addMessageAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const patchTicketStatusAdmin = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketById(ticketId);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    await updateTicket(ticketId, req.body.status);
    safeNotify(() => emitTicketStatusChanged(ticket.userId, ticketId, req.body.status));

    const updated             = await findTicketWithOwner(ticketId);
    const { ownerEmail, ...rest } = updated;
    return sendSuccessResponse(res, "Status updated", {
      ticket: { ...formatTicketRow(rest), owner: buildTicketOwner({ ...updated, ownerEmail }) },
    });
  } catch (error) {
    console.error("patchTicketStatusAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};