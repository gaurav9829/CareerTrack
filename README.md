# CareerTrack — Full-Stack Job Portal & Recruitment Management System

CareerTrack is a MERN-stack job portal built as a major project.

- **Public visitors** browse published jobs, search / filter / sort, view details, and apply **without an account** (with résumé upload).
- **Administrators** log in securely and manage jobs, review applications, change statuses, add internal notes, download résumés, and export applications as CSV.

All demo data (companies, jobs, candidates) is **fictional**.

---

## Features

### Public (no login)
- Job listing with **search** (title / company / location), **filters** (location, employment type, experience level), **sorting** (newest, oldest, deadline, salary) and **pagination**
- Filter/sort/page state is kept in the **URL** so refresh and back/forward work
- Job detail page with salary, deadline, responsibilities, qualifications, skills and benefits
- **Apply without an account** — multipart form with résumé upload (PDF/DOCX), upload progress, inline server errors
- Duplicate applications blocked (one application per email per job)
- Closed / unpublished / expired jobs are hidden and reject applications

### Admin (JWT in httpOnly cookie)
- Secure login (rate-limited), logout, session restore
- **Dashboard** with live stats (total/active/expired/draft/closed jobs, total applications, applications by status)
- **Job management**: create, edit, publish / unpublish / close, delete (blocked when applications exist — with confirmation modals)
- **Application management**: filter by job / status / date range, search by name or email
- Change application status (Submitted → … → Selected/Rejected), add **internal notes**
- Download candidate **résumés** (protected route)
- **CSV export** honoring the active filters, with formula-injection protection

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 (Vite), React Router 6, Tailwind CSS 3, axios |
| Backend | Node.js, Express 4 (CommonJS) |
| Database | MongoDB (Atlas in production) via Mongoose 8 |
| Auth | JWT in an **httpOnly cookie**, bcryptjs (cost 12) |
| Validation | express-validator (server) + client-side checks |
| Uploads | multer (local disk storage, magic-byte validation) |
| Security | helmet, CORS whitelist, express-rate-limit, express-mongo-sanitize |
| CSV | json2csv |
| Testing | Jest + Supertest + mongodb-memory-server (76 automated tests) |
| Hosting | Frontend: Vercel · Backend: Render (persistent disk for uploads) |

---

## Project Structure

```
├── frontend/               # React app (Vite)
│   ├── src/api/            # axios instance + endpoint functions
│   ├── src/components/     # reusable UI (Button, Modal, Pagination, Toast…)
│   ├── src/layouts/        # PublicLayout, AdminLayout
│   ├── src/pages/public/   # JobList, JobDetail, ApplyForm, ApplySuccess, NotFound
│   ├── src/pages/admin/    # Login, Dashboard, JobsManage, JobForm, Applications…
│   ├── src/context/        # AuthContext, ToastContext
│   ├── vercel.json         # /api rewrite + SPA fallback (deployed setup)
│   └── vite.config.js      # dev proxy /api -> :5000
├── backend/
│   ├── src/config/         # env.js, db.js, constants.js (enums + activeJobFilter)
│   ├── src/models/         # Admin, Job, Application
│   ├── src/routes/         # publicRoutes, authRoutes, adminJobRoutes, adminApplicationRoutes
│   ├── src/controllers/
│   ├── src/middleware/     # auth (protect), upload, validate, rate limiters, error handler
│   ├── src/utils/          # ApiError, asyncHandler, fileSignature, csv helpers
│   ├── src/seed/           # seedAdmin.js, seedJobs.js (12 fake jobs)
│   ├── src/app.js          # express app (exported for tests)
│   ├── src/server.js       # env check + DB connect + listen
│   ├── tests/              # Jest + Supertest suite
│   └── uploads/resumes/    # uploaded résumés (gitignored)
├── docs/                   # API docs, DB schema, test cases, viva notes, report notes
└── screenshots/            # captured by the student for the report
```

---

## Prerequisites

- Node.js ≥ 18 (tested on Node 24)
- npm
- A MongoDB database — free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or a local `mongod`

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then edit .env (see below)
```

Fill in `backend/.env`:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/careertrack
JWT_SECRET=<long random string>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong password>
```

> Never commit `.env`. Only `.env.example` with placeholders is in git.

### 2. Seed the database

```bash
npm run seed:admin        # creates the admin from ADMIN_* env vars
npm run seed:jobs         # inserts 12 fictional jobs (active/expired/draft/closed mix)
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_BASE_URL=/api is fine for local dev
npm run dev               # http://localhost:5173, proxies /api to :5000
```

### 4. Run everything

```bash
# terminal 1 (backend)     npm run dev     -> http://localhost:5000
# terminal 2 (frontend)    npm run dev     -> http://localhost:5173
```

### 5. Automated tests

```bash
cd backend
npm test                  # 76 tests; first run downloads a throwaway in-memory MongoDB
```

---

## API Documentation

See **[docs/API_Documentation.md](docs/API_Documentation.md)** for every endpoint with request/response examples.

Quick shape: all responses use `{ success, data?, message?, errors?, pagination? }`.

## Database Schema

See **[docs/Database_Schema.md](docs/Database_Schema.md)** — collections, fields, indexes, validation rules, ER diagram.

## Testing

See **[docs/Test_Cases.xlsx](docs/Test_Cases.xlsx)** — test case IDs mapped to the automated Jest suite (76 passing) plus the manual frontend checklist.

## Deployment

- **Backend → Render** (Node web service). Start command: `node src/server.js`. Render's free-tier disk is ephemeral — uploaded résumés can disappear on redeploy (documented limitation).
- **Frontend → Vercel**. `frontend/vercel.json` rewrites `/api/*` to the Render URL (keeps the auth cookie first-party) and provides the SPA fallback.
- Deployment links: `Deployment_Links.txt` · Repository: `GitHub_Repository_Link.txt`

## Known Limitations & Future Improvements

1. **Ephemeral résumé storage on Render free tier** — move uploads to Cloudinary/S3 with signed URLs.
2. **JWT cannot be revoked** — logout only clears the cookie; a server-side token blocklist (e.g. Redis) would enable true revocation.
3. Rate limiters are **in-memory** — use a shared store (Redis) when running multiple backend instances.
4. The general/apply rate limits are raised in `NODE_ENV=test` so automated tests are deterministic (login limiter stays strict and is itself tested).
5. Frontend tests are **manual** (checklist in Test_Cases.xlsx); no automated UI tests.

## Screenshots

Genuine captures from the running app are already in [`screenshots/`](screenshots/) — see the README there for what each file shows. [`Project_Report.pdf`](Project_Report.pdf) embeds them in section 16.

---

### Documentation for the viva / report

- [docs/VIVA_NOTES.md](docs/VIVA_NOTES.md) — auth flow, validation, duplicate prevention, upload validation, indexes, library choices
- [docs/report_notes.md](docs/report_notes.md) — architecture, data flow, design decisions, challenges & solutions
