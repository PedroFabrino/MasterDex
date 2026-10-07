## Parent
#24

## What to build
Add a Target Rarity Filter dropdown to the Card Selector Modal that defaults to the collector's configured target rarity tier (e.g. Any, Holo Rare+, Ultra Rare+, Illustration Rare+, Secret Rare). When a user opens any Pokémon slot, the available cards are filtered by that rarity tier so high-tier cards are immediately found. When the collector types a collector number or fraction in the search box (e.g. `129` or `129/103`), the rarity filter automatically bypasses and queries across ALL rarities matching that number.

## Acceptance criteria
- [ ] `CardSelectorModal.tsx` renders a Target Rarity Filter dropdown in the search header, defaulted to the user's persisted `targetRarity`.
- [ ] If search query is a plain species name (or empty), the card search results are filtered by the selected rarity threshold.
- [ ] If search query contains a collector number or fraction (e.g., `129` or `129/103`), the rarity constraint is automatically bypassed to surface all cards matching that code across all tiers.
- [ ] Manual changes to the rarity dropdown in the modal filter the current results immediately.
- [ ] Full localization in both `en-US` and `pt-BR` via `useTranslation()`.
- [ ] `CardSelectorModal.tsx` line count stays strictly <= 400 lines.
- [ ] Automated tests verify rarity filtering and code query bypass logic.

## Blocked by
- None — can start immediately
