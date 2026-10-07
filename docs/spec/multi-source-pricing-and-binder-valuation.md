# Spec: Multi-Source Card Pricing and Binder Portfolio Valuation

## Problem Statement

Pokémon TCG collectors track card values from two distinct secondary markets: local liquidity in Brazilian stores (denominated in BRL via LigaPokémon) and global market capitalization (denominated in USD via TCGplayer and EUR via Cardmarket). Currently:

1. MasterDex only had a legacy on-demand web scraper targeting `cartasdepokemon.com.br`, which suffered from brittle DOM structures and forced users to manually find and paste expansion URLs into a modal.
2. The 220+ expansions and 24,000+ cards indexed from TCGdex had `marketPrice: 0` because TCGdex's card-level `pricing` payload was never ingested during catalog synchronization.
3. Collectors had no way of knowing the cumulative market worth of their physical cards assigned to PokéBinder slots, creating a disconnect between binder tracking and investment valuation.

## Solution

Build a unified, multi-source pricing pipeline and portfolio valuation system:

1. **Multi-Source Pricing Ingestion**: Ingest native market quotations from TCGdex (TCGplayer USD, Cardmarket EUR), TCGCSV, and LigaPokémon (BRL) into a normalized `card_prices` relational table.
2. **Dynamic Currency Normalization**: Fetch and cache daily USD/EUR to BRL exchange rates from AwesomeAPI with SQLite persistence, allowing accurate server-side expansion ranking and multi-currency display (`LigaPokémon: R$ 110 | TCGplayer: R$ 100 ($18)`).
3. **Automated LigaPokémon Integration**: Replace manual URL pasting with an automated 1-click external link (`https://www.ligapokemon.com.br/?view=cards/search&card=ed={CODE}`) and resilient on-demand scraping with a 7-day TTL cache and graceful fallback.
4. **Reactive Binder Portfolio Worth**: Dynamically aggregate the monetary value of physical cards assigned to PokéBinder slots (`card_id IS NOT NULL`), surfacing a reactive header pill and a rich Portfolio Modal breaking down value by generation, region, and top chase cards.

## User Stories

1. As a collector, I want to see both Brazilian store prices (LigaPokémon in BRL) and international market prices (TCGplayer in USD) for any card, so that I can evaluate local liquidity against global market value.
2. As a collector, I want the system to automatically fetch TCGplayer and Cardmarket prices from TCGdex without requiring me to paste URLs, so that card prices and investment scores are immediately available.
3. As a collector, I want smart variant pricing where Common cards use normal market prices and Secret/Ultra Rare cards use holofoil prices, so that chase cards are accurately valued.
4. As a collector, I want to see native prices alongside converted currency values (e.g. `R$ 100 ($18)`), so that I understand foreign card pricing in my local currency.
5. As a collector, I want a 1-click "Ver na LigaPokémon" button on every expansion, so that I can immediately browse and buy physical singles from Brazilian stores.
6. As a collector, I want on-demand LigaPokémon price updates to cache for 7 days, so that repetitive requests are fast and avoid anti-bot rate limits.
7. As a collector, I want the system to gracefully fall back to global TCGplayer pricing if LigaPokémon is temporarily blocked or down, so that set rankings never break.
8. As a collector, I want to configure my Valuation Preference (Brazilian Market vs. Global Market) in Collector Settings, so that leaderboard sorting and composite scores align with my market focus.
9. As a collector, I want to see the total financial value of my physical PokéBinder in the application header, so that I have immediate visibility into my collection's worth.
10. As a collector, I want retro pixel sprites to count as R$ 0 in my portfolio, so that only actual physical cards assigned to slots contribute to financial worth.
11. As a collector, I want my Binder Portfolio Value to update reactively the moment I assign, swap, or remove a card in my binder, so that I don't have to reload the page to see my updated worth.
12. As a collector, I want an interactive Portfolio Modal accessible from the header pill, so that I can explore my collection's value broken down by generation, region, and top 5 most valuable cards.
13. As an international collector, I want every label, currency indicator, provider name, and modal description localized in Portuguese and English without hardcoded strings.

## Implementation Decisions

- **Multi-Source Schema (`card_prices`)**:
  - Normalized table `card_prices (id, card_id, provider, native_price, currency, recorded_at)` indexed by `(card_id, provider)`.
  - Supported providers: `ligapokemon`, `tcgdex_tcgplayer`, `tcgdex_cardmarket`, `tcgcsv`.
- **Exchange Rate Engine (`exchange_rates`)**:
  - Cache daily rates (USD/BRL, EUR/BRL) in an SQLite table `exchange_rates (pair, rate, fetched_at)` sourced from AwesomeAPI, falling back to the last-known good rate on network failures.
- **Automated LigaPokémon Mapping**:
  - Pre-seed standard sets using TCGdex Portuguese names/abbreviations and a static dictionary (`server/data/ligapokemonSets.json`).
  - Store `ligapokemon_code` on the `expansions` table to support in-app overrides for unmapped or new sets.
- **Valuation Preference & Server-Side Scoring**:
  - Add `valuation_preference` (`ligapokemon` | `tcgplayer`) to `collector_profiles` and preferences endpoint.
  - In `investmentService`, calculate Chase Card, Secret Pool Value, and Investment Score using the preferred provider normalized to BRL.
- **Reactive Portfolio Worth Engine**:
  - Compute total binder worth via an indexed SQL query joining `user_pokemon` with `card_prices` where `card_id IS NOT NULL` and `collected = true`.
  - Trigger optimistic and server-confirmed portfolio worth updates in the frontend `useCollection` hook on slot mutations.
- **UI Components & Internationalization**:
  - Add Header Portfolio Pill with compact currency formatting.
  - Create `PortfolioModal` dialog rendering total worth, Gen 1–9 distribution bar, top 5 chase cards, and multi-source provider comparison.
  - Maintain 100% i18n parity across `pt.ts` and `en.ts` for all portfolio and pricing keys.

## Testing Decisions

- **Multi-Source Storage & Conversion**:
  - Unit tests verifying insertion, querying, and variant resolution (normal vs holofoil) in `card_prices`.
  - Unit tests verifying exchange rate fetching, SQLite caching, and fallback on network failure.
- **LigaPokémon Mapping & Scraper**:
  - Unit tests verifying set code resolution from TCGdex metadata and manual overrides.
  - Integration tests verifying on-demand scraping with 7-day TTL cache and graceful fallback on simulated HTTP errors.
- **Portfolio Worth Calculation**:
  - Unit tests proving unassigned sprite slots contribute R$ 0 and assigned cards aggregate accurately.
  - Integration tests verifying portfolio worth reactively updates upon slot assignment and removal.
- **i18n & Seam Compliance**:
  - Verify zero database queries outside repositories and strict type-safe dictionary parity across all new translation keys.

## Out of Scope

- Real-time stock availability tracking in individual Brazilian retail stores.
- Automated bulk scraping of the entire LigaPokémon catalog in a single cron run (to prevent Cloudflare IP blocks).
- Multi-currency portfolio toggling to currencies other than BRL and USD for this initial vertical slice.

## Further Notes

- Governed by ADR 0008 (`docs/adr/0008-multi-source-card-pricing-and-binder-portfolio-valuation.md`).
- Sliced into 4 vertical tracer-bullet tickets published in dependency order.
