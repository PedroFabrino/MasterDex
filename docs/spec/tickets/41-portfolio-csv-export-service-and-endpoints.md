## Parent
#55

## What to build
Build the backend `portfolioExportService.ts` and API endpoints for generating the Collectr-compatible Portfolio CSV. The service filters assigned cards (`isNotNull(cardId)`), resolves set names, maps condition codes (`NM` -> `NEAR_MINT`, `DMG` -> `DAMAGED`, etc.), formats variant (`Holofoil` vs `Normal`), and computes condition-adjusted USD market prices via `canonicalPriceService` and `exchangeRateService`. Wire endpoints `GET /api/collection/export?userId=...&format=portfolio_csv` and `POST /api/collection/export-portfolio-csv` (for guest/in-memory slots) with numerical Pokédex sorting.

## Acceptance criteria
- [ ] `portfolioExportService.ts` exports `generatePortfolioCsv(items, rates?)` and `exportForUser(userId)` returning standard CSV:
  `Card,Set,Game,Variant,Kind,Condition,Grade,Quantity,PurchasePrice (USD),MarketPrice (USD),Currency`
- [ ] Only slots with physical TCG cards assigned are included; placeholder sprites are strictly excluded.
- [ ] Output is ordered numerically by Pokédex ID (`#0001` to `#1025`).
- [ ] Condition strings map correctly: `NM` -> `NEAR_MINT`, `LP` -> `LIGHTLY_PLAYED`, `MP` -> `MODERATELY_PLAYED`, `HP` -> `HEAVILY_PLAYED`, `DMG` -> `DAMAGED`.
- [ ] `MarketPrice (USD)` reflects condition adjustments formatted to 2 decimals, or empty string `""` if unpriced.
- [ ] `GET /api/collection/export?format=portfolio_csv` and `POST /api/collection/export-portfolio-csv` respond with `text/csv` and appropriate `Content-Disposition`.
- [ ] `collectionRoutes.ts` and `portfolioExportService.ts` remain strictly <= 400 lines.
- [ ] Backend unit tests pass verifying CSV headers, row data, sorting, and pricing calculations.

## Blocked by
- None — can start immediately
