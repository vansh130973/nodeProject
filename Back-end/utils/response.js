export const sendSuccessResponse = (res, message, data = {}, token = null, statusCode = 200) => {
  const payload = { success: true, message };
  if (token !== null) payload.token = token;
  return res.status(statusCode).json({ ...payload, ...data });
};

export const sendErrorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};