import bcrypt from "bcrypt";
import { promises as fs } from "fs";
import { createWriteStream } from "fs";
import path from "path";
import https from "https";
import http from "http";
import { sendSuccessResponse, sendErrorResponse } from "../../../common/http/response.js";
import {
  bulkFindExistingUsernamesAndEmails,
  bulkInsertUsers,
  updateProfilePicture,
} from "../../user/models/user.model.js";

// Constants 
const BCRYPT_ROUNDS = 10;

const REQUIRED_COLUMNS = [
  "first name", "last name", "user name",
  "mobile number", "status", "gender", "email address",
];

const VALID_STATUSES = new Set(["active", "inactive", "pending", "deleted"]);
const VALID_GENDERS  = new Set(["male", "female", "other"]);

// CSV Parser
const parseCSV = (text) => {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim()); // skip blank lines including trailing newline

  if (!lines.length) return [];

  const parseRow = (line) => {
    const fields = [];
    let cur = "", inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        fields.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
};

// Profile picture downloader 

const downloadProfilePicture = (url, userId) =>
  new Promise((resolve) => {
    if (!url?.startsWith("http")) { resolve(null); return; }

    const tryDownload = (targetUrl, redirects = 0) => {
      if (redirects > 5) { resolve(null); return; }
      const proto = targetUrl.startsWith("https") ? https : http;

      proto.get(targetUrl, { timeout: 8000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          tryDownload(res.headers.location, redirects + 1);
          return;
        }
        if (res.statusCode !== 200) { res.resume(); resolve(null); return; }

        const ct  = res.headers["content-type"] ?? "";
        const ext = ct.includes("png") ? ".png" : ct.includes("webp") ? ".webp" : ".jpg";
        const dir  = path.join("uploads", String(userId));
        const file = path.join(dir, `user_${Date.now()}_${Math.floor(Math.random() * 100000)}${ext}`);

        fs.mkdir(dir, { recursive: true })
          .then(() => {
            const writer = createWriteStream(file);
            res.pipe(writer);
            writer.on("finish", () => resolve(file.replace(/\\/g, "/")));
            writer.on("error",  () => resolve(null));
          })
          .catch(() => resolve(null));
      })
      .on("error",   () => resolve(null))
      .on("timeout", () => resolve(null));
    };

    tryDownload(url);
  });

// ─── Duplicate check helpers ──────────────────────────────────────────────────

/**
 * Build a lookup key used for duplicate detection.
 * Lowercasing once here avoids repeated .toLowerCase() calls later.
 */
const key = (userName, email) =>
  ({ name: userName.toLowerCase(), email: email.toLowerCase() });

/**
 * Run ONE DB query that covers both non-deleted and deleted rows,
 * then split the results by isDeleted flag.
 *
 * Returns:
 *   activeNames/activeEmails  — isDeleted=0 → always block
 *   deletedNames/deletedEmails — isDeleted=1 → allow once (for non-deleted CSV rows)
 *                                             → block entirely (for deleted CSV rows)
 */
const loadExistingRecords = async (allRows) => {
  if (!allRows.length) return { activeNames: new Set(), activeEmails: new Set(), deletedNames: new Set(), deletedEmails: new Set() };

  const existing = await bulkFindExistingUsernamesAndEmails(
    allRows.map((r) => r.userName),
    allRows.map((r) => r.email)
  );

  return {
    activeNames:  new Set(existing.filter((r) => r.isDeleted === 0).map((r) => r.userName.toLowerCase())),
    activeEmails: new Set(existing.filter((r) => r.isDeleted === 0).map((r) => r.email.toLowerCase())),
    deletedNames: new Set(existing.filter((r) => r.isDeleted === 1).map((r) => r.userName.toLowerCase())),
    deletedEmails:new Set(existing.filter((r) => r.isDeleted === 1).map((r) => r.email.toLowerCase())),
  };
};

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * POST /admin/users/bulk-import
 *
 * Rules:
 * - Only .csv files accepted
 * - Password = userName@123
 * - Profile pictures downloaded to uploads/{userId}/
 * - status "deleted" → isDeleted = 1
 *
 * Duplicate logic (non-deleted CSV rows):
 *   userName/email not in DB            → insert
 *   exists with isDeleted=1 (once only) → insert as isDeleted=0
 *   exists with isDeleted=0             → skip
 *   deleted slot already used in batch  → skip
 *
 * Duplicate logic (deleted CSV rows):
 *   userName/email already in DB        → skip(any isDeleted)
 *   duplicate within batch              → skip
 *   first occurrence, not in DB         → insert
 */
export const bulkImportUsers = async (req, res) => {
  try {
    // ── 1. File check ─────────────────────────────────────────────────────────
    if (!req.file) return sendErrorResponse(res, "Please upload a CSV file", 400);

    const { originalname: name = "", mimetype: mime } = req.file;
    const isCSV = mime === "text/csv" || mime === "application/vnd.ms-excel" || name.toLowerCase().endsWith(".csv");

    if (!isCSV) {
      await fs.unlink(req.file.path).catch(() => {});
      return sendErrorResponse(res, "Only CSV files are allowed", 400);
    }

    // 2. Read + parse
    let fileContent;
    try {
      fileContent = await fs.readFile(req.file.path, "utf8");
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }

    const records = parseCSV(fileContent);
    if (!records.length) return sendErrorResponse(res, "CSV file is empty", 400);

    // 3. Column check
    const missing = REQUIRED_COLUMNS.filter((c) => !Object.keys(records[0]).includes(c));
    if (missing.length) return sendErrorResponse(res, `CSV is missing required columns: ${missing.join(", ")}`, 400);

    // 4. Row validation
    const normalised  = [];
    const skippedRows = [];

    for (let i = 0; i < records.length; i++) {
      const r   = records[i];
      const row = i + 2;

      const firstName      = (r["first name"]      ?? "").trim();
      const lastName       = (r["last name"]        ?? "").trim();
      const userName       = (r["user name"]        ?? "").trim();
      const phone          = String(r["mobile number"] ?? "").trim();
      const status         = (r["status"]           ?? "").toLowerCase().trim();
      const gender         = (r["gender"]           ?? "").toLowerCase().trim();
      const profilePicture = (r["profile picture"]  ?? "").trim() || null;
      const email          = (r["email address"]    ?? "").toLowerCase().trim();

      if (!firstName || !lastName || !userName || !email) {
        skippedRows.push({ row, userName, email, reason: "Missing required field" }); continue;
      }
      if (!VALID_STATUSES.has(status)) {
        skippedRows.push({ row, userName, email, reason: `Invalid status "${status}"` }); continue;
      }
      if (!VALID_GENDERS.has(gender)) {
        skippedRows.push({ row, userName, email, reason: `Invalid gender "${gender}"` }); continue;
      }

      normalised.push({
        row, firstName, lastName, userName, phone,
        status, isDeleted: status === "deleted" ? 1 : 0,
        gender, profilePicture, email,
      });
    }

    if (!normalised.length) return sendErrorResponse(res, "No valid rows found in CSV", 400);

    // 5. Duplicate check
    // One DB query covers all rows — split results by isDeleted after
    const { activeNames, activeEmails, deletedNames, deletedEmails } =
      await loadExistingRecords(normalised);

    const nonDeleted = normalised.filter((r) => r.isDeleted === 0);
    const deleted    = normalised.filter((r) => r.isDeleted === 1);
    const toInsert   = [];

    // Used to track "deleted slot consumed" within this batch
    const usedNames  = new Set();
    const usedEmails = new Set();

    for (const r of nonDeleted) {
      const { name: uName, email: uEmail } = key(r.userName, r.email);

      if (activeNames.has(uName)) { skippedRows.push({ row: r.row, userName: r.userName, email: r.email, reason: "userName already exists" }); continue; }
      if (activeEmails.has(uEmail)) { skippedRows.push({ row: r.row, userName: r.userName, email: r.email, reason: "email already exists" });    continue; }
      if (deletedNames.has(uName) && usedNames.has(uName)) { skippedRows.push({ row: r.row, userName: r.userName, email: r.email, reason: "userName already exists" }); continue; }
      if (deletedEmails.has(uEmail) && usedEmails.has(uEmail)) { skippedRows.push({ row: r.row, userName: r.userName, email: r.email, reason: "email already exists" });    continue; }

      if (deletedNames.has(uName))  usedNames.add(uName);
      if (deletedEmails.has(uEmail)) usedEmails.add(uEmail);
      toInsert.push(r);
    }

    // Deleted CSV rows: blocked if already in DB (either state) or duplicate in batch
    for (const r of deleted) {
      const { name: uName, email: uEmail } = key(r.userName, r.email);

      if (activeNames.has(uName)  || deletedNames.has(uName)) { skippedRows.push({ row: r.row, userName: r.userName, email: r.email, reason: "userName already exists" }); continue; }
      if (activeEmails.has(uEmail) || deletedEmails.has(uEmail)) { skippedRows.push({ row: r.row, userName: r.userName, email: r.email, reason: "email already exists" });    continue; }
      if (usedNames.has(uName)) { skippedRows.push({ row: r.row, userName: r.userName, email: r.email, reason: "userName already exists" }); continue; }
      if (usedEmails.has(uEmail)) { skippedRows.push({ row: r.row, userName: r.userName, email: r.email, reason: "email already exists" });    continue; }

      usedNames.add(uName);
      usedEmails.add(uEmail);
      toInsert.push(r);
    }

    if (!toInsert.length) {
      return sendSuccessResponse(res, "Bulk import completed — all rows already exist", {
        inserted: 0, skipped: skippedRows.length, skippedRecords: skippedRows,
      });
    }

    // 6. Hash passwords
    const usersToInsert = await Promise.all(
      toInsert.map(async (r) => ({
        firstName:      r.firstName,
        lastName:       r.lastName,
        userName:       r.userName,
        password:       await bcrypt.hash(`${r.userName}@123`, BCRYPT_ROUNDS),
        email:          r.email,
        phone:          r.phone,
        gender:         r.gender,
        profilePicture: null,
        status:         r.status,
        isDeleted:      r.isDeleted,
        _remoteUrl:     r.profilePicture,
      }))
    );

    // 7. Insert + download profile pictures
    const { insertedIds, affectedRows } = await bulkInsertUsers(usersToInsert);

    try {
      await Promise.allSettled(
        insertedIds.map(async ({ id, _remoteUrl }) => {
          if (!_remoteUrl) return;
          const localPath = await downloadProfilePicture(_remoteUrl, id);
          if (localPath) await updateProfilePicture(id, localPath).catch(() => {});
        })
      );
    } catch {
      console.warn("[bulk-import] Some profile pictures could not be downloaded");
    }

    return sendSuccessResponse(res, "Bulk import completed", {
      inserted: affectedRows,
      skipped:  skippedRows.length,
      skippedRecords: skippedRows,
    });

  } catch (error) {
    console.error("[bulk-import] Unexpected error:", error);
    return sendErrorResponse(res, "An unexpected error occurred during import", 500);
  }
};