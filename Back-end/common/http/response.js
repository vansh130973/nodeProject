/**
 * Send a standardized successful API response payload.
 * @param {import("express").Response} res
 * @param {string} message
 * @param {Object} [data={}]
 * @param {number} [statusCode=200]
 */
export const sendSuccessResponse = (res, message, data = {}, statusCode = 200) => {
  const payload = { success: true, message };

  if (data && typeof data === "object" && Object.keys(data).length > 0) {
    Object.assign(payload, data);
  }

  return res.status(statusCode).json(payload);
};

/**
 * Send a standardized failed API response payload.
 * @param {import("express").Response} res
 * @param {string} message
 * @param {number} [statusCode=400]
 * @param {unknown} [devMessage]
 */
export const sendErrorResponse = (res, message, statusCode = 400, devMessage) => {
  const payload = { success: false, message };

  if (process.env.NODE_ENV === "development" && devMessage !== undefined && devMessage !== null) {
    payload.devMessage =
      typeof devMessage === "object" ? JSON.stringify(devMessage) : devMessage;
  }

  return res.status(statusCode).json(payload);
};
