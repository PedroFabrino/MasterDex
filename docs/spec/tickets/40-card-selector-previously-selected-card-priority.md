## Parent
#53

## What to build
Ensure that when editing a collected slot that already has a card linked (`slot?.tcgCard != null`), the cards grid in `CardSelectorGrid.tsx` always renders the default sprite as Slot #1 and the previously selected card as Slot #2, regardless of any active search query, rarity filter, or language filter. Deduplicate the previously selected card from the remaining search cards list so it does not appear twice. When no card was previously selected, preserve standard ordering (sprite first, followed by live search cards).

## Acceptance criteria
- [ ] When `slot?.tcgCard != null`, the grid renders Slot #1 as Default Sprite and Slot #2 as the previously selected card.
- [ ] The previously selected card in Slot #2 is highlighted with `isSelected=true`, violet border, and CheckCircle badge.
- [ ] Slot #2 is preserved even when `debouncedQuery` or filters (`rarity`, `selectedLanguage`) do not match the card.
- [ ] The card in Slot #2 is excluded from the remaining `liveCards` rendered in Slots #3..N.
- [ ] When `slot?.tcgCard == null`, Slot #1 is Default Sprite and Slots #2..N are `liveCards`.
- [ ] Clicking Slot #2 calls `onSelectCard` with `pokemon.id` and the selected card.
- [ ] File line counts stay strictly under architectural limits (<= 400 lines).
- [ ] Unit tests pass verifying ordering, filter immunity, and deduplication.

## Blocked by
- None — can start immediately
