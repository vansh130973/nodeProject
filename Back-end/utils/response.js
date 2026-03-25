export const sendSuccessResponse = (res, message, data = {}, token = null) => {
  return res.json({ success: true, message, token, ...data });
};

export const sendErrorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};