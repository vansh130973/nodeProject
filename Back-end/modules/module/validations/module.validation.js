import Joi from "joi";
import { RECORD_STATUS } from "../../../common/constants/status.js";

export const createModuleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Module name is required",
    "string.min": "Module name must be at least 2 characters",
    "string.max": "Module name must not exceed 100 characters",
  }),
  status: Joi.string().valid(RECORD_STATUS.ACTIVE, RECORD_STATUS.INACTIVE).default(RECORD_STATUS.ACTIVE).messages({
    "any.only": "Status must be active or inactive",
  }),
});

export const updateModuleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Module name is required",
    "string.min": "Module name must be at least 2 characters",
    "string.max": "Module name must not exceed 100 characters",
  }),
  status: Joi.string().valid(RECORD_STATUS.ACTIVE, RECORD_STATUS.INACTIVE).required().messages({
    "string.empty": "Status is required",
    "any.only": "Status must be active or inactive",
  }),
});
