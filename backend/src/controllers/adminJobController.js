// Admin job management: stats, list, CRUD, publish/unpublish/close, delete.
const Job = require('../models/Job');
const Application = require('../models/Application');
const { activeJobFilter, JOB_STATUS } = require('../config/constants');
const { escapeRegex } = require('../utils/regex');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const TEXT_FIELDS = [
  'title',
  'company',
  'location',
  'employmentType',
  'experienceLevel',
  'description',
  'applicationInstructions',
];
const ARRAY_FIELDS = ['responsibilities', 'qualifications', 'skills', 'benefits'];

// Trims and caps string arrays coming from the admin form.
function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 50);
}

// Whitelist + normalize the request body into a payload Mongo can accept.
function buildJobPayload(body, existing = null) {
  const updates = {};
  for (const field of TEXT_FIELDS) {
    if (body[field] !== undefined) updates[field] = String(body[field]).trim();
  }
  for (const field of ARRAY_FIELDS) {
    if (body[field] !== undefined) updates[field] = sanitizeStringArray(body[field]);
  }
  if (body.deadline !== undefined) {
    updates.deadline = body.deadline ? new Date(body.deadline) : null;
  }
  if (body.salary !== undefined && body.salary && typeof body.salary === 'object') {
    // The UI posts "" for blank salary inputs; normalize those to null so the
    // schema stores "salary not disclosed" instead of an invalid empty string.
    const toNumOrNull = (v) => (v === '' || v == null ? null : Number(v));
    updates.salary = {
      min: toNumOrNull(body.salary.min),
      max: toNumOrNull(body.salary.max),
      currency: String(body.salary.currency || existing?.salary?.currency || 'INR'),
    };
  }
  if (body.status !== undefined && JOB_STATUS.includes(body.status)) {
    updates.status = body.status;
    if (body.status === 'published' && !existing?.publishedAt) {
      updates.publishedAt = new Date();
    }
  }
  return updates;
}

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [totalJobs, activeJobs, expiredJobs, draftJobs, closedJobs, totalApplications] =
    await Promise.all([
      Job.countDocuments({}),
      Job.countDocuments(activeJobFilter(now)),
      Job.countDocuments({ status: 'published', deadline: { $ne: null, $lt: now } }),
      Job.countDocuments({ status: 'draft' }),
      Job.countDocuments({ status: 'closed' }),
      Application.countDocuments({}),
    ]);

  const byStatusRows = await Application.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const applicationsByStatus = Object.fromEntries(byStatusRows.map((r) => [r._id, r.count]));

  res.json({
    success: true,
    data: {
      totalJobs,
      activeJobs,
      expiredJobs,
      draftJobs,
      closedJobs,
      totalApplications,
      applicationsByStatus,
    },
  });
});

// GET /api/admin/jobs
const listJobs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const sort = ['newest', 'oldest', 'title'].includes(req.query.sort) ? req.query.sort : 'newest';
  const status = JOB_STATUS.includes(req.query.status) ? req.query.status : '';
  const q = String(req.query.q || '').trim().slice(0, 120);

  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { company: rx }, { location: rx }];
  }

  const sortMap = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, title: { title: 1 } };
  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate('createdBy', 'name email')
      .sort(sortMap[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    Job.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: jobs,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// POST /api/admin/jobs
const createJob = asyncHandler(async (req, res) => {
  const payload = buildJobPayload(req.body);
  payload.createdBy = req.admin._id; // always the logged-in admin, never client data
  if (!payload.status) payload.status = 'draft'; // jobs start as drafts
  if (payload.status === 'published' && !payload.publishedAt) payload.publishedAt = new Date();

  const job = await Job.create(payload);
  res.status(201).json({ success: true, data: job, message: 'Job created.' });
});

// GET /api/admin/jobs/:id
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('createdBy', 'name email');
  if (!job) throw ApiError.notFound('Job not found.');
  const applicationCount = await Application.countDocuments({ job: job._id });
  res.json({ success: true, data: { job, applicationCount } });
});

// PUT /api/admin/jobs/:id
const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found.');

  const payload = buildJobPayload(req.body, job);
  Object.assign(job, payload);
  await job.save(); // triggers schema validation (incl. salary min<=max)

  res.json({ success: true, data: job, message: 'Job updated.' });
});

// PATCH status transitions - small endpoints, easy to explain and test.
const publishJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found.');
  job.status = 'published';
  job.publishedAt = job.publishedAt || new Date();
  await job.save();
  res.json({ success: true, data: job, message: 'Job published.' });
});

const unpublishJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found.');
  job.status = 'draft';
  job.publishedAt = null;
  await job.save();
  res.json({ success: true, data: job, message: 'Job unpublished (back to draft).' });
});

const closeJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found.');
  job.status = 'closed';
  await job.save();
  res.json({ success: true, data: job, message: 'Job closed.' });
});

// DELETE /api/admin/jobs/:id - blocked when applications exist, because
// applications reference the job and deleting it would orphan candidate data.
// Closing the job is the safe alternative (it just stops being visible).
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found.');

  const applicationCount = await Application.countDocuments({ job: job._id });
  if (applicationCount > 0) {
    throw ApiError.conflict(
      `This job has ${applicationCount} application(s) and cannot be deleted. Close it instead.`,
    );
  }

  await job.deleteOne();
  res.json({ success: true, message: 'Job deleted.' });
});

module.exports = {
  getStats,
  listJobs,
  createJob,
  getJob,
  updateJob,
  publishJob,
  unpublishJob,
  closeJob,
  deleteJob,
};
