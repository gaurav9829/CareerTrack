// Public API routes (no authentication).
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Simple health probe for Render uptime checks and local verification.
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const mongoose = require('mongoose');
    res.json({
      success: true,
      data: { status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' },
    });
  }),
);

module.exports = router;
