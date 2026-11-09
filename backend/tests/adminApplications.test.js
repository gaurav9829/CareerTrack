// TC-AA01..TC-AA11: admin application list/filters, status, notes, CSV export,
// résumé download (protected), delete with file cleanup.
const request = require('supertest');
const app = require('../src/app');
const {
  startTestDB,
  stopTestDB,
  createAdmin,
  loginAdmin,
  createJob,
  applyRequest,
  applyPayload,
  PDF_BYTES,
  DOCX_BYTES,
  inDays,
} = require('./helpers');

let mongo;
let admin;
let jobA;
let jobB;
let appRavi; // application by Ravi (used for status/notes/resume tests)

beforeAll(async () => {
  mongo = await startTestDB();
  await createAdmin();
  admin = await loginAdmin(app);

  jobA = await createJob({ title: 'Apps Job A', company: 'Applesoft', status: 'published', deadline: inDays(7) });
  jobB = await createJob({ title: 'Apps Job B', company: 'Bananasoft', status: 'published', deadline: inDays(7) });

  // Real applications created through the public endpoint (real files on disk).
  const r1 = await applyRequest(app, jobA._id, applyPayload({ name: 'Ravi Kumar', email: 'ravi@example.com', skills: 'React' }));
  const r2 = await applyRequest(app, jobA._id, applyPayload({ name: '=Evil Formula', email: 'evil@example.com', skills: 'Excel' }));
  const r3 = await applyRequest(app, jobB._id, applyPayload({ name: 'Aditi Rao', email: 'aditi@example.com', skills: 'Node' }), {
    buffer: DOCX_BYTES,
    name: 'aditi.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  expect(r1.status).toBe(201);
  expect(r2.status).toBe(201);
  expect(r3.status).toBe(201);

  const Application = require('../src/models/Application');
  appRavi = await Application.findOne({ email: 'ravi@example.com' });
});

afterAll(() => stopTestDB(mongo));

describe('GET /api/admin/applications', () => {
  test('TC-AA01: lists applications with job info', async () => {
    const res = await admin.get('/api/admin/applications');
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.data[0].job).toHaveProperty('title');
  });

  test('TC-AA02: filter by status', async () => {
    await admin.patch(`/api/admin/applications/${appRavi._id}/status`).send({ status: 'Shortlisted' });
    const res = await admin.get('/api/admin/applications?status=Shortlisted');
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].email).toBe('ravi@example.com');
  });

  test('TC-AA03: filter by job', async () => {
    const res = await admin.get(`/api/admin/applications?job=${jobB._id}`);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].email).toBe('aditi@example.com');
  });

  test('TC-AA04: search by name and email', async () => {
    const byName = await admin.get('/api/admin/applications?q=aditi');
    expect(byName.body.pagination.total).toBe(1);
    const byEmail = await admin.get('/api/admin/applications?q=evil@');
    expect(byEmail.body.pagination.total).toBe(1);
  });

  test('TC-AA05: date range filter (from/to)', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await admin.get(`/api/admin/applications?from=${tomorrow}`);
    expect(res.body.pagination.total).toBe(0);
  });
});

describe('PATCH /api/admin/applications/:id/status', () => {
  test('TC-AA06: valid status updates the application', async () => {
    const res = await admin.patch(`/api/admin/applications/${appRavi._id}/status`).send({ status: 'Interview Scheduled' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Interview Scheduled');
  });

  test('TC-AA07: invalid status returns 400', async () => {
    const res = await admin.patch(`/api/admin/applications/${appRavi._id}/status`).send({ status: 'Hired Maybe' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/applications/:id/notes', () => {
  test('TC-AA08: adds an internal note with the admin as author', async () => {
    const res = await admin.post(`/api/admin/applications/${appRavi._id}/notes`).send({ text: 'Strong React skills.' });
    expect(res.status).toBe(201);
    const note = res.body.data.notes[0];
    expect(note.text).toBe('Strong React skills.');
    expect(note.author.name).toBe('Test Admin');
  });
});

describe('GET /api/admin/applications/export (CSV)', () => {
  test('TC-AA09: returns text/csv with the expected header row', async () => {
    const res = await admin.get('/api/admin/applications/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    const header = res.text.split(/\r?\n/)[0]; // json2csv v5 quotes all fields
    expect(header).toContain('Application ID');
    expect(header).toContain('Job Title');
    expect(header).toContain('Applied Date');
    expect(res.text).toContain('Ravi Kumar');
  });

  test('TC-AA10: CSV formula injection is neutralized', async () => {
    const res = await admin.get('/api/admin/applications/export');
    expect(res.text).toContain("'=Evil Formula"); // apostrophe prefix added
  });
});

describe('GET /api/admin/applications/:id/resume', () => {
  test('TC-AA11: streams the original résumé with Content-Disposition', async () => {
    const res = await admin.get(`/api/admin/applications/${appRavi._id}/resume`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('resume.pdf');
    expect(res.body).toEqual(PDF_BYTES); // exact bytes we uploaded
  });
});

describe('DELETE /api/admin/applications/:id', () => {
  test('TC-AA12: deletes the application and its résumé file', async () => {
    const Application = require('../src/models/Application');
    const target = await Application.findOne({ email: 'aditi@example.com' });
    const storedName = target.resume.storedName;

    const res = await admin.delete(`/api/admin/applications/${target._id}`);
    expect(res.status).toBe(200);
    expect(await Application.findById(target._id)).toBeNull();
    expect(require('fs').existsSync(require('path').join(require('../src/config/env').UPLOAD_PATH, storedName))).toBe(false);
  });
});
