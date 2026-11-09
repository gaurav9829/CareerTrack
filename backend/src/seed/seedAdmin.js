// Creates (or resets) the demo admin from environment variables.
// Run: npm run seed:admin   (requires MONGO_URI + ADMIN_* vars in backend/.env)
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Admin = require('../models/Admin');

async function seedAdmin() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('[seed] Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env first.');
    process.exit(1);
  }
  await connectDB();

  const existing = await Admin.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    existing.name = env.ADMIN_NAME;
    existing.passwordHash = env.ADMIN_PASSWORD; // pre-save hook hashes it
    await existing.save();
    console.log(`[seed] Admin updated: ${existing.email}`);
  } else {
    await Admin.create({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL,
      passwordHash: env.ADMIN_PASSWORD, // hashed by the pre-save hook
    });
    console.log(`[seed] Admin created: ${env.ADMIN_EMAIL}`);
  }
  await disconnectDB();
}

seedAdmin().catch((err) => {
  console.error('[seed] Failed:', err.message);
  process.exit(1);
});
