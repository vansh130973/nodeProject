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
  password: Joi.string()
    .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must be 8+ characters and include an uppercase letter, a number, and a special character (@$!%*?&)",
    }),
  confirmPassword: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .messages({ "any.only": "Passwords do not match" }),
});

export const loginUserSchema = Joi.object({
  userName: Joi.string().required(),
  password: Joi.string().required(),
});
