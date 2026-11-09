// TC-J01..TC-J11: public job listing, search, filters, sorting, pagination, detail.
const request = require('supertest');
const app = require('../src/app');
const { startTestDB, stopTestDB, createAdmin, createJob, inDays } = require('./helpers');

let mongo;

beforeAll(async () => {
  mongo = await startTestDB();
  await createAdmin();

  // Fixture set: 2 active, 1 expired, 1 draft, 1 closed.
  await createJob({ title: 'React Developer', company: 'NovaWorks', location: 'Bengaluru', deadline: inDays(10), status: 'published' });
  await createJob({ title: 'Node Developer', company: 'NovaWorks', location: 'Hyderabad', deadline: null, status: 'published' });
  await createJob({ title: 'Expired Job', company: 'OldCorp', location: 'Mumbai', deadline: inDays(-3), status: 'published' });
  await createJob({ title: 'Draft Job', company: 'HiddenCorp', location: 'Pune', status: 'draft' });
  await createJob({ title: 'Closed Job', company: 'GoneCorp', location: 'Delhi', status: 'closed' });
});

afterAll(() => stopTestDB(mongo));

describe('GET /api/health', () => {
  test('TC-J11: health check returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('GET /api/jobs', () => {
  test('TC-J01: lists only active jobs (no drafts, closed or expired)', async () => {
    const res = await request(app).get('/api/jobs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const titles = res.body.data.map((j) => j.title);
    expect(titles).toContain('React Developer');
    expect(titles).toContain('Node Developer');
    expect(titles).not.toContain('Expired Job');
    expect(titles).not.toContain('Draft Job');
    expect(titles).not.toContain('Closed Job');
    expect(res.body.pagination.total).toBe(2);
  });

  test('TC-J02: search q matches title, company and location case-insensitively', async () => {
    const byTitle = await request(app).get('/api/jobs?q=node');
    expect(byTitle.body.data.map((j) => j.title)).toContain('Node Developer');

    const byCompany = await request(app).get('/api/jobs?q=novaworks');
    expect(byCompany.body.pagination.total).toBe(2);

    const byLocation = await request(app).get('/api/jobs?q=bengaluru');
    expect(byLocation.body.data.map((j) => j.title)).toContain('React Developer');
  });

  test('TC-J03: filters by employment type and experience level', async () => {
    await createJob({ title: 'Intern Role', employmentType: 'Internship', experienceLevel: 'Fresher', status: 'published' });
    await createJob({ title: 'Lead Role', employmentType: 'Full-time', experienceLevel: 'Lead', status: 'published' });

    const interns = await request(app).get('/api/jobs?type=Internship');
    expect(interns.body.data.map((j) => j.title)).toEqual(['Intern Role']);

    const leads = await request(app).get('/api/jobs?level=Lead');
    expect(leads.body.data.map((j) => j.title)).toEqual(['Lead Role']);
  });

  test('TC-J04: sorting - newest, oldest, deadline (jobs without deadline last)', async () => {
    // dedicated fixtures scoped by company so this test is independent
    await createJob({ title: 'Sort A', company: 'SortCorp', deadline: inDays(1), status: 'published' });
    await createJob({ title: 'Sort B', company: 'SortCorp', deadline: inDays(5), status: 'published' });
    await createJob({ title: 'Sort C', company: 'SortCorp', deadline: null, status: 'published' });

    const oldest = await request(app).get('/api/jobs?company=SortCorp&sort=oldest');
    expect(oldest.body.data[0].title).toBe('Sort A');

    const newest = await request(app).get('/api/jobs?company=SortCorp&sort=newest');
    expect(newest.body.data[0].title).toBe('Sort C');

    const byDeadline = await request(app).get('/api/jobs?company=SortCorp&sort=deadline');
    const deadlineTitles = byDeadline.body.data.map((j) => j.title);
    expect(deadlineTitles).toEqual(['Sort A', 'Sort B', 'Sort C']); // soonest first, no-deadline last
  });

  test('TC-J05: pagination returns correct slice and meta', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await createJob({ title: `Page Job ${i}`, company: 'PageCorp', status: 'published' });
    }
    const res = await request(app).get('/api/jobs?company=PageCorp&page=2&limit=2');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    // newest first on page 2 => jobs 3 and 2
    expect(res.body.data[0].title).toBe('Page Job 3');
  });

  test('TC-J06: public detail never exposes createdBy', async () => {
    const list = await request(app).get('/api/jobs?q=react');
    const id = list.body.data[0]._id;
    const res = await request(app).get(`/api/jobs/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('React Developer');
    expect(res.body.data.createdBy).toBeUndefined();
  });
});

describe('GET /api/jobs/:id visibility rules', () => {
  test('TC-J07: draft job detail returns 404', async () => {
    const job = await createJob({ title: 'Detail Draft', status: 'draft' });
    const res = await request(app).get(`/api/jobs/${job._id}`);
    expect(res.status).toBe(404);
  });

  test('TC-J08: closed job detail returns 404', async () => {
    const job = await createJob({ title: 'Detail Closed', status: 'closed' });
    const res = await request(app).get(`/api/jobs/${job._id}`);
    expect(res.status).toBe(404);
  });

  test('TC-J09: expired job detail returns 404', async () => {
    const job = await createJob({ title: 'Detail Expired', status: 'published', deadline: inDays(-1) });
    const res = await request(app).get(`/api/jobs/${job._id}`);
    expect(res.status).toBe(404);
  });

  test('TC-J10: invalid job id returns 400', async () => {
    const res = await request(app).get('/api/jobs/not-a-valid-id');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
