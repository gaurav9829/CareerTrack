# VIVA Notes — short explanations of how things work

Say-it-in-30-seconds answers, each pointing at the real code.

## 1. Auth flow

- **Login** (`controllers/authController.js`): find admin by email **including** `passwordHash` (`select: false` — hidden by default), `bcrypt.compare`, on success sign a JWT (`jsonwebtoken`) containing `{ id }` and set it as an **httpOnly cookie**. Wrong email and wrong password both return the same generic `401 Invalid credentials` — an attacker learns nothing.
- **Every request**: the `protect` middleware (`middleware/auth.js`) reads the cookie, verifies the JWT, loads the admin into `req.admin`. Failure → 401.
- **Frontend**: `AuthContext` calls `/auth/me` on page load to restore the session; `ProtectedRoute` renders admin pages only when an admin exists, otherwise redirects to `/admin/login`. An axios response interceptor clears auth on any 401 (expired session).
- **Why httpOnly cookie?** JavaScript cannot read it, so an XSS bug cannot steal the token. `Secure` is enabled in production.
- **Trade-off to mention:** logout clears the cookie but the JWT stays valid until expiry (stateless). True revocation would need a server-side blocklist (Redis).

## 2. Validation (two layers)

- **Server (authoritative)**: `express-validator` chains per endpoint, executed by a shared `validate()` middleware (`middleware/validate.js`) that converts any failure into `400 { success:false, message, errors:[{field,message}] }`. ObjectIds are checked with `isMongoId()` (a bad id is a 400, never a 500 cast error). Mongoose schema validators back this up (required fields, enums, salary min ≤ max).
- **Client (UX only)**: the apply form and job form check the same rules before submitting (`pages/public/ApplyForm.jsx`), so users get instant feedback — but the server never trusts the client.
- Constants/enums live in ONE file (`config/constants.js`) — no magic strings anywhere.

## 3. Duplicate prevention (two lines of defence)

1. **Pre-check**: `Application.findOne({ job, email })` → friendly 409 "You have already applied…" (`controllers/jobController.js`).
2. **Database**: unique compound index `{ job: 1, email: 1 }` (`models/Application.js`). Even under a race (two requests at once), Mongo rejects the second insert with error code 11000, which the central error handler maps to a 409.

## 4. Upload validation (three layers + cleanup)

1. **Extension whitelist** in multer's `fileFilter` (`.pdf`/`.docx` only).
2. **MIME type** as a hint (browsers can lie).
3. **Magic bytes** after the file is on disk (`utils/fileSignature.js`): a PDF must start `%PDF`, a DOCX must start `PK\x03\x04` (ZIP header). A renamed `.exe → .pdf` fails here — covered by test TC-A07.
- **Filename**: `crypto.randomUUID() + ext` — the visitor's filename never touches disk (path traversal impossible).
- **Storage**: `backend/uploads/resumes/` (gitignored, NOT under any static folder).
- **Cleanup**: a router-level error guard deletes the saved file if ANY later step fails (validation, duplicate, magic bytes) — no orphaned files.
- **Serving**: only via `GET /admin/applications/:id/resume` behind `protect`; the UUID name is re-verified before `res.download`.

## 5. Indexes (why each exists)

- `applications { job:1, email:1 } unique` — duplicate prevention (above).
- `applications { status:1, createdAt:-1 }` — the admin list filters by status and sorts newest first; this one index serves both.
- `jobs { status:1, deadline:1 }` — the active-job filter (`status='published' AND deadline>=now`) used on every public query and stats.
- `jobs { createdAt:-1 }` — newest-first lists.
- `jobs text index (title, company, location)` — created per the design; current search uses case-insensitive **regex with escaped input** instead (note the trade-off if asked).

## 6. Protected routes

- `router.use(protect)` at the top of both admin routers (`adminJobRoutes.js`, `adminApplicationRoutes.js`) — no admin endpoint can be added later without protection.
- `GET /admin/applications/:id/resume` is inside that protected router — résumé files are unreachable without the cookie. Test TC-Z01..16 loops over **all 16 admin routes** asserting 401 without a cookie.
- Route order matters: `/admin/applications/export` is declared BEFORE `/:id` so "export" is never parsed as an id.

## 7. Why each library

| Library | Why |
|---|---|
| Express | minimal HTTP framework; middleware model is easy to explain |
| Mongoose | schema validation + indexes for MongoDB |
| jsonwebtoken | stateless auth suitable for a cookie-based SPA |
| bcryptjs | password hashing with salt (pure JS — no native build issues on Windows) |
| express-validator | declarative per-route validation with consistent error shape |
| helmet | sane security headers in one line |
| cors | explicit origin whitelist with credentials |
| express-rate-limit | brute-force protection (login) and flood control (apply) |
| express-mongo-sanitize | strips `$`/`.` keys (NoSQL injection); pairs with a body-normalizer (see report_notes) |
| multer | standard multipart handling with disk storage + limits |
| json2csv | CSV export (v5 works with CommonJS) |
| Jest + Supertest + mongodb-memory-server | fast, isolated backend tests with a real MongoDB engine, no Atlas needed |
| React Router | SPA routing with URL-search-params state |
| axios | `withCredentials` cookie handling + upload progress events |
| Tailwind CSS | consistent design tokens (primary palette, spacing, radius) |

## 8. Things to demo first

1. Public list → search "nova", filter Internship, sort by deadline, page through.
2. Open a job → apply with a PDF → success page; apply again same email → friendly 409.
3. Try uploading `notes.txt` or a renamed .exe → inline rejection.
4. Admin login → dashboard stats → publish a draft → it appears publicly.
5. Review the application: download résumé, change status, add a note, export CSV (open in Excel — see the `'`-prefixed `=` cells).
