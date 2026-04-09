import Joi from "joi";

export const createModuleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Module name is required",
    "string.min": "Module name must be at least 2 characters",
    "string.max": "Module name must not exceed 100 characters",
  }),
  status: Joi.string().valid("active", "inactive").default("active").messages({
    "any.only": "Status must be active or inactive",
  }),
});

export const updateModuleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Module name is required",
    "string.min": "Module name must be at least 2 characters",
    "string.max": "Module name must not exceed 100 characters",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "string.empty": "Status is required",
    "any.only": "Status must be active or inactive",
  }),
});
