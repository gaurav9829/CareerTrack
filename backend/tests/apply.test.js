// TC-A01..TC-A14: the public apply endpoint - validation, upload handling,
// duplicate prevention, visibility rules, NoSQL injection defence.
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const { UPLOAD_PATH } = require('../src/config/env');
const {
  startTestDB,
  stopTestDB,
  uploadedFileCount,
  createAdmin,
  createJob,
  applyPayload,
  applyRequest,
  PDF_BYTES,
  DOCX_BYTES,
  inDays,
} = require('./helpers');

let mongo;
let activeJob; // published, deadline in the future

beforeAll(async () => {
  mongo = await startTestDB();
  await createAdmin();
  activeJob = await createJob({
    title: 'Apply Target',
    company: 'ApplyCorp',
    status: 'published',
    deadline: inDays(7),
  });
});

afterAll(() => stopTestDB(mongo));

describe('POST /api/jobs/:id/apply', () => {
  test('TC-A01: succeeds without auth, stores file with UUID name', async () => {
    const res = await applyRequest(app, activeJob._id, applyPayload());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Exactly one file on disk, named as a UUID + .pdf (not the original name).
    const files = fs.readdirSync(UPLOAD_PATH);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(files[0]).not.toContain('resume.pdf');

    // Application references the stored file.
    const Application = require('../src/models/Application');
    const doc = await Application.findOne({ email: 'ravi.kumar@example.com' });
    expect(doc).toBeTruthy();
    expect(doc.resume.storedName).toBe(files[0]);
    expect(doc.status).toBe('Submitted');
  });

  test('TC-A01b: missing résumé file returns 400', async () => {
    const res = await request(app).post(`/api/jobs/${activeJob._id}/apply`).field(applyPayload());
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/résumé|resume/i);
  });

  test('TC-A02: missing required fields returns 400', async () => {
    const res = await applyRequest(app, activeJob._id, { name: '', email: '', phone: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'phone']));
  });

  test('TC-A03: invalid email returns 400', async () => {
    const res = await applyRequest(app, activeJob._id, applyPayload({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
  });

  test('TC-A04: invalid phone returns 400', async () => {
    const res = await applyRequest(app, activeJob._id, applyPayload({ phone: 'abc123' }));
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'phone')).toBe(true);
  });

  test('TC-A05: wrong file type (.txt) returns 400', async () => {
    const res = await applyRequest(app, activeJob._id, applyPayload(), {
      buffer: Buffer.from('just some text'),
      name: 'notes.txt',
      type: 'text/plain',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pdf|docx/i);
    expect(uploadedFileCount()).toBe(1); // the .txt was never written
  });

  test('TC-A06: oversized file (>4 MB) returns 413', async () => {
    const res = await applyRequest(app, activeJob._id, applyPayload(), {
      buffer: Buffer.alloc(5 * 1024 * 1024, 65),
      name: 'big.pdf',
      type: 'application/pdf',
    });
    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/too large/i);
  });

  test('TC-A07: fake PDF (renamed .exe) is rejected by magic bytes and deleted', async () => {
    const exeBytes = Buffer.concat([Buffer.from([0x4d, 0x5a, 0x90, 0x00]), Buffer.alloc(64, 0)]); // MZ...
    const res = await applyRequest(app, activeJob._id, applyPayload({ email: 'fake@example.com' }), {
      buffer: exeBytes,
      name: 'resume.pdf',
      type: 'application/pdf',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid pdf|docx/i);
    expect(uploadedFileCount()).toBe(1); // orphaned upload was cleaned up
  });

  test('TC-A08: duplicate application returns 409 and no extra file is kept', async () => {
    const res = await applyRequest(app, activeJob._id, applyPayload({ email: 'ravi.kumar@example.com' }));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already applied/i);
    expect(uploadedFileCount()).toBe(1); // second upload removed
  });

  test('TC-A09: DOCX upload with correct magic bytes succeeds', async () => {
    const res = await applyRequest(app, activeJob._id, applyPayload({ email: 'docx.user@example.com' }), {
      buffer: DOCX_BYTES,
      name: 'resume.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(res.status).toBe(201);
    expect(uploadedFileCount()).toBe(2);
  });

  test('TC-A10: applying to a draft job returns 400', async () => {
    const job = await createJob({ title: 'Draft Target', status: 'draft' });
    const res = await applyRequest(app, job._id, applyPayload({ email: 'd1@example.com' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not accepting/i);
  });

  test('TC-A11: applying to a closed job returns 400', async () => {
    const job = await createJob({ title: 'Closed Target', status: 'closed' });
    const res = await applyRequest(app, job._id, applyPayload({ email: 'd2@example.com' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not accepting/i);
  });

  test('TC-A12: applying to an expired job returns 400', async () => {
    const job = await createJob({ title: 'Expired Target', status: 'published', deadline: inDays(-2) });
    const res = await applyRequest(app, job._id, applyPayload({ email: 'd3@example.com' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('TC-A13: unknown job id returns 404', async () => {
    const res = await applyRequest(
      app,
      '507f1f77bcf86cd799439011',
      applyPayload({ email: 'd4@example.com' }),
    );
    expect(res.status).toBe(404);
  });

  test('TC-A14: multipart fields are parsed and stored (skills split, education JSON)', async () => {
    const Application = require('../src/models/Application');
    const doc = await Application.findOne({ email: 'ravi.kumar@example.com' });
    expect(doc.skills).toEqual(['React', 'Node.js', 'MongoDB']);
    expect(doc.experience.years).toBe(2);
    expect(doc.education[0]).toMatchObject({ degree: 'B.Tech CSE', year: 2023 });
  });

  test('TC-A15: NoSQL injection attempt (email[$ne]) is sanitized and rejected', async () => {
    const res = await request(app)
      .post(`/api/jobs/${activeJob._id}/apply`)
      .field('name', 'Injector')
      .field('phone', '+91 90000 00000')
      .field('email[$ne]', 'x@example.com')
      .attach('resume', PDF_BYTES, { filename: 'resume.pdf', contentType: 'application/pdf' });
    // The $ne key never becomes a Mongo filter -> email is missing -> 400 (not 500)
    expect(res.status).toBe(400);
    expect(uploadedFileCount()).toBe(2); // rejected upload cleaned up
  });

  test('TC-A16: JSON-body NoSQL injection (email object) is sanitized and rejected', async () => {
    const res = await request(app)
      .post(`/api/jobs/${activeJob._id}/apply`)
      .send({ name: 'Injector', email: { $ne: 'x@example.com' }, phone: '+91 90000 00000' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
  });
});
