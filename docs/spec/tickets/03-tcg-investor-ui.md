## Parent
#6

## What to build
Build the `/tcg-investor` view in `apps/web`. Render an expansion leaderboard matrix sorted by Investment Score, displaying columns for Expansion Name, Base/Secret Count, Top Chase Card with BRL price, Average Secret Price, and Secret Density. Include an "Add Expansion by URL" input form that triggers `POST /api/tcg/expansions/scrape`. Provide a slide-over modal or drawer that displays the visual grid of all SA+ secret rare cards for an expansion with images, rarities, and current prices.

## Acceptance criteria
- [ ] Dedicated navigation link and route `/tcg-investor` in the Vue SPA.
- [ ] Expansion leaderboard table/cards sorted by Investment Score with sorting options.
- [ ] "Add Expansion by URL" form with loading states and error handling for invalid URLs.
- [ ] Modal/drawer displaying the visual gallery of all secret cards (`local_id > base_count`) with prices in BRL.
- [ ] Components strictly adhere to line limit stop conditions (<= 400 lines).
- [ ] Responsive design on mobile and desktop matching the existing UI aesthetic.

## Blocked by
- #8
