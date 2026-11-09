// Application model. Many Applications belong to one Job (ref: job).
const mongoose = require('mongoose');
const { APPLICATION_STATUS } = require('../config/constants');

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 200 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    education: [
      {
        degree: { type: String, trim: true },
        institution: { type: String, trim: true },
        year: { type: Number },
      },
    ],
    experience: {
      years: { type: Number, default: 0, min: 0 },
      summary: { type: String, trim: true, default: '' },
    },
    skills: { type: [String], default: [] },
    coverLetter: { type: String, trim: true, default: '', maxlength: 5000 },
    // storedName is a random UUID + extension - the visitor's original filename
    // is kept only for display (resume.originalName) and never used on disk.
    resume: {
      originalName: { type: String, required: true },
      storedName: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
    },
    status: { type: String, enum: APPLICATION_STATUS, default: 'Submitted' },
    notes: [
      {
        text: { type: String, required: true, trim: true, maxlength: 2000 },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// One application per email per job. The controller also pre-checks this for a
// friendlier message, and Mongo error 11000 is mapped to 409 in the error handler.
applicationSchema.index({ job: 1, email: 1 }, { unique: true });
applicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
