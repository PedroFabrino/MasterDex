# Spec: TCG Investor Expansion Filtering and Collector Preferences

## Problem Statement

When exploring expansions in the TCG Investor leaderboard, collectors are presented with promotional compilations (e.g. *SWSH Black Star Promos*, *McDonald's Collections*, *POP Series*) alongside core booster expansions. Unlike standard booster box releases or special set booster packs, promotional sets cannot be purchased as randomized booster boxes to chase cards for missing binder slots. Having them mixed directly into the main leaderboard creates noise, skews investment comparisons, and pollutes collection gap yields.

Additionally, collectors currently have no way to customize which expansions appear on their leaderboard, nor is their selected Target Rarity Filter persisted across visits. Whenever the user leaves or reloads the application, their rarity preference resets to "any", requiring repetitive manual configuration.

## Solution

1. **Automated Expansion Categorization**: MasterDex deterministically categorizes expansions into **Booster Expansions** (standard releases with randomized packs/boxes and secret rare cards) and **Promotional Collections** (non-booster promotional compilations).
2. **Default Leaderboard View & Category Filter**: The TCG Investor leaderboard defaults strictly to displaying **Booster Expansions**, with an **Expansion Category Filter** control allowing collectors to switch between *Booster Expansions*, *Promotions & Subsets*, and *All Expansions*.
3. **Granular Set Hiding & Collapsible Tray**:
   - Every active expansion card provides a 1-click "Hide Set" action (eye-off icon).
   - Hidden expansions are gracefully moved out of the active grid into a collapsible **Hidden Expansions Tray** located at the bottom of the leaderboard (e.g., "Hidden Expansions (3)").
   - Inside the tray, collectors can review muted sets and restore them with a 1-click "Unhide Set" action.
4. **Search Bypasses Hide**: Searching for an expansion by name matches across all expansions; if a matching set is hidden, it is rendered with a distinct "Hidden" badge and an inline unhide button.
5. **Collector Preferences Persistence**:
   - Target Rarity Filter changes are instantly auto-saved without confirmation dialogs.
   - Hidden expansion IDs are persisted to the collector's profile via a dedicated preferences API endpoint and mirrored to `localStorage` for guest mode.

## User Stories

1. As a collector, I want the TCG Investor leaderboard to show only Booster Expansions by default, so that I am not distracted by promo compilations that cannot be chased via booster boxes.
2. As a collector, I want an Expansion Category Filter dropdown in the control bar, so that I can easily toggle between Booster Expansions, Promotions & Subsets, or All Expansions when desired.
3. As a collector, I want to hide any specific expansion from my active leaderboard using a button on the card, so that I can suppress sets I have no interest in collecting or investing in.
4. As a collector, I want hidden expansions to be neatly organized in a collapsible Hidden Expansions Tray at the bottom of the page, so that they do not clutter my main view while remaining accessible.
5. As a collector, I want to expand the Hidden Expansions Tray and click "Unhide Set" on any card, so that it immediately returns to my active leaderboard.
6. As a collector, I want the search bar to find expansions even if they are marked as hidden, so that I can quickly locate and unhide a specific set by name.
7. As a collector, I want hidden expansions appearing in search results to show a visible "Hidden" status badge and an unhide action, so that I immediately understand their visibility state.
8. As a collector, I want my selected Target Rarity Filter to auto-save immediately upon selection, so that my customized rarity threshold is preserved when I reload or return to the application.
9. As an authenticated collector, I want my hidden expansions and target rarity to synchronize with my database profile, so that my preferences follow me across different devices and browsers.
10. As a guest collector, I want my hidden expansions and target rarity to be saved to browser local storage, so that my choices remain intact between reloads before I log in.
11. As an international user, I want all category labels, hide/unhide buttons, tray headers, and tooltips to be fully localized in both English (`en-US`) and Portuguese (`pt-BR`), so that the interface maintains complete linguistic fidelity.

## Implementation Decisions

- **Automated Classification Seam**:
  - Sets are categorized as `promo` if their ID ends with `p` (e.g., `swshp`, `svp`, `smp`, `xyp`, `basep`, `miscp`), starts with `pop`, `tk-`, `wp`, `bp`, `np`, or their name contains `"Promo"`, `"Promotional"`, `"Trainer Kit"`, `"McDonald"`, or `"Trick or Trade"`.
  - All other sets are categorized as `booster`.
  - The expansions repository enriches expansion objects with `category: 'booster' | 'promo'`.
- **API Contracts**:
  - `GET /api/tcg/expansions`: Supports `category=booster|promo|all` query parameter (defaulting to `booster`).
  - `GET /api/collector/preferences`: Returns `{ targetRarity: string, hiddenExpansions: string[] }` for the authenticated user, or defaults for guests.
  - `PATCH /api/collector/preferences`: Accepts `{ targetRarity?: string, hiddenExpansions?: string[] }` and atomically updates the collector's preferences in SQLite.
- **Database Schema**:
  - Add `target_rarity` (text, default `'any'`) and `hidden_expansions` (text storing JSON array of set IDs/slugs, default `'[]'`) to `collector_profiles` in `server/db/schema.ts`.
- **Frontend Interaction & State**:
  - `TcgInvestorDashboard.tsx`: Manages active category, preferences fetching on mount, optimistic updates on filter changes, and auto-syncing to `localStorage` (fallback) and the preferences API.
  - The main grid renders only non-hidden expansions matching the active category and search filter.
  - The collapsible **Hidden Expansions Tray** renders below the grid when hidden expansions exist, showing count badges and expanding to show muted cards with unhide buttons.
  - Search filtering includes hidden expansions with a badge to permit rapid unhiding.
  - `ExpansionCard.tsx`: Adds an eye-off "Hide Set" action button and an eye-on "Unhide Set" action button.
- **Line Limit Constraints**:
  - Ensure all modified files stay well below limits: `TcgInvestorDashboard.tsx` <= 400 lines, `ExpansionCard.tsx` <= 400 lines, `tcgRoutes.ts` <= 400 lines, `collectorRepository.ts` <= 400 lines. Decompose UI sub-components (such as `HiddenExpansionsTray.tsx`) if line counts approach 350.
- **i18n Directive**:
  - Zero hardcoded strings. Add all translation keys to both `pt-BR` and `en-US` in `src/i18n/translations.ts`.

## Testing Decisions

- **Black-box API Behavior**:
  - Test `GET /api/tcg/expansions?category=booster` returns only booster expansions and excludes promo sets like `swshp` or `basep`.
  - Test `GET /api/tcg/expansions?category=promo` returns promotional collections.
  - Test `GET /api/collector/preferences` and `PATCH /api/collector/preferences` persists and retrieves custom target rarity and hidden expansion lists.
- **Regression Proof**:
  - Ensure existing gap yield calculations, card scraping, and Pokedex synchronization tests continue to pass 100%.

## Out of Scope

- Custom user-created set categories or tagging systems.
- Scraped market price tracking for individual cards within promo sets that don't have secondary pricing data.
- Global deletion or removal of expansions from the master catalog.

## Further Notes

- Maintains complete backward compatibility with existing guest sessions via `localStorage` sync.
- Operates under the existing SQLite database and Drizzle ORM architecture.
