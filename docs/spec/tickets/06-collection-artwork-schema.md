## Parent
#12

## What to build
Extend the `user_pokemon` database schema, repository seam, and collection API to store and retrieve assigned TCG card artworks (`card_id`, `card_name`, `card_image_url`) alongside collection status, allowing collectors to save their specific physical card scans.

## Acceptance criteria
- [ ] `packages/shared/src/index.ts` exports updated `UserPokemon` with optional `cardId`, `cardName`, `cardImageUrl`.
- [ ] `apps/api/src/db/schema.ts` adds `cardId`, `cardName`, `cardImageUrl` text columns to `user_pokemon`.
- [ ] `apps/api/src/db/index.ts` defensively adds new columns via `ensureDatabaseTables()` migrations.
- [ ] `collectorRepository.setUserPokemon` updated to accept and persist card artwork fields or clear them.
- [ ] `PATCH /api/collection/:pokemonId` accepts `{ collected?: boolean, cardId?: string | null, cardName?: string | null, cardImageUrl?: string | null }` and returns the updated record.
- [ ] Repository seam respected (no raw SQL/queries outside `collectorRepository.ts`).
- [ ] Unit test suite in `apps/api/tests/collectorArtwork.test.ts` passes with 100% coverage of setting, updating, and clearing card artwork.

## Blocked by
None — can start immediately
