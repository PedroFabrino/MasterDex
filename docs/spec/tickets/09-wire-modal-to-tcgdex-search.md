## Parent
#1

## What to build
Wire the `CardSelectorModal.tsx` in MasterDex to live card searches via `GET /api/tcg/cards/search`, replacing static mock cards with real TCGdex card scans (such as Celebrations Mew ex 129/103) while keeping the official Pokémon game sprite at position #1 (**Default Sprite Anchor**). Persist selected cards to collection state and binder slot rendering.

## Acceptance criteria
- [ ] `CardSelectorModal.tsx` queries `GET /api/tcg/cards/search?q=...` with debounced input and loading skeletons.
- [ ] Position #1 in results grid is ALWAYS the official Pokémon game sprite (**Default Sprite Anchor**).
- [ ] Positions #2+ display live matching TCG cards with high-resolution artwork scans, card number, and set name from TCGdex.
- [ ] Selecting a card updates the 4x4 binder slot with the full TCG card scan in the authentic card aspect ratio.
- [ ] Selecting position #1 reverts the slot back to the default game sprite.
- [ ] Clicking "Remover da Coleção" clears collection status and closes modal.
- [ ] Hard stop line limits respected (all components <= 400 lines).
- [ ] Clean production build (`npm run build`).

## Blocked by
- #2
