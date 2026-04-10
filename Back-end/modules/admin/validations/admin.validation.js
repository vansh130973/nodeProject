import Joi from "joi";

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const PASSWORD_MSG = "Password must be 8+ characters and include an uppercase letter, a number, and a special character (@$!%*?&)";

export const addAdminSchema = Joi.object({
  userName: Joi.string().min(3).max(20).required().messages({
    "string.empty": "Username is required",
    "string.min":   "Username must be at least 3 characters",
    "string.max":   "Username must not exceed 20 characters",
  }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email format",
  }),
  phone: Joi.string().length(10).pattern(/^[0-9]+$/).required().messages({
    "string.empty":        "Phone number is required",
    "string.length":       "Phone number must be exactly 10 digits",
    "string.pattern.base": "Phone number must contain only numbers",
  }),
  password: Joi.string().pattern(PASSWORD_PATTERN).required().messages({
    "string.empty":        "Password is required",
    "string.pattern.base": PASSWORD_MSG,
  }),
  conformPassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.required": "Confirm password is required",
    "any.only":     "Passwords do not match",
  }),
});

export const loginAdminSchema = Joi.object({
  userName: Joi.string().required(),
  password: Joi.string().required(),
});

export const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid("active", "pending", "inactive").required().messages({
    "any.only":     "Status must be one of: active, pending, inactive",
    "string.empty": "Status is required",
  }),
});

export const editUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({ "string.empty": "First name is required" }),
  lastName:  Joi.string().min(2).max(50).required().messages({ "string.empty": "Last name is required" }),
  email:     Joi.string().email().required().messages({ "string.empty": "Email is required", "string.email": "Invalid email format" }),
  phone:     Joi.string().length(10).pattern(/^[0-9]+$/).required().messages({
    "string.empty": "Phone is required", "string.length": "Phone must be exactly 10 digits", "string.pattern.base": "Phone must contain only numbers",
  }),
  gender: Joi.string().valid("male", "female", "other").required().messages({ "any.only": "Gender must be male, female or other" }),
  password: Joi.string().allow("", null).optional().when(Joi.string().min(1), {
    then: Joi.string().pattern(PASSWORD_PATTERN).messages({ "string.pattern.base": "Password must be 8+ chars with 1 uppercase, 1 number, 1 special character" }),
  }),
});

// ─── Admin CRUD Validations ───────────────────────────────────────────────────

export const editAdminSchema = Joi.object({
  userName: Joi.string().min(3).max(20).required().messages({
    "string.empty": "Username is required",
    "string.min":   "Username must be at least 3 characters",
    "string.max":   "Username must not exceed 20 characters",
  }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email format",
  }),
  phone: Joi.string().length(10).pattern(/^[0-9]+$/).required().messages({
    "string.empty":        "Phone is required",
    "string.length":       "Phone must be exactly 10 digits",
    "string.pattern.base": "Phone must contain only numbers",
  }),
  password: Joi.string().allow("", null).optional().when(Joi.string().min(1), {
    then: Joi.string().pattern(PASSWORD_PATTERN).messages({ "string.pattern.base": PASSWORD_MSG }),
  }),
});