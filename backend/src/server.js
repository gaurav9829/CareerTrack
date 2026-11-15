// Entry point: validates required env, connects to MongoDB, then starts HTTP.
// Run with: npm run dev  (or npm start in production / Render).
const env = require('./config/env');
const { connectDB } = require('./config/db');

// Fail fast if secrets are missing (never start half-configured in production).
const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[startup] Missing required environment variables: ${missing.join(', ')}. ` +
      'Copy backend/.env.example to backend/.env and fill in real values.',
  );
  process.exit(1);
}

const app = require('./app');

(async () => {
  try {
    await connectDB();
    console.log('[startup] MongoDB connected');

    // Optional demo bootstrap for fresh deployments (Render free tier has no
    // shell, so `npm run seed:*` cannot be run there). When AUTO_SEED_DEMO=true
    // and the database has no admin yet, seed the demo admin + fictional jobs
    // on boot. Idempotent: it only acts when the admin is missing / jobs empty.
    if (process.env.AUTO_SEED_DEMO === 'true') {
      const adminCount = await require('./models/Admin').countDocuments({});
      if (adminCount === 0) {
        const { ensureDemoAdmin } = require('./seed/seedAdmin');
        await ensureDemoAdmin();
        const { seedJobs } = require('./seed/seedJobs');
        await seedJobs();
        console.log('[startup] Demo data seeded (AUTO_SEED_DEMO=true, empty database)');
      }
    }

    const server = app.listen(env.PORT, () => {
      console.log(`[startup] CareerTrack API listening on http://localhost:${env.PORT}`);
    });

    // Graceful shutdown (Ctrl+C, Render restarts).
    const shutdown = async () => {
      console.log('[shutdown] closing server...');
      server.close(async () => {
        const { disconnectDB } = require('./config/db');
        await disconnectDB();
        process.exit(0);
      });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[startup] Failed to start:', err.message);
    process.exit(1);
  }
})();
