# ADR 0009: Per-Card Condition Scraping and Valuation Interpolation

## Context
Pokémon card valuations diverge significantly based on physical condition (Near Mint, Lightly Played / SP, Moderately Played, Heavily Played, Damaged / D). Global catalog APIs like TCGdex only provide Near Mint benchmark prices without condition breakdowns. While LigaPokémon set search pages only expose baseline prices, individual LigaPokémon card pages embed active store stock with explicit condition tags (`qualid`).

## Decision
We store card condition (`cardCondition`: `NM`, `LP`, `MP`, `HP`, `DMG`) per collected slot in `user_pokemon` and cache condition-specific quotes in `card_prices`. When a collector assigns or updates a non-NM card, an in-process throttled scraper background queue queries LigaPokémon for that specific card's marketplace listings.

For valuation:
1. If an exact condition listing exists on LigaPokémon, we use the lowest listing price (`preco-menor`).
2. If the condition has zero active listings, we find the nearest available condition on LigaPokémon and scale it via centralized, easily adjustable relative ratios (`CONDITION_RATIOS`).
3. If no condition listings or no connection is available, we fall back to the canonical Near Mint price scaled by the standard condition multiplier.

The UI displays the active condition, allowing collectors to collapse/expand the condition selector in `CardSelectorModal` (defaulting to NM), shows condition badges (`D`, `HP`, etc.) on binder slots, and details the valuation derivation (exact quote vs. interpolated) in the Portfolio Modal.

## Considered Options
- Static multipliers only: Rejected because high-value damaged cards trade with unique Brazilian market dynamics that diverge from flat percentage cuts.
- Full set condition scraping: Rejected due to prohibitive latency and aggressive Cloudflare rate limits.
- Strict N/A when missing condition listings: Rejected because it artificially zeros out portfolio worth for rare cards.

## Consequences
- Preserves accurate portfolio valuations for damaged and played cards.
- Non-blocking UX: collectors see instantaneous multiplier estimates while background scraping resolves actual marketplace quotes.
- Database schema and API contracts expanded cleanly with backward compatibility for existing `NM` cards.
