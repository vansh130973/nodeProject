const SERVER_URL = process.env.SERVER_URL || "http://localhost:3200";

/**
 * Convert DB-stored file path into a public URL.
 * If path is already absolute (http/https), it is returned unchanged.
 * @param {string|null|undefined} relativePath
 * @returns {string|null}
 */
export const buildFileUrl = (relativePath) => {
  if (!relativePath) return null;
  if (String(relativePath).startsWith("http")) return relativePath;
  return `${SERVER_URL}/${relativePath}`;
};
