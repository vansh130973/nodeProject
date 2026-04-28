import Joi from "joi";

export const createTicketSchema = Joi.object({
  subject: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().allow("").optional(),
});

export const addMessageSchema = Joi.object({
  message: Joi.string().trim().allow("").optional(),
});

export const updateTicketStatusSchema = Joi.object({
  status: Joi.string().valid("open", "pending", "closed", "adminReply", "userReply").required(),
});

export const listTicketsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().valid("open", "pending", "closed", "adminReply", "userReply", "all", "").optional(),
  search: Joi.string().trim().allow("").optional(),
});