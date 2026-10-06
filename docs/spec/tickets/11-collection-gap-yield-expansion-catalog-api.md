## Parent
#4

## What to build
Extend the backend API and repositories (`expansionsRepository`, `investmentService`, `tcgRoutes`) to index the full 220+ TCGdex Expansion Catalog via `GET /api/tcg/expansions`. Compute the user's Collection Gap Yield (missing cards matching or exceeding the Target Rarity Filter) entirely server-side with sub-second response times, and provide full Vitest unit and integration test coverage.

## Acceptance criteria
- [ ] Backend indexes all 220+ official expansions from TCGdex and stores set metadata in `local.db`.
- [ ] `GET /api/tcg/expansions` supports query parameters `rarity` (any, holo, ultra, illustration, secret), `sort` (gap_yield, score, chase, pool), and optional `userId`.
- [ ] Collection Gap Yield algorithm correctly calculates how many cards in an expansion at or above target rarity represent Pokémon species for which the user does not currently own a card of >= target rarity.
- [ ] Sorting and array computations are handled entirely on the backend API without heavy frontend calculation.
- [ ] Unit and integration tests verify yield calculations across different collection states and rarity tiers.
- [ ] Tests pass via `npm run test`.

## Blocked by
- None — can start immediately
