import { moveTicketAttachment } from "../../../middlewares/upload.js";
import { findUserById } from "../../user/models/user.model.js";
import { findAdminById } from "../../admin/models/admin.model.js";
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
  buildFileUrl,
  notifySupportNewTicket,
  notifyUserTicketCreated,
  notifyTicketMessage,
} from "../helpers/ticket.helper.js";
import { sendSuccessResponse, sendErrorResponse } from "../../../utils/response.js";

const formatTicketRow = (row) => ({
  ...row,
  file: buildFileUrl(row.file),
});

const formatMessages = (messages) =>
  messages.map((m) => ({
    ...m,
    file: buildFileUrl(m.file),
  }));

const safeNotify = async (fn) => {
  try {
    await fn();
  } catch (e) {
    console.error("ticket notification error:", e?.message || e);
  }
};

export const createTicket = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { subject, description } = req.body;

    const ticketId = await insertTicket(userId, subject, description ?? "", "open", null);

    let filePath = null;
    if (req.file) {
      filePath = await moveTicketAttachment(req.file, ticketId);
      await updateTicketFile(ticketId, filePath);
    }

    const ticket = await findTicketById(ticketId);
    const owner = await findUserById(userId);

    await safeNotify(() =>
      notifyUserTicketCreated({
        toEmail: owner?.email,
        ticketId,
        subject: ticket.subject,
      })
    );
    await safeNotify(() =>
      notifySupportNewTicket({
        userEmail: owner?.email,
        userName: owner?.userName ?? "",
        ticketId,
        subject: ticket.subject,
      })
    );

    return sendSuccessResponse(res, "Ticket created", {
      ticket: formatTicketRow(ticket),
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
    const ticket = await findTicketForUser(ticketId, req.user.id);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    // User opened the ticket — if admin had replied, clear the unread badge
    // by resetting status back to 'open' (ball is now in user's court, they've seen it)
    if (ticket.status === "adminReply") {
      await updateTicketStatus(ticketId, "open");
      ticket.status = "open";
    }

    const messages = await getTicketMessages(ticketId);
    return sendSuccessResponse(res, "Ticket loaded", {
      ticket: formatTicketRow(ticket),
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
    const ticket = await findTicketForUser(ticketId, req.user.id);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    let text = (req.body.message ?? "").trim();
    if (!text && !req.file) {
      return sendErrorResponse(res, "Message or attachment is required", 400);
    }
    if (!text && req.file) text = "(attachment)";

    let filePath = null;
    if (req.file) {
      filePath = await moveTicketAttachment(req.file, ticketId, "messages");
    }

    await insertTicketMessage(ticketId, req.user.id, "user", text, filePath);
    if (ticket.status !== "closed") {
      await updateTicketStatus(ticketId, "userReply");
    } else {
      await touchTicket(ticketId);
    }

    const owner = await findUserById(req.user.id);

    await safeNotify(() =>
      notifyTicketMessage({
        toEmail: process.env.TICKET_NOTIFY_EMAIL || process.env.MAIL_USER,
        subject: ticket.subject,
        preview: text,
        ticketId,
        fromLabel: `User ${owner?.userName ?? req.user.id}`,
      })
    );

    const messages = await getTicketMessages(ticketId);
    return sendSuccessResponse(res, "Message sent", { messages: formatMessages(messages) });
  } catch (error) {
    console.error("addMessageUser error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const listTicketsAdmin = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status ?? "";
    const search = req.query.search ?? "";

    const [{ tickets, pagination }, unreadCount] = await Promise.all([
      listAllTickets({ page, limit, status, search }),
      getUnreadCount(),
    ]);

    const enriched = tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt,
      userId: t.userId,
      userName: t.userName,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
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
    const ticket = await findTicketWithOwner(ticketId);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    if (ticket.status === "userReply") {
      await updateTicketStatus(ticketId, "open");
      ticket.status = "open";
    }

    const messages = await getTicketMessages(ticketId);

    const { ownerEmail, ...rest } = ticket;
    return sendSuccessResponse(res, "Ticket loaded", {
      ticket: {
        ...formatTicketRow(rest),
        owner: {
          email: ownerEmail,
          userName: ticket.userName,
          firstName: ticket.firstName,
          lastName: ticket.lastName,
        },
      },
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
    const ticket = await findTicketWithOwner(ticketId);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    let text = (req.body.message ?? "").trim();
    if (!text && !req.file) {
      return sendErrorResponse(res, "Message or attachment is required", 400);
    }
    if (!text && req.file) text = "(attachment)";

    let filePath = null;
    if (req.file) {
      filePath = await moveTicketAttachment(req.file, ticketId, "messages");
    }

    await insertTicketMessage(ticketId, req.user.id, "admin", text, filePath);
    if (ticket.status !== "closed") {
      await updateTicketStatus(ticketId, "adminReply");
    } else {
      await touchTicket(ticketId);
    }

    const adminRow = await findAdminById(req.user.id);

    await safeNotify(() =>
      notifyTicketMessage({
        toEmail: ticket.ownerEmail,
        subject: ticket.subject,
        preview: text,
        ticketId,
        fromLabel: `Support (${adminRow?.userName ?? "admin"})`,
      })
    );

    const messages = await getTicketMessages(ticketId);
    return sendSuccessResponse(res, "Message sent", { messages: formatMessages(messages) });
  } catch (error) {
    console.error("addMessageAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const patchTicketStatusUser = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket = await findTicketForUser(ticketId, req.user.id);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    const { status } = req.body;
    await updateTicketStatus(ticketId, status);

    const updated = await findTicketForUser(ticketId, req.user.id);
    return sendSuccessResponse(res, "Status updated", {
      ticket: formatTicketRow(updated),
    });
  } catch (error) {
    console.error("patchTicketStatusUser error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};

export const patchTicketStatusAdmin = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket = await findTicketById(ticketId);
    if (!ticket) return sendErrorResponse(res, "Ticket not found", 404);

    const { status } = req.body;
    await updateTicketStatus(ticketId, status);

    const updated = await findTicketWithOwner(ticketId);
    const { ownerEmail, ...rest } = updated;

    return sendSuccessResponse(res, "Status updated", {
      ticket: {
        ...formatTicketRow(rest),
        owner: {
          email: ownerEmail,
          userName: updated.userName,
          firstName: updated.firstName,
          lastName: updated.lastName,
        },
      },
    });
  } catch (error) {
    console.error("patchTicketStatusAdmin error:", error);
    return sendErrorResponse(res, "Server error", 500);
  }
};