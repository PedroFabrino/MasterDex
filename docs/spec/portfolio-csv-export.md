# Spec: TCG Portfolio CSV Export

## Problem Statement

Collectors use external portfolio tracking platforms such as **Collectr** and **TCGplayer** to track real-time market value, trade logs, and collection investments. Currently, MasterDex offers a generic backup CSV (`Pokedex,Name,Collected,CardId,CardName,CardImageUrl`), which includes unassigned sprite slots and lacks critical market fields (e.g., Set, Game, Variant, Condition, MarketPrice in USD). 

Collectors need a specialized **Portfolio CSV Export** containing only cards with assigned physical TCG cards (`slot.tcgCard != null`), formatted to match industry-standard portfolio tracker schemas with live condition-adjusted USD market pricing.

## Proposed Solution

1. **Portfolio CSV Format**:
   Generate a CSV adhering strictly to the standard portfolio schema:
   ```csv
   Card,Set,Game,Variant,Kind,Condition,Grade,Quantity,PurchasePrice (USD),MarketPrice (USD),Currency
   ```
   - **`Card`**: Clean official card name (e.g., `Chandelure`, `Jirachi ex`), stripping trailing collector numbers.
   - **`Set`**: Expansion / Set name (e.g., `ME: 30th Celebration`, `Base Set`, `151`).
   - **`Game`**: Constant `POKEMON`.
   - **`Variant`**: `Holofoil` if `card.isHolo` is true, otherwise `Normal`.
   - **`Kind`**: Constant `RAW`.
   - **`Condition`**: Standardized condition string:
     - `NM` -> `NEAR_MINT`
     - `LP` -> `LIGHTLY_PLAYED`
     - `MP` -> `MODERATELY_PLAYED`
     - `HP` -> `HEAVILY_PLAYED`
     - `DMG` -> `DAMAGED`
   - **`Grade`**: Empty string `""`.
   - **`Quantity`**: `1`.
   - **`PurchasePrice (USD)`**: Empty string `""`.
   - **`MarketPrice (USD)`**: Condition-adjusted USD price formatted to 2 decimals (e.g. `1.93`). If unavailable or zero, left empty `""`.
   - **`Currency`**: Constant `USD`.

2. **Scope & Ordering**:
   - Filtered strictly to slots where a physical TCG card is assigned (`tcgCard != null`). Basic sprite entries are excluded.
   - Ordered numerically by Pokédex ID (`#0001` to `#1025`) matching the natural binder progression.

3. **Backend Service & API Routes**:
   - Implement `portfolioExportService.ts` to enrich assigned cards with set names, condition conversions, and live USD valuations.
   - `GET /api/collection/export?userId=...&format=portfolio_csv`: Streams the CSV download for authenticated profiles.
   - `POST /api/collection/export-portfolio-csv`: Accepts an array of client-side slots for unauthenticated / guest sessions and returns the formatted CSV.

4. **UI Entrypoints**:
   - **Portfolio Modal (`PortfolioModal.tsx`)**: Header action button alongside portfolio metrics.
   - **Backup & Import Modal (`FileBackupTab.tsx`)**: Dedicated export button in the export section.

5. **Internationalization & Governance**:
   - 100% i18n parity across `en-US` and `pt-BR` with zero hardcoded strings.
   - Strict adherence to file line limits: routes <= 400, services <= 400, components <= 400, tests <= 500.

## User Stories

1. As a collector with cards assigned in MasterDex, I want to export a CSV of my physical cards in Collectr/portfolio format, so that I can import my collection into third-party tracking apps without manual entry.
2. As a collector, I want only my physical TCG cards included in the export (ignoring placeholder sprites), so that my portfolio value and card counts are accurate.
3. As a collector, I want my card conditions (e.g., Damaged, Near Mint) and live USD market values to be correctly mapped and formatted, so that third-party trackers reflect my actual card grades and values.
4. As a guest collector, I want to be able to export my local browser binder to portfolio CSV just as easily as a logged-in user.

## Implementation Decisions

- **`server/services/portfolioExportService.ts`**:
  Dedicated service encapsulating the CSV generation logic to preserve the <= 400 line limit on `collectionRoutes.ts`.
- **`server/routes/collectionRoutes.ts`**:
  Extend `GET /export` with `format=portfolio_csv` and add `POST /export-portfolio-csv`.
- **`src/lib/apiClient.ts`**:
  Add `exportPortfolioCsv(userId?: string, slots?: CollectedSlot[])` helper triggering automatic browser file download.
- **`src/components/portfolio/PortfolioModal.tsx` & `src/components/import/FileBackupTab.tsx`**:
  Render the export button with download icon and loading state.

## Testing Strategy

- Unit tests in `tests/portfolioExport.test.ts`:
  - CSV header and column validation against sample specifications.
  - Verification that basic sprites (`tcgCard: null`) are excluded.
  - Proper mapping of conditions (`NM` -> `NEAR_MINT`, `DMG` -> `DAMAGED`).
  - USD condition-adjusted valuation formatting.
  - Guest POST endpoint and authenticated GET endpoint parity.
  - Pokédex numerical sort order verification.
