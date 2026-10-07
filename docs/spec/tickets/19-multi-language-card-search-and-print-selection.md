## Parent
#24

## What to build
Enable collectors to search for and catalog Japanese, Chinese, and Korean cards directly from the Card Selector. The backend search service queries English and Japanese TCGdex datasets concurrently by default, falling back to Chinese if zero cards match. When selecting a card to represent a Binder Slot, the collector can select the physical Card Print Language (quick pills for `PT`, `EN`, `JA` plus a dropdown for other supported prints like `KO`, `ZH`, `ES`, `FR`, `DE`, `IT`). The assigned print language is saved in `user_pokemon.card_language` in SQLite and rendered as an authentic regional badge on card artwork tiles.

## Acceptance criteria
- [ ] Database schema in `schema.ts` includes `card_language` column on `user_pokemon` (with defensive migration in `server/db/index.ts`).
- [ ] `tcgdexService.ts` executes smart parallel queries across English (`EN`) and Japanese (`JA`) endpoints for general searches, and queries `/v2/{lang}/cards` when a specific language is requested.
- [ ] `GET /api/tcg/cards/search` supports `lang` query parameter (defaulting to `all`).
- [ ] `CardSelectorModal.tsx` provides Card Print Language selection: quick pills for primary languages (`PT`, `EN`, `JA`) and a dropdown for other supported prints (`KO`, `ZH-TW`, `ZH-CN`, `ES`, etc.).
- [ ] Assigned card tiles in the Binder display a distinct language badge (e.g., `JA`, `PT`, `KO`) indicating the physical card print.
- [ ] Collector's `updateCollection` API route and repository persist `cardLanguage`.
- [ ] Full localization in both `en-US` and `pt-BR` via `useTranslation()`.
- [ ] Code modifications satisfy line limits (Routes <= 400, Repositories <= 400, Components <= 400).
- [ ] Automated tests cover multi-language card search and print language assignment.

## Blocked by
- #25
