# CareerTrack API Documentation

Base URL: `/api` (backend). All bodies and responses are JSON unless stated otherwise.

Standard response shapes:

```jsonc
// success
{ "success": true, "data": ..., "message": "...", "pagination": { "page": 1, "limit": 9, "total": 42, "totalPages": 5 } }

// error
{ "success": false, "message": "Validation failed", "errors": [ { "field": "email", "message": "Please provide a valid email address." } ] }
```

Auth: admin endpoints require the JWT **httpOnly cookie** set by `POST /api/auth/login` (cookie name configurable via `COOKIE_NAME`, default `careertrack_token`).

Common status codes: `400` validation/invalid id, `401` not authenticated, `404` not found, `409` duplicate/conflict, `413` file too large, `429` rate limited.

---

## Health

### `GET /api/health`
Public. Uptime probe.

```json
{ "success": true, "data": { "status": "ok", "db": "connected" } }
```

---

## Public — Jobs

### `GET /api/jobs`
Public. Lists **active** jobs only (published, deadline empty or in the future). Expired, draft and closed jobs are excluded.

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `q` | string | matches title, company or location (case-insensitive, regex-escaped) |
| `location` | string | case-insensitive match |
| `company` | string | case-insensitive match |
| `type` | enum | `Full-time`, `Part-time`, `Contract`, `Internship`, `Freelance` (invalid values are ignored) |
| `level` | enum | `Fresher`, `Junior`, `Mid`, `Senior`, `Lead` (invalid values ignored) |
| `sort` | enum | `newest` (default), `oldest`, `deadline` (soonest first, no-deadline jobs last), `salary` (highest max first, no-salary jobs last) |
| `page` | int | default 1 |
| `limit` | int | default 9, max 50 |

Example: `GET /api/jobs?q=react&location=Bengaluru&type=Full-time&sort=deadline&page=1`

```json
{
  "success": true,
  "data": [
    {
      "_id": "665f1...", "title": "React Developer", "company": "TechNova Solutions",
      "location": "Bengaluru, Karnataka", "employmentType": "Full-time",
      "experienceLevel": "Junior", "salary": { "min": 450000, "max": 700000, "currency": "INR" },
      "description": "...", "deadline": "2026-11-30T00:00:00.000Z",
      "publishedAt": "2026-11-08T...", "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 9, "total": 8, "totalPages": 1 }
}
```

Public job responses never include `createdBy`, `__v` or applicant data.

### `GET /api/jobs/:id`
Public. One active job (same fields as above).

Errors: `400` invalid id · `404` job missing, draft, closed or expired.

### `POST /api/jobs/:id/apply`
Public. Submit an application. `Content-Type: multipart/form-data`.

Rate limit: 10 requests/hour/IP.

| Field | Type | Rules |
|---|---|---|
| `name` | text | required, 2–120 chars |
| `email` | email | required, normalized to lowercase; must be unique per job |
| `phone` | text | required, 7–15 digits (leading `+`, spaces, dashes allowed) |
| `skills` | text | optional, comma-separated string |
| `coverLetter` | text | optional, ≤ 5000 chars |
| `experienceYears` | int | optional, 0–50 |
| `experienceSummary` | text | optional |
| `education` | text | optional, **JSON-encoded array** of `{ degree, institution, year }` (FormData has no nested objects) |
| `resume` | file | **required**, field name `resume`, PDF or DOCX, max 4 MB (`MAX_RESUME_MB`). Validated by extension, MIME hint and **magic bytes** |

Success — `201`:

```json
{ "success": true, "message": "Application submitted successfully. Good luck!",
  "data": { "id": "665f2...", "jobTitle": "DevOps Associate", "company": "CloudNest Infra" } }
```

Errors: `400` validation / job not accepting applications / expired / invalid file content · `404` job not found · `409` already applied (same job + email) · `413` file too large. Files from failed requests are deleted automatically (no orphaned uploads).

---

## Auth

### `POST /api/auth/login`
Public, rate-limited (10/15 min/IP; returns 429 above that).

```json
// request
{ "email": "admin@example.com", "password": "..." }
// 200
{ "success": true, "data": { "id": "...", "name": "Demo Admin", "email": "admin@example.com", "role": "admin" }, "message": "Logged in successfully." }
```

Errors: `400` invalid payload · `401` `Invalid credentials` (generic for wrong email AND wrong password) · `429` too many attempts. Sets the httpOnly JWT cookie (`HttpOnly`, `SameSite` from env, `Secure` in production).

### `POST /api/auth/logout`
Public. Clears the cookie. Note: the JWT is stateless and remains technically valid until expiry — a documented trade-off (see VIVA_NOTES.md).

### `GET /api/auth/me`
Auth required. Returns the current admin; used by the frontend to restore the session.

Errors: `401` missing/invalid/expired token or deleted admin.

---

## Admin — Jobs (all auth required)

### `GET /api/admin/stats`
```json
{ "success": true, "data": {
  "totalJobs": 12, "activeJobs": 8, "expiredJobs": 1, "draftJobs": 2, "closedJobs": 1,
  "totalApplications": 14,
  "applicationsByStatus": { "Submitted": 6, "Shortlisted": 3, "Selected": 1, ... } } }
```

### `GET /api/admin/jobs`
Lists ALL jobs regardless of status. Query: `q` (title/company/location), `status` (`draft|published|closed`), `sort` (`newest|oldest|title`), `page`, `limit` (max 50). Includes the `createdBy` admin (name/email).

### `POST /api/admin/jobs`
Creates a job (defaults to `draft`). Body:

```jsonc
{
  "title": "...", "company": "...", "location": "...",        // required
  "description": "...",                                       // required
  "employmentType": "Full-time", "experienceLevel": "Mid",    // optional enums
  "salary": { "min": 500000, "max": 900000, "currency": "INR" }, // optional; max >= min enforced
  "responsibilities": ["..."], "qualifications": ["..."], "skills": ["..."], "benefits": ["..."],
  "applicationInstructions": "...",
  "deadline": "2026-12-01",                                   // optional ISO date
  "status": "draft"                                           // optional; "published" sets publishedAt
}
```

`201` with the job. Errors: `400` validation (including salary max < min).

### `GET /api/admin/jobs/:id`
One job + `applicationCount`. Errors: `400` invalid id · `404` not found.

### `PUT /api/admin/jobs/:id`
Full update (send the complete job object; the frontend edit form does). Same validation as create.

### `PATCH /api/admin/jobs/:id/publish` — sets `status=published`, `publishedAt` (if unset).
### `PATCH /api/admin/jobs/:id/unpublish` — back to `draft`, clears `publishedAt`.
### `PATCH /api/admin/jobs/:id/close` — sets `status=closed`.

All return the updated job.

### `DELETE /api/admin/jobs/:id`
**Blocked with `409` when applications exist** — applications reference the job and candidate data must not be orphaned; the API suggests closing the job instead. Design decision documented in docs/report_notes.md.

```json
{ "success": false, "message": "This job has 3 application(s) and cannot be deleted. Close it instead." }
```

---

## Admin — Applications (all auth required)

### `GET /api/admin/applications`
Query: `job` (id), `status` (enum), `from` / `to` (dates, inclusive), `q` (name/email), `page`, `limit`. Sorted newest first. Each row includes the populated job (`title`, `company`, `status`).

### `GET /api/admin/applications/export`
**CSV** (`text/csv`) honoring the same filters. Columns: `Application ID, Job Title, Company, Name, Email, Phone, Experience Years, Skills, Status, Applied Date`. Cells beginning with `= + - @` are prefixed with `'` to prevent CSV formula injection. Must be declared before `GET /:id` (it is).

### `GET /api/admin/applications/:id`
Full application with populated `job` and populated `notes.author` (name/email).

### `PATCH /api/admin/applications/:id/status`
Body `{ "status": "Shortlisted" }` — validated against the enum. `400` for invalid values.

### `POST /api/admin/applications/:id/notes`
Body `{ "text": "..." }` (1–2000 chars). The logged-in admin is stored as the author. Returns the updated application with populated notes.

### `GET /api/admin/applications/:id/resume`
Streams the résumé file (auth required). `Content-Disposition: attachment; filename="<originalName>"`. The on-disk name must match the UUID pattern; tampered names → `404`. Missing file on disk → `404`.

### `DELETE /api/admin/applications/:id`
Deletes the application **and** its résumé file. (Optional endpoint — included.)

---

## Error handling notes

- Invalid ObjectIds → `400` (never a 500 cast error).
- Mongo duplicate-key errors (code 11000) → `409` with a friendly message for the job+email case.
- Multer size errors → `413`; other upload errors → `400`.
- `500` responses hide internals in production (`message: "Internal server error"`).
- NoSQL injection keys (`$ne`, `$gt`, dotted keys) are stripped by express-mongo-sanitize before validation.
