// Auth routes: /api/auth/login, /api/auth/logout, /api/auth/me
const express = require('express');
const { body } = require('express-validator');

const { validate } = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimiters');
const { protect } = require('../middleware/auth');
const { login, logout, me } = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post(
  '/login',
  loginLimiter, // strict brute-force limiter
  validate([
    body('email').trim().isEmail().withMessage('Please provide a valid email.'),
    body('password').isString().notEmpty().withMessage('Password is required.'),
  ]),
  asyncHandler(login),
);

router.post('/logout', asyncHandler(logout));

// Used by the frontend AuthContext to restore the session on page load.
router.get('/me', protect, asyncHandler(me));

module.exports = router;
