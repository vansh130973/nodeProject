import Joi from "joi";

export const addAdminSchema = Joi.object({
  userName: Joi.string().min(3).max(20).required().messages({
    "string.empty": "Username is required",
    "string.min": "Username must be at least 3 characters",
    "string.max": "Username must not exceed 20 characters",
  }),

  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email format",
  }),

  phone: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.empty": "Phone number is required",
      "string.length": "Phone number must be exactly 10 digits",
      "string.pattern.base": "Phone number must contain only numbers",
    }),

  password: Joi.string()
    .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/)
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.pattern.base":
        "Password must be 8+ characters and include an uppercase letter, a number, and a special character (@$!%*?&)",
    }),

  conformPassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.required": "Confirm password is required",
    "any.only": "Passwords do not match",
  }),
});

export const loginAdminSchema = Joi.object({
  userName: Joi.string().required(),
  password: Joi.string().required(),
});