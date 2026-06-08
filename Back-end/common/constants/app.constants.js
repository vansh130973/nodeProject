// ─── Image Upload ─────────────────────────────────────────────────────────────

export const IMAGE_MIMETYPE = ["image/jpeg", "image/png", "image/webp"];

/** Max profile image upload size (multer). */
export const IMAGE_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

// ─── CSV / Bulk Import ────────────────────────────────────────────────────────

export const CSV_MIMETYPE = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/** Sub-directory (under uploads/) for bulk-import spreadsheets. */
export const BULK_IMPORT_UPLOADS_SUBDIR = "uploads/csv";

/** Max bulk-import file size (multer) and confirm JSON body — same limit. */
export const BULK_IMPORT_MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

/** Default password for newly imported users: `{username}@123` */
export const BULK_IMPORT_DEFAULT_PASSWORD_SUFFIX = "@123";

// ─── Bcrypt ───────────────────────────────────────────────────────────────────

/** Salt rounds used for every bcrypt.hash() call in the project. */
export const BCRYPT_ROUNDS = 10;
