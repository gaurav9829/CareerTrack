// protect: reads the JWT from the httpOnly cookie, verifies it, loads the admin
// and attaches it to req.admin. Every /admin/* route and the résumé download
// go through this - without a valid cookie they get 401.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const Admin = require('../models/Admin');

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies[env.COOKIE_NAME];
  if (!token) throw ApiError.unauthorized('Authentication required. Please log in.');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw ApiError.unauthorized('Session expired or invalid. Please log in again.');
  }

  const admin = await Admin.findById(payload.id);
  if (!admin) throw ApiError.unauthorized('Account no longer exists.');

  req.admin = admin; // downstream handlers use req.admin._id, req.admin.name...
  next();
});

module.exports = { protect };
