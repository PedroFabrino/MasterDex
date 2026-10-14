## Parent
#55

## What to build
Integrate the Portfolio CSV Export into the frontend UI and API client. Add typed `exportPortfolioCsv(userId?: string, slots?: CollectedSlot[])` in `apiClient.ts` that triggers an authentic file download in the browser. In `PortfolioModal.tsx`, add an **"Export Portfolio CSV"** button in the header metrics area. In `FileBackupTab.tsx`, add an **"Export Portfolio CSV"** button alongside the existing JSON and CSV buttons with informative tooltips. Support both authenticated users and local guest collectors. Add type-safe translations across `en-US` and `pt-BR`.

## Acceptance criteria
- [ ] `apiClient.ts` provides `downloadPortfolioCsv(userId?: string, collected?: Record<number, CollectedSlot>)` downloading the CSV file.
- [ ] `PortfolioModal.tsx` features an "Export Portfolio CSV" button triggering download with spinner feedback.
- [ ] `FileBackupTab.tsx` includes an "Export Portfolio CSV" button in the export section.
- [ ] Works seamlessly for both authenticated profiles and unauthenticated guest sessions.
- [ ] Zero hardcoded user-facing strings: complete parity across `pt-BR` and `en-US` dictionaries in `src/i18n`.
- [ ] All modified components remain strictly <= 400 lines (and hooks <= 300 lines).
- [ ] Frontend component and integration tests pass verifying button triggers and download handling.

## Blocked by
- #56
