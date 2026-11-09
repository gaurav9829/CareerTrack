// Shared test helpers: in-memory DB lifecycle, fixture builders, file buffers.
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectDB, disconnectDB } = require('../src/config/db');
const { UPLOAD_PATH } = require('../src/config/env');
const Admin = require('../src/models/Admin');
const Job = require('../src/models/Job');

// Start a throwaway MongoDB, point the app at it.
async function startTestDB() {
  const mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  return mongo;
}

async function stopTestDB(mongo) {
  await disconnectDB();
  await mongo.stop();
  cleanUploads();
}

// Tests must not leave résumé files behind.
function cleanUploads() {
  if (!fs.existsSync(UPLOAD_PATH)) return;
  for (const f of fs.readdirSync(UPLOAD_PATH)) {
    fs.unlinkSync(path.join(UPLOAD_PATH, f));
  }
}

function uploadedFileCount() {
  return fs.existsSync(UPLOAD_PATH) ? fs.readdirSync(UPLOAD_PATH).length : 0;
}

async function createAdmin(overrides = {}) {
  return Admin.create({
    name: 'Test Admin',
    email: 'admin@test.dev',
    passwordHash: 'Password123!', // pre-save hook hashes this
    ...overrides,
  });
}

// Login through the real endpoint and keep the cookie (request.agent).
async function loginAdmin(app, admin = null, password = 'Password123!') {
  const target = admin || (await Admin.findOne());
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: target.email, password });
  if (res.status !== 200) throw new Error(`test login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

async function createJob(overrides = {}) {
  let createdBy = overrides.createdBy;
  if (!createdBy) {
    const admin = await Admin.findOne() || (await createAdmin());
    createdBy = admin._id;
  }
  return Job.create({
    title: 'Test Job',
    company: 'TestCorp',
    location: 'Test City',
    description: 'A test job description.',
    createdBy,
    ...overrides,
  });
}

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY);

// Real magic bytes so files pass the signature check.
const PDF_BYTES = Buffer.from('%PDF-1.4\nCareerTrack test resume content\n');
const DOCX_BYTES = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from('word/document.xml fake docx'),
]);

// Standard application payload for multipart requests.
function applyPayload(overrides = {}) {
  return {
    name: 'Ravi Kumar',
    email: 'ravi.kumar@example.com',
    phone: '+91 98765 43210',
    skills: 'React, Node.js, MongoDB',
    coverLetter: 'I would love to join.',
    experienceYears: '2',
    experienceSummary: 'Built MERN demo apps.',
    education: JSON.stringify([
      { degree: 'B.Tech CSE', institution: 'Demo University', year: 2023 },
    ]),
    ...overrides,
  };
}

// POST an application the way the browser would: multipart fields + resume file.
function applyRequest(app, jobId, payload, file = null) {
  const req = request(app).post(`/api/jobs/${jobId}/apply`);
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) req.field(key, value);
  }
  const f = file || { buffer: PDF_BYTES, name: 'resume.pdf', type: 'application/pdf' };
  req.attach('resume', f.buffer, { filename: f.name, contentType: f.type });
  return req;
}

module.exports = {
  startTestDB,
  stopTestDB,
  cleanUploads,
  uploadedFileCount,
  createAdmin,
  loginAdmin,
  createJob,
  applyPayload,
  applyRequest,
  PDF_BYTES,
  DOCX_BYTES,
  inDays,
};
