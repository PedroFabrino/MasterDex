## Problem Statement

Pokémon collectors tracking a Master National Dex face a disjointed experience between tracking species completion and making informed physical card purchasing decisions. Generic Pokédex apps lack physical binder layout fidelity and do not support assigning specific physical card scans (e.g. Secret Rares, Illustration Rares, or alternate art variants) to binder slots. 

Meanwhile, existing TCG investment tools analyze expansions in a vacuum based strictly on market price ceilings and secondary market capitalization, with zero awareness of the collector's actual binder progress. Collectors have no automated way to determine which official Pokémon TCG expansions yield the highest number of missing cards or high-rarity upgrades for their specific collection. Furthermore, collectors risk losing their tracking data when limited solely to browser local storage, and lack seamless import pathways from existing Google Sheets or local backups.

## Solution

Unify the 4x4 National Dex physical binder experience and the TCG Investor expansion advisor into a coherent, high-performance web application (`MasterDex`). 

The application offers two synchronized modes accessible via a persistent header switcher:
1. **PokéBinder**: A full 1025-species National Dex tracker organized into authentic 16-card (4x4) binder pages across all 9 generations. Every slot features a standard card aspect ratio, slot-aware TCG card search scoped by species and collector number, the official pixel sprite as the default anchor, and local-first persistence synced to a durable backend.
2. **TCG Investor**: An expansion advisor powered by the full official Expansion Catalog (220+ sets indexed from TCGdex). It introduces a server-computed **Collection Gap Yield** that ranks expansions by how many cards matching or exceeding a collector's target rarity filter would be new additions or upgrades to their binder. Scraped secondary market data in Brazilian Real (BRL / R$) from LigaPokémon enriches the leaderboard with Top Chase Cards, Secret Pool Values, and composite Investment Scores.

A comprehensive collection management system provides an in-app Import/Backup dialog (supporting Google Sheets and JSON/CSV files) and developer database seeding scripts.

## User Stories

1. As a collector, I want to switch between the PokéBinder view and the TCG Investor dashboard via a persistent header navigation bar, so that I can seamlessly alternate between tracking my binder and evaluating expansions.
2. As a collector, I want to browse all 1025 Pokémon species across all 9 generations in 16-card (4x4) binder pages, so that the digital tracker accurately mirrors my physical card binder sleeves.
3. As a collector, I want all 1025 Pokémon names, numbers, and official game sprites to render instantly without network latency or external API rate limits, so that pagination across all 65 pages is smooth and responsive.
4. As a developer, I want a periodic check script and API endpoint that checks PokeAPI for newly introduced species or forms, so that the bundled dataset can be updated as new generations and DLC release.
5. As a collector, I want to click any uncollected Pokémon slot to mark it as collected, so that I can rapidly log my physical cards.
6. As a collector, I want clicking any Pokémon slot to open the Card Artwork Selector pre-filled with the Pokémon's name and scoped to its official Pokédex ID (`dexId`), so that search results never include unrelated Pokémon.
7. As a collector, I want to search for cards using specific collector numbers and set totals (e.g. "Mew ex 152" or "129/103"), so that the card search engine strictly filters to that exact card.
8. As a collector, I want the first slot in the Card Artwork Selector to always be the official Pokémon game sprite ("Default Sprite Anchor"), so that I can easily retain or reset back to the classic sprite view.
9. As a collector, I want to assign high-resolution physical TCG card artwork to any owned slot, so that my digital binder showcases the exact card variants (such as Illustration Rares and Secret Rares) that I own.
10. As a collector, I want to remove a Pokémon from my collection using an explicit "Remover da Coleção" button inside the modal, so that I can easily correct mistaken entries.
11. As a new visitor, I want the tracker to initialize with a clean, empty binder, so that I can build my collection from scratch without having to manually uncheck mock cards.
12. As a collector, I want my collection changes to save immediately to `localStorage`, so that I have zero latency and full offline functionality even without logging in.
13. As an authenticated collector, I want my collection and assigned card artwork to synchronize bidirectionally with the backend database, so that my collection is securely backed up across devices.
14. As a collector, I want to open the TCG Investor dashboard to view the complete catalog of all official Pokémon TCG expansions (220+ sets), so that I have comprehensive coverage of the entire history of the card game.
15. As a collector, I want the TCG Investor leaderboard to default-rank expansions by **Collection Gap Yield**, so that I immediately see which expansions offer the highest number of cards I still need to complete my collection.
16. As a collector, I want to configure my **Target Rarity Filter** (with choices: Any Rarity / All Cards, Holo Rare+, Ultra Rare+, Illustration Rare & SIR, Secret Rare / SA+), so that I can evaluate expansions based on my personal collecting goals.
17. As a collector with Charizard collected as a basic sprite or normal card, when I set my Target Rarity to "Illustration Rare+", I want Charizard cards of Illustration Rare or Secret Rare tiers in expansions to still be counted as "new" gaps, so that I can see upgrade opportunities for my binder.
18. As a collector, I want all Collection Gap Yield calculations and set rankings to be computed on the server API, so that my mobile browser does not experience heavy computations, lag, or battery drain.
19. As a collector, I want to inspect any expansion to view its secret rare cards, chase cards, and secondary market prices in Brazilian Real (BRL / R$), so that I understand both its aesthetic appeal and financial value.
20. As a collector, I want a single-click "Analisar Mercado" scraper action for expansions lacking secondary market data, so that I can trigger real-time pricing ingestion from LigaPokémon / MyPCards.
21. As a collector, I want to filter and search the expansion catalog by set name or series, so that I can quickly inspect specific eras (e.g., Scarlet & Violet, Sword & Shield).
22. As a collector, I want to toggle expansions into a "Tracked / Watchlist" group, so that I can monitor my favorite expansions over time.
23. As a collector, I want an in-app Import / Backup modal where I can import my collection from a Google Sheets spreadsheet (`GEN 1` through `GEN 9` tabs), so that my historical tracking data is effortlessly migrated.
24. As a collector, I want to export and import my collection as a JSON or CSV backup file, so that I have full data portability and can restore my progress at any time.
25. As a developer, I want a CLI seed script (`npm run seed:collector`) to populate the local database with my specific user collection profile in a single command, so that development and local testing reflect real user data.

## Implementation Decisions

### 1. Unified Navigation & State Management
- Add a top-level mode switcher in the global header between `PokéBinder` and `TCG Investor`.
- Preserve the collapsible sidebar for Region/Page navigation when in `PokéBinder` mode.
- Maintain an active mode state with optional URL query/hash synchronization (`#binder` vs `#investor`).

### 2. National Pokédex Data Layer
- Package all 1025 official Pokémon species into a static bundled JSON dataset (`src/data/pokedex.json`) including `id`, `name`, and standard sprite URLs.
- Define 9 regions spanning 65 total binder pages (16 cards per page):
  - Kanto (#001–#151, Pages 1–10)
  - Johto (#152–#251, Pages 11–16)
  - Hoenn (#252–#386, Pages 16–25)
  - Sinnoh (#387–#493, Pages 25–31)
  - Unova (#494–#649, Pages 31–41)
  - Kalos (#650–#721, Pages 41–46)
  - Alola (#722–#809, Pages 46–51)
  - Galar (#810–#905, Pages 51–57)
  - Paldea (#906–#1025, Pages 57–65)
- Provide CLI utility `npm run sync:pokedex` and backend endpoint `GET /api/pokedex/sync-check` to poll PokeAPI species count and alert/sync if count exceeds 1025.

### 3. TCGdex Card Search & Query Refinement
- Update `CardSelectorModal` to send `dexId={pokemon.id}` when opened from a binder slot.
- Refactor `tcgdexService.searchCards` to apply an exact filter on `localId` when parsed from queries (e.g. `129` or `152`), falling back to name search only if zero exact matches are returned.
- Stop overriding `set.total` with query parameters; use authentic set counts from TCGdex set metadata.

### 4. Expansion Catalog & Collection Gap Yield Engine (Backend API Seam)
- Store all 220+ official TCG expansions and their card indices in SQLite/libSQL (`expansions` and `cards` tables) via `expansionsRepository`.
- Implement `GET /api/tcg/expansions`:
  - Query parameters: `rarity` (any, holo, ultra, illustration, secret), `sort` (gap_yield, investment_score, chase_price, pool_value), `userId` (optional).
  - For each expansion, cross-reference its card list against the user's collection in `user_pokemon`.
  - Calculate `collectionGapYield`: Count of cards in the set with rarity >= target rarity for which the user's collected Pokémon slot does not already possess a card of rarity >= target rarity.
  - Return sorted expansion rows enriched with yield metrics and scraped financial metrics.
- Keep all sorting and heavy array calculations inside backend services (`investmentService`, `expansionsRepository`), never on the frontend client.

### 5. TCG Investor Frontend Interface
- Create `src/components/investor/TcgInvestorDashboard.tsx`:
  - Filter bar: Search input, Target Rarity dropdown (default: Any Rarity), Sort By selector, Watchlist toggle.
  - Leaderboard Grid / Table: Expansion card components displaying Expansion name, series, logo/symbol, Collection Gap Yield badge, Investment Score badge, Top Chase Card (R$), and Total Secret Pool (R$).
  - Quick action: "Analisar Mercado" to trigger scraping for unscraped sets.
  - Detail Drawer / Modal (`ExpansionDetailModal.tsx`): Displays expansion summary, breakdown of all secret rares with scans, rarity tags, and BRL market prices.

### 6. Persistence, Import & User Seed
- Purge hardcoded starter collected Pokémon from `App.tsx`; start with `{}` as default state.
- Create `src/components/ImportBackupModal.tsx`:
  - Google Sheets tab: Invokes `sheetSeedService.autoSeedFromGoogleDrive` or accepts Google Sheet ID to ingest `GEN 1`–`GEN 9` rows.
  - File Backup tab: Import & Export `.json` or `.csv` files.
- Create developer script `server/scripts/seedCollector.ts` (`npm run seed:collector`) to seed profile `pedro` with collection data into `local.db`.
- Support optimistic `localStorage` updates with debounced `PATCH /api/collection` sync when a profile is active.

### 7. Architectural Guardrails (`AGENTS.md`)
- Enforce line count boundaries: API routes <= 400 lines, services <= 400 lines, React views/components <= 400 lines, hooks/composables <= 300 lines, tests <= 500 lines.
- Enforce Repository Seam: Repositories are the sole location for database/ORM operations.
- Run `graphify update .` upon completion of code modifications.

## Testing Decisions

- **Test Behavior, Not Implementation**: Tests will verify end-to-end API response shapes, status codes, query parser correctness, and mathematical calculations rather than internal private state.
- **Backend Test Suite (Vitest)**:
  - Unit tests for `tcgdexService`: query parsing (`129/103`, `Mew ex 152`), `dexId` filtering, localId matching, and sets cache.
  - Unit tests for `investmentService`: collection gap yield computation against simulated user collections across all rarity tiers.
  - Integration tests for `/api/tcg/expansions` and `/api/tcg/cards/search` with simulated database queries.
  - Integration tests for collection import and seed services.
- **Frontend Verification**:
  - Component rendering tests for `TcgInvestorDashboard`, `CardSelectorModal`, and `CardSlot`.
  - Typecheck (`tsc --noEmit`) and production build verification (`npm run build`).

## Out of Scope

- Native mobile app wrappers (iOS/Android).
- Automated live scraping cron bots on third-party marketplace websites without user request.
- Integration with external grading company APIs (PSA, BGS, CGC).
- Multi-currency conversion engines (pricing remains in Brazilian Real BRL / R$).

## Further Notes

- Respects [ADR 0001](file:///c:/Users/pfabr/Documents/Git/MasterDex/docs/adr/0001-revamp-to-monorepo-spa-and-backend.md), [ADR 0002](file:///c:/Users/pfabr/Documents/Git/MasterDex/docs/adr/0002-libsql-and-hono-for-vercel-serverless.md), [ADR 0003](file:///c:/Users/pfabr/Documents/Git/MasterDex/docs/adr/0003-binder-slot-card-artwork-and-tcgdex-integration.md), and [ADR 0004](file:///c:/Users/pfabr/Documents/Git/MasterDex/docs/adr/0004-tcg-investor-collection-gap-yield-and-api-seam.md).
- Uses domain vocabulary defined in [CONTEXT.md](file:///c:/Users/pfabr/Documents/Git/MasterDex/CONTEXT.md).
