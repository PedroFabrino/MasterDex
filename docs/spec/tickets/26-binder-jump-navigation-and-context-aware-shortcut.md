## Parent
#32

## What to build
End-to-end integration of `BinderSearchBar` into `App.tsx` positioned directly above the binder book frame. Wires selection to calculate the target page (`Math.floor((pokemon.id - 1) / 16) + 1`), flip pages, update the active region, and trigger the Slot Highlight on the selected Pokémon. Implements the global context-aware `Ctrl+K` / `⌘K` keyboard shortcut: focusing the Binder Search when in PokeBinder mode, and focusing the `InvestorFilterBar` when in TCG Investor mode.

## Acceptance criteria
- [ ] `BinderSearchBar` is positioned above the binder book container in `App.tsx`.
- [ ] Selecting a Pokémon computes the target page (`Math.floor((pokemon.id - 1) / 16) + 1`) and navigates to that page.
- [ ] Active region is synchronized with the target page.
- [ ] Selected Pokémon slot triggers `isHighlighted={true}` on the target card slot for 2.5 seconds.
- [ ] Pressing `Ctrl+K` or `⌘K` while in PokeBinder mode focuses the Binder Search input.
- [ ] Pressing `Ctrl+K` or `⌘K` while in TCG Investor mode focuses the investor expansion filter input.
- [ ] Pressing `Escape` blurs and dismisses the search input and autocomplete popover.
- [ ] Integration tests verify end-to-end page jumps, region updates, highlight triggering, and shortcut focus behavior across both modes.

## Blocked by
- #33
- #34
