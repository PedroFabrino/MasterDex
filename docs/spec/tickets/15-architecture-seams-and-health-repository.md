## Parent
#18

## What to build
Enforce strict backend architectural seams and isolate server data assets:
- Encapsulate database ping and connectivity check inside `collectorRepository.pingDatabase()`, removing the direct `rawClient.execute('SELECT 1;')` call in `server/routes/healthRoutes.ts` to uphold the repository seam directive.
- Decouple cross-repository business orchestration (calling `collectorRepository` and `investmentService` inside `ExpansionsRepository.getExpansionsWithYield`) by moving orchestration into domain services.
- Relocate heavy server datasets (such as `tcgdexSetCards.json`) from the frontend `src/data/` directory to a server-side data directory to prevent relative path breakage in bundled serverless environments.

## Acceptance criteria
- [ ] `server/routes/healthRoutes.ts` imports no database client directly and queries the database strictly via `collectorRepository.pingDatabase()`.
- [ ] No files outside `server/repositories/` and `server/db/` import `rawClient` or `db`.
- [ ] `ExpansionsRepository` operates purely on data access without orchestrating calls across other repositories.
- [ ] Server data loading uses reliable paths that do not couple into frontend `src/` folders.
- [ ] All database health, repository, and expansion test suites pass 100% green.

## Blocked by
- None — can start immediately
