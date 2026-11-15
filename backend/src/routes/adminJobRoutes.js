// Admin job routes - ALL protected by the JWT cookie (protect middleware).
const express = require('express');
const { body, param } = require('express-validator');

const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const {
  getStats,
  listJobs,
  createJob,
  getJob,
  updateJob,
  publishJob,
  unpublishJob,
  closeJob,
  deleteJob,
} = require('../controllers/adminJobController');
const { JOB_STATUS, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } = require('../config/constants');

const router = express.Router();
router.use(protect); // every route below requires a valid admin cookie

const idRule = param('id').isMongoId().withMessage('Invalid job id.');

// Shared create/update rules. Arrays are validated loosely; the controller
// normalizes them. salary.max >= salary.min is enforced by the schema too.
const jobRules = [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 150 }),
  body('company').trim().notEmpty().withMessage('Company is required.').isLength({ max: 120 }),
  body('location').trim().notEmpty().withMessage('Location is required.').isLength({ max: 120 }),
  body('description').trim().notEmpty().withMessage('Description is required.').isLength({ max: 10000 }),
  body('employmentType').optional({ values: 'falsy' }).isIn(EMPLOYMENT_TYPES),
  body('experienceLevel').optional({ values: 'falsy' }).isIn(EXPERIENCE_LEVELS),
  body('salary.min')
    .optional({ values: 'falsy' }) // UI sends "" for blank salary inputs
    .isFloat({ min: 0 })
    .withMessage('Salary min must be a positive number.'),
  body('salary.max')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('Salary max must be a positive number.')
    .custom((max, { req }) => {
      const min = req.body?.salary?.min;
      if (max == null || max === '' || min == null || min === '') return true;
      return Number(min) <= Number(max);
    })
    .withMessage('Salary max must be greater than or equal to min.'),
  body('deadline').optional({ values: 'falsy' }).isISO8601().withMessage('Deadline must be a valid date.'),
  body('status').optional({ values: 'falsy' }).isIn(JOB_STATUS),
  body('responsibilities').optional().isArray({ max: 50 }),
  body('qualifications').optional().isArray({ max: 50 }),
  body('skills').optional().isArray({ max: 50 }),
  body('benefits').optional().isArray({ max: 50 }),
];

// Defined before /:id so "stats" is never treated as an id.
router.get('/stats', asyncHandler(getStats));

router.get('/jobs', asyncHandler(listJobs));
router.post('/jobs', validate(jobRules), asyncHandler(createJob));
router.get('/jobs/:id', validate([idRule]), asyncHandler(getJob));
router.put('/jobs/:id', validate([idRule, ...jobRules]), asyncHandler(updateJob));
router.patch('/jobs/:id/publish', validate([idRule]), asyncHandler(publishJob));
router.patch('/jobs/:id/unpublish', validate([idRule]), asyncHandler(unpublishJob));
router.patch('/jobs/:id/close', validate([idRule]), asyncHandler(closeJob));
router.delete('/jobs/:id', validate([idRule]), asyncHandler(deleteJob));

module.exports = router;
