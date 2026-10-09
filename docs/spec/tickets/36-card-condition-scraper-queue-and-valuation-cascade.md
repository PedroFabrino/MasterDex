## Parent
#46

## What to build
Build the backend scraping engine and background queue for extracting real-time card condition stock from LigaPokémon, coupled with the 3-tier valuation cascade service. Extract store listings with `qualid` (1=M, 2=NM, 3=SP, 4=MP, 5=HP, 6=D) from Liga's embedded `cards_stock`, pick the lowest price for the target condition, interpolate from the nearest available condition if out of stock, and fall back to the calibrated multiplier if no listings exist. Manage queries through an in-process, throttled background queue with backoff retries.

## Acceptance criteria
- [ ] `cardConditionScraperService.ts` scrapes individual card pages on LigaPokémon, parses embedded `cards_stock`, and resolves lowest store price (`preco-menor`) per condition.
- [ ] In-process throttled queue runs background scrapes at a controlled rate (e.g., 1 request/second) without blocking API handlers, with retry and failure backoff.
- [ ] `canonicalPriceService.ts` implements the 3-tier condition valuation cascade:
  1. Exact scraped condition quote.
  2. Scaled nearest available condition quote using `CONDITION_RATIOS`.
  3. Canonical Near Mint quote scaled by baseline multiplier.
- [ ] Integration tests verify:
  - Parsing Liga `cards_stock` with simulated DOM snippets.
  - Three-tier cascade resolution under all fallback permutations (exact match, nearest available, multiplier only).
  - Background queue concurrency and error resilience.

## Blocked by
- #47
