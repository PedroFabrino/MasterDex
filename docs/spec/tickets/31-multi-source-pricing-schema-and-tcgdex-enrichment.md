## Parent
#41

## What to build
Introduce multi-source card market price tracking and foreign currency normalization. The system establishes a normalized `card_prices` relational table and an `exchange_rates` cache (persisting USD/EUR to BRL quotations sourced from AwesomeAPI with fallback to last-known good rate). Card synchronization ingests detailed TCGplayer and Cardmarket quotations from TCGdex using smart variant selection (normal prices for commons, holofoil prices for ultra/secret rares). The Expansion Detail Modal displays native prices alongside BRL conversions (e.g. `TCGplayer: $18.20 / R$ 100,00`).

## Acceptance criteria
- [ ] Drizzle schema introduces `card_prices` table `(id, card_id, provider, native_price, currency, recorded_at)` and `exchange_rates` table `(pair, rate, fetched_at)`.
- [ ] Database migration initializes tables in `local.db` without wiping existing user collections.
- [ ] `exchangeRateService` fetches daily USD/EUR to BRL rates from AwesomeAPI, caches in SQLite, and falls back to last-known rate if offline.
- [ ] `pricingRepository` provides clean query methods to upsert and retrieve prices across providers.
- [ ] Card catalog sync ingests `pricing` from TCGdex with smart rarity variant resolution (normal vs holofoil).
- [ ] Expansion Detail Modal renders TCGplayer (USD) and Cardmarket (EUR) quotes with formatted BRL conversions.
- [ ] Vitest test suite covers multi-source price insertion, exchange rate caching, and currency conversion.

## Blocked by
- None — can start immediately
