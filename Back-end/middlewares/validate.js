import { sendErrorResponse } from '../utils/response.js';

export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return sendErrorResponse(res, 'Validation Error', error.details.map((detail) => detail.message), 400);
  }
  next();
};
