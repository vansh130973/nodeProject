import Joi from "joi";

export const addUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(11).required(),
  lastName: Joi.string().min(2).max(11).required(),
  userName: Joi.string().min(3).max(15).required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/)
    .required(),
  gender: Joi.string().valid("male", "female", "other").required(),
  password: Joi.string()
    .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must be 8+ chars with uppercase, number and special char",
    }),
  confirmPassword: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .messages({ "any.only": "Passwords do not match" }),
  profilePicture: Joi.string().allow("", null).optional(),
});

export const loginUserSchema = Joi.object({
  userName: Joi.string().required(),
  password: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  firstName:      Joi.string().min(2).max(11).required(),
  lastName:       Joi.string().min(2).max(11).required(),
  phone: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/)
    .required(),
  gender:         Joi.string().valid("male", "female", "other").required(),
  profilePicture: Joi.string().allow("", null).optional(),
});

export const changePasswordSchema = Joi.object({
  newPassword: Joi.string()
    .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/)
    .required()
    .messages({
      "string.pattern.base":
        "New password must be 8+ chars with uppercase, number and special char",
    }),
  confirmNewPassword: Joi.any()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({ "any.only": "Passwords do not match" }),
});
