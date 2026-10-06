## Parent
#4

## What to build
Expand the PokéBinder to cover all 1025 official Pokémon species across 9 generations and 65 binder pages (4x4, 16 cards per page).
Bundle all 1025 species with their official names, dex IDs, and sprites in a lightweight static JSON dataset (`src/data/pokedex.json`), update `BinderSidebar` with all 9 regions (Kanto through Paldea), purge hardcoded starter collected cards from `App.tsx` for a clean slate, and provide a PokeAPI sync check script `npm run sync:pokedex` and backend endpoint `GET /api/pokedex/sync-check`.

## Acceptance criteria
- [ ] Bundled dataset contains all 1025 official Pokémon species (#001 Bulbasaur to #1025 Pecharunt) with valid English names and sprite URLs.
- [ ] Binder displays exactly 65 pages in 4x4 (16 cards/page) grid layout.
- [ ] `BinderSidebar` includes all 9 regions (Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar, Paldea) with correct page ranges.
- [ ] Fresh visits initialize with an empty collection (`{}`) without pre-checked starter cards.
- [ ] `npm run sync:pokedex` script queries PokeAPI species count and validates current dataset parity.
- [ ] Backend route `GET /api/pokedex/sync-check` returns status, speciesCount, and parity boolean.
- [ ] Application builds without errors (`npm run build`).

## Blocked by
- None — can start immediately
