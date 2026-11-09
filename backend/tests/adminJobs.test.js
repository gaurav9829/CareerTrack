// TC-AJ01..TC-AJ10: admin job CRUD, status transitions, delete-block, stats.
const request = require('supertest');
const app = require('../src/app');
const {
  startTestDB,
  stopTestDB,
  createAdmin,
  loginAdmin,
  createJob,
  inDays,
} = require('./helpers');

let mongo;
let admin;
let jobPayload;

const fullPayload = () => ({
  title: 'Full Stack Developer',
  company: 'AdminCorp',
  location: 'Remote',
  description: 'A full description of the role.',
  employmentType: 'Full-time',
  experienceLevel: 'Mid',
  salary: { min: 500000, max: 900000, currency: 'INR' },
  responsibilities: ['Ship features', 'Review code'],
  qualifications: ['B.Tech'],
  skills: ['React', 'Node'],
  benefits: ['Insurance'],
  applicationInstructions: 'Apply with a PDF résumé.',
  deadline: inDays(14).toISOString(),
});

beforeAll(async () => {
  mongo = await startTestDB();
  admin = await createAdmin();
  admin = await loginAdmin(app, admin);
  jobPayload = fullPayload();
});

afterAll(() => stopTestDB(mongo));

describe('POST /api/admin/jobs', () => {
  test('TC-AJ01: creates a draft job by default', async () => {
    const res = await admin.post('/api/admin/jobs').send(jobPayload);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.createdBy).toBeDefined();
    expect(res.body.data.title).toBe('Full Stack Developer');
  });

  test('TC-AJ02: creating with status published sets publishedAt', async () => {
    const res = await admin.post('/api/admin/jobs').send({ ...jobPayload, title: 'Published Now', status: 'published' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.publishedAt).toBeTruthy();
  });

  test('TC-AJ03: missing title returns 400', async () => {
    const res = await admin.post('/api/admin/jobs').send({ ...jobPayload, title: '' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'title')).toBe(true);
  });

  test('TC-AJ04: salary max < min returns 400', async () => {
    const res = await admin
      .post('/api/admin/jobs')
      .send({ ...jobPayload, salary: { min: 900000, max: 500000, currency: 'INR' } });
    expect(res.status).toBe(400);
  });
});

describe('admin job lifecycle', () => {
  test('TC-AJ05: update changes fields (PUT sends the full payload)', async () => {
    const job = await createJob({ title: 'Update Me', status: 'draft' });
    const res = await admin
      .put(`/api/admin/jobs/${job._id}`)
      .send({ ...fullPayload(), title: 'Updated Title', location: 'Chennai' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
    expect(res.body.data.location).toBe('Chennai');
  });

  test('TC-AJ06: publish/unpublish/close transitions work', async () => {
    const job = await createJob({ title: 'Lifecycle', status: 'draft' });

    const pub = await admin.patch(`/api/admin/jobs/${job._id}/publish`);
    expect(pub.body.data.status).toBe('published');
    expect(pub.body.data.publishedAt).toBeTruthy();

    const unp = await admin.patch(`/api/admin/jobs/${job._id}/unpublish`);
    expect(unp.body.data.status).toBe('draft');

    const clo = await admin.patch(`/api/admin/jobs/${job._id}/close`);
    expect(clo.body.data.status).toBe('closed');
  });

  test('TC-AJ07: delete works when no applications exist', async () => {
    const job = await createJob({ title: 'Delete Me', status: 'draft' });
    const res = await admin.delete(`/api/admin/jobs/${job._id}`);
    expect(res.status).toBe(200);
    const Job = require('../src/models/Job');
    expect(await Job.findById(job._id)).toBeNull();
  });

  test('TC-AJ08: delete is BLOCKED (409) when applications exist', async () => {
    const job = await createJob({ title: 'Protected Job', status: 'published' });
    const Application = require('../src/models/Application');
    await Application.create({
      job: job._id,
      name: 'Candidate',
      email: 'candidate@example.com',
      phone: '+91 90000 00000',
      resume: { originalName: 'r.pdf', storedName: '00000000-0000-4000-8000-000000000000.pdf', mimeType: 'application/pdf', size: 10 },
    });

    const res = await admin.delete(`/api/admin/jobs/${job._id}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/close it instead/i);
  });
});

describe('GET /api/admin/jobs + stats', () => {
  test('TC-AJ09: admin list shows all statuses and filters by status', async () => {
    await createJob({ title: 'Admin Draft', status: 'draft' });
    const all = await admin.get('/api/admin/jobs');
    expect(all.status).toBe(200);
    expect(all.body.pagination.total).toBeGreaterThanOrEqual(3);

    const drafts = await admin.get('/api/admin/jobs?status=draft');
    drafts.body.data.forEach((j) => expect(j.status).toBe('draft'));
  });

  test('TC-AJ10: stats returns correct counters', async () => {
    const res = await admin.get('/api/admin/stats');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totalJobs).toBeGreaterThanOrEqual(3);
    expect(d).toHaveProperty('activeJobs');
    expect(d).toHaveProperty('totalApplications');
    expect(d).toHaveProperty('applicationsByStatus');
  });

  test('TC-AJ11: admin get by id includes applicationCount', async () => {
    const job = await createJob({ title: 'Count Job', status: 'published' });
    const res = await admin.get(`/api/admin/jobs/${job._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.applicationCount).toBe(0);
  });
});
