// Central environment config. Loads backend/.env once (path is relative to this
// file so it works no matter which folder `npm` was called from).
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  COOKIE_NAME: process.env.COOKIE_NAME || 'careertrack_token',
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || 'lax',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  MAX_RESUME_MB: parseInt(process.env.MAX_RESUME_MB, 10) || 4,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads/resumes',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Demo Admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
};

env.isProd = env.NODE_ENV === 'production';
env.isTest = env.NODE_ENV === 'test';

// UPLOAD_DIR is relative to the backend root; resolve it to an absolute path.
env.UPLOAD_PATH = path.resolve(__dirname, '..', '..', env.UPLOAD_DIR);

// Convert values like "1d" / "12h" / "30m" / "3600" into milliseconds,
// used for the cookie maxAge (JWT itself already accepts "1d").
function expiryToMs(value) {
  if (!value) return 24 * 60 * 60 * 1000;
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const match = /^(\d+)\s*(d|h|m)$/.exec(value);
  if (!match) return 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = { d: 24 * 60 * 60 * 1000, h: 60 * 60 * 1000, m: 60 * 1000 }[match[2]];
  return n * unit;
}

env.COOKIE_MAX_AGE = expiryToMs(env.JWT_EXPIRES_IN);

module.exports = env;
