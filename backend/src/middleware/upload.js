// Résumé upload: multer disk storage with randomized filenames.
// Three validation layers:
//   1. extension (here, in fileFilter)
//   2. MIME type (hint only - browsers lie, so it is treated as a signal)
//   3. magic bytes AFTER upload (see utils/fileSignature.js) - the source of truth
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const ALLOWED_EXTENSIONS = {
  '.pdf': ['application/pdf'],
  // Some browsers send DOCX as octet-stream, so accept both and rely on magic bytes.
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
    'application/zip',
  ],
};

// Make sure the upload folder exists at require-time (tests skip server.js).
if (!fs.existsSync(env.UPLOAD_PATH)) {
  fs.mkdirSync(env.UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.UPLOAD_PATH),
  // NEVER trust the visitor's filename on disk: random UUID + safe extension.
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ALLOWED_EXTENSIONS[ext];
  if (!allowedMimes) {
    return cb(ApiError.badRequest('Invalid file type. Only PDF and DOCX files are allowed.'));
  }
  if (file.mimetype && !allowedMimes.includes(file.mimetype)) {
    return cb(ApiError.badRequest('File MIME type does not match PDF/DOCX.'));
  }
  return cb(null, true);
};

const uploadResume = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_RESUME_MB * 1024 * 1024, // Multer error LIMIT_FILE_SIZE -> 413
    files: 1,
  },
});

module.exports = { uploadResume, ALLOWED_EXTENSIONS };
