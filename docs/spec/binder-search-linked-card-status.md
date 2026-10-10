# Spec: Binder Search Linked Card Indicator and Collector Number Display

## Problem Statement

When using the `BinderSearchBar` component to look up a Pokémon species, collectors are presented with an autocomplete dropdown displaying species name, Pokédex number, sprite thumbnail, and target binder location. Currently, if a Pokémon is marked as collected without a physical card linked, it displays an emerald `Collected` badge. However, when a physical TCG card is assigned to that slot, the dropdown only renders a generic `TCG Card` badge without distinguishing the collection status or showing which specific card print or collector number (e.g. `172/132` or `4/102`) is assigned.

This creates ambiguity for collectors who manage extensive binders:
1. They cannot immediately tell from the search dropdown whether a specific card printing is linked versus a generic sprite or unassigned card.
2. They cannot see the collector number / set total (e.g. `172/132`, `4/102`) directly in the search results.
3. They cannot search by card collector number (e.g. searching `172/132` or `4/102`) to locate the corresponding species in their binder.

## Solution

1. **Enhanced Status Badge in Search Dropdown**:
   - For collected Pokémon with an assigned TCG card that includes a collector number, display a rich status badge: `Collected · {number}` (e.g., `Collected · 172/132` in English, `Capturado · 172/132` in Portuguese).
   - If a TCG card is assigned but lacks a specific collector number, display `Collected · TCG Card` (in English) / `Capturado · Carta TCG` (in Portuguese) as a clean fallback.
   - For Pokémon collected as default sprites (no physical TCG card assigned), retain the emerald `Collected` / `Capturado` badge.
   - For uncollected species, no status badge is rendered.

2. **Multifaceted Search Query Matching**:
   - Enhance `filterPokemonByName` to accept the optional collection state.
   - In addition to case-insensitive and diacritic-insensitive species name matching, support:
     - Exact Pokédex number queries (e.g. `25` or `#025` matches Pikachu).
     - Linked card collector number queries (e.g. typing `172/132` or `4/102` matches the Pokémon species whose assigned card matches that number).

3. **Collection Serialization & Preservation**:
   - Ensure `cardNumber` / `number` is preserved during collection mapping and merging across local storage, cloud sync, and backup JSON/CSV formats.

4. **Zero Hardcoded Strings & Parity Enforcement**:
   - Add localized keys `cardAssignedWithNumberStatus` and update `cardAssignedStatus` across `src/i18n/locales/en.ts` and `src/i18n/locales/pt.ts` with strict TypeScript typing in `src/i18n/types.ts`.

## User Stories

1. As a collector, when I search for a Pokémon in the binder search bar, I want to see if it is collected and which card collector number is linked (e.g. `Collected · 172/132`), so that I instantly know my collection status for that species.
2. As a collector, when a Pokémon is collected with only a placeholder sprite and no physical card linked, I want to see `Collected` (or `Capturado`), so that I know I still need to obtain a physical card.
3. As a collector, when a Pokémon is not yet collected, I want to see no collection badge in the search dropdown, keeping the interface clean.
4. As a collector, I want to search in the search bar by card collector number (e.g. `172/132` or `4/102`) to find the Pokémon species that owns that card.
5. As an international collector, I want all badge text to be localized in Portuguese (`Capturado · 172/132`) and English (`Collected · 172/132`) according to my language preference.

## Implementation Decisions

- **I18n Structure (`src/i18n`)**:
  - `en.ts`:
    - `binderSearch.cardAssignedStatus`: `'Collected · TCG Card'`
    - `binderSearch.cardAssignedWithNumberStatus`: `'Collected · {number}'`
  - `pt.ts`:
    - `binderSearch.cardAssignedStatus`: `'Capturado · Carta TCG'`
    - `binderSearch.cardAssignedWithNumberStatus`: `'Capturado · {number}'`
  - `types.ts`:
    - Update `binderSearch` interface with `cardAssignedWithNumberStatus: string`.

- **`BinderSearchBar.tsx`**:
  - Update `filterPokemonByName(list, query, collected?)` to optionally match by Pokédex ID and assigned card number.
  - Pass `collected` into `filterPokemonByName(POKEMON, query, collected)`.
  - In dropdown rendering:
    ```tsx
    {hasTcgCard ? (
      <Badge
        variant="outline"
        className="text-[9px] px-1.5 py-0 h-4 border-violet-500/60 text-violet-300 bg-violet-950/40"
      >
        <Sparkles className="size-2.5 mr-0.5 text-violet-400" />
        {slot?.tcgCard?.number
          ? t("binderSearch.cardAssignedWithNumberStatus", { number: slot.tcgCard.number })
          : t("binderSearch.cardAssignedStatus")}
      </Badge>
    ) : isCollected ? (
      <Badge
        variant="outline"
        className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/60 text-emerald-300 bg-emerald-950/40"
      >
        <CheckCircle className="size-2.5 mr-0.5 text-emerald-400" />
        {t("binderSearch.collectedStatus")}
      </Badge>
    ) : null}
    ```

- **Data Mapping (`src/lib/cardMapping.ts` & `src/lib/collectionMerge.ts`)**:
  - Ensure `RawCardData` and mapping functions accept and preserve `cardNumber` and `number`.

## Testing Decisions

- Unit tests in `tests/binderSearch.test.ts`:
  - Verify `Capturado · 4/102` / `Collected · 4/102` is rendered when a card with number is assigned.
  - Verify `Capturado` is rendered when a slot is collected without a card.
  - Verify uncollected Pokémon render no badge.
  - Verify search query matches species by Pokédex number and linked card collector number.
- Verify i18n parity in `tests/i18n.test.ts`.

## Out of Scope

- Modifying the visual appearance of `CardSlot.tsx` on the binder canvas.
- Adding full card details (e.g. card illustrator, holographic pattern description) to the search dropdown.
