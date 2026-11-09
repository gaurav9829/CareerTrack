// Auth endpoints: login (sets httpOnly JWT cookie), logout (clears it), me.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const Admin = require('../models/Admin');

function safeAdmin(admin) {
  return { id: admin._id, name: admin.name, email: admin.email, role: admin.role };
}

function cookieOptions() {
  return {
    httpOnly: true, // JS (XSS) can never read the token
    secure: env.isProd, // HTTPS-only in production
    sameSite: env.COOKIE_SAMESITE,
    maxAge: env.COOKIE_MAX_AGE,
    path: '/',
  };
}

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Generic error message for BOTH wrong email and wrong password
  // (never tell an attacker which part was wrong).
  const admin = await Admin.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');
  if (!admin || !(await admin.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const token = jwt.sign({ id: admin._id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  res.cookie(env.COOKIE_NAME, token, cookieOptions());

  res.json({ success: true, data: safeAdmin(admin), message: 'Logged in successfully.' });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie(env.COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
  res.json({ success: true, message: 'Logged out.' });
});

// GET /api/auth/me (protect loads req.admin)
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: safeAdmin(req.admin) });
});

module.exports = { login, logout, me };
