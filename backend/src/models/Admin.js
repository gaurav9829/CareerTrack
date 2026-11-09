// Admin model. There is NO public registration: an admin exists only after
// `npm run seed:admin` creates one from environment variables.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Never returned by queries unless explicitly selected with .select('+passwordHash').
    // Convention: when server code assigns a PLAIN password to passwordHash,
    // the pre-save hook below hashes it before it reaches the database.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, default: 'admin' },
  },
  { timestamps: true },
);

// Hash on every change of passwordHash (bcrypt cost 12).
adminSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  // Already a bcrypt hash (starts with $2a$/$2b$) - do not double-hash.
  if (typeof this.passwordHash === 'string' && /^\$2[aby]\$/.test(this.passwordHash)) {
    return next();
  }
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

adminSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

module.exports = mongoose.model('Admin', adminSchema);
