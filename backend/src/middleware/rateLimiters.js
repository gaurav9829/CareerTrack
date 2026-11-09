// Rate limiters (in-memory, per IP - fine for a single-instance deployment).
// In test runs the general/apply limits are raised so automated tests do not
// trip them; the login limiter stays strict because a test must exercise it.
const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');

const jsonHandler = (message) => (req, res) =>
  res.status(429).json({ success: false, message, errors: [] });

const base = {
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
};

// Whole API: ~100 requests / 15 min / IP
const generalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 1_000_000 : 100,
  handler: jsonHandler('Too many requests. Please slow down and try again later.'),
});

// Login: strict - brute-force protection. Kept low in tests on purpose.
const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 5 : 10,
  handler: jsonHandler('Too many login attempts. Try again in 15 minutes.'),
});

// Apply: ~10 submissions / hour / IP
const applyLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: env.isTest ? 1_000_000 : 10,
  handler: jsonHandler('Too many applications from this address. Try again later.'),
});

module.exports = { generalLimiter, loginLimiter, applyLimiter };
