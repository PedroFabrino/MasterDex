## Parent
#41

## What to build
Automate LigaPokémon integration across expansions. Sets are mapped to LigaPokémon Portuguese edition codes using TCGdex Portuguese metadata, a static dictionary (`server/data/ligapokemonSets.json`), and an in-app override code stored in `expansions.ligapokemon_code`. The UI features a direct 1-click "Ver na LigaPokémon" external link on expansion cards and detail views. On-demand scraping parses card prices in BRL, caches results for 7 days in `card_prices`, and degrades gracefully with user toast notifications if LigaPokémon triggers Cloudflare anti-bot checks.

## Acceptance criteria
- [ ] Static mapping `server/data/ligapokemonSets.json` maps top modern booster sets to LigaPokémon edition codes.
- [ ] Schema adds `ligapokemon_code` column to `expansions` table to support manual in-app overrides.
- [ ] Direct 1-click external link (`https://www.ligapokemon.com.br/?view=cards/search&card=ed={CODE}`) rendered on ExpansionCard and ExpansionDetailModal.
- [ ] Backend scrape endpoint parses card prices in BRL into `card_prices` with provider `ligapokemon`.
- [ ] 7-day TTL cache prevents redundant scraping calls for the same expansion.
- [ ] Graceful fallback: If LigaPokémon request encounters anti-bot challenges or errors, the server logs a warning and returns status notifying the client without breaking card displays.
- [ ] Vitest test suite verifies edition code resolution, HTML scraping parser, TTL expiration, and fallback handling.

## Blocked by
- #42
