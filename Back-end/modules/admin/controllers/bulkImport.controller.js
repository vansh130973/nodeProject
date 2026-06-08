import bcrypt from "bcrypt";
import { promises as fs } from "fs";
import { createWriteStream } from "fs";
import path from "path";
import https from "https";
import http from "http";
import { sendSuccessResponse, sendErrorResponse } from "../../../common/http/response.js";
import { emitBulkImportEvent } from "../../../socket/socketManager.js";
import {
  bulkFindByUsernamesOrEmails,
  bulkInsertUsers,
  bulkUpdateUsers,
  updateProfilePicture,
} from "../../user/models/user.model.js";
import {
  BCRYPT_ROUNDS,
  BULK_IMPORT_UPLOADS_SUBDIR,
  BULK_IMPORT_DEFAULT_PASSWORD_SUFFIX,
  CSV_MIMETYPE,
} from "../../../common/constants/app.constants.js";

const REQUIRED_COLUMNS = [
  "first name", "last name", "user name",
  "mobile number", "status", "gender", "email address",
];

const VALID_STATUSES = new Set(["active", "inactive", "pending", "deleted"]);
const VALID_GENDERS  = new Set(["male", "female", "other"]);

// ─── Tiny reusable utilities ──────────────────────────────────────────────────

/** Silently delete a file — never throws. */
const unlinkSilent = (p) => fs.unlink(p).catch(() => {});

/** Build a skip/error record — one shape used everywhere. */
const makeSkip = (r, reason) =>
  ({ row: r.row, userName: r.userName, email: r.email, reason });

// CSV Parser
const parseCSV = (text) => {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim());

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
        fields.push(cur.trim()); cur = "";
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

// ─── Row extraction + validation ──────────────────────────────────────────────

/** Normalise one raw CSV object into typed fields. */
const extractRow = (r, index) => ({
  row:            index + 2, // row 1 = header
  firstName:      (r["first name"]      ?? "").trim(),
  lastName:       (r["last name"]       ?? "").trim(),
  userName:       (r["user name"]       ?? "").trim(),
  phone:          String(r["mobile number"] ?? "").trim(),
  status:         (r["status"]          ?? "").toLowerCase().trim(),
  gender:         (r["gender"]          ?? "").toLowerCase().trim(),
  profilePicture: (r["profile picture"] ?? "").trim() || null,
  email:          (r["email address"]   ?? "").toLowerCase().trim(),
});

/**
 * Validate extracted fields (field-level only — no DB calls).
 * @returns {string|null} Error reason, or null if the row is valid.
 */
const validateRow = ({ firstName, lastName, userName, email, status, gender }) => {
  if (!firstName || !lastName || !userName || !email) return "Missing required field";
  if (!VALID_STATUSES.has(status)) return `Invalid status "${status}"`;
  if (!VALID_GENDERS.has(gender))  return `Invalid gender "${gender}"`;
  return null;
};

// ─── Parse + validate pipeline (no DB calls) ─────────────────────────────────
/**
 * Reads a CSV file and returns field-validated rows only.
 * No duplicate check — used by both validate and import controllers.
 */
const classifyCSV = async (csvPath) => {
  const records = parseCSV(await fs.readFile(csvPath, "utf8"));

  if (!records.length) throw Object.assign(new Error("CSV file is empty"), { status: 400 });

  const missing = REQUIRED_COLUMNS.filter((c) => !Object.keys(records[0]).includes(c));
  if (missing.length)
    throw Object.assign(
      new Error(`CSV is missing required columns: ${missing.join(", ")}`),
      { status: 400 }
    );

  const normalised = [];
  const errorRows  = [];

  for (let i = 0; i < records.length; i++) {
    const fields = extractRow(records[i], i);
    const error  = validateRow(fields);
    if (error) errorRows.push(makeSkip(fields, error));
    else normalised.push({ ...fields, isDeleted: fields.status === "deleted" ? 1 : 0 });
  }

  return { total: records.length, normalised, errorRows };
};

// ─── Profile picture downloader ───────────────────────────────────────────────
const downloadProfilePicture = (url, userId) =>
  new Promise((resolve) => {
    if (!url?.startsWith("http")) { resolve(null); return; }

    const tryDownload = (targetUrl, redirects = 0) => {
      if (redirects > 5) { resolve(null); return; }
      const proto = targetUrl.startsWith("https") ? https : http;

      proto.get(targetUrl, { timeout: 8000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume(); tryDownload(res.headers.location, redirects + 1); return;
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

// ─── Background import ────────────────────────────────────────────────────────
/**
 * Runs after the 202 response is flushed (via setImmediate).
 *
 * Flow:
 *   1. DB lookup to split valid rows into toInsert vs toUpdate
 *   2. Bulk INSERT new rows (fallback to row-by-row on failure)
 *   3. Row-by-row UPDATE existing rows
 *   4. Download profile pictures for both inserted + updated rows
 *
 * Progress events emitted:
 *   bulkImport:started  — before any work begins
 *   bulkImport:progress — after inserts complete; after updates complete; after pictures
 *   bulkImport:done     — final summary { success, total, inserted, updated, invalid, failed, errors, message }
 */
const runBackgroundImport = async (normalised, invalidCount, csvPath, adminId) => {
  const emit        = (type, payload) => emitBulkImportEvent(adminId, type, payload);
  const totalInCSV  = normalised.length + invalidCount;
  const failed      = [];
  const insertedIds = [];
  const updatedIds  = [];

  try {
    // ── 1. DB lookup: split into insert vs update ──────────────────────────────
    const existing = await bulkFindByUsernamesOrEmails(
      normalised.map((r) => r.userName),
      normalised.map((r) => r.email)
    );

    // Build lookup Sets from existing rows
    const existingByUserName = new Map(existing.map((r) => [r.userName.toLowerCase(), r]));
    const existingByEmail    = new Map(existing.map((r) => [r.email.toLowerCase(),    r]));

    const toInsert = [];
    const toUpdate = [];

    for (const r of normalised) {
      const byName  = existingByUserName.get(r.userName.toLowerCase());
      const byEmail = existingByEmail.get(r.email.toLowerCase());
      if (byName || byEmail) {
        toUpdate.push(r);
      } else {
        toInsert.push(r);
      }
    }

    emit("started", {
      total:   normalised.length,
      message: `Import started — ${toInsert.length} to insert, ${toUpdate.length} to update…`,
    });

    // ── 2. Hash passwords for new users ───────────────────────────────────────
    const usersToInsert = await Promise.all(
      toInsert.map(async ({ firstName, lastName, userName, email, phone, gender, status, isDeleted, profilePicture }) => ({
        firstName, lastName, userName, email, phone, gender, status, isDeleted,
        password:       await bcrypt.hash(`${userName}${BULK_IMPORT_DEFAULT_PASSWORD_SUFFIX}`, BCRYPT_ROUNDS),
        profilePicture: null,
        _remoteUrl:     profilePicture,
      }))
    );

    // ── 3. INSERT new rows ────────────────────────────────────────────────────
    if (usersToInsert.length) {
      try {
        const result = await bulkInsertUsers(usersToInsert);
        insertedIds.push(...result.insertedIds);

        emit("progress", {
          phase:     "inserting",
          processed: result.affectedRows,
          total:     normalised.length,
          percent:   Math.round((result.affectedRows / normalised.length) * 50),
          message:   `${result.affectedRows} users inserted. Processing updates…`,
        });
      } catch {
        // Bulk failed — insert row-by-row
        for (let i = 0; i < usersToInsert.length; i++) {
          try {
            const result = await bulkInsertUsers([usersToInsert[i]]);
            insertedIds.push(...result.insertedIds);
          } catch (rowErr) {
            failed.push(makeSkip(toInsert[i], rowErr?.sqlMessage ?? rowErr?.message ?? "Insert failed"));
          }

          if ((i + 1) % 10 === 0 || i === usersToInsert.length - 1) {
            emit("progress", {
              phase:     "inserting",
              processed: i + 1,
              total:     normalised.length,
              percent:   Math.round(((i + 1) / normalised.length) * 50),
              message:   `Inserting… ${i + 1}/${usersToInsert.length}`,
            });
          }
        }
      }
    }

    // ── 4. UPDATE existing rows ───────────────────────────────────────────────
    if (toUpdate.length) {
      const usersToUpdate = toUpdate.map(({ firstName, lastName, userName, email, phone, gender, status, isDeleted, profilePicture }) => ({
        firstName, lastName, userName, email, phone, gender, status, isDeleted,
        profilePicture: null,
        _remoteUrl: profilePicture,
      }));

      try {
        const result = await bulkUpdateUsers(usersToUpdate);
        updatedIds.push(...result.updatedIds);
      } catch {
        // Row-by-row fallback
        for (let i = 0; i < usersToUpdate.length; i++) {
          try {
            const result = await bulkUpdateUsers([usersToUpdate[i]]);
            updatedIds.push(...result.updatedIds);
          } catch (rowErr) {
            failed.push(makeSkip(toUpdate[i], rowErr?.sqlMessage ?? rowErr?.message ?? "Update failed"));
          }
        }
      }

      emit("progress", {
        phase:     "inserting",
        processed: insertedIds.length + updatedIds.length,
        total:     normalised.length,
        percent:   75,
        message:   `${updatedIds.length} users updated. Downloading profile pictures…`,
      });
    }

    // ── 5. Download profile pictures (insert + update) ────────────────────────
    const allProcessed = [...insertedIds, ...updatedIds];
    const withPics = allProcessed.filter((r) => r._remoteUrl);

    if (withPics.length) {
      emit("progress", {
        phase:     "pictures",
        processed: 0,
        total:     withPics.length,
        percent:   75,
        message:   `Downloading ${withPics.length} profile picture${withPics.length !== 1 ? "s" : ""}…`,
      });

      await Promise.allSettled(
        withPics.map(async ({ id, _remoteUrl }) => {
          const localPath = await downloadProfilePicture(_remoteUrl, id);
          if (localPath) await updateProfilePicture(id, localPath).catch(() => {});
        })
      );
    }

    // ── 6. Done ───────────────────────────────────────────────────────────────
    emit("done", {
      success:  true,
      total:    totalInCSV,
      inserted: insertedIds.length,
      updated:  updatedIds.length,
      invalid:  invalidCount,
      failed:   failed.length,
      errors:   failed,
      message:  buildDoneMessage(insertedIds.length, updatedIds.length, invalidCount, failed.length),
    });

  } catch (error) {
    console.error("[bulk-import] Background error:", error);

    emit("done", {
      success:  false,
      total:    totalInCSV,
      inserted: insertedIds.length,
      updated:  updatedIds.length,
      invalid:  invalidCount,
      failed:   failed.length + (normalised.length - insertedIds.length - updatedIds.length - failed.length),
      errors:   failed,
      message:  "Import failed during background processing. Please try again.",
    });

  } finally {
    await unlinkSilent(csvPath);
  }
};

/** Build a human-readable summary string for the done event. */
const buildDoneMessage = (inserted, updated, invalid, failed) => {
  const parts = [];
  if (inserted) parts.push(`${inserted} user${inserted !== 1 ? "s" : ""} inserted`);
  if (updated)  parts.push(`${updated} user${updated !== 1 ? "s" : ""} updated`);
  if (invalid)  parts.push(`${invalid} invalid row${invalid !== 1 ? "s" : ""} skipped`);
  if (failed)   parts.push(`${failed} row${failed !== 1 ? "s" : ""} failed`);
  if (!parts.length) parts.push("Nothing to import");
  return parts.join(", ") + ".";
};

// ─── Path guard ───────────────────────────────────────────────────────────────
const resolveSafeCsvPath = async (rawPath) => {
  if (!rawPath)
    throw Object.assign(new Error("csvPath is required"), { status: 400 });

  const csvPath = path.normalize(rawPath);
  if (!path.resolve(csvPath).startsWith(path.resolve(BULK_IMPORT_UPLOADS_SUBDIR)))
    throw Object.assign(new Error("Invalid file path"), { status: 400 });

  try { await fs.access(csvPath); } catch {
    throw Object.assign(new Error("CSV file not found. Please re-upload."), { status: 404 });
  }

  return csvPath;
};

// ─── Controller 1: Validate ───────────────────────────────────────────────────
/**
 * POST /admin/users/bulk-validate
 *
 * Accepts a CSV upload, runs field-level validation ONLY (no DB calls, no
 * duplicate check). Returns a summary of valid vs invalid rows.
 *
 * Response data:
 *   csvPath   — opaque server path; pass to bulk-import
 *   total     — total data rows in CSV
 *   valid     — rows that passed field validation
 *   invalid   — rows with field errors (will be skipped on import)
 *   canImport — true when valid > 0
 *   errors    — [{row, userName, email, reason}] for invalid rows
 */
export const validateCSV = async (req, res) => {
  const csvPath = req.file?.path ?? null;

  try {
    if (!req.file || !csvPath)
      return sendErrorResponse(res, "Please upload a CSV file", 400);

    const { originalname: name = "", mimetype: mime } = req.file;
    const isCSV = CSV_MIMETYPE.includes(mime) || name.toLowerCase().endsWith(".csv");

    if (!isCSV) {
      await unlinkSilent(csvPath);
      return sendErrorResponse(res, "Only CSV files are allowed", 400);
    }

    const { total, normalised, errorRows } = await classifyCSV(csvPath);

    return sendSuccessResponse(res, "Validation complete", {
      csvPath,
      total,
      valid:     normalised.length,
      invalid:   errorRows.length,
      canImport: normalised.length > 0,
      errors:    errorRows,
    });

  } catch (err) {
    console.error("[bulk-validate] Error:", err);
    if (csvPath) await unlinkSilent(csvPath);

    const status  = err.status ?? 500;
    const message = err.status ? err.message : "An unexpected error occurred during validation";
    return sendErrorResponse(res, message, status);
  }
};

// ─── Controller 2: Import ─────────────────────────────────────────────────────
/**
 * POST /admin/users/bulk-import
 * Body: { csvPath: "uploads/csv/csv_xxx.csv" }   (JSON, no file upload)
 *
 * Re-runs field-level validation (no duplicate check at this stage).
 * Background job then does a DB lookup to split rows into INSERT vs UPDATE
 * and runs both, emitting socket progress throughout.
 *
 * Responds 202 immediately. Real-time updates via:
 *   bulkImport:started  — { total, message }
 *   bulkImport:progress — { phase, processed, total, percent, message }
 *   bulkImport:done     — { success, total, inserted, updated, invalid, failed, errors, message }
 */
export const bulkImportUsers = async (req, res) => {
  let csvPath;
  let handledByBackground = false;

  try {
    csvPath = await resolveSafeCsvPath(req.body?.csvPath);

    const { total, normalised, errorRows } = await classifyCSV(csvPath);

    if (!normalised.length) {
      return sendSuccessResponse(res, "Nothing to import — all rows have field errors", {
        queued:  0,
        invalid: errorRows.length,
        total,
      });
    }

    handledByBackground = true;
    setImmediate(() =>
      runBackgroundImport(normalised, errorRows.length, csvPath, req.user.id)
    );

    return sendSuccessResponse(
      res,
      "Import started. You will be notified via socket when it completes.",
      {
        queued:  normalised.length,
        invalid: errorRows.length,
        total,
      },
      202
    );

  } catch (err) {
    console.error("[bulk-import] Error:", err);
    const status  = err.status ?? 500;
    const message = err.status ? err.message : "An unexpected error occurred during import";
    return sendErrorResponse(res, message, status);

  } finally {
    if (!handledByBackground && csvPath) await unlinkSilent(csvPath);
  }
};
