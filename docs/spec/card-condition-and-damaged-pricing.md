# Spec: Card Condition and Damaged Pricing Integration

## Problem Statement

TCG collectors often own cards in varying physical conditions—from pristine Near Mint copies to heavily played and Damaged (D) cards. Card condition has an immense impact on secondary market pricing; for example, a Base Set Charizard in Damaged condition trades for a fraction of its Near Mint counterpart.

Currently, MasterDex suffers from three significant limitations:
1. All assigned cards in PokéBinder slots are assumed to be Near Mint (NM), with no data model or interface for collectors to specify card condition.
2. Global card catalog APIs (TCGdex) and LigaPokémon set search only report Near Mint baseline market prices, lacking condition breakdowns.
3. The Portfolio Worth engine computes binder value by treating all assigned cards as Near Mint, artificially overinflating collection value for collectors who own Damaged, Heavily Played, or Moderately Played cards.

## Solution

Integrate card condition across the full application stack with authentic market-aware valuation:
1. **Standardized Condition Model**: Introduce a unified 5-tier card condition standard (`NM`, `LP`, `MP`, `HP`, `DMG`), mapped 1:1 with Brazilian LigaPokémon marketplace stock (`M/NM`, `SP`, `MP`, `HP`, `D`).
2. **Per-Card Marketplace Scraping & Throttled Queue**: Extract real-time store stock (`cards_stock`) with condition IDs (`qualid`) and prices directly from LigaPokémon card pages using an in-process, throttled background queue.
3. **Three-Tier Valuation Cascade**:
   - Tier 1: Real scraped lowest listing (`preco-menor`) for exact condition.
   - Tier 2: Scaled price from the nearest available condition (e.g., HP when D is out of stock) using centralized, easily tunable condition ratios.
   - Tier 3: Calibrated percentage multiplier against the canonical Near Mint price when no domestic listings exist.
4. **Collapsible UI Selector**: In the card selector modal, provide a collapsed-by-default selector defaulting cleanly to `NM`, expandable to pick non-NM grades with clear pricing context.
5. **Visual Signals & Valuation Transparency**: Display distinct badges (e.g. `D`, `HP`) on binder slots for non-NM cards and transparently disclose price derivation in the Portfolio Modal.
6. **Zero Hardcoded Strings**: Full internationalization parity across Portuguese (`pt-BR`) and English (`en-US`).

## User Stories

1. As a collector, I want to specify the physical condition of my card (NM, LP, MP, HP, D) when assigning it to a binder slot, so that my collection accurately reflects the state of my physical cards.
2. As a collector, I want the condition selector to be collapsed by default to Near Mint (NM), so that adding standard cards remains swift and uncluttered.
3. As a collector, I want to expand the condition selector when adding a worn or Damaged card to select its condition with a single click.
4. As a collector, I want my Damaged (D) cards to be valued using real LigaPokémon store listings for condition D, so that my portfolio reflects actual Brazilian liquidity.
5. As a collector, I want the system to fall back to the nearest available condition (e.g., scaled HP price) if nobody currently sells a Damaged copy on Liga, so that rare cards are realistically valued rather than showing R$ 0.
6. As a collector, I want an immediate optimistic estimate when assigning a non-NM card while a background queue verifies live market listings without blocking the UI.
7. As a collector, I want to see a clear condition badge (`D`, `HP`, `MP`, `LP`) on my binder slot next to the language badge, so that I can immediately identify worn cards in my binder grid.
8. As a collector, I want Near Mint cards to remain clean without redundant badges, preserving visual elegance for mint collections.
9. As a collector, I want the Portfolio Modal to transparently display whether a card's price came from a verified condition quote, nearest condition interpolation, or baseline discount.
10. As an international collector, I want all condition names, tooltips, and badges translated in Portuguese and English without hardcoded strings.

## Implementation Decisions

- **Domain Model & Glossary**:
  - Registered **Card Condition** and **Condition Valuation Adjustment** in `CONTEXT.md`.
  - Documented architectural decisions in `docs/adr/0009-per-card-condition-scraping-and-valuation-interpolation.md`.
- **Centralized Configuration (`shared/conditionConfig.ts`)**:
  - Definitive condition types: `'NM' | 'LP' | 'MP' | 'HP' | 'DMG'`.
  - Tunable relative ratio constants for nearest-condition scaling and fallback multipliers.
  - 1:1 mapping functions to LigaPokémon `qualid` (1=M, 2=NM, 3=SP, 4=MP, 5=HP, 6=D).
- **Database Schema (`server/db/schema.ts`)**:
  - `user_pokemon`: add `card_condition text not null default 'NM'`.
  - `card_prices`: add `condition text not null default 'NM'` with composite ID `${cardId}:${provider}:${condition}`.
- **Repository Seams**:
  - `CollectorRepository`: accept and persist `cardCondition` across `setUserPokemon`, `batchSyncCollection`, and query methods.
  - `PricingRepository`: support condition-aware price lookup and upsertion.
- **Per-Card Scraping & Queue Service**:
  - `cardConditionScraperService.ts`: query `https://www.ligapokemon.com.br/?view=cards/card&card={name}&ed={code}`, parse embedded `cards_stock` and extract lowest listing per condition.
  - Throttled in-process queue (1 request/second) with backoff retry, updating `card_prices`.
- **Valuation Cascade**:
  - `canonicalPriceService.ts` & `portfolioService.ts`: resolve condition price via exact match -> scaled nearest condition -> multiplier fallback.
- **Frontend & i18n**:
  - `CardSelectorModal.tsx`: Collapsible selector row below language selector, defaulting to `NM`.
  - `CardSlot.tsx`: Render condition badge (`D`, `HP`, etc.) only when `cardCondition !== 'NM'`.
  - `PortfolioModal.tsx`: Show condition badge and price derivation info in top cards and detail views.
  - Centralized i18n dictionaries (`pt.ts` and `en.ts`) with zero raw strings.

## Testing Decisions

- **Schema & Seam Tests**:
  - Unit tests verifying `card_condition` default to `NM` and smooth backward compatibility.
  - Tests ensuring repository mutations persist condition without regressions.
- **Scraper & Valuation Tests**:
  - Unit tests parsing mock Liga `cards_stock` payload extracting minimum condition prices.
  - Unit tests validating the 3-tier cascade: exact match, nearest condition scaled interpolation, and fallback multiplier.
  - Queue rate limiting and retry tests.
- **UI & State Tests**:
  - Component tests for `CardSelectorModal` collapsible condition selection.
  - Component tests for `CardSlot` conditional badge rendering (visible for non-NM, hidden for NM).
  - Portfolio modal valuation display tests.
- **i18n Parity Tests**:
  - Automated test verifying all condition translation keys exist in both `pt-BR` and `en-US`.

## Out of Scope

- Grading company certifications (PSA/BGS/CGC slab grades and serial numbers).
- User ability to upload custom photos of damaged cards.
- Condition breakdowns for international TCGplayer imports (TCGplayer developer API remains closed).

## Further Notes

- Governed by ADR 0009 (`docs/adr/0009-per-card-condition-scraping-and-valuation-interpolation.md`).
- Sliced into 4 vertical tracer-bullet tickets published in dependency order.
