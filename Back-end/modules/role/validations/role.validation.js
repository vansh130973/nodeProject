import Joi from "joi";

const permissionRow = Joi.object({
  moduleId:  Joi.number().integer().positive().required(),
  canView:   Joi.boolean().default(false),
  canAdd:    Joi.boolean().default(false),
  canEdit:   Joi.boolean().default(false),
  canDelete: Joi.boolean().default(false),
});

export const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Role name is required",
    "string.min":   "Role name must be at least 2 characters",
    "string.max":   "Role name must not exceed 100 characters",
  }),
  description: Joi.string().max(255).allow("", null).optional(),
  status: Joi.string().valid("active", "inactive").default("active").messages({
    "any.only": "Status must be active or inactive",
  }),
  permissions: Joi.array().items(permissionRow).default([]),
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Role name is required",
    "string.min":   "Role name must be at least 2 characters",
    "string.max":   "Role name must not exceed 100 characters",
  }),
  description: Joi.string().max(255).allow("", null).optional(),
  status: Joi.string().valid("active", "inactive").required().messages({
    "string.empty": "Status is required",
    "any.only":     "Status must be active or inactive",
  }),
  permissions: Joi.array().items(permissionRow).default([]),
});
