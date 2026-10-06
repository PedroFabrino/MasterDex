# Spec: Pokemon Tracker & TCG Investor Monorepo Revamp

## 1. Background & Problem Statement
The current repository is a client-only static Vue 3 single-page application hosted on GitHub Pages that tracks Pokémon National Dex species (#1–1025) and synchronizes with Google Sheets.
The user wants to expand functionality into **Pokémon Trading Card Game (TCG) expansion investment analysis**, specifically evaluating sets based on **SA+ / Secret Rare** card values (cards whose collector number strictly exceeds the set's base count, e.g., 085/084 to 120/084 in *Escuridão Absoluta*).

Implementing this client-side hits several roadblocks:
1. Browser CORS restrictions prevent client-side scraping of price and set websites like `cartasdepokemon.com.br`.
2. Browser-only state and ephemeral storage lack relational querying, historical price tracking, and background scheduled refreshes.
3. Client-side Google Sheets API interaction requires intrusive OAuth popups on every device.

## 2. Goals & Non-Goals

### Goals
- **Monorepo Architecture**: Restructure into `apps/web` (Vue 3 + Vite + Tailwind SPA) and `apps/api` (Node.js + TypeScript + Hono) with npm/pnpm workspaces, ready for Vercel deployment.
- **TCG Expansion Analyzer & Ingestion Engine**:
  - Scrape and parse expansions from `cartasdepokemon.com.br` on-demand and via background refresh.
  - Automatically detect the expansion's `Base Count` (e.g. `_officialCards = 84`).
  - Extract all cards with `collector_number > base_count` as **Secret Rares (SA+)**, capturing card name, rarity, BRL market price, and image.
  - Compute a composite **Investment Score** (0–100) weighting chase card ceiling, average secret price, and secret density.
  - Record price points in `price_history` for trend analysis.
- **Unified Collector Profile & Google Sheet Auto-Seed**:
  - Google OAuth2 authentication verified by the backend.
  - Automatically detect and import the user's existing Google Drive spreadsheet (`"Pokemon Collection Tracker"` across `GEN 1` to `GEN 9`) into the database on first login.
  - Maintain the National Dex tracking experience backed by fast database queries.
- **Architectural Seams & Line Limits**: Enforce strict repository seams (`repositories/`) for all database operations and strict file line count stop conditions per `AGENTS.md`.

### Non-Goals
- Real-time stock broker trading or automated buying bots.
- Multi-currency conversions (focus strictly on Brazilian Real / BRL secondary market prices).
- Card grading evaluation (PSA/BGS condition multipliers).

## 3. Architecture & Monorepo Layout

```
PokemonTracker/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/      (PokemonCard, PokemonGrid, AppHeader, ExpansionCard, SecretCardGrid)
│   │   │   ├── views/           (DexTrackerView, TcgInvestorView, ExpansionDetailView)
│   │   │   ├── stores/          (pokemonStore, tcgStore, authStore)
│   │   │   ├── composables/     (useTcgExpansions, useCollection)
│   │   │   └── api/             (typed fetch client to /api)
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── api/
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema.ts     (Drizzle ORM schema)
│       │   │   └── index.ts      (libSQL connection)
│       │   ├── repositories/     (expansionsRepository, cardsRepository, collectorRepository)
│       │   ├── services/         (scraperService, investmentService, sheetSeedService, authService)
│       │   ├── routes/           (tcgRoutes, collectionRoutes, authRoutes)
│       │   └── index.ts          (Hono app entrypoint)
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── shared/
│       ├── src/
│       │   └── types.ts          (Pokemon, Expansion, Card, InvestmentMetrics, CollectorProfile)
│       └── package.json
├── docs/
│   ├── adr/
│   └── spec/
├── vercel.json                   (Routing: /api/* -> apps/api, /* -> apps/web)
├── Dockerfile                    (Containerized build alternative)
├── CONTEXT.md                    (Domain glossary)
├── AGENTS.md                     (Operational & architectural instructions)
└── package.json                  (Workspaces root)
```

## 4. Database Schema (Drizzle ORM + libSQL)

- **`collector_profiles`**:
  - `id`: text primary key (UUID)
  - `google_id`: text unique
  - `email`: text not null
  - `name`: text not null
  - `avatar_url`: text
  - `seeded_from_sheet`: integer boolean (default 0)
  - `created_at`: integer timestamp

- **`user_pokemon`**:
  - `id`: text primary key
  - `user_id`: text references `collector_profiles(id)`
  - `pokedex_id`: integer not null
  - `collected`: integer boolean not null
  - `updated_at`: integer timestamp

- **`expansions`**:
  - `id`: text primary key
  - `name`: text not null
  - `slug`: text unique not null
  - `series`: text
  - `url`: text not null
  - `base_count`: integer not null
  - `secret_count`: integer not null
  - `investment_score`: real not null (0-100)
  - `chase_card_name`: text
  - `chase_card_price`: real
  - `total_secret_pool_value`: real
  - `avg_secret_price`: real
  - `last_scraped_at`: integer timestamp

- **`cards`**:
  - `id`: text primary key
  - `expansion_id`: text references `expansions(id)`
  - `local_id`: integer not null
  - `name`: text not null
  - `rarity`: text not null
  - `image_url`: text
  - `market_price`: real not null
  - `is_secret`: integer boolean not null (local_id > base_count)
  - `types`: text

- **`price_history`**:
  - `id`: text primary key
  - `card_id`: text references `cards(id)`
  - `market_price`: real not null
  - `recorded_at`: integer timestamp

- **`tracked_expansions`**:
  - `id`: text primary key
  - `user_id`: text references `collector_profiles(id)`
  - `expansion_id`: text references `expansions(id)`
  - `added_at`: integer timestamp

## 5. Ingestion Engine & Investment Score Formula

### Extraction Algorithm (`scraperService.ts`)
1. Fetch target URL (e.g., `https://www.cartasdepokemon.com.br/megaevolucao/escuridao-absoluta`) via HTTP GET.
2. Parse HTML using `cheerio`:
   - Extract `_officialCards` from script tags as `base_count`.
   - Iterate over card elements matching `data-card-preview-item` / `data-card-id`.
   - Parse `local_id` (`data-card-local-id`), `name` (`data-card-name`), `rarity` (`data-card-rarity`), `image_url` (`data-card-image`), and `market_price` (`data-card-price`).
   - Flag `is_secret = (local_id > base_count)`.
3. Filter down to all `is_secret == true` cards.

### Investment Score Calculation
Let:
- $P_{max} = \max(\text{Secret Card Prices})$ (Chase Card Ceiling)
- $\bar{P} = \text{mean}(\text{Secret Card Prices})$ (Average Secret Rare Price)
- $D = \frac{N_{secret}}{N_{base}}$ (Secret Card Density Ratio)

Normalized component weights:
$$\text{InvestmentScore} = 0.40 \cdot \min(100, \frac{P_{max}}{10}) + 0.40 \cdot \min(100, \frac{\bar{P}}{1.5}) + 0.20 \cdot \min(100, D \cdot 200)$$
Result is clamped to a clean 0–100 scale, rewarding high chase ceilings, strong price floors, and generous secret rare density.

## 6. Authentication & Sheet Auto-Seed Flow
1. User clicks "Sign in with Google" in the SPA.
2. User authenticates via Google OAuth2; frontend sends credential/token to `POST /api/auth/google`.
3. Backend validates Google token, creates/fetches `collector_profile`.
4. If `seeded_from_sheet == false`:
   - Backend calls Google Drive API to search for `name = 'Pokemon Collection Tracker' and mimeType = 'application/vnd.google-apps.spreadsheet'`.
   - If found, reads values from `GEN 1!A2:C` through `GEN 9!A2:C`.
   - Upserts all entries where `COLLECTED == 'TRUE'` into `user_pokemon`.
   - Updates `collector_profile.seeded_from_sheet = true`.
5. Returns session JWT to SPA.

## 7. API Routes Contract
- `GET /api/tcg/expansions` — List all analyzed expansions with investment metrics and chase cards.
- `GET /api/tcg/expansions/:slug` — Detailed expansion data with all secret rare cards and price history.
- `POST /api/tcg/expansions/scrape` — Ingest or refresh an expansion by URL (`{ url: string }`).
- `GET /api/collection` — Retrieve authenticated user's tracked National Dex collection.
- `PATCH /api/collection/:pokemonId` — Toggle collected status (`{ collected: boolean }`).
- `POST /api/collection/reseed` — Manually re-trigger Google Sheet import.
- `POST /api/auth/google` — Google OAuth token exchange & session establishment.

## 8. Architectural Rules Compliance
- Hard stop line limits enforced:
  - API routes <= 400 lines
  - Services <= 400 lines
  - Vue views/components <= 400 lines
  - Composables <= 300 lines
  - Tests <= 500 lines
- Repository Seam: All Drizzle queries restricted exclusively to `apps/api/src/repositories/`.
- Knowledge Graph: `graphify update .` to be run after code modifications.
