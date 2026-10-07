## Parent
#41

## What to build
Provide a real-time financial portfolio valuation of the collector's PokéBinder. The backend calculates the total monetary worth of all physical cards assigned to binder slots (`card_id IS NOT NULL`) via an indexed SQL aggregate, grouping value by Generation/Region and identifying the top 5 most valuable chase cards owned. The AppHeader features a compact reactive Portfolio Pill (`💼 R$ 2.450,00` / `$480.00`) that updates immediately whenever a card is assigned, swapped, or removed. Clicking the pill opens an interactive Portfolio Modal displaying the full financial portfolio breakdown, regional distribution, and top owned cards.

## Acceptance criteria
- [ ] Backend endpoint `GET /api/collector/portfolio` returns total portfolio value (in BRL and USD), card count, top 5 chase cards, and regional distribution.
- [ ] Repository query calculates value strictly from slots with physical assigned cards (`card_id IS NOT NULL` and `collected = true`); default retro sprites count as R$ 0.
- [ ] Frontend `useCollection` hook reactively updates portfolio worth upon slot mutations (`patchSlot`, `removeSlot`, `batchSync`).
- [ ] Compact Portfolio Pill rendered in AppHeader alongside species progress counter.
- [ ] Interactive PortfolioModal renders total worth, Gen 1–9 distribution bar, top 5 cards owned with artwork previews, and multi-market comparison.
- [ ] Complete i18n parity across `pt.ts` and `en.ts` for all portfolio metrics, empty states, and modal labels.
- [ ] Vitest test suite covers portfolio aggregation query, reactive state update on slot change, and 0-value sprite exclusion.

## Blocked by
- #44
