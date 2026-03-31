import multer from "multer";
import path from "path";
import { promises as fs } from "fs";

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

const upload = multer({ storage });

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