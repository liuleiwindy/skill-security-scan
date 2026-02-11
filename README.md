# Security Scan Standalone Site

Next.js app for creating scan reports and shareable poster pages.

## Run Local

```bash
npm install
npm run dev
```

Open `http://localhost:3001/scan` (or the port shown by `next dev`).

## Storage Mode

- Production (recommended): uses Postgres when `POSTGRES_URL` or `DATABASE_URL` is set.
- Local fallback: writes reports to `data/reports/*.json` when no Postgres URL is set.

## Deploy To Vercel

1. Push this folder as a GitHub repo (or set Vercel root directory to `security-scan-site` in a monorepo).
2. In Vercel, create a new project from that repo.
3. Add a Postgres integration and set env vars:
   - `POSTGRES_URL` (or `DATABASE_URL`)
4. Deploy.

After deploy, verify:
- `POST /api/scan` returns `{ scanId, status }`
- `GET /scan/report/:id` loads after refresh
- `GET /scan/poster/:id` loads after refresh

## Notes

- `@vercel/postgres` is currently deprecated in favor of Neon SDKs. This project still supports it for compatibility, and can be migrated later without changing API contracts.
