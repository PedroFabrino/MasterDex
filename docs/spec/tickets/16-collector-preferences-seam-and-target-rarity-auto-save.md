## Parent
#14

## What to build
Provide a persistent preferences seam for collectors to save their investor preferences, including their selected Target Rarity Filter and list of hidden expansions. When a user selects a Target Rarity (e.g. Holo Rare+, Ultra Rare+, Illustration Rare+, Secret Rare) in the TCG Investor dashboard, the setting is instantly auto-saved without requiring manual confirmation clicks. Stored preferences are retrieved on dashboard mount and applied automatically, persisting across reloads in SQLite for authenticated collectors and syncing to `localStorage` for guest mode.

## Acceptance criteria
- [ ] Database schema in `schema.ts` includes `target_rarity` and `hidden_expansions` preferences columns on `collector_profiles` (or dedicated preferences table).
- [ ] `GET /api/collector/preferences` returns the stored preferences (`targetRarity`, `hiddenExpansions`) for the current user or guest defaults.
- [ ] `PATCH /api/collector/preferences` validates and atomically updates the collector's preferences in the repository seam.
- [ ] TCG Investor dashboard loads user preferences on mount and initializes the Target Rarity dropdown.
- [ ] Changing the Target Rarity dropdown immediately triggers an asynchronous update to the preferences endpoint and `localStorage` fallback while recalculating collection gap yields.
- [ ] All new interface copy and notifications are fully localized in `pt-BR` and `en-US`.
- [ ] Automated tests cover preferences retrieval and update behavior.

## Blocked by
- #15
