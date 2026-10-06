## Parent
#4

## What to build
Upgrade the card search engine (`tcgdexService.ts`, `tcgRoutes.ts`) and `CardSelectorModal.tsx` to accept `dexId`, strictly scoping searches to the clicked Pokémon species. Enforce exact collector number (`localId`) matching when queries include numbers (e.g., "Mew ex 152" or "129/103"), preserve authentic set totals from TCGdex set metadata, and ensure the Default Sprite Anchor at slot #1 acts as a reliable reset.

## Acceptance criteria
- [ ] `GET /api/tcg/cards/search` accepts optional `dexId` parameter and restricts returned cards to that species.
- [ ] Queries specifying a card number (e.g. `152`, `129/103`) strictly filter to cards matching that `localId` (falling back to name search if 0 exact matches).
- [ ] Set total displayed on cards reflects real official set count rather than overriding with query strings.
- [ ] `CardSelectorModal` passes `pokemon.id` as `dexId` to ensure only matching species cards are displayed.
- [ ] Default Sprite Anchor at slot #1 correctly sets `tcgCard: null` and displays official Pokémon sprite.
- [ ] Search tests in Vitest verify `dexId` scoping and exact `localId` matching for Mew variants.

## Blocked by
- #5
