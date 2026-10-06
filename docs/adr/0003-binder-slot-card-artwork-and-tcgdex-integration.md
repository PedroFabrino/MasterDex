# ADR 0003: Binder Slot Card Artwork Customization and TCGdex Integration

## Status
Accepted

## Context
Collectors often own specific, high-value physical cards (such as Secret Rares, Illustration Rares, or Special Art like *Mew ex 129/103* from Celebrations) rather than generic Pokémon placeholders. 

The application needed a mechanism to:
1. Allow collectors to customize individual National Dex slots to display the exact card scan they physically own.
2. Search and resolve cards by specific collector numbers (e.g. `129/103`).
3. Maintain an authentic physical binder appearance where every slot shares a consistent card aspect ratio.
4. Support rapid artwork switching while preserving the official game sprite as a first-class default.

## Decision
1. **Card Aspect Ratio for All Binder Slots**:
   - All binder slots will share a standard TCG card aspect ratio (~2.5 : 3.5).
   - Unassigned/sprite slots feature a neutral background with the Pokémon sprite centered.
   - Assigned card slots display the full card artwork filling the container.

2. **Auto-Collect & Modal Interaction Flow**:
   - Clicking an uncollected slot automatically marks it as `collected = true` and opens the **Card Artwork Selector Modal**.
   - Re-clicking an already collected slot opens the modal to inspect/update the card or explicitly uncollect via a "Remover da Coleção" button.

3. **Default Sprite Anchor**:
   - Result item #1 in the selector modal is always the official Pokémon game sprite, functioning as both the default state and the reset action.
   - Items #2+ display matching cards fetched from the search provider.

4. **TCGdex Integration with Smart Query Parsing**:
   - Use TCGdex (`api.tcgdex.net`) as the primary zero-key search provider.
   - The query parser decomposes strings matching `[Name] [Number]/[Total]` (e.g. `Mew ex 129/103`) into name filters and exact card number matching.

5. **Persistence**:
   - Persist `card_id`, `card_name`, and `card_image_url` on `user_pokemon` (libSQL/Turso) and `localStorage`.
   - Volatile `market_price` is intentionally excluded from the collection record to avoid stale valuations.

## Consequences
- **Positive**: Direct, frictionless alignment between the digital tracker and physical binder pages. Users can find exact card variants effortlessly.
- **Positive**: Zero external API key dependencies for users (TCGdex operates without required auth tokens).
- **Trade-off**: Requires schema extension to `user_pokemon` (`card_id`, `card_name`, `card_image_url`) and backend search route `/api/tcg/cards/search`.
