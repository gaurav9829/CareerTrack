// Single source of truth for every enum value used in the app.
// No magic strings scattered across controllers.
const APPLICATION_STATUS = [
  'Submitted',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Selected',
  'Rejected',
];

const JOB_STATUS = ['draft', 'published', 'closed'];

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];

const EXPERIENCE_LEVELS = ['Fresher', 'Junior', 'Mid', 'Senior', 'Lead'];

const SORT_OPTIONS = ['newest', 'oldest', 'deadline', 'salary'];

// "Expired" is derived, never stored. A job is active when it is published AND
// its deadline is empty (open until closed) or in the future.
// Used by: public list, public detail, apply endpoint, dashboard stats.
function activeJobFilter(now = new Date()) {
  return {
    status: 'published',
    $or: [{ deadline: null }, { deadline: { $gte: now } }],
  };
}

// Fields that are safe to expose publicly (never expose createdBy or internal data).
const PUBLIC_JOB_FIELDS =
  'title company location employmentType experienceLevel salary description responsibilities qualifications skills benefits applicationInstructions deadline status publishedAt createdAt';

module.exports = {
  APPLICATION_STATUS,
  JOB_STATUS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  SORT_OPTIONS,
  activeJobFilter,
  PUBLIC_JOB_FIELDS,
};
