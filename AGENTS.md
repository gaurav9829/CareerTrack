# CareerTrack – Full-Stack Job Portal & Recruitment Management System

> Instructions for the coding agent (OpenCode). Read this file fully before writing any code.
> Work phase by phase (see "Build Order"). After each phase: run it, fix errors, then make a git commit.

## 1. Project Summary

CareerTrack is a MERN job portal for an InternsElite major project.

- **Public visitors** browse published jobs, search/filter/sort, view job details, and apply **without an account** (with résumé upload).
- **Administrators** log in securely and manage jobs, review applications, change statuses, add internal notes, view résumés, and export CSV.

Deadline: **10 Nov 2026**. If time runs short, follow the "Cut List" in section 15.

## 2. Ground Rules for the Agent

1. Use **JavaScript only** (no TypeScript). Backend uses **CommonJS** (`require`) to keep Jest simple. Frontend uses ES modules (Vite default).
2. Keep code simple, readable, and commented where the logic is non-obvious. The student must be able to **explain every file in a viva**.
3. Never commit secrets. Only `.env.example` with placeholders is committed. `.env`, `node_modules`, `uploads/` are gitignored.
4. Never claim a feature or test is done unless it was actually run. Documentation must reflect the real implementation.
5. No real personal data anywhere. Seed data and test data must be fake.
6. Use consistent status constants from one shared file (see section 6). No magic strings scattered around.
7. Use proper HTTP status codes and a single JSON error shape: `{ "success": false, "message": "...", "errors": [...] }`.
8. Success shape: `{ "success": true, "data": ..., "message": "..." }` (add `pagination` where relevant).
9. Make small, meaningful commits (conventional style: `feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## 3. Tech Stack (Final)

| Layer | Choice |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS, JavaScript |
| HTTP client | `axios` (with `withCredentials: true`) |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (free tier) via Mongoose |
| Auth | JWT in **httpOnly cookie**, passwords hashed with `bcryptjs` |
| Validation | `express-validator` (server-side), light client-side checks |
| Uploads | `multer` (local disk storage) |
| Security | `helmet`, `cors` (origin whitelist), `express-rate-limit`, `express-mongo-sanitize`, `cookie-parser` |
| CSV | `json2csv` |
| Testing | Jest + Supertest + `mongodb-memory-server` (backend); manual test sheet for frontend |
| Frontend hosting | Vercel |
| Backend hosting | Render (Node web service). **Not Vercel**, because serverless has no persistent disk for résumé uploads |

## 4. Folder Structure

```
CareerTrack_Major_Project/
├── frontend/
│   ├── src/
│   │   ├── api/            # axios instance + API call functions
│   │   ├── components/     # reusable UI (Button, Input, Card, Modal, Pagination, Spinner, Toast, ProtectedRoute...)
│   │   ├── layouts/        # PublicLayout, AdminLayout
│   │   ├── pages/
│   │   │   ├── public/     # JobList, JobDetail, ApplyForm (or section in JobDetail), ApplySuccess, NotFound
│   │   │   └── admin/      # Login, Dashboard, JobsManage, JobForm, ApplicationsManage, ApplicationDetail
│   │   ├── context/        # AuthContext
│   │   ├── hooks/          # useDebounce etc.
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── vercel.json         # rewrites /api/* to backend + SPA fallback
│   ├── package.json
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── config/         # db.js, env.js, constants.js
│   │   ├── models/         # Admin.js, Job.js, Application.js
│   │   ├── routes/         # publicRoutes.js, authRoutes.js, adminJobRoutes.js, adminApplicationRoutes.js
│   │   ├── controllers/
│   │   ├── middleware/     # auth.js, errorHandler.js, upload.js, validate.js, rateLimiters.js, notFound.js
│   │   ├── utils/          # ApiError.js, asyncHandler.js, fileSignature.js, csv helpers
│   │   ├── seed/           # seedAdmin.js, seedJobs.js
│   │   ├── app.js          # express app (exported for tests)
│   │   └── server.js       # starts server
│   ├── tests/              # Jest + Supertest
│   ├── uploads/resumes/    # gitignored (keep .gitkeep)
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── API_Documentation.md   # (exported to PDF later)
│   ├── Database_Schema.md     # (+ ER diagram, exported to PDF later)
│   └── Test_Cases.xlsx        # generated from REAL test results
├── screenshots/               # captured manually by the student
├── README.md
├── .gitignore
├── GitHub_Repository_Link.txt
└── Deployment_Links.txt
```

## 5. Environment Variables

`backend/.env.example`
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/careertrack
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=1d
COOKIE_NAME=careertrack_token
COOKIE_SAMESITE=lax            # use "none" only if frontend calls backend cross-site directly
CLIENT_ORIGIN=http://localhost:5173
MAX_RESUME_MB=4
UPLOAD_DIR=uploads/resumes
ADMIN_NAME=Demo Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me_strong_password
```

`frontend/.env.example`
```
VITE_API_BASE_URL=/api
```

Dev: Vite proxies `/api` to `http://localhost:5000`.
Prod: `vercel.json` rewrites `/api/:path*` to the Render backend URL, so the browser sees one origin and the cookie stays first-party. Add the SPA fallback rewrite for React Router too. Backend must set `app.set('trust proxy', 1)` for rate limiting and secure cookies behind Render/Vercel.

## 6. Constants (`backend/src/config/constants.js`)

```js
APPLICATION_STATUS = ['Submitted','Under Review','Shortlisted','Interview Scheduled','Selected','Rejected']
JOB_STATUS = ['draft','published','closed']
EMPLOYMENT_TYPES = ['Full-time','Part-time','Contract','Internship','Freelance']
EXPERIENCE_LEVELS = ['Fresher','Junior','Mid','Senior','Lead']
```
"Expired" is **derived**, not stored: a job is *active* when `status === 'published'` AND (`deadline` is empty OR `deadline >= now`). Expired = published with a past deadline. Create one reusable query helper `activeJobFilter()` and use it everywhere (public list, public detail, apply endpoint, dashboard stats).

## 7. Data Models

### Admin
`name`, `email` (unique, lowercase), `passwordHash` (`select: false`), `role` (default `'admin'`), `createdAt`.
Methods: `comparePassword`. No public registration route exists. Admin is created only by `npm run seed:admin`.

### Job
- `title` (required), `company` (required), `location` (required)
- `employmentType` (enum), `experienceLevel` (enum)
- `salary`: `{ min: Number, max: Number, currency: String default 'INR' }` (min <= max validated)
- `description` (required), `responsibilities: [String]`, `qualifications: [String]`, `skills: [String]`, `benefits: [String]`
- `applicationInstructions: String`
- `deadline: Date` (optional)
- `status` (enum JOB_STATUS, default `draft`), `publishedAt: Date`
- `createdBy` ref Admin, timestamps
- Indexes: text index on `title, company, location`; compound `{ status: 1, deadline: 1 }`; `{ createdAt: -1 }`.

### Application
- `job` ref Job (required, indexed), `name`, `email` (lowercase, trimmed), `phone`
- `education: [{ degree, institution, year }]`, `experience: { years: Number, summary: String }`
- `skills: [String]`, `coverLetter: String`
- `resume: { originalName, storedName, mimeType, size }` (storedName is a random UUID + extension; never the user's filename)
- `status` (enum APPLICATION_STATUS, default `Submitted`)
- `notes: [{ text, author (ref Admin), createdAt }]`
- timestamps
- **Unique compound index `{ job: 1, email: 1 }`**. Duplicate handling: catch Mongo error code 11000 and return `409 Conflict` with a clear message. Also pre-check in the controller for a friendly error.
- Additional index: `{ status: 1, createdAt: -1 }`.

Relationship: one Job has many Applications (reference from Application to Job). Handle invalid ObjectIds (400) and missing records (404).

## 8. API Endpoints

Base path `/api`. Admin routes sit behind the `protect` middleware (JWT cookie).

### Public
| Method | Path | Purpose |
|---|---|---|
| GET | `/jobs` | List active jobs. Query: `q` (title/company/location), `location`, `company`, `type`, `level`, `sort` (`newest`,`oldest`,`deadline`,`salary`), `page`, `limit` (max 50). Returns pagination meta |
| GET | `/jobs/:id` | Job detail (only if active; otherwise 404) |
| POST | `/jobs/:id/apply` | Submit application (`multipart/form-data`, field `resume`). Rejects unpublished/expired/closed jobs (400/404), duplicates (409), invalid files (400/413) |
| GET | `/health` | Health check |

### Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Verify email + password, set httpOnly cookie. Generic error message on failure ("Invalid credentials") |
| POST | `/auth/logout` | Clear cookie |
| GET | `/auth/me` | Return current admin (used by frontend to restore session) |

### Admin – Jobs (protected)
| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/stats` | total jobs, active jobs, expired/closed jobs, total applications (optionally applications by status) |
| GET | `/admin/jobs` | List all jobs with search, filter by status, sort, pagination |
| POST | `/admin/jobs` | Create job (default draft) |
| GET | `/admin/jobs/:id` | Get one job (includes application count) |
| PUT | `/admin/jobs/:id` | Update job |
| PATCH | `/admin/jobs/:id/publish` | Publish (sets `publishedAt`) |
| PATCH | `/admin/jobs/:id/unpublish` | Back to draft |
| PATCH | `/admin/jobs/:id/close` | Close |
| DELETE | `/admin/jobs/:id` | Delete job. Decision: **block deletion if applications exist** (return 409, suggest closing instead). Document this choice |

### Admin – Applications (protected)
| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/applications` | List with filters `job`, `status`, `from`, `to`, search by name/email, pagination |
| GET | `/admin/applications/export` | CSV export honoring the same filters (**define this route before `/:id`**) |
| GET | `/admin/applications/:id` | Full details with populated job |
| PATCH | `/admin/applications/:id/status` | Update status (validated against enum) |
| POST | `/admin/applications/:id/notes` | Add internal note |
| GET | `/admin/applications/:id/resume` | Stream résumé file (auth required, `Content-Disposition`, correct MIME) |
| DELETE | `/admin/applications/:id` | Optional: delete application + its file |

CSV columns: application id, job title, company, name, email, phone, experience years, skills, status, applied date. Protect against CSV formula injection (prefix cells starting with `=`, `+`, `-`, `@` with `'`).

## 9. Security Requirements

- `helmet()` defaults; `cors({ origin: CLIENT_ORIGIN, credentials: true })` (whitelist, never `*`).
- `express-rate-limit`: general limiter (~100 req / 15 min per IP), strict login limiter (~5–10 attempts / 15 min), apply limiter (~10 / hour per IP).
- `express-mongo-sanitize` on body, params, query. Also validate all ObjectIds and coerce query params to strings/numbers (never pass raw objects to Mongo filters). Escape user text before building regex search.
- JSON body limit (e.g. 100kb). Request validation via `express-validator` on every write endpoint, with a shared `validate` middleware.
- Password hashing: `bcryptjs`, cost 12. JWT signed with `JWT_SECRET`, short expiry. Cookie: `httpOnly`, `secure` in production, `sameSite` from env.
- `protect` middleware: reads cookie, verifies JWT, loads admin, 401 on failure. Résumé route is **only** reachable via `protect`.
- Public job responses must **not** expose `createdBy`, internal fields, or applicant data. Use explicit field selection (`select`) for public queries.
- Centralized error handler: never leak stack traces in production; map Mongoose validation errors (400), cast errors (400), duplicate key (409), Multer errors (400/413).
- Secrets only from env vars. Fail fast at startup if `JWT_SECRET` or `MONGO_URI` is missing.

## 10. Résumé Upload Handling

- Field name: `resume`. Allowed: PDF and DOCX only. Max size from `MAX_RESUME_MB` (default 4 MB).
- Validation layers: (1) extension, (2) MIME type, (3) **magic bytes** after upload (PDF starts with `%PDF`; DOCX is a ZIP starting with `PK\x03\x04`). If the check fails, delete the file and return 400.
- Store on disk in `UPLOAD_DIR` (outside any static/public folder, **never** `express.static`). Filename = `crypto.randomUUID() + ext`.
- If application creation fails after the file was saved (validation error, duplicate, closed job), **delete the orphaned file**. Validate the job and the duplicate check *before* trusting the upload where possible, and clean up in the error path regardless.
- Serve only via the protected admin route using `res.download` / stream with sanitized filename.
- Known limitation to document: Render free tier disk is ephemeral, so uploaded résumés can vanish on redeploy/restart. Mention this in README and report (future enhancement: Cloudinary/S3 with signed URLs).

## 11. Frontend Pages & Behavior

Routes (React Router):
- `/` – Job listing: search bar (title/company/location), filters (type, level, location), sort dropdown, pagination (page numbers), loading skeleton/spinner, empty state, error state.
- `/jobs/:id` – Job detail: all fields, apply section/button. Show "closed/expired" state if not active.
- `/jobs/:id/apply` (or inline form) – Application form with client-side validation (required fields, email, phone, file type/size), upload progress or submitting state, inline server errors (including duplicate 409), success page/confirmation.
- `/admin/login` – Login form with error handling.
- `/admin` – Dashboard with stat cards.
- `/admin/jobs` – Table: search, status filter, sort, pagination; actions publish/unpublish/close/edit/delete with **confirmation modal**.
- `/admin/jobs/new`, `/admin/jobs/:id/edit` – Job form (dynamic list inputs for responsibilities/qualifications/skills/benefits).
- `/admin/applications` – Table with filters (job, status, date range), CSV export button.
- `/admin/applications/:id` – Candidate details, résumé download/view button, status dropdown, notes list + add note form.
- `*` – Not found page.

Cross-cutting:
- `AuthContext` calls `/auth/me` on load. `ProtectedRoute` redirects to `/admin/login` if unauthenticated. Axios interceptor handles 401 by clearing auth state.
- Toast notifications for success/error. Confirmation modal component reused for destructive actions.
- Reusable components, consistent Tailwind design tokens (a small palette, consistent spacing/radius). Fully responsive (test at 375px, 768px, 1280px).
- Debounce search inputs (~400ms). Keep filter/sort/page state in URL query params so refresh/back works.
- Accessibility basics: labels on inputs, focus styles, button `type`, alt text.

## 12. Testing Plan

Backend automated tests (Jest + Supertest + mongodb-memory-server), each with a clear name that maps to a test case ID:
- Jobs: list only active, search, filters, sorting, pagination, detail 404 for draft/closed/expired, invalid id 400.
- Apply: success without auth, missing fields 400, invalid email/phone 400, wrong file type 400, oversized file 413/400, fake file (renamed .exe → .pdf) 400, duplicate 409, apply to draft/closed/expired job rejected.
- Auth: login success, wrong password 401, rate limit on login, `/auth/me` without cookie 401.
- Authorization: every `/admin/*` endpoint returns 401 without a cookie (loop over routes), résumé route 401 without cookie.
- Admin jobs: create, update, publish/unpublish/close, delete blocked when applications exist, validation errors.
- Admin applications: filter, status update (valid + invalid value), add note, CSV export content type and header row, résumé download.
- NoSQL injection attempt (`email[$ne]=x`) is sanitized/rejected.

Manual frontend tests are recorded in the spreadsheet (Pass/Fail entered honestly after actually trying them).

**`docs/Test_Cases.xlsx`** columns: Test Case ID, Module, Scenario, Input/Preconditions, Expected Result, Actual Result, Status (Pass/Fail). Generate automated rows from real Jest output; leave manual rows' Actual/Status for the student to fill in after testing.

## 13. Documentation Deliverables

Generate these **from the real code**, after features work:
1. `README.md` – overview, features and roles, stack, architecture, prerequisites, install steps (frontend + backend), env setup, MongoDB Atlas setup, run commands, API docs location, how to run tests, deployment URLs + procedure, screenshots folder link, known limitations and future improvements.
2. `docs/API_Documentation.md` – per endpoint: method, path, purpose, auth requirement, params/body, example success response, important error responses.
3. `docs/Database_Schema.md` – database name, collections, schema explanation, relationships, indexes, validation rules, a Mermaid ER diagram, anonymized sample documents.
4. `docs/Test_Cases.xlsx` as described above.
5. Report content outline (the student will assemble the final `Project_Report.pdf` with the 20 required sections). Prepare a `docs/report_notes.md` with factual material for: architecture and data-flow diagram (Mermaid), design decisions, security measures, file-upload handling, challenges and solutions, limitations. Only describe what was actually built.
6. `docs/VIVA_NOTES.md` – short explanations of auth flow, validation, duplicate prevention, upload validation, indexes, protected routes, and why each library was chosen.

## 14. Build Order (commit after each phase)

**Phase 0 – Setup**: repo init, `.gitignore`, folder structure, backend + frontend scaffolds, env examples, Vite proxy, Tailwind configured. Commit.

**Phase 1 – Backend core**: `app.js`/`server.js`, DB connection, error handler, security middleware, constants, Admin/Job/Application models, seed scripts (`npm run seed:admin`, `npm run seed:jobs` with ~12 fake jobs). Commit.

**Phase 2 – Public API**: job list/detail with search, filters, sort, pagination; apply endpoint with multer + validation + duplicate + cleanup. Commit.

**Phase 3 – Auth + admin API**: login/logout/me, `protect`, stats, job CRUD + publish/unpublish/close, application list/detail/status/notes/résumé/export. Commit.

**Phase 4 – Backend tests**: write and run the Jest suite; fix bugs found. Commit.

**Phase 5 – Frontend public**: layout, components, job list, job detail, apply form, success page. Commit.

**Phase 6 – Frontend admin**: auth context, protected routes, login, dashboard, job management, application management. Commit.

**Phase 7 – Polish**: loading/empty/error states, toasts, confirmation modals, responsive pass, accessibility pass. Commit.

**Phase 8 – Docs**: README, API docs, DB schema, test-case sheet, report notes, viva notes. Commit.

**Phase 9 – Deployment prep**: `vercel.json`, Render start command (`node src/server.js`), production env checklist, `Deployment_Links.txt` placeholders. Commit.

After each phase, tell the student what to run to verify and what changed. If something cannot be verified in the environment, say so plainly.

## 15. Cut List (if time runs out, drop in this order)

1. Optional `DELETE /admin/applications/:id`
2. Sort by salary, URL-synced filter state
3. Rate limit tuning and extra edge-case tests (keep the core ones)
4. Skeleton loaders (keep simple spinners)

**Never cut**: duplicate prevention, résumé validation, protected admin/résumé routes, status updates, CSV export, `.env.example`, `.gitignore`, README.

## 16. Definition of Done

- [ ] Public browse, search, filter, sort, pagination, and job detail work on desktop and mobile
- [ ] Apply works without login; résumé validated; duplicates blocked; closed/expired/unpublished jobs rejected
- [ ] Admin login works; all admin routes and résumé files are inaccessible without auth
- [ ] Dashboard stats, job CRUD + publish/unpublish/close, application filtering, status updates, notes, CSV export all work
- [ ] Backend tests pass; results recorded honestly
- [ ] No secrets or real data in the repo; `.env.example` present
- [ ] README, API docs, DB schema docs, test cases, report notes, viva notes written from the actual implementation
- [ ] Frontend on Vercel and backend on Render reachable; demo admin handled safely (credentials shared with the evaluator privately, never in the repo)
