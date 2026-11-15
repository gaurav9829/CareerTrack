// Creates (or resets) the demo admin from environment variables.
// Run: npm run seed:admin   (requires MONGO_URI + ADMIN_* vars in backend/.env)
// The function is exported so server.js can bootstrap a fresh deployment:
// when AUTO_SEED_DEMO=true and no admin exists yet, the API seeds itself
// on boot (used on Render, where the free tier has no shell access).
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Admin = require('../models/Admin');

async function ensureDemoAdmin() {
  const existing = await Admin.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    existing.name = env.ADMIN_NAME;
    existing.passwordHash = env.ADMIN_PASSWORD; // pre-save hook hashes it
    await existing.save();
    console.log(`[seed] Admin updated: ${existing.email}`);
    return existing;
  }
  const admin = await Admin.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    passwordHash: env.ADMIN_PASSWORD, // hashed by the pre-save hook
  });
  console.log(`[seed] Admin created: ${admin.email}`);
  return admin;
}

module.exports = { ensureDemoAdmin };

if (require.main === module) {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('[seed] Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env first.');
    process.exit(1);
  }
  ensureDemoAdmin()
    .then(() => disconnectDB())
    .catch((err) => {
      console.error('[seed] Failed:', err.message);
      process.exit(1);
    });
}
