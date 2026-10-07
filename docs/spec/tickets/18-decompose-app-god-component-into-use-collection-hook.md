## Parent
#18

## What to build
Decompose `src/App.tsx` (approaching the 400-line monolith limit) by extracting collection state and synchronization into a custom hook:
- Create `src/hooks/useCollection.ts` (<= 250 lines) to encapsulate collection state, hydration, local storage synchronization, and server syncing.
- Replace the N+1 sequential HTTP PATCH requests during guest-to-cloud merge with a single atomic call to `POST /api/collection/batch`.
- Remove side-effecting network requests from inside React state updater functions (`setCollected`).
- Slim down `src/App.tsx` from 362 lines down to under 200 lines, adhering cleanly to the single-responsibility principle.

## Acceptance criteria
- [ ] `src/hooks/useCollection.ts` manages collection state, persistence, and server synchronization with clean lifecycle boundaries.
- [ ] Guest-to-cloud collection merge uses `POST /api/collection/batch` in a single request instead of multiple concurrent PATCH requests.
- [ ] `src/App.tsx` line count is reduced to <= 200 lines.
- [ ] PokéBinder collection grid rendering, slot selection, and card assignments continue to operate smoothly with 100% test pass rate.

## Blocked by
- #20
