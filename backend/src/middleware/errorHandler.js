// Central error handling: 404 for unmatched routes + one error mapper that
// converts every known error type into the standard JSON error shape
// { success:false, message, errors:[...] }.
const mongoose = require('mongoose');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars - Express needs the 4-arg signature
function errorHandler(err, req, res, next) {
  let error = err;
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = Array.isArray(err.errors) ? err.errors : [];

  // Mongoose schema validation -> 400 with per-field messages
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }
  // Bad ObjectId / bad cast -> 400
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for ${err.path}.`;
  }
  // Mongo duplicate key -> 409 (e.g. applying twice to the same job)
  else if (err.code === 11000) {
    statusCode = 409;
    const keys = Object.keys(err.keyValue || {});
    message =
      keys.includes('job') && keys.includes('email')
        ? 'You have already applied to this job with this email address.'
        : 'Duplicate value for a unique field.';
  }
  // Multer upload errors -> 413 for size, 400 for the rest
  else if (err instanceof multer.MulterError) {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File too large. Maximum size is ${env.MAX_RESUME_MB} MB.`
        : `Upload error: ${err.code}.`;
  }
  // Tampered/expired tokens -> 401
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired or invalid. Please log in again.';
  }

  // Log server errors, but never leak internal details to the client in production.
  if (statusCode >= 500) {
    console.error('[error]', err);
    if (env.isProd) message = 'Internal server error';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: statusCode === 500 && env.isProd ? [] : errors,
  });
}

module.exports = { notFoundHandler, errorHandler };
