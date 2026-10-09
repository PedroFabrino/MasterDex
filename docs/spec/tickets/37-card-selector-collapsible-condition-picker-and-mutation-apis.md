## Parent
#46

## What to build
Integrate the card condition selector into the UI and collection mutation pipeline. In `CardSelectorModal.tsx`, add a collapsed-by-default condition selector located directly alongside/below the language selector. Default condition is `NM` (Near Mint). Expanding the selector displays toggle pills (`NM`, `LP`, `MP`, `HP`, `DMG`) with localized labels and condition pricing impact. Wire the chosen condition into `onSelectCard`, updating client state and triggering backend collection mutation APIs (`PATCH /api/collection/:pokemonId` and batch sync), which queues condition scraping if non-NM.

## Acceptance criteria
- [ ] `collectionRoutes.ts` PATCH and batch sync endpoints accept and validate `cardCondition?: string` (`'NM' | 'LP' | 'MP' | 'HP' | 'DMG'`).
- [ ] Mutating a slot to a non-NM condition automatically enqueues a background condition scrape if uncached.
- [ ] `apiClient.ts`, `cardMapping.ts`, and `collectionMerge.ts` cleanly map and merge `cardCondition` across local and cloud collections.
- [ ] `CardSelectorModal.tsx` renders a collapsible condition selector row:
  - Collapsed by default displaying: `Condition: Near Mint (NM) ▾`.
  - Expanding shows options: `NM`, `LP`, `MP`, `HP`, `DMG`.
  - Selecting an artwork immediately pairs with the selected condition.
- [ ] Full i18n translation parity across `pt-BR` and `en-US` with zero hardcoded strings.
- [ ] Component and API route tests pass verifying payload handling, state transitions, and UI interactions.

## Blocked by
- #48
