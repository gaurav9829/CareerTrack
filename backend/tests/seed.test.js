// TC-S01..TC-S04: demo-data bootstrap (seed helpers + server.js AUTO_SEED_DEMO gate).
// The seed functions are the ones server.js runs when AUTO_SEED_DEMO=true and
// the database is empty (Render free tier has no shell for `npm run seed:*`).
const request = require('supertest');
const app = require('../src/app');
const { startTestDB, stopTestDB } = require('./helpers');
const { ensureDemoAdmin } = require('../src/seed/seedAdmin');
const { seedJobs } = require('../src/seed/seedJobs');
const Admin = require('../src/models/Admin');
const Job = require('../src/models/Job');
const env = require('../src/config/env');

let mongo;

beforeAll(async () => {
  mongo = await startTestDB();
});

afterAll(() => stopTestDB(mongo));

describe('demo data bootstrap', () => {
  test('TC-S01: ensureDemoAdmin creates the admin from env credentials', async () => {
    const admin = await ensureDemoAdmin();
    expect(admin.email).toBe(env.ADMIN_EMAIL.toLowerCase());
    expect(admin.passwordHash).not.toBe(env.ADMIN_PASSWORD); // pre-save hook hashed it
    expect(await Admin.countDocuments({})).toBe(1);
  });

  test('TC-S02: ensureDemoAdmin is idempotent (updates, never duplicates)', async () => {
    const again = await ensureDemoAdmin();
    expect(again.email).toBe(env.ADMIN_EMAIL.toLowerCase());
    expect(await Admin.countDocuments({})).toBe(1);
  });

  test('TC-S03: seedJobs inserts 12 fictional jobs owned by the admin', async () => {
    await seedJobs();
    const jobs = await Job.countDocuments({});
    expect(jobs).toBe(12);
    const published = await Job.countDocuments({ status: 'published', publishedAt: { $ne: null } });
    expect(published).toBeGreaterThan(0);
    const drafts = await Job.countDocuments({ status: 'draft', publishedAt: null });
    expect(drafts).toBeGreaterThan(0);
  });

  test('TC-S04: public list only serves active jobs after seeding', async () => {
    // 9 published total, 1 of them deliberately expired -> 8 active
    const res = await request(app).get('/api/jobs');
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(8);
  });
});
