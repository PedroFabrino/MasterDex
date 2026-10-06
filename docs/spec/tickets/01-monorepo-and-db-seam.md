## Parent
#6

## What to build
Set up the monorepo workspace structure (`apps/web`, `apps/api`, `packages/shared`). Set up the Hono server in `apps/api` with Drizzle ORM configured with `@libsql/client` (local file `file:local.db`). Define Drizzle schema for `expansions`, `cards`, `price_history`, `collector_profiles`, and `user_pokemon`. Implement `expansionsRepository.ts` obeying the strict repository seam, and expose `GET /api/health`.

## Acceptance criteria
- [ ] Root `package.json` configures workspaces for `apps/*` and `packages/*`.
- [ ] `packages/shared` exports shared TypeScript types (`Pokemon`, `Expansion`, `Card`, `InvestmentMetrics`).
- [ ] `apps/api/src/db/schema.ts` defines all tables with Drizzle ORM.
- [ ] `apps/api/src/repositories/expansionsRepository.ts` handles queries according to the repository seam rule.
- [ ] `GET /api/health` returns `{ status: "ok", db: "connected" }`.
- [ ] Automated tests verify repository CRUD operations.

## Blocked by
- None — can start immediately
