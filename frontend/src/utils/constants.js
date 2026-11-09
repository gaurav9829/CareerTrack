// Shared option lists mirrored from backend/src/config/constants.js.
// (Kept in sync manually - documented in docs/VIVA_NOTES.md.)
export const APPLICATION_STATUS = [
  'Submitted',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Selected',
  'Rejected',
]

export const JOB_STATUS = ['draft', 'published', 'closed']

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance']

export const EXPERIENCE_LEVELS = ['Fresher', 'Junior', 'Mid', 'Senior', 'Lead']

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'deadline', label: 'Deadline (soonest)' },
  { value: 'salary', label: 'Salary (highest)' },
]
