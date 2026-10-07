# Spec: Card Selector Rarity Filtering and Multi-Language Search

## Problem Statement

When assigning cards to a Binder Slot in the Card Selector Modal, collectors encounter two major friction points:
1. **Lack of Rarity Filtering**: The modal only offers freeform text search. A collector chasing a specific rarity tier (e.g. Illustration Rare+ or Secret Rare) must either scroll through dozens of standard cards or manually memorize and type the collector code. Furthermore, when typing an exact collector number (e.g. `129`), the collector wants to see all cards matching that code across all rarities, rather than having it restricted.
2. **Missing Multi-Language / International Cards**: The backend search service hardcodes the English endpoint (`/v2/en`), completely hiding Japanese, Chinese, and Korean prints. Many collectors own authentic Japanese, Korean, or Chinese cards (including regional promos and art exclusives). Additionally, collectors cannot specify which physical language print (`PT`, `EN`, `JA`, `KO`, `ZH`, etc.) their owned card is, nor configure their favored languages for rapid selection.

## Solution

1. **Card Selector Rarity Filter & Code Query Bypass**:
   - Add a Target Rarity Filter dropdown to the Card Selector Modal with options: `Any Rarity`, `Holo Rare+`, `Ultra Rare+`, `Illustration Rare+`, `Secret Rare`.
   - Default the selector to the collector's persisted `targetRarity`.
   - Implement smart code query bypass: if the user types a collector number or fraction (e.g. `129` or `129/103`), the rarity filter is automatically overridden to query ALL rarities matching that number.
2. **Multi-Language Search & Print Language Selection**:
   - Update `tcgdexService.ts` to perform smart parallel queries across English (`EN`) and Japanese (`JA`) endpoints by default, and fall back to Chinese (`ZH-TW`) if zero results are returned.
   - When assigning a card to a Binder Slot, allow the collector to select the Card Print Language: quick pills for primary languages (`PT`, `EN`, `JA`) and a dropdown for other supported prints (`KO`, `ZH-TW`, `ZH-CN`, `ES`, `FR`, `DE`, `IT`).
   - Persist the selected `card_language` in the collector's `user_pokemon` record alongside `cardId` and artwork.
   - Display a distinct language print badge on card artwork tiles.
   - Support collector-configured `favoredLanguages` so preferred languages appear first as quick pills.

## User Stories

1. As a collector, I want the Card Selector Modal to display a Rarity Filter dropdown defaulting to my configured Target Rarity, so that high-tier cards are immediately surfaced when I open any Pokémon slot.
2. As a collector, I want typing a collector number (e.g., `129` or `129/103`) to automatically bypass the rarity filter and search across all rarities, so that I can immediately match my exact card without changing dropdown filters.
3. As a collector, I want searching for Pokémon cards to return Japanese prints and exclusive sets alongside Western releases, so that my Japanese cards (like VSTAR Universe or SV Promos) appear in search results.
4. As a collector, I want searching by code to query Chinese and Korean datasets when English/Japanese queries yield no match, so that Asian-exclusive releases can be identified.
5. As a collector, I want to select the physical print language of my owned card (e.g. PT, EN, JA, KO, ZH) when assigning it to a Binder Slot, so that my collection accurately reflects the physical cards I own.
6. As a collector, I want quick-selection pills for PT, EN, and JA with a dropdown for all other languages, so that selecting the most common card prints takes only 1 click.
7. As a collector, I want assigned card tiles to display an authentic language badge (e.g., `JA`, `PT`, `KO`), so that I can see the regional print at a glance in my binder.
8. As a collector, I want all selector labels, tooltips, and language names to be fully localized in both English (`en-US`) and Portuguese (`pt-BR`).

## Implementation Decisions

- **Card Selector Modal Seam**:
  - Add `rarity` state to `CardSelectorModal.tsx` initialized with collector's `targetRarity`.
  - Parse query for numbers/fractions (`parseQuery`): if localId/total exists, bypass rarity constraint on the backend request.
- **Backend Search Multi-Language Seam**:
  - `GET /api/tcg/cards/search`: Add `lang` query parameter (default `all`).
  - When `lang=all`: Execute `tcgdexService` parallel requests to `/v2/en` and `/v2/ja`. If 0 cards returned, fallback to `/v2/zh-tw`. Merge results and annotate each with `lang: 'en' | 'ja' | 'zh-tw' | 'ko' | 'pt'`.
  - When specific `lang` is requested: Query `/v2/{lang}/cards` directly.
- **Card Print Language Persistence**:
  - Add `card_language` (text, default `'en'`) to `user_pokemon` table in `server/db/schema.ts` and update `collectorRepository`.
  - Update `updateCollectionSchema` in `collectionRoutes.ts` to accept `cardLanguage?: string`.
  - Persist `favoredLanguages` (string array JSON, default `['pt', 'en', 'ja']`) in collector preferences.
- **Architectural Line Limits & i18n**:
  - Keep `CardSelectorModal.tsx` <= 400 lines (extract `CardLanguageSelector.tsx` if needed).
  - Add all new strings with 100% parity across `pt-BR` and `en-US` in `src/i18n`.

## Testing Decisions

- Test `GET /api/tcg/cards/search` returns both EN and JA cards for Pikachu.
- Test `GET /api/tcg/cards/search` with code bypass returns cards across all rarities for a given localId.
- Test `collectorRepository.setUserPokemon` saves and returns `cardLanguage`.
- Test `CardSelectorModal` obeys 400-line limit and renders language pills.

## Out of Scope

- Automatic optical translation of card attack text.
- Full offline downloading of all international card JSON datasets.
- Scraping Brazilian secondary market prices for Japanese/Chinese exclusive promos.
