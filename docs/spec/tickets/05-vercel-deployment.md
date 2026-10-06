## Parent
#6

## What to build
Configure root `vercel.json` routing `/api/*` to `apps/api` serverless functions and `/*` to `apps/web` static build. Support production libSQL database connection via Turso environment variables (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`) with local fallback (`file:local.db`). Add Dockerfile for optional containerized deployments. Verify full monorepo build passes without type or lint errors.

## Acceptance criteria
- [ ] `vercel.json` correctly routes API and frontend in a monorepo structure.
- [ ] Database client switches between local `file:local.db` and cloud Turso based on `DATABASE_URL`.
- [ ] Multi-stage `Dockerfile` created for standalone containerized execution.
- [ ] `npm run build` at workspace root passes cleanly for all packages.
- [ ] End-to-end deployment verification instructions documented.

## Blocked by
- #9
- #10
