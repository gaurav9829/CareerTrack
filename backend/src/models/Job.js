// Job model. One Job has many Applications (referenced from Application.job).
const mongoose = require('mongoose');
const { JOB_STATUS, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } = require('../config/constants');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    company: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'Full-time' },
    experienceLevel: { type: String, enum: EXPERIENCE_LEVELS, default: 'Fresher' },
    salary: {
      min: { type: Number, min: 0, default: null },
      max: {
        type: Number,
        min: 0,
        default: null,
        // Cross-field rule: salary.max >= salary.min (validated on document save).
        validate: {
          validator: function (value) {
            if (value == null || this.min == null) return true;
            return this.min <= value;
          },
          message: 'Salary max must be greater than or equal to salary min.',
        },
      },
      currency: { type: String, default: 'INR', maxlength: 8 },
    },
    description: { type: String, required: true, trim: true },
    responsibilities: { type: [String], default: [] },
    qualifications: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
    applicationInstructions: { type: String, trim: true, default: '' },
    // Optional deadline. When in the past, the job is treated as EXPIRED
    // (derived in activeJobFilter, never stored as a status).
    deadline: { type: Date, default: null },
    status: { type: String, enum: JOB_STATUS, default: 'draft' },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true },
);

// Indexes per design doc: text search, status+deadline lookups, newest-first lists.
jobSchema.index({ title: 'text', company: 'text', location: 'text' });
jobSchema.index({ status: 1, deadline: 1 });
jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
