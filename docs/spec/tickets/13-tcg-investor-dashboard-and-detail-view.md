## Parent
#4

## What to build
Build the persistent header mode switcher between `PokéBinder` and `TCG Investor`, and implement the complete TCG Investor user interface (`TcgInvestorDashboard.tsx`). Provide an Expansion Catalog leaderboard default-ranked by Collection Gap Yield, Target Rarity dropdown (default: Any Rarity / All Cards), search/sort controls, an on-demand "Analisar Mercado" pricing scraper trigger, and an `ExpansionDetailModal` displaying all secret rare cards and BRL secondary market prices.

## Acceptance criteria
- [ ] Header includes a responsive mode switcher between `PokéBinder` and `TCG Investor`.
- [ ] Switching between modes preserves application state without full page reloads.
- [ ] TCG Investor leaderboard displays expansion cards with name, series, Collection Gap Yield badge, Investment Score badge, Top Chase Card (R$), and Secret Pool Value (R$).
- [ ] Target Rarity selector provides choices: Any Rarity (default), Holo Rare+, Ultra Rare+, Illustration Rare+, Secret Rare+.
- [ ] Changing Target Rarity re-queries the backend API and updates the ranked order of expansions.
- [ ] "Analisar Mercado" button allows users to trigger pricing scraping from LigaPokémon for unscraped sets.
- [ ] Clicking "Ver Secretas" opens `ExpansionDetailModal` showing high-resolution card artwork, collector numbers, rarities, and prices in BRL.
- [ ] Frontend adheres to line limit rules (< 400 lines per component).

## Blocked by
- #6
