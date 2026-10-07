# ADR 0008: Multi-Source Card Pricing and Binder Portfolio Valuation

## Status
Accepted

## Context
Pokémon TCG collectors track cards from multiple perspectives: local liquidity in Brazilian stores (LigaPokémon denominated in BRL) and global secondary market valuations (TCGplayer denominated in USD, Cardmarket in EUR). 

Previously:
1. Expansion pricing was dependent solely on an on-demand HTML web scraper targeting `cartasdepokemon.com.br`, which suffered from brittle DOM parsing, anti-bot Cloudflare challenges, and manual URL input prompts in the UI.
2. The card catalog indexed via TCGdex contained 24,000+ cards with `marketPrice` hardcoded to 0 because TCGdex's detailed `pricing` object was never captured during catalog sync.
3. Collectors had no way of knowing the cumulative market worth of their physical cards assigned to PokéBinder slots.

## Decision
1. **Multi-Source Normalized Storage (`card_prices`)**:
   - Establish a dedicated relational table `card_prices` indexed by `(card_id, provider)` storing `native_price`, `currency`, and `recorded_at`.
   - Support multiple **Pricing Providers**: `ligapokemon` (BRL), `tcgdex_tcgplayer` (USD), `tcgdex_cardmarket` (EUR), and `tcgcsv` (USD).
   - Resolve card variant pricing via **Smart Rarity Selection**: Commons/Uncommons use `normal.marketPrice`; Holo Rares, Ultra Rares, and Secret Rares use `holofoil.marketPrice`.

2. **Server-Side Valuation Preference & Daily Exchange Rate Normalization**:
   - Collectors configure their **Valuation Preference** (Default: Brazilian Market / LigaPokémon; fallback: Global Market / TCGplayer via TCGdex/TCGCSV).
   - The backend maintains an SQLite-persisted daily exchange rate cache (sourced from AwesomeAPI with fallback to last-known good rate) to standardize values into BRL for server-side expansion ranking, chase card identification, and portfolio sums.
   - The frontend displays both the canonical local currency and the native capture currency (e.g., `LigaPokémon: R$ 110 | TCGdex: R$ 100 ($18)`).

3. **Automated LigaPokémon 1-Click Link and On-Demand Ingestion**:
   - Map standard sets using official Portuguese abbreviations and names from TCGdex paired with a curated mapping file (`server/data/ligapokemonSets.json`) and an in-app code override.
   - Expose a 1-click external link (`https://www.ligapokemon.com.br/?view=cards/search&card=ed={CODE}`) on all expansion views.
   - On-demand LigaPokémon scraping caches responses with a 7-day TTL and degrades gracefully to global TCGplayer pricing if LigaPokémon triggers Cloudflare anti-bot checks.

4. **Reactive Binder Portfolio Valuation**:
   - Only physical cards assigned to PokéBinder slots with `card_id != null` contribute to the **Binder Portfolio Value** (default retro sprites count as R$ 0).
   - Portfolio worth is dynamically aggregated via indexed SQL query and updates reactively on the client whenever a card is assigned, swapped, or removed.
   - The UI surfaces a compact Portfolio Pill in the application header alongside a comprehensive **Portfolio Modal** breaking down value by generation/region, top valuable cards, and multi-market comparison.

## Considered Options
- **Pure Client-Side Currency Conversion**: Rejected because server-side expansion leaderboard sorting (by Chase Card R$, Secret Pool Value R$) and Investment Score calculations require normalized server-side numbers.
- **Valuing Unassigned Sprite Slots**: Rejected because pixel sprites do not represent physical owned collectibles; valuing them would distort portfolio accuracy.
- **High-Frequency Scheduled Batch Scraping of LigaPokémon**: Rejected to prevent Cloudflare IP blocking and maintain zero-friction reliability.
