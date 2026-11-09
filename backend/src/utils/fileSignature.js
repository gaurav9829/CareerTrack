// Magic-byte validation: after multer saves the file we inspect the first bytes
// to confirm the content really is what the extension claims.
//   PDF  starts with: 25 50 44 46 ("%PDF")
//   DOCX is a ZIP that starts with: 50 4B 03 04 ("PK\x03\x04")
// A renamed .exe -> .pdf fails here and gets deleted.
const fs = require('fs/promises');
const path = require('path');
const ApiError = require('./ApiError');

const SIGNATURES = {
  '.pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  '.docx': [0x50, 0x4b, 0x03, 0x04], // PK.. (ZIP local file header)
};

async function validateFileSignature(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const expected = SIGNATURES[ext];
  if (!expected) {
    throw ApiError.badRequest('Invalid file type. Only PDF and DOCX files are allowed.');
  }

  const handle = await fs.open(filePath, 'r');
  try {
    const { buffer } = await handle.read({
      buffer: Buffer.alloc(expected.length),
      position: 0,
      length: expected.length,
    });
    const matches = expected.every((byte, i) => buffer[i] === byte);
    if (!matches) {
      throw ApiError.badRequest('File content does not look like a valid PDF or DOCX.');
    }
  } finally {
    await handle.close();
  }
}

// Best-effort cleanup - used whenever an upload must not outlive a failed request.
async function removeFileQuietly(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[cleanup] failed to remove file', filePath, err);
  }
}

module.exports = { validateFileSignature, removeFileQuietly };
