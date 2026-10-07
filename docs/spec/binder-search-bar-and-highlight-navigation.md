# Spec: Binder Search Bar and Highlight Navigation

## Problem Statement

When navigating the National Dex collection grid (#001 to #1025), collectors must manually page through up to 65 binder pages or select regions sequentially in the sidebar to locate a specific Pokémon species. This introduces friction when verifying whether a specific Pokémon is collected, checking what TCG card artwork is assigned, or wanting to inspect a card's binder position quickly. Collectors lack a direct search mechanism to locate a Pokémon species by name, jump immediately to the corresponding binder page, and have the targeted slot visually highlighted so it is immediately obvious where the card lives in the 4×4 grid.

## Solution

1. **Dedicated Binder Search Toolbar**:
   - Introduce a prominent, sleek `BinderSearchBar` component positioned directly above the binder book frame in `App.tsx`.
   - Feature a responsive search input with a magnifying glass icon, clear button, and a keyboard shortcut badge (`Ctrl+K` / `⌘K`).
   - Context-aware keyboard shortcut: Pressing `Ctrl+K` (or `⌘K`) in PokeBinder mode focuses the Binder Search input; pressing `Ctrl+K` in TCG Investor mode focuses the existing investor expansion filter input; `Esc` closes and unfocuses.

2. **Species Name Matching & Autocomplete Dropdown**:
   - Filter strictly by Pokémon species name across the 1,025 National Dex entries.
   - Perform case-insensitive substring matching with full diacritic normalization (e.g. typing `"flabe"` matches *Flabébé*).
   - Render a floating popover dropdown directly beneath the search input featuring:
     - Pokémon mini-sprite thumbnail.
     - Species name with matched substring highlighted.
     - Target location pill displaying page and region (e.g., `Pág. 1 · Kanto`).
     - Collection status indicator (emerald check if collected, violet badge if assigned TCG card).
   - Support full keyboard navigation: Arrow Up / Down to preview through results, Enter to select, and Escape to dismiss.

3. **Page Navigation & Slot Highlight Animation**:
   - Upon selecting a Pokémon, calculate the exact target page: `Math.floor((pokemon.id - 1) / 16) + 1`.
   - Update current page and active region in `App` state, flip the binder view, and smoothly scroll the target card into view if needed.
   - Apply a **Slot Highlight** to the targeted `CardSlot`: a vibrant amber/gold glowing pulse ring (`ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-pulse`).
   - Keep the Card Selector Modal closed so the user can see the card's position in the binder spread.
   - Automatically dismiss the highlight after 2.5 seconds, or dismiss it immediately if the user clicks on the card (which opens the Card Selector Modal normally).

4. **Zero-Hardcoded-Strings & Parity Enforcement**:
   - Centralize all labels, placeholders, aria-labels, and tooltips in `src/i18n/locales/pt.ts` and `en.ts` with strict TypeScript key parity.

## User Stories

1. As a collector, I want a search bar located directly above my binder pages, so that I can quickly search for any Pokémon in the National Dex without scanning pages manually.
2. As a collector, I want typing a Pokémon name (e.g. "Char") to display an instant dropdown of matching species with mini-sprites and page numbers, so that I can identify the right Pokémon immediately.
3. As a collector, I want search queries to be case-insensitive and ignore accents (e.g. "flabe" matches "Flabébé"), so that I don't have to worry about exact accent keys.
4. As a collector, I want to navigate search results using the keyboard (Arrow Up, Arrow Down, Enter, Escape), so that I can search and select without taking my hands off the keyboard.
5. As a collector, I want pressing `Ctrl+K` or `⌘K` while in the PokeBinder tab to instantly focus the search bar, so that I have a fast shortcut for quick lookup.
6. As a collector, I want pressing `Ctrl+K` while in the TCG Investor tab to focus the investor filter search instead, so that the shortcut is context-aware and never confusing.
7. As a collector, I want selecting a Pokémon from the search results to jump directly to its binder page and update the active region, so that the binder displays the correct page right away.
8. As a collector, I want the selected Pokémon's card slot to display an animated amber/gold glowing ring for 2.5 seconds, so that I can immediately spot the card on the 4×4 grid.
9. As a collector, I want the highlight animation to dismiss automatically after 2.5 seconds or immediately when I click the card, so that it doesn't linger as visual clutter.
10. As a collector, I want search results to show whether a Pokémon is already collected or has a TCG card assigned, so that I have instant collection context before jumping.
11. As a collector, I want all search labels, placeholders, and empty states localized in English and Portuguese, so that the interface matches my selected language.

## Implementation Decisions

- **BinderSearchBar Component**:
  - Create `src/components/BinderSearchBar.tsx` as a standalone component to prevent bloating `App.tsx` and respect the 400-line ceiling rule.
  - State: query text, focused/open state, selected index for keyboard navigation.
  - Filter logic: `POKEMON.filter(...)` with diacritic normalization using `.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()`.
  - Dropdown rendering: Popover or styled absolute list with max-height and auto-scroll for highlighted item.
- **Global / Context-Aware Shortcut Listener**:
  - In `App.tsx`, attach a `keydown` listener for `(e.ctrlKey || e.metaKey) && e.key === "k"`.
  - If `appMode === "binder"`, dispatch focus to the `BinderSearchBar` input.
  - If `appMode === "investor"`, dispatch focus to the `InvestorFilterBar` input.
- **Navigation & Highlight State in App.tsx**:
  - Add state `highlightedPokemonId: number | null` to `App.tsx`.
  - Add `handleSelectPokemon(pokemon: Pokemon)`: computes target page `Math.floor((pokemon.id - 1) / 16) + 1`, calls `jumpToPage(targetPage)`, sets `highlightedPokemonId(pokemon.id)`.
  - Auto-dismiss timer: `setTimeout(() => setHighlightedPokemonId(null), 2500)` with cleanup.
  - Clear `highlightedPokemonId` immediately when `handleSlotClick` is fired.
- **CardSlot Visual Highlight Styling**:
  - Add `isHighlighted?: boolean` prop to `CardSlotProps` in `src/components/CardSlot.tsx`.
  - When `isHighlighted` is true, add `ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-pulse z-20`.
  - Use `ref` or smooth scroll element when highlighted to ensure visibility if scrolled down.
- **i18n Dictionary Additions**:
  - Add `binderSearch` namespace in `src/i18n/types.ts`, `src/i18n/locales/pt.ts`, and `src/i18n/locales/en.ts` with keys: `placeholder`, `noResults`, `pageLabel`, `clear`, `shortcutLabel`.

## Testing Decisions

- **Behavioral Unit Tests (`tests/binderSearch.test.ts` / `tests/binderSearchUi.test.tsx`)**:
  - Test diacritic-insensitive and case-insensitive species name matching (e.g. "char" -> Charmander, Charmeleon, Charizard; "flabe" -> Flabébé).
  - Test keyboard navigation (ArrowDown increments active index, Enter triggers selection, Escape closes).
  - Test calculation of target page: Pokémon #1 -> Page 1, Pokémon #16 -> Page 1, Pokémon #17 -> Page 2, Pokémon #25 -> Page 2.
  - Test `isHighlighted` prop on `CardSlot` applies the amber ring pulse style.
  - Test i18n parity for `binderSearch` keys across `en` and `pt`.
  - Verify file line count constraints (< 400 lines per component/test).

## Out of Scope

- Searching by card set name, artist, or attack text in the binder toolbar (handled within Card Selector Modal).
- Filtering binder pages by type or generation directly within the search bar (handled by the sidebar regions).
- Sticky multi-selection of multiple Pokémon slots at once.

## Further Notes

- The design strictly respects the domain model in `CONTEXT.md`: using `Binder Search` and `Slot Highlight`.
- Keeps `App.tsx` and `BinderPageView.tsx` well under the 400-line limit by encapsulating search into `BinderSearchBar.tsx`.
