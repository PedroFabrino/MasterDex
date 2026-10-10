# Spec: Card Selector Previously Selected Card Priority Slot

## Problem Statement

When a collector opens the `CardSelectorModal` to edit a Pokémon that already has a physical TCG card assigned (for example, to update its condition from Near Mint to Damaged, or adjust its language print), the cards grid currently renders:
1. Slot 1: Default sprite anchor.
2. Slots 2..N: Cards returned by the active search query (`liveCards`), scoped by the active rarity and language filters.

If the previously selected card is located further down in the search results (or excluded entirely by an active rarity or language filter), the collector is forced to clear filters, scroll through dozens of prints, or re-type the exact collector number just to re-select their already-assigned card. This creates unnecessary friction when simply trying to edit card condition or view assigned card metadata.

## Proposed Solution

Guarantee that whenever a Pokémon has an assigned physical card in its collection slot (`slot.tcgCard != null`):
1. **Slot 1**: Always the Default Sprite anchor (`pokemon.spriteUrl`).
2. **Slot 2**: Always the **Previously Selected Card** (`slot.tcgCard`), regardless of active search query, rarity filter, or language filter ("doesn't matter the filter").
3. **Slots 3..N**: Remaining cards from `liveCards`, cleanly deduplicated so the previously selected card is not repeated.
4. **Immediate Interaction**: The previously selected card in Slot 2 is rendered immediately from local slot data without waiting for network search queries to complete, allowing instant condition adjustments.

## User Stories

1. As a collector editing an assigned card's condition (e.g. marking it as Damaged), I want the previously selected card to appear right next to the sprite at position #2 regardless of active filters, so that I don't have to re-search or scroll for it.
2. As a collector with an active language or rarity filter, I still want to see my currently assigned card at position #2, ensuring my existing selection is always accessible.
3. As a collector selecting a brand new card for an unassigned Pokémon or sprite-only slot, I want the grid to display the sprite in slot 1 followed by search results as usual.
4. As a collector, I want the search results grid to never show duplicate cards if my previously selected card is also returned by the active search.

## Acceptance Criteria

- [ ] When `slot?.tcgCard != null`, Slot #1 renders the Default Sprite and Slot #2 renders the previously selected card with `isSelected=true` and CheckCircle badge.
- [ ] Slot #2 is rendered regardless of the search query, rarity filter, or language filter.
- [ ] Any matching card in `liveCards` is deduplicated from the rest of the grid.
- [ ] When `slot?.tcgCard == null`, Slot #1 renders the Default Sprite and Slot #2..N render `liveCards` normally.
- [ ] Clicking Slot #2 triggers selection with the currently selected modal condition and language.
- [ ] Component line count remains <= 400 lines.
- [ ] Comprehensive unit tests verify slot ordering, filter independence, and deduplication.
