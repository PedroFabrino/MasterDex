## Parent
#6

## What to build
Implement `scraperService.ts` in `apps/api` using Cheerio to fetch and parse expansions from `cartasdepokemon.com.br`. The scraper extracts `base_count` (from `_officialCards`), identifies Secret Rares where `local_id > base_count`, extracts BRL card market prices, card names, rarities, and image URLs. Implement `investmentService.ts` to calculate the composite 0–100 Investment Score. Expose endpoints `POST /api/tcg/expansions/scrape` and `GET /api/tcg/expansions` with Drizzle repository persistence.

## Acceptance criteria
- [ ] `scraperService.ts` correctly extracts `base_count` and filters cards strictly where `local_id > base_count`.
- [ ] Correctly parses BRL prices from `data-card-price` and rarity from `data-card-rarity`.
- [ ] `investmentService.ts` calculates the composite Investment Score (0–100) weighting chase ceiling, average secret price, and secret density.
- [ ] `POST /api/tcg/expansions/scrape` persists the expansion, secret cards, and initial price history.
- [ ] `GET /api/tcg/expansions` returns sorted expansions with top chase cards and investment metrics.
- [ ] Automated tests verify scraping parser fixtures and scoring calculations.

## Blocked by
- #7
