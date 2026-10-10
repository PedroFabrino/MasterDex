## Parent
#51

## What to build
Enhance `BinderSearchBar` component to display a rich collection status badge indicating whether a Pokémon is collected and which physical TCG card is linked (e.g. `Collected · 172/132` in English, `Capturado · 172/132` in Portuguese). For slots collected with no physical card assigned, maintain the standard `Collected` / `Capturado` badge. For uncollected species, render no badge. Extend `filterPokemonByName` to also match by Pokédex number and linked card collector number. Ensure full i18n parity across Portuguese and English dictionaries.

## Acceptance criteria
- [ ] For Pokémon with an assigned TCG card containing a collector number (e.g. `172/132` or `4/102`), the search autocomplete dropdown displays a violet badge with a Sparkles icon and text `Collected · {number}` (`Capturado · {number}`).
- [ ] For Pokémon with an assigned TCG card lacking a number, the dropdown falls back gracefully to `Collected · TCG Card` (`Capturado · Carta TCG`).
- [ ] For Pokémon collected as default sprites (no physical card), the dropdown retains the emerald badge with CheckCircle icon and text `Collected` (`Capturado`).
- [ ] For uncollected species, no badge is displayed in the search result item.
- [ ] `filterPokemonByName` supports searching by Pokémon name, Pokédex number (`25`, `#025`), or linked card collector number (`172/132`, `4/102`).
- [ ] All new user-facing strings are strictly typed in `src/i18n/types.ts` and translated in `src/i18n/locales/en.ts` and `src/i18n/locales/pt.ts` with 100% key parity.
- [ ] Unit tests in `tests/binderSearch.test.ts` verify badge display for assigned cards, sprite-only collected, uncollected, search query matching by card number, and i18n parity in `tests/i18n.test.ts`.

## Blocked by
- None — can start immediately
