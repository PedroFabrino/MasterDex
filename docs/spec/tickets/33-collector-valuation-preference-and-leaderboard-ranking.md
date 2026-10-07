## Parent
#41

## What to build
Introduce collector-configurable Valuation Preference and multi-source server-side leaderboard ranking. Collectors can choose between "Brazilian Market (LigaPokémon)" and "Global Market (TCGplayer)" in Collector Settings and the Investor Filter Bar. In `investmentService`, expansions are ranked and scored (Investment Score, Top Chase Card, Secret Pool Value) using the preferred provider normalized to BRL via the daily exchange rate cache. Expansion cards render the Canonical price badge with a comparison popover displaying all captured provider quotations.

## Acceptance criteria
- [ ] Schema adds `valuation_preference` (`ligapokemon` | `tcgplayer`) to `collector_profiles` table defaulting to `ligapokemon`.
- [ ] Collector preferences API (`GET` and `PATCH /api/collector/preferences`) supports reading and updating `valuationPreference`.
- [ ] `investmentService` resolves the Canonical Market Price based on user preference, normalizing foreign currencies using the exchange rate cache.
- [ ] Expansion leaderboard sorts accurately by Chase Card and Secret Pool value with mixed multi-currency cards.
- [ ] Valuation preference selector added to InvestorFilterBar and CollectorSettingsPage.
- [ ] Card tiles render Canonical price badge; clicking/hovering reveals comparison popover with LigaPokémon, TCGdex, and TCGCSV quotes.
- [ ] Strict i18n parity across `pt.ts` and `en.ts` for all valuation preference labels and tooltips.
- [ ] Vitest test suite verifies ranking with mixed sources, preference persistence, and canonical resolution.

## Blocked by
- #43
