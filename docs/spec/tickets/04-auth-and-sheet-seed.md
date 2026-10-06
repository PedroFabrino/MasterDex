## Parent
#6

## What to build
Implement Google OAuth token validation in `apps/api` (`authRoutes.ts`). Implement `sheetSeedService.ts` to automatically discover `"Pokemon Collection Tracker"` in the user's Google Drive upon first sign-in, parse sheets `GEN 1` through `GEN 9`, and populate collected Pokémon into `user_pokemon`. Expose `GET /api/collection` and `PATCH /api/collection/:pokemonId`. Refactor the Vue collection store in `apps/web` to synchronize with this backend API instead of making direct client-side Google Sheets calls.

## Acceptance criteria
- [ ] `POST /api/auth/google` verifies Google OAuth credentials and creates/retrieves `collector_profiles`.
- [ ] Automated discovery and parsing of `"Pokemon Collection Tracker"` from Google Drive on first connection.
- [ ] `user_pokemon` records seeded from rows with `COLLECTED == 'TRUE'`.
- [ ] `GET /api/collection` returns user collection with fast database querying.
- [ ] `PATCH /api/collection/:pokemonId` updates collection status without client-side Google API popups.
- [ ] Manual "Re-sync from Google Sheet" option provided in UI settings.

## Blocked by
- #7
