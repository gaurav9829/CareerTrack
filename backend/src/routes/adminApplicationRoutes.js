// Admin application routes - ALL protected. NOTE: /export is defined BEFORE
// /:id so "export" is never treated as an application id.
const express = require('express');
const { body, param } = require('express-validator');

const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const {
  listApplications,
  exportApplications,
  getApplication,
  updateStatus,
  addNote,
  downloadResume,
  deleteApplication,
} = require('../controllers/adminApplicationController');
const { APPLICATION_STATUS } = require('../config/constants');

const router = express.Router();
router.use(protect); // every route below requires a valid admin cookie

const idRule = param('id').isMongoId().withMessage('Invalid application id.');

router.get('/applications', asyncHandler(listApplications));
router.get('/applications/export', asyncHandler(exportApplications));
router.get('/applications/:id', validate([idRule]), asyncHandler(getApplication));
router.get('/applications/:id/resume', validate([idRule]), asyncHandler(downloadResume));
router.patch(
  '/applications/:id/status',
  validate([
    idRule,
    body('status')
      .isIn(APPLICATION_STATUS)
      .withMessage(`Status must be one of: ${APPLICATION_STATUS.join(', ')}.`),
  ]),
  asyncHandler(updateStatus),
);
router.post(
  '/applications/:id/notes',
  validate([
    idRule,
    body('text').trim().isLength({ min: 1, max: 2000 }).withMessage('Note text is required (max 2000 chars).'),
  ]),
  asyncHandler(addNote),
);
router.delete('/applications/:id', validate([idRule]), asyncHandler(deleteApplication));

module.exports = router;
