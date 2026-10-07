## Parent
#32

## What to build
A dedicated `BinderSearchBar` component that provides real-time autocomplete filtering across the 1,025 National Dex species names, with diacritic normalization (e.g. typing "flabe" matches "Flabébé"), keyboard navigation (Arrow Up/Down, Enter, Escape), and a floating popover dropdown displaying species mini-sprites, target binder page and region badges, and collection status indicators. All user-facing strings are localized with strict parity in `pt-BR` and `en-US`.

## Acceptance criteria
- [ ] `BinderSearchBar` component renders a search input with a search icon, clear button, and shortcut badge indicator.
- [ ] Typing in the input filters Pokémon species by name using case-insensitive substring matching with accent/diacritic stripping.
- [ ] Dropdown displays matching results showing Pokémon mini-sprite, species name, target page/region pill (e.g. `Pág. 1 · Kanto`), and collection status badge.
- [ ] Keyboard navigation allows moving the active highlight with ArrowUp/ArrowDown, selecting with Enter, and closing with Escape.
- [ ] Selecting an item fires `onSelectPokemon(pokemon)` with the chosen species and closes the dropdown.
- [ ] Empty search state renders localized message when no species match the query.
- [ ] All user-facing labels, placeholders, and tooltips are localized in `src/i18n/locales/pt.ts` and `en.ts` with strict TypeScript key parity.
- [ ] Unit tests in `tests/binderSearch.test.ts` verify matching accuracy, keyboard events, and i18n parity.

## Blocked by
- None — can start immediately
