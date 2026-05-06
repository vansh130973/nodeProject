export const RECORD_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
  PENDING: "pending",
};

export const TICKET_STATUS = {
  OPEN: "open",
  ADMIN_REPLY: "adminReply",
  USER_REPLY: "userReply",
  CLOSED: "closed",
};

export const TICKET_MANUAL_STATUS = [TICKET_STATUS.OPEN, TICKET_STATUS.CLOSED];
