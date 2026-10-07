## Parent
#18

## What to build
Centralize frontend network communication and eliminate duplicated card mapping logic:
- Create `src/lib/apiClient.ts` providing strongly-typed API client functions (`getCollection`, `patchSlot`, `batchSyncCollection`, `searchCards`, `getExpansions`, `getExpansionDetails`).
- Extract the shared card object mapping logic (`{ id, name, setName, number, imageUrl, thumbnailUrl }`) into a single helper in `src/lib/cardMapping.ts` or `src/lib/apiClient.ts`, removing duplicated code across `App.tsx`, `CardSelectorModal.tsx`, `FileBackupTab.tsx`, and `GoogleSheetsTab.tsx`.
- Refactor `CardSelectorModal.tsx` (currently 372 lines, approaching the 400-line monolith limit) to use the API client and shared mapping, reducing the file size to under 280 lines.

## Acceptance criteria
- [ ] `src/lib/apiClient.ts` provides centralized, typed API client methods for all backend endpoints.
- [ ] Card mapping logic is defined once and shared across all consuming components.
- [ ] `CardSelectorModal.tsx` file size is reduced to <= 280 lines.
- [ ] All 12 test suites (80+ vitest tests) pass with 100% green status.

## Blocked by
- #21
- #22
