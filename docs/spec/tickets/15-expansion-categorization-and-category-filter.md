## Parent
#14

## What to build
Categorize all 220+ Pokémon TCG expansions in MasterDex into Booster Expansions vs Promotional Collections. Default the TCG Investor dashboard to displaying only Booster Expansions so that non-booster promo compilations (such as SWSH Black Star Promos, McDonald's Collections, and POP Series) no longer clutter the investment analysis and collection gap yields. Provide an Expansion Category Filter dropdown in the control bar allowing collectors to toggle between Booster Expansions (default), Promotions & Subsets, or All Expansions, with complete English and Portuguese localization.

## Acceptance criteria
- [ ] Catalog service and expansions repository deterministically categorize expansions into `booster` vs `promo` based on set IDs (suffix `p`, `pop*`, `tk-*`, `wp`, `bp`, `np`, `miscp`) and promo naming keywords.
- [ ] `GET /api/tcg/expansions` supports a `category` query parameter (`booster` | `promo` | `all`), defaulting to `booster`.
- [ ] TCG Investor dashboard renders an Expansion Category Filter dropdown in the control bar with options `Booster Expansions` (default), `Promotions & Subsets`, and `All Expansions`.
- [ ] Switching categories immediately updates the displayed expansion cards and set counts without full-page reload.
- [ ] All new interface copy is localized with strict parity in both `pt-BR` and `en-US` via `useTranslation()`.
- [ ] Automated tests verify category filtering on the API and promo set exclusion from booster results.
- [ ] Code modifications satisfy line limits (Routes <= 400, Repositories <= 400, Components <= 400).

## Blocked by
- None — can start immediately
