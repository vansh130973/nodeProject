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
  updateTicketStatus,
  touchTicket,
  getUnreadCount,
} from "../models/ticket.model.js";
import {
  notifySupportNewTicket,
  notifyUserTicketCreated,
  notifyTicketMessage,
} from "../helpers/ticket.helper.js";
import { buildFileUrl } from "../../../common/url/file-url.js";
import { sendSuccessResponse, sendErrorResponse } from "../../../common/http/response.js";

/**
 * Append a full public URL to a ticket's file path.
 *
 * @param {object|null} ticket
 * @returns {object|null}
 */
const formatTicketRow = (ticket) =>
  ticket ? { ...ticket, file: buildFileUrl(ticket.file) } : null;

/**
 * Map message rows so each file path becomes a full public URL.
 *
 * @param {object[]} messages
 * @returns {object[]}
 */
const formatMessages = (messages) =>
  messages.map((m) => ({ ...m, file: buildFileUrl(m.file) }));

/**
 * Run a notification/socket side-effect without letting failures bubble up.
 * A notification error should never reject the main HTTP response.
 *
 * @param {() => Promise<void>} fn
 * @returns {Promise<void>}
 */
const safeNotify = async (fn) => {
  try { await fn(); } catch (e) { console.error("ticket notification error:", e?.message || e); }
};

/**
 * Extract and normalise the message text from the request.
 * When only a file is uploaded the text falls back to "(attachment)".
 *
 * @param {object} req HTTP request (body.message, file)
 * @returns {{ text: string, isValid: boolean }}
 */
const getNormalizedMessageText = (req) => {
  let text = (req.body.message ?? "").trim();
  if (!text && req.file) text = "(attachment)";
  return { text, isValid: Boolean(text || req.file) };
};

/**
 * Build a plain owner object from a ticket-with-owner row.
 *
 * @param {object} ticket  Row that includes ownerEmail, userName, firstName, lastName
 * @returns {{ email: string, userName: string, firstName: string, lastName: string }}
 */
const buildTicketOwner = (ticket) => ({
  email:     ticket.ownerEmail,
  userName:  ticket.userName,
  firstName: ticket.firstName,
  lastName:  ticket.lastName,
});

/**
 * POST /tickets
 * Create a new support ticket, optionally with a file attachment.
 * Sends confirmation email to the user and an alert email to support.
 *
 * @param {object} req HTTP request — body: { subject, description }; optional file upload
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
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

/**
 * GET /tickets
 * List all tickets belonging to the authenticated user.
 *
 * @param {object} req HTTP request (authenticated user on req.user)
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const getMyTickets = async (req, res) => {
  try {
    const rows = await listTicketsForUser(req.user.id);
    return sendSuccessResponse(res, "Tickets loaded", { tickets: rows });
  } catch (error) {
    console.error("getMyTickets error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

/**
 * GET /tickets/:id
 * Fetch a single ticket with its messages for the owning user.
 * Auto-clears the "adminReply" status to "open" on load.
 *
 * @param {object} req HTTP request — params.id: ticket id
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const getTicketDetailUser = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketForUser(ticketId, req.user.id);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    if (ticket.status === "adminReply") {
      await updateTicketStatus(ticketId, "open");
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

/**
 * POST /tickets/:id/messages
 * User sends a reply message (text and/or file attachment) on their ticket.
 * Emits a socket event to notify all admins of the new reply.
 *
 * @param {object} req HTTP request — params.id: ticket id; body.message; optional file
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const addMessageUser = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketForUser(ticketId, req.user.id);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    const { text, isValid } = getNormalizedMessageText(req);
    if (!isValid) return sendErrorResponse(res, "Message or attachment is required", 400);

    let filePath = null;
    if (req.file) filePath = await moveTicketAttachment(req.file, ticketId, "messages");

    const messageId = await insertTicketMessage(ticketId, req.user.id, "user", text, filePath);
    ticket.status !== "closed"
      ? await updateTicketStatus(ticketId, "userReply")
      : await touchTicket(ticketId);

    const owner     = await findUserById(req.user.id);
    const createdAt = new Date().toISOString();

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

/**
 * PATCH /tickets/:id/status
 * User updates the status of their own ticket (e.g. marks it closed).
 *
 * @param {object} req HTTP request — params.id: ticket id; body.status
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const patchTicketStatusUser = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketForUser(ticketId, req.user.id);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    await updateTicketStatus(ticketId, req.body.status);
    const updated = await findTicketForUser(ticketId, req.user.id);
    return sendSuccessResponse(res, "Status updated", { ticket: formatTicketRow(updated) });
  } catch (error) {
    console.error("patchTicketStatusUser error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

// ─── Admin controllers ────────────────────────────────────────────────────────

/**
 * GET /admin/tickets?page=1&limit=20&status=open&search=query
 * Paginated list of all tickets for the admin panel.
 * Also returns the global unread count for the admin sidebar badge.
 *
 * @param {object} req HTTP request — query: page, limit, status, search
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
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

/**
 * GET /admin/tickets/:id
 * Fetch a single ticket with all messages and owner profile for the admin view.
 * Auto-clears the "userReply" status to "open" on load.
 *
 * @param {object} req HTTP request — params.id: ticket id
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const getTicketDetailAdmin = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketWithOwner(ticketId);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    if (ticket.status === "userReply") {
      await updateTicketStatus(ticketId, "open");
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

/**
 * POST /admin/tickets/:id/messages
 * Admin sends a reply message (text and/or file attachment) on a ticket.
 * Emits a socket event to notify the ticket owner of the new reply.
 *
 * @param {object} req HTTP request — params.id: ticket id; body.message; optional file
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const addMessageAdmin = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketWithOwner(ticketId);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    const { text, isValid } = getNormalizedMessageText(req);
    if (!isValid) return sendErrorResponse(res, "Message or attachment is required", 400);

    let filePath = null;
    if (req.file) filePath = await moveTicketAttachment(req.file, ticketId, "messages");

    const messageId = await insertTicketMessage(ticketId, req.user.id, "admin", text, filePath);
    ticket.status !== "closed"
      ? await updateTicketStatus(ticketId, "adminReply")
      : await touchTicket(ticketId);

    const adminRow  = await findAdminById(req.user.id);
    const createdAt = new Date().toISOString();

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

/**
 * PATCH /admin/tickets/:id/status
 * Admin updates the status of any ticket.
 * Emits a socket event so the ticket owner is notified in real time.
 *
 * @param {object} req HTTP request — params.id: ticket id; body.status
 * @param {object} res HTTP response
 * @returns {Promise<object>} JSON success or error via res
 */
export const patchTicketStatusAdmin = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket   = await findTicketById(ticketId);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    await updateTicketStatus(ticketId, req.body.status);
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
