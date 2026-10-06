# ADR 0004: TCG Investor Expansion Catalog and Server-Side Collection Gap Yield

## Status
Accepted

## Context
Collectors seeking to expand or upgrade their Pokémon collection need a data-driven way to evaluate which official expansions give them the highest probability of acquiring cards they still need. 

In traditional TCG investment tools, expansions are ranked purely by secondary market capitalization or chase card ceiling prices without consideration of the collector's actual binder progress. Conversely, binder trackers rarely suggest which physical expansion packs or singles to prioritize.

Furthermore, querying card lists across all 220+ official expansions from external APIs directly within client devices would cause excessive bandwidth consumption, device battery drain, and external rate limiting.

## Decision
1. **Server-Side Collection Gap Yield Computation**:
   - All collection gap calculations, sorting, and ranking are strictly executed on the backend API (`server/services/investmentService.ts` and `server/repositories/expansionsRepository.ts`), never in the frontend.
   - The backend cross-references the official Expansion Catalog (indexed from TCGdex) against the user's collection in SQLite/libSQL.
   - The frontend receives pre-calculated, ready-to-render expansion rows with sub-second response times.

2. **Rarity-Tiered Gap Semantics**:
   - The default **Target Rarity Filter** is set to `Any Rarity / All Cards`. Under this mode, any collected Pokémon species in the binder satisfies the slot; uncollected species represent gaps.
   - When a collector configures a higher target rarity threshold (e.g., `Illustration Rare+` or `Secret Rare / SA+`), a card in an expansion counts toward the **Collection Gap Yield** if the collector does not yet own a card of equal or greater rarity assigned to that Pokémon's Binder Slot.
   - For example, if a collector owns a standard sprite or normal card for Charizard (#006), and sets their target rarity to `Illustration Rare+`, a Special Illustration Rare Charizard ex in an expansion will be counted as a new card gap.

3. **Hybrid Leaderboard: Yield + Financial Valuation**:
   - The Expansion Catalog displays all 220+ official sets ordered by default according to **Collection Gap Yield** (greatest number of missing cards for the user's configured rarity).
   - For expansions with scraped secondary market data (from LigaPokémon / MyPCards), the leaderboard simultaneously displays **Investment Score**, **Top Chase Card (R$)**, and **Secret Pool Value (R$)**.
   - An in-app scraper trigger allows on-demand price enrichment for unscraped expansions.

## Consequences
- **Positive**: Direct synergy between binder tracking and purchasing decisions. Collectors immediately see which expansions deliver the highest yield of cards they actually want.
- **Positive**: Low device footprint and optimal mobile performance by isolating all relational cross-referencing and sorting to the backend API seam.
- **Positive**: Future-proof against new set releases via scheduled TCGdex catalog sync.
