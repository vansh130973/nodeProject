import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import {
  IMAGE_MIMETYPE,
  IMAGE_MAX_FILE_BYTES,
  BULK_IMPORT_UPLOADS_SUBDIR,
  BULK_IMPORT_MAX_FILE_BYTES,
} from "../common/constants/app.constants.js";

// Store temporarily in uploads/tmp/ — moved to uploads/{userId}/ after DB insert
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = "uploads/tmp";
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Keep original extension only, temp name
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `tmp_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: IMAGE_MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMETYPE.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
  },
});

export default upload;

/**
 * Move uploaded file from tmp to uploads/{userId}/profile{ext}
 * Returns the final relative path stored in DB  e.g. "uploads/12/profile.jpg"
 */
export const moveToUserFolder = async (file, userId) => {
  if (!file) return null;

  const ext =
    path.extname(file.originalname).toLowerCase() ||
    path.extname(file.filename);

  const dir = path.join("uploads", String(userId));

  // 👇 generate unique filename
  const uniqueName = `user_${Date.now()}_${Math.floor(Math.random() * 100000)}${ext}`;
  const finalPath = path.join(dir, uniqueName);

  await fs.mkdir(dir, { recursive: true });

  await fs.rename(file.path, finalPath);

  return finalPath; // e.g. "uploads/14/user_1773827615695_91682.png"
};

/**
 * Move upload into uploads/tickets/{ticketId}/[messages/] — returns relative path for DB.
 */
export const moveTicketAttachment = async (file, ticketId, subfolder = "") => {
  if (!file) return null;

  const ext =
    path.extname(file.originalname).toLowerCase() ||
    path.extname(file.filename);

  const base = path.join("uploads", "tickets", String(ticketId));
  const dir = subfolder ? path.join(base, subfolder) : base;

  const uniqueName = `att_${Date.now()}_${Math.floor(Math.random() * 100000)}${ext}`;
  const finalPath = path.join(dir, uniqueName);

  await fs.mkdir(dir, { recursive: true });
  await fs.rename(file.path, finalPath);

  return finalPath.replace(/\\/g, "/");
};

/**
 * CSV-specific storage — saves to BULK_IMPORT_UPLOADS_SUBDIR with a unique filename.
 * Used exclusively by the bulk import route.
 */
const csvStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(BULK_IMPORT_UPLOADS_SUBDIR, { recursive: true });
    cb(null, BULK_IMPORT_UPLOADS_SUBDIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".csv";
    cb(null, `csv_${Date.now()}_${Math.floor(Math.random() * 100000)}${ext}`);
  },
});

export const uploadCSV = multer({
  storage: csvStorage,
  limits: { fileSize: BULK_IMPORT_MAX_FILE_BYTES },
});
