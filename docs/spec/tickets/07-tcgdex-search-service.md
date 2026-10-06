## Parent
#12

## What to build
Build a TCGdex card search integration and smart query parser that resolves queries such as `"Mew ex 129/103"` into structured card results with high-resolution image scans, set metadata, and collector numbers, exposed via `GET /api/tcg/cards/search`.

## Acceptance criteria
- [ ] `packages/shared/src/index.ts` exports `TcgCardSearchResult`.
- [ ] `apps/api/src/services/tcgdexService.ts` implements smart query parser separating card names from set numbers (e.g. `129/103` or `129`).
- [ ] `tcgdexService` fetches and normalizes card scans from `https://api.tcgdex.net/v2/en/cards` with fallback sorting.
- [ ] In-memory query caching prevents redundant external HTTP requests for repeat searches.
- [ ] `GET /api/tcg/cards/search?q=...` route mounted with query validation and structured response.
- [ ] Hard stop line limits respected (service <= 400 lines, routes <= 400 lines).
- [ ] Unit test suite in `apps/api/tests/tcgdexService.test.ts` covers parsing regex, error handling, mock response formatting, and route responses.

## Blocked by
- #13
