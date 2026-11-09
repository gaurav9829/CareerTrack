# Deployment Guide (Render backend + Vercel frontend)

## 0. Why this split?

The backend runs on **Render** as a long-running Node service (NOT Vercel serverless):
- multer stores résumés on local disk; serverless platforms have no persistent disk.
- express-rate-limit keeps counters in memory, which needs a single long-lived process.

The frontend runs on **Vercel**. `frontend/vercel.json` rewrites `/api/*` to the Render
URL so the **browser only ever talks to one origin** — the auth cookie stays first-party
(no cross-site cookie problems), and React Router gets a SPA fallback.

## 1. Push to GitHub

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

## 2. Backend on Render

1. Create a **MongoDB Atlas** free cluster → get the connection string
   (`mongodb+srv://<user>:<password>@<cluster>.mongodb.net/careertrack`).
2. Render dashboard → **New → Web Service** → connect the repo.
   - Root directory: `backend`
   - Runtime: Node
   - Build command: `npm install`
   - **Start command:** `node src/server.js`
   - Health check path: `/api/health`
3. Environment variables (Render → Environment):

| Key | Value |
|---|---|
| NODE_ENV | `production` |
| MONGO_URI | your Atlas connection string |
| JWT_SECRET | long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| JWT_EXPIRES_IN | `1d` |
| COOKIE_NAME | `careertrack_token` |
| COOKIE_SAMESITE | `lax` (works because the frontend proxies same-origin) |
| CLIENT_ORIGIN | your Vercel URL, e.g. `https://careertrack.vercel.app` |
| MAX_RESUME_MB | `4` |
| UPLOAD_DIR | `uploads/resumes` |
| ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD | your private admin credentials (never commit these) |

4. After the first deploy, run the seeds once (Render Shell or locally against Atlas):
   ```bash
   # locally, with MONGO_URI pointing at Atlas:
   npm run seed:admin
   npm run seed:jobs
   ```
5. Note: on Render's **free tier the disk is ephemeral** — uploaded résumés disappear on
   redeploy/restart. Documented in README (future fix: S3/Cloudinary).

## 3. Frontend on Vercel

1. Import the repo → **Framework preset: Vite**, **Root directory: `frontend`**.
2. Environment variable: `VITE_API_BASE_URL=/api` (the default; can be skipped).
3. Edit `frontend/vercel.json`: replace `REPLACE-WITH-YOUR-BACKEND` with your real
   Render URL (e.g. `https://careertrack-api.onrender.com`), commit, push. Vercel redeploys.
4. SPA fallback (`/(.*)` → `/index.html`) and the `/api/*` rewrite are already in place.

## 4. Production checklist

- [ ] Backend URL responds: `GET https://<render-url>/api/health` → `{"status":"ok","db":"connected"}`
- [ ] Vercel site loads jobs: `GET https://<vercel-url>/api/jobs` returns JSON (same origin!)
- [ ] Admin login works on the deployed site; cookie flags are `HttpOnly; Secure` (DevTools → Application → Cookies)
- [ ] All admin routes return 401 without login (try `/api/admin/stats` in a private window)
- [ ] Apply works end-to-end with a real PDF; duplicate email gets 409
- [ ] Résumé download works from the admin console
- [ ] Demo admin credentials shared with the evaluator **privately** — never in the repo
