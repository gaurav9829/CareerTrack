// Generates docs/Test_Cases.xlsx from the REAL automated test suite plus the
// manual frontend checklist.
//
// The `exceljs` package is a documentation-only dependency, so it is NOT in
// package.json. Run it one-off with:
//     cd backend
//     npm i --no-save exceljs
//     node ../docs/generate-test-cases.js
const path = require('path');

let ExcelJS;
try {
  ExcelJS = require('exceljs');
} catch {
  // When run per the instructions above (cwd = backend), exceljs is in
  // backend/node_modules - resolve it explicitly from there.
  ExcelJS = require(path.resolve(process.cwd(), 'node_modules', 'exceljs'));
}

// --- Automated rows (mirrors backend/tests/*; all 81 PASS as of the latest run) ---
const AUTOMATED = [
  // jobs.test.js
  ['TC-J11', 'Public Jobs', 'Health check endpoint', 'GET /api/health', '200 with status "ok"', 'Passed (Jest)', 'Pass'],
  ['TC-J01', 'Public Jobs', 'List shows only active jobs', '1 expired + 1 draft + 1 closed + 2 active jobs seeded', 'Only active jobs returned; drafts/closed/expired excluded', 'Passed (Jest)', 'Pass'],
  ['TC-J02', 'Public Jobs', 'Search q matches title/company/location case-insensitively', '?q=node, ?q=novaworks, ?q=bengaluru', 'Correct matches returned', 'Passed (Jest)', 'Pass'],
  ['TC-J02b', 'Public Jobs', 'Search never leaks expired jobs (regression: search $or must not overwrite the active-filter deadline $or)', '?q=expired and ?q=oldcorp on an expired job titled "Expired Job" (OldCorp)', '200 but 0 results; expired job excluded from search results', 'Passed (Jest)', 'Pass'],
  ['TC-J03', 'Public Jobs', 'Filter by employment type and experience level', '?type=Internship, ?level=Lead', 'Only matching jobs returned', 'Passed (Jest)', 'Pass'],
  ['TC-J04', 'Public Jobs', 'Sorting newest/oldest/deadline', '?sort=deadline on jobs with +1d, +5d, null deadlines', 'Soonest deadline first; no-deadline job LAST', 'Passed (Jest)', 'Pass'],
  ['TC-J05', 'Public Jobs', 'Pagination slice + meta', '5 jobs, ?page=2&limit=2', '2 items; pagination {page:2,total:5,totalPages:3}', 'Passed (Jest)', 'Pass'],
  ['TC-J06', 'Public Jobs', 'Public detail hides createdBy', 'GET /api/jobs/:id', 'Job returned without createdBy field', 'Passed (Jest)', 'Pass'],
  ['TC-J07', 'Public Jobs', 'Draft job detail is hidden', 'GET /api/jobs/:id (draft)', '404', 'Passed (Jest)', 'Pass'],
  ['TC-J08', 'Public Jobs', 'Closed job detail is hidden', 'GET /api/jobs/:id (closed)', '404', 'Passed (Jest)', 'Pass'],
  ['TC-J09', 'Public Jobs', 'Expired job detail is hidden', 'GET /api/jobs/:id (deadline past)', '404', 'Passed (Jest)', 'Pass'],
  ['TC-J10', 'Public Jobs', 'Invalid job id format', 'GET /api/jobs/not-a-valid-id', '400 with standard error shape', 'Passed (Jest)', 'Pass'],

  // apply.test.js
  ['TC-A01', 'Apply', 'Application succeeds without login; résumé stored as UUID', 'multipart POST with valid fields + PDF', '201; file on disk named <uuid>.pdf; status "Submitted"', 'Passed (Jest)', 'Pass'],
  ['TC-A01b', 'Apply', 'Missing résumé file rejected', 'multipart POST without resume file', '400 "Please attach your résumé"', 'Passed (Jest)', 'Pass'],
  ['TC-A02', 'Apply', 'Missing required fields rejected', 'empty name/email/phone', '400 with field errors for name, email, phone', 'Passed (Jest)', 'Pass'],
  ['TC-A03', 'Apply', 'Invalid email rejected', 'email="not-an-email"', '400 with email field error', 'Passed (Jest)', 'Pass'],
  ['TC-A04', 'Apply', 'Invalid phone rejected', 'phone="abc123"', '400 with phone field error', 'Passed (Jest)', 'Pass'],
  ['TC-A05', 'Apply', 'Wrong file type rejected (.txt)', 'notes.txt upload', '400 "Only PDF and DOCX files are allowed"; file never written', 'Passed (Jest)', 'Pass'],
  ['TC-A06', 'Apply', 'Oversized file rejected', '5 MB PDF (limit 4 MB)', '413 "File too large"', 'Passed (Jest)', 'Pass'],
  ['TC-A07', 'Apply', 'Fake PDF (renamed .exe) caught by magic bytes', 'MZ-header bytes saved as resume.pdf', '400; orphaned upload deleted from disk', 'Passed (Jest)', 'Pass'],
  ['TC-A08', 'Apply', 'Duplicate application blocked', 'same job + same email twice', '409 "You have already applied…"; second file removed', 'Passed (Jest)', 'Pass'],
  ['TC-A09', 'Apply', 'DOCX with valid magic bytes accepted', 'real PK header .docx upload', '201', 'Passed (Jest)', 'Pass'],
  ['TC-A10', 'Apply', 'Apply to draft job rejected', 'POST apply on draft job', '400 "not accepting applications"', 'Passed (Jest)', 'Pass'],
  ['TC-A11', 'Apply', 'Apply to closed job rejected', 'POST apply on closed job', '400 "not accepting applications"', 'Passed (Jest)', 'Pass'],
  ['TC-A12', 'Apply', 'Apply to expired job rejected', 'POST apply on published job with past deadline', '400 "This job posting has expired"', 'Passed (Jest)', 'Pass'],
  ['TC-A13', 'Apply', 'Unknown job id returns 404', 'valid-format nonexistent id', '404', 'Passed (Jest)', 'Pass'],
  ['TC-A14', 'Apply', 'Multipart fields parsed and stored', 'skills string, education JSON, experienceYears', 'skills split to array; education parsed; years=2', 'Passed (Jest)', 'Pass'],
  ['TC-A15', 'Security', 'NoSQL injection via multipart field name', 'email[$ne]=x multipart', '400 (sanitized), not 500; upload cleaned up', 'Passed (Jest)', 'Pass'],
  ['TC-A16', 'Security', 'NoSQL injection via JSON body', '{"email":{"$ne":"x"}}', '400 with email field error', 'Passed (Jest)', 'Pass'],

  // auth.test.js
  ['TC-AU01', 'Auth', 'Login success sets httpOnly cookie', 'valid admin credentials', '200; Set-Cookie HttpOnly; admin data returned', 'Passed (Jest)', 'Pass'],
  ['TC-AU02', 'Auth', 'Wrong password rejected with generic message', 'valid email + wrong password', '401 "Invalid credentials" (no hint which part was wrong)', 'Passed (Jest)', 'Pass'],
  ['TC-AU03', 'Auth', 'Unknown email rejected identically', 'unknown email', '401 "Invalid credentials"', 'Passed (Jest)', 'Pass'],
  ['TC-AU04', 'Auth', 'Login payload validation', 'missing password / bad email', '400', 'Passed (Jest)', 'Pass'],
  ['TC-AU05', 'Auth', '/auth/me without cookie', 'GET /api/auth/me', '401', 'Passed (Jest)', 'Pass'],
  ['TC-AU06', 'Auth', '/auth/me with cookie restores session', 'cookie from login', '200 admin data; no passwordHash exposed', 'Passed (Jest)', 'Pass'],
  ['TC-AU07', 'Auth', 'Logout clears cookie', 'POST /api/auth/logout', '200; cookie emptied in Set-Cookie', 'Passed (Jest)', 'Pass'],
  ['TC-AU08', 'Auth', 'Login rate limiting', 'repeated login attempts (limit 5/15min in test env)', '429 "Too many login attempts"', 'Passed (Jest)', 'Pass'],

  // authorization.test.js
  ['TC-Z01..16', 'Authorization', 'ALL /api/admin/* routes reject anonymous callers', '16 GET/POST/PUT/PATCH/DELETE admin routes without cookie (incl. résumé download)', 'Every route returns 401', 'Passed (Jest)', 'Pass'],
  ['TC-Z99', 'Authorization', 'Public routes stay public', 'GET /api/health, GET /api/jobs without cookie', '200', 'Passed (Jest)', 'Pass'],

  // adminJobs.test.js
  ['TC-AJ01', 'Admin Jobs', 'Create job defaults to draft', 'POST /api/admin/jobs (full payload)', '201; status "draft"; createdBy set', 'Passed (Jest)', 'Pass'],
  ['TC-AJ02', 'Admin Jobs', 'Create with status published sets publishedAt', 'POST with status=published', '201; publishedAt set', 'Passed (Jest)', 'Pass'],
  ['TC-AJ03', 'Admin Jobs', 'Create validation', 'missing title', '400 with title field error', 'Passed (Jest)', 'Pass'],
  ['TC-AJ04', 'Admin Jobs', 'Salary max < min rejected', 'salary {min:900000, max:500000}', '400', 'Passed (Jest)', 'Pass'],
  ['TC-AJ05', 'Admin Jobs', 'Update job (full PUT payload)', 'PUT with complete payload + changed title/location', '200; fields updated', 'Passed (Jest)', 'Pass'],
  ['TC-AJ06', 'Admin Jobs', 'Publish/unpublish/close transitions', 'PATCH on a draft job x3', 'published (publishedAt set) -> draft -> closed', 'Passed (Jest)', 'Pass'],
  ['TC-AJ07', 'Admin Jobs', 'Delete job without applications', 'DELETE on un-applied job', '200; job removed', 'Passed (Jest)', 'Pass'],
  ['TC-AJ08', 'Admin Jobs', 'Delete BLOCKED when applications exist', 'DELETE on job with 1 application', '409 "…Close it instead."', 'Passed (Jest)', 'Pass'],
  ['TC-AJ09', 'Admin Jobs', 'Admin list shows all statuses + status filter', 'GET /api/admin/jobs?status=draft', 'All rows match filter', 'Passed (Jest)', 'Pass'],
  ['TC-AJ10', 'Admin Jobs', 'Dashboard stats counters', 'GET /api/admin/stats', 'totalJobs/activeJobs/totalApplications/applicationsByStatus present', 'Passed (Jest)', 'Pass'],
  ['TC-AJ11', 'Admin Jobs', 'Job detail includes applicationCount', 'GET /api/admin/jobs/:id', '200; applicationCount returned', 'Passed (Jest)', 'Pass'],

  // adminApplications.test.js
  ['TC-AA01', 'Admin Applications', 'List with populated job info', 'GET /api/admin/applications', '200; rows include job.title', 'Passed (Jest)', 'Pass'],
  ['TC-AA02', 'Admin Applications', 'Filter by status', '?status=Shortlisted', 'Only matching rows', 'Passed (Jest)', 'Pass'],
  ['TC-AA03', 'Admin Applications', 'Filter by job', '?job=<id>', 'Only that job\'s applications', 'Passed (Jest)', 'Pass'],
  ['TC-AA04', 'Admin Applications', 'Search by name/email', '?q=aditi, ?q=evil@', 'Only matching rows', 'Passed (Jest)', 'Pass'],
  ['TC-AA05', 'Admin Applications', 'Date-range filter', '?from=<tomorrow>', '0 results for future range', 'Passed (Jest)', 'Pass'],
  ['TC-AA06', 'Admin Applications', 'Valid status update', 'PATCH status "Interview Scheduled"', '200; status persisted', 'Passed (Jest)', 'Pass'],
  ['TC-AA07', 'Admin Applications', 'Invalid status rejected', 'PATCH status "Hired Maybe"', '400 (enum validation)', 'Passed (Jest)', 'Pass'],
  ['TC-AA08', 'Admin Applications', 'Internal note with author', 'POST note', '201; note stored with admin author name', 'Passed (Jest)', 'Pass'],
  ['TC-AA09', 'Admin Applications', 'CSV export content type + headers', 'GET /api/admin/applications/export', 'text/csv; attachment; correct columns', 'Passed (Jest)', 'Pass'],
  ['TC-AA10', 'Admin Applications', 'CSV formula injection neutralized', 'candidate name "=Evil Formula"', 'Cell prefixed with apostrophe in CSV', 'Passed (Jest)', 'Pass'],
  ['TC-AA11', 'Admin Applications', 'Résumé download (protected)', 'GET résumé route with admin cookie', '200; exact original bytes; Content-Disposition', 'Passed (Jest)', 'Pass'],
  ['TC-AA12', 'Admin Applications', 'Delete application removes résumé file', 'DELETE application', '200; DB record and disk file both gone', 'Passed (Jest)', 'Pass'],

  // seed.test.js (AUTO_SEED_DEMO bootstrap for hosts without shell access)
  ['TC-S01', 'Demo Seed', 'ensureDemoAdmin creates the admin from env credentials', 'empty admins collection + ADMIN_* env vars', 'Admin created; passwordHash is bcrypt (not plaintext)', 'Passed (Jest)', 'Pass'],
  ['TC-S02', 'Demo Seed', 'ensureDemoAdmin is idempotent', 'run twice with same env', 'Admin updated in place; count stays 1 (never duplicates)', 'Passed (Jest)', 'Pass'],
  ['TC-S03', 'Demo Seed', 'seedJobs inserts 12 fictional jobs owned by the admin', 'empty jobs collection + existing admin', '12 jobs; published ones have publishedAt; drafts/closed have none', 'Passed (Jest)', 'Pass'],
  ['TC-S04', 'Demo Seed', 'Public list only serves active jobs after seeding', 'GET /api/jobs after seedJobs (9 published, 1 expired)', 'pagination.total = 8; expired job excluded', 'Passed (Jest)', 'Pass'],
];

// --- Manual frontend checklist (student fills Actual/Status after trying) ---
const MANUAL = [
  ['MC-01', 'Frontend', 'Job list renders, search + filters + sort update URL and results', 'npm run dev (backend + frontend)', 'Results match filters; refresh keeps state', '', ''],
  ['MC-02', 'Frontend', 'Pagination works and resets on new filter', 'click page 2, then change filter', 'Page resets to 1; correct slice shown', '', ''],
  ['MC-03', 'Frontend', 'Empty state when no jobs match', 'search gibberish', 'Friendly empty state with clear-filters hint', '', ''],
  ['MC-04', 'Frontend', 'Job detail shows all fields', 'open an active job', 'Salary, deadline, lists, skills, instructions visible', '', ''],
  ['MC-05', 'Frontend', 'Apply form client validation', 'submit with empty fields / bad email / big file', 'Inline errors; no request sent', '', ''],
  ['MC-06', 'Frontend', 'Apply success flow', 'valid application + PDF', 'Redirect to success page; confirmation shown', '', ''],
  ['MC-07', 'Frontend', 'Duplicate apply shows friendly error', 'apply twice with same email', '409 message shown inline, no crash', '', ''],
  ['MC-08', 'Frontend', 'Admin login + session restore', 'login, then refresh /admin', 'Dashboard stays; /auth/me restores session', '', ''],
  ['MC-09', 'Frontend', 'Protected route redirects', 'visit /admin while logged out', 'Redirect to /admin/login', '', ''],
  ['MC-10', 'Frontend', 'Job CRUD + publish/unpublish/close with confirm modals', 'create, edit, publish, close, delete a job', 'Actions work; confirmations shown; toasts appear', '', ''],
  ['MC-11', 'Frontend', 'Application review: filters, CSV export, status, notes, résumé download', 'admin reviews an application', 'All actions succeed', '', ''],
  ['MC-12', 'Frontend', 'Responsive layout', 'test at 375px / 768px / 1280px widths', 'No broken layout; mobile menus work', '', ''],
];

const HEADER = ['Test Case ID', 'Module', 'Scenario', 'Input / Preconditions', 'Expected Result', 'Actual Result', 'Status (Pass/Fail)'];

(async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CareerTrack';
  const sheet = workbook.addWorksheet('Test Cases');

  sheet.columns = HEADER.map((h) => ({ header: h, key: h, width: h === 'Scenario' || h === 'Input / Preconditions' || h === 'Expected Result' ? 46 : 14 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };

  const addRow = (arr) => {
    const row = sheet.addRow(HEADER.reduce((obj, h, i) => ({ ...obj, [h]: arr[i] }), {}));
    row.alignment = { vertical: 'top', wrapText: true };
  };

  AUTOMATED.forEach(addRow);
  MANUAL.forEach(addRow);

  await workbook.xlsx.writeFile(path.join(__dirname, 'Test_Cases.xlsx'));
  console.log(`Written docs/Test_Cases.xlsx with ${AUTOMATED.length} automated + ${MANUAL.length} manual rows.`);
})().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
