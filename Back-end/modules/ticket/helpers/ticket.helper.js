import transporter from "../../../config/mailer.js";
import { buildFileUrl } from "../../../common/url/file-url.js";

export { buildFileUrl };

/**
 * Notify support mailbox when a user opens a new ticket.
 */
export const notifySupportNewTicket = async ({ userEmail, userName, ticketId, subject }) => {
  const to = process.env.TICKET_NOTIFY_EMAIL || process.env.MAIL_USER;
  if (!to) return;

  await transporter.sendMail({
    from: `"MyPanel Support" <${process.env.MAIL_USER}>`,
    to,
    subject: `[New ticket #${ticketId}] ${subject}`,
    html: `
      <p>A new support ticket was opened.</p>
      <p><strong>From:</strong> ${escapeHtml(userName)} (${escapeHtml(userEmail)})</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
    `,
  });
};

/**
 * Notify user that ticket creation was successful.
 */
export const notifyUserTicketCreated = async ({ toEmail, ticketId, subject }) => {
  if (!toEmail) return;
  await transporter.sendMail({
    from: `"MyPanel" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: `Ticket #${ticketId} received`,
    html: `
      <p>Your ticket has been created.</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p>We will respond as soon as possible.</p>
    `,
  });
};

/**
 * Notify the opposite side about a new reply on the ticket thread.
 */
export const notifyTicketMessage = async ({ toEmail, subject, preview, ticketId, fromLabel }) => {
  if (!toEmail) return;
  const safePreview = escapeHtml((preview || "").slice(0, 500));
  await transporter.sendMail({
    from: `"MyPanel" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: `[Ticket #${ticketId}] New reply`,
    html: `
      <p><strong>${escapeHtml(fromLabel)}</strong> replied on ticket #${ticketId}.</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <blockquote style="border-left: 4px solid #e5e7eb; padding-left: 12px; margin: 12px 0; color: #374151;">
        ${safePreview || "<em>(no text)</em>"}
      </blockquote>
    `,
  });
};

/**
 * Minimal HTML escaping to safely render user text inside emails.
 */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
