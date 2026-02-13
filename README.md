# Security Scan Standalone Site

Next.js app for creating scan reports and shareable poster pages.

## Run Local

```bash
npm install
npm run dev
```

Open `http://localhost:3001/scan` (or the port shown by `next dev`).

## Test Matrix

```bash
npm test
npm run build
```

Prompt-injection evaluation (Promptfoo harness):

```bash
npm run test:promptfoo
npm run test:promptfoo:online:connect
npm run test:promptfoo:online:quick
npm run test:promptfoo:online
```

## Prompt Injection Runtime vs Evaluation

1. Runtime detector path:
   - `lib/scan/external-pi-detectors/promptfoo-detector.ts`
   - calls Z.AI OpenAI-compatible `chat/completions` directly
2. Evaluation harness:
   - `tests/promptfoo/*.yaml`
   - executed by `npm run test:promptfoo:*`

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
 - Prompt-injection runtime detector uses `ZAI_API_KEY`, `ZAI_API_BASE_URL`, and optional `ZAI_PI_MODEL` (default `glm-4.5`).
 - Recommended Z.AI coding endpoint: `https://api.z.ai/api/coding/paas/v4`.
