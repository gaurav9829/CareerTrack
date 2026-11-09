// Admin application management: list, CSV export, detail, status, notes,
// résumé download, delete.
const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const { APPLICATION_STATUS } = require('../config/constants');
const { escapeRegex } = require('../utils/regex');
const { csvSafe, toCsv } = require('../utils/csv');
const { removeFileQuietly } = require('../utils/fileSignature');
const { UPLOAD_PATH } = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Shared filters for list + export so both always agree.
function buildFilter(query) {
  const filter = {};
  if (query.job && /^[0-9a-fA-F]{24}$/.test(String(query.job))) filter.job = query.job;
  if (APPLICATION_STATUS.includes(query.status)) filter.status = query.status;
  if (query.from || query.to) {
    filter.createdAt = {};
    const from = new Date(query.from);
    if (!Number.isNaN(from.getTime())) filter.createdAt.$gte = from;
    if (query.to) {
      const to = new Date(query.to);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999); // "to" date is inclusive
        filter.createdAt.$lte = to;
      }
    }
  }
  const q = String(query.q || '').trim().slice(0, 120);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  return filter;
}

// GET /api/admin/applications
const listApplications = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const filter = buildFilter(req.query);

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('job', 'title company status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Application.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: applications,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// GET /api/admin/applications/export - CSV honoring the same filters.
const exportApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find(buildFilter(req.query))
    .populate('job', 'title company')
    .sort({ createdAt: -1 });

  const rows = applications.map((a) => ({
    'Application ID': csvSafe(a._id),
    'Job Title': csvSafe(a.job?.title),
    Company: csvSafe(a.job?.company),
    Name: csvSafe(a.name),
    Email: csvSafe(a.email),
    Phone: csvSafe(a.phone),
    'Experience Years': csvSafe(a.experience?.years ?? 0),
    Skills: csvSafe((a.skills || []).join('; ')),
    Status: csvSafe(a.status),
    'Applied Date': csvSafe(a.createdAt ? a.createdAt.toISOString() : ''),
  }));

  const csv = toCsv(
    [
      'Application ID',
      'Job Title',
      'Company',
      'Name',
      'Email',
      'Phone',
      'Experience Years',
      'Skills',
      'Status',
      'Applied Date',
    ],
    rows,
  );

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="applications-${stamp}.csv"`);
  res.send(csv);
});

// GET /api/admin/applications/:id
const getApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate('job', 'title company location employmentType status deadline')
    .populate('notes.author', 'name email');
  if (!application) throw ApiError.notFound('Application not found.');
  res.json({ success: true, data: application });
});

// PATCH /api/admin/applications/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('Application not found.');
  application.status = req.body.status; // validated against the enum in the route
  await application.save();
  res.json({ success: true, data: application, message: `Status updated to ${application.status}.` });
});

// POST /api/admin/applications/:id/notes
const addNote = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('Application not found.');
  application.notes.push({ text: req.body.text, author: req.admin._id });
  await application.save();
  const updated = await application.populate('notes.author', 'name email');
  res.status(201).json({ success: true, data: updated, message: 'Note added.' });
});

// GET /api/admin/applications/:id/resume - PROTECTED file streaming.
const downloadResume = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).select('resume');
  if (!application) throw ApiError.notFound('Application not found.');

  const { storedName, originalName } = application.resume || {};
  // Defense in depth: on-disk names are always UUID + .pdf/.docx, so anything
  // else means tampering - reject before touching the filesystem.
  if (!storedName || !/^[0-9a-f-]{36}\.(pdf|docx)$/i.test(storedName)) {
    throw ApiError.notFound('Resume file is missing or invalid.');
  }

  const filePath = path.join(UPLOAD_PATH, storedName);
  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound('Resume file not found on disk.');
  }

  res.download(filePath, originalName || storedName); // sets Content-Disposition
});

// DELETE /api/admin/applications/:id - removes the record AND its résumé file.
const deleteApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('Application not found.');

  if (application.resume?.storedName) {
    await removeFileQuietly(path.join(UPLOAD_PATH, application.resume.storedName));
  }
  await application.deleteOne();

  res.json({ success: true, message: 'Application deleted.' });
});

module.exports = {
  listApplications,
  exportApplications,
  getApplication,
  updateStatus,
  addNote,
  downloadResume,
  deleteApplication,
};
