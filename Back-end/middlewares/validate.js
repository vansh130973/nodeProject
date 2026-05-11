import { sendErrorResponse } from '../common/http/response.js';

export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) { return sendErrorResponse( res, error.details.map((d) => d.message), 400 ); }

  next();
};
