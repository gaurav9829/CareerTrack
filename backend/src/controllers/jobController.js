// Public job endpoints: list (search/filter/sort/pagination), detail, apply.
const Job = require('../models/Job');
const Application = require('../models/Application');
const { activeJobFilter, PUBLIC_JOB_FIELDS } = require('../config/constants');
const { escapeRegex } = require('../utils/regex');
const { validateFileSignature, removeFileQuietly } = require('../utils/fileSignature');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Coerces query params to safe strings/numbers. Invalid enum values are
// treated as "no filter" (public browsing should never 400 on a stray param).
function readListQuery(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 9));
  const sortRaw = String(query.sort || 'newest');
  return {
    q: String(query.q || '').trim().slice(0, 120),
    location: String(query.location || '').trim().slice(0, 120),
    company: String(query.company || '').trim().slice(0, 120),
    type: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'].includes(query.type)
      ? query.type
      : '',
    level: ['Fresher', 'Junior', 'Mid', 'Senior', 'Lead'].includes(query.level) ? query.level : '',
    sort: ['newest', 'oldest', 'deadline', 'salary'].includes(sortRaw) ? sortRaw : 'newest',
    page,
    limit,
  };
}

// Deadline sort: soonest first, jobs WITHOUT a deadline go last.
// Salary sort: highest salary.max first, jobs without salary info go last.
// Both use $ifNull to push "missing" values to the end.
function sortValueFor(sort) {
  if (sort === 'deadline') return { field: '$deadline', fill: new Date('9999-12-31'), dir: 1 };
  return { field: '$salary.max', fill: -1, dir: -1 };
}

async function fetchPublicJobs(filter, { sort, page, limit }) {
  const skip = (page - 1) * limit;
  const total = await Job.countDocuments(filter);

  if (sort === 'deadline' || sort === 'salary') {
    const { field, fill, dir } = sortValueFor(sort);
    const jobs = await Job.aggregate([
      { $match: filter },
      { $addFields: { _sortVal: { $ifNull: [field, fill] } } },
      { $sort: { _sortVal: dir, _id: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Mirror PUBLIC_JOB_FIELDS: never expose createdBy / internal fields.
      { $project: { createdBy: 0, __v: 0, _sortVal: 0 } },
    ]);
    return { jobs, total };
  }

  const sortMap = { newest: { createdAt: -1 }, oldest: { createdAt: 1 } };
  const jobs = await Job.find(filter)
    .select(PUBLIC_JOB_FIELDS)
    .sort(sortMap[sort] || sortMap.newest)
    .skip(skip)
    .limit(limit);
  return { jobs, total };
}

// GET /api/jobs
const listJobs = asyncHandler(async (req, res) => {
  const parsed = readListQuery(req.query);

  // Combine the active-job filter with the text search safely: two $or keys
  // cannot coexist in one query object (the later one would overwrite the
  // deadline $or and leak expired jobs into search results), so the search
  // $or goes into an $and condition instead.
  const filter = activeJobFilter(); // published AND (no deadline OR deadline in future)
  if (parsed.q) {
    const rx = new RegExp(escapeRegex(parsed.q), 'i');
    filter.$and = [{ $or: [{ title: rx }, { company: rx }, { location: rx }] }];
  }
  if (parsed.location) filter.location = new RegExp(escapeRegex(parsed.location), 'i');
  if (parsed.company) filter.company = new RegExp(escapeRegex(parsed.company), 'i');
  if (parsed.type) filter.employmentType = parsed.type;
  if (parsed.level) filter.experienceLevel = parsed.level;

  const { jobs, total } = await fetchPublicJobs(filter, parsed);

  res.json({
    success: true,
    data: jobs,
    pagination: {
      page: parsed.page,
      limit: parsed.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.limit)),
    },
  });
});

// GET /api/jobs/:id
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, ...activeJobFilter() }).select(
    PUBLIC_JOB_FIELDS,
  );
  if (!job) throw ApiError.notFound('This job does not exist or is no longer available.');
  res.json({ success: true, data: job });
});

// POST /api/jobs/:id/apply  (multipart/form-data, file field: "resume")
const applyToJob = asyncHandler(async (req, res) => {
  const { name, email, phone, skills, coverLetter, experienceYears, experienceSummary, education } =
    req.body;

  // 1. Job must exist AND be active (published + not expired). Distinguish the
  //    reasons so the visitor sees an honest message.
  const job = await Job.findById(req.params.id).select('title company status deadline');
  if (!job) throw ApiError.notFound('Job not found.');
  if (!job.status || job.status !== 'published') {
    throw ApiError.badRequest('This job is not accepting applications.');
  }
  if (job.deadline && job.deadline < new Date()) {
    throw ApiError.badRequest('This job posting has expired.');
  }

  // 2. Résumé must be attached (check BEFORE the duplicate lookup - a request
  //    without a file is incomplete no matter what).
  if (!req.file) throw ApiError.badRequest('Please attach your résumé (PDF or DOCX).');

  // 3. Duplicate pre-check (the unique index is the second line of defence).
  const duplicate = await Application.findOne({ job: job._id, email: email.toLowerCase() });
  if (duplicate) {
    throw ApiError.conflict('You have already applied to this job with this email address.');
  }

  // 4. Magic-byte check - the file must really be what its extension claims
  //    (catches renamed .exe -> .pdf fakes).
  await validateFileSignature(req.file.path);

  // 5. Parse multipart-only fields: skills is a comma-separated string,
  //    education is a JSON-encoded array (FormData has no nested objects).
  let skillsList = [];
  if (skills) {
    skillsList = String(skills)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
  }

  let educationList = [];
  if (education) {
    try {
      const parsed = JSON.parse(education);
      if (!Array.isArray(parsed)) throw new Error('not an array');
      educationList = parsed
        .filter((e) => e && typeof e === 'object')
        .slice(0, 10)
        .map((e) => ({
          degree: String(e.degree || '').trim().slice(0, 120),
          institution: String(e.institution || '').trim().slice(0, 120),
          year: e.year ? Number(e.year) : undefined,
        }));
    } catch {
      throw ApiError.badRequest('Education must be a valid JSON array.');
    }
  }

  // 6. Create. If ANYTHING above failed after the file was saved, the
  //    router-level cleanup middleware deleted the orphaned upload.
  const application = await Application.create({
    job: job._id,
    name,
    email,
    phone,
    education: educationList,
    experience: {
      years: experienceYears ? Number(experienceYears) : 0,
      summary: experienceSummary || '',
    },
    skills: skillsList,
    coverLetter: coverLetter || '',
    resume: {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully. Good luck!',
    data: { id: application._id, jobTitle: job.title, company: job.company },
  });
});

module.exports = { listJobs, getJob, applyToJob, removeFileQuietly };
