## Parent
#4

## What to build
Deliver end-to-end collection persistence: wire frontend collection state to synchronize bidirectionally with `/api/collection`, build an in-app Import/Backup dialog (`ImportBackupModal.tsx`) with Google Sheets auto-ingest (`GEN 1`–`GEN 9` tabs) and JSON/CSV backup and restore, and create the developer CLI script `server/scripts/seedCollector.ts` (`npm run seed:collector`) populating user profile `pedro` in `local.db`.

## Acceptance criteria
- [ ] Collection updates write optimistically to `localStorage` and synchronize with `PATCH /api/collection`.
- [ ] In-app Import/Backup modal provides a Google Sheets tab that parses `GEN 1` through `GEN 9` tabs via `sheetSeedService`.
- [ ] In-app Import/Backup modal provides JSON and CSV export and file upload restore.
- [ ] `npm run seed:collector` CLI script populates profile `pedro` in SQLite/libSQL (`local.db`) with collection status.
- [ ] Unit/integration tests verify sheet row parsing and collection upsert logic.
- [ ] Production build and test suite pass without regressions (`npm run test`, `npm run build`).

## Blocked by
- #5
- #6
