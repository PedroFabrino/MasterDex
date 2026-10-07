## Parent
#27

## What to build
Build an interactive Staging Review Grid interface that displays scanned binder pages and pockets before saving to the database. Each pocket card shows the cropped physical photo side-by-side with the matched Pokémon species (#1..#1025) and card artwork. Collectors can review high-confidence matches, click any ambiguous slot to search and pick the correct card, and hit "Confirm All & Add to Binder" to bulk-synchronize the reviewed cards into their MasterDex in SQLite.

## Acceptance criteria
- [ ] `StagingReviewModal.tsx` renders a visual grid matching the binder page structure (e.g. 3x3 or 4x3) with multi-page navigation.
- [ ] Each slot displays the cropped physical photo alongside matched Pokémon species name, dex number, card image, and confidence badge.
- [ ] Clicking any slot opens an inline correction drawer/dialog to adjust the species or card assignment.
- [ ] "Confirm & Add to Binder" triggers `collectorRepository.batchUpsertUserPokemon` to bulk-save assigned cards and mark species as collected.
- [ ] Displays confirmation summary with count of updated binder slots.
- [ ] Complete localization in `en-US` and `pt-BR` with 100% key parity.
- [ ] Component line count <= 400 lines.
- [ ] Automated tests verify staging review data mapping and bulk collection updates.

## Blocked by
- #30
