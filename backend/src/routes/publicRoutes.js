// Public routes (no authentication): health, job browsing, apply.
const express = require('express');
const { body, param } = require('express-validator');

const asyncHandler = require('../utils/asyncHandler');
const { removeFileQuietly } = require('../utils/fileSignature');
const { validate } = require('../middleware/validate');
const { applyLimiter } = require('../middleware/rateLimiters');
const { uploadResume } = require('../middleware/upload');
const normalizeBody = require('../middleware/normalizeBody');
const { listJobs, getJob, applyToJob } = require('../controllers/jobController');

const router = express.Router();

// Simple health probe for Render uptime checks and local verification.
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const mongoose = require('mongoose');
    res.json({
      success: true,
      data: {
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      },
    });
  }),
);

// GET /api/jobs - active jobs with search, filters, sort, pagination.
router.get('/jobs', asyncHandler(listJobs));

// GET /api/jobs/:id - one active job.
router.get(
  '/jobs/:id',
  validate([param('id').isMongoId().withMessage('Invalid job id.')]),
  asyncHandler(getJob),
);

// POST /api/jobs/:id/apply - multipart/form-data with résumé file.
// Middleware order matters: rate limit -> id check -> multer saves the file ->
// field validation -> controller (job active + duplicate + magic bytes).
router.post(
  '/jobs/:id/apply',
  applyLimiter,
  validate([param('id').isMongoId().withMessage('Invalid job id.')]),
  uploadResume.single('resume'),
  normalizeBody, // multer 2 bodies are null-prototype; rebuild before validation
  validate([
    body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2-120 characters.'),
    body('email').trim().isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
    body('phone')
      .trim()
      .matches(/^\+?[0-9][0-9\s-]{6,14}$/)
      .withMessage('Please provide a valid phone number.'),
    body('skills').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
    body('coverLetter').optional({ values: 'falsy' }).isString().isLength({ max: 5000 }),
    body('experienceYears').optional({ values: 'falsy' }).isInt({ min: 0, max: 50 }),
    body('experienceSummary').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
    body('education').optional({ values: 'falsy' }).isString(), // JSON-encoded array
  ]),
  asyncHandler(applyToJob),
);

// Cleanup guard: if ANY middleware above failed AFTER multer saved the file,
// delete the orphaned upload, then pass the error to the global handler.
router.use((err, req, res, next) => {
  if (req.file) removeFileQuietly(req.file.path);
  next(err);
});

module.exports = router;
