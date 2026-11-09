// TC-Z01..TC-Z12: EVERY /admin/* route and the résumé route must return 401
// without an auth cookie. Loop over all of them so none can be missed.
const request = require('supertest');
const app = require('../src/app');
const { startTestDB, stopTestDB, createAdmin } = require('./helpers');

let mongo;

beforeAll(async () => {
  mongo = await startTestDB();
  await createAdmin();
});

afterAll(() => stopTestDB(mongo));

const adminRoutes = [
  ['GET', '/api/admin/stats'],
  ['GET', '/api/admin/jobs'],
  ['POST', '/api/admin/jobs'],
  ['GET', '/api/admin/jobs/507f1f77bcf86cd799439011'],
  ['PUT', '/api/admin/jobs/507f1f77bcf86cd799439011'],
  ['PATCH', '/api/admin/jobs/507f1f77bcf86cd799439011/publish'],
  ['PATCH', '/api/admin/jobs/507f1f77bcf86cd799439011/unpublish'],
  ['PATCH', '/api/admin/jobs/507f1f77bcf86cd799439011/close'],
  ['DELETE', '/api/admin/jobs/507f1f77bcf86cd799439011'],
  ['GET', '/api/admin/applications'],
  ['GET', '/api/admin/applications/export'],
  ['GET', '/api/admin/applications/507f1f77bcf86cd799439011'],
  ['PATCH', '/api/admin/applications/507f1f77bcf86cd799439011/status'],
  ['POST', '/api/admin/applications/507f1f77bcf86cd799439011/notes'],
  ['GET', '/api/admin/applications/507f1f77bcf86cd799439011/resume'],
  ['DELETE', '/api/admin/applications/507f1f77bcf86cd799439011'],
];

describe('admin routes without authentication', () => {
  test.each(adminRoutes)('TC-Z: %s %s returns 401', async (method, route) => {
    const res = await request(app)[method.toLowerCase()](route);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('public routes stay public', () => {
  test('TC-Z99: /api/jobs and /api/health do not require auth', async () => {
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    const jobs = await request(app).get('/api/jobs');
    expect(jobs.status).toBe(200);
  });
});
