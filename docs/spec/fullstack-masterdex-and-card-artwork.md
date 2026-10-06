# Spec: Fullstack MasterDex Architecture and Live TCGdex Artwork Integration

## 1. Summary
Integrate the complete backend architecture into **MasterDex** as a unified fullstack application with a clean folder structure:
- `server/`: Backend Hono REST API, libSQL / Turso database schema, repository seam, TCGdex search engine, expansion scraper, and Google Sheet auto-seeder.
- `shared/`: TypeScript domain contracts and interfaces shared across server and client.
- `src/`: React 19 + Vite + Tailwind v4 + shadcn/ui frontend (4x4 binder grid, sidebar navigation, card slots).
- `api/index.ts` & `vercel.json`: Vercel Serverless Function entrypoint for zero-friction cloud deployment.

Additionally, wire the interactive `CardSelectorModal.tsx` in the React frontend to live card searches via `GET /api/tcg/cards/search`, resolving queries like *"Mew ex 129/103"* directly to high-resolution TCGdex card scans while keeping the official Pokémon game sprite at position #1 (**Default Sprite Anchor**).

---

## 2. Directory Layout & Separation of Concerns

```
MasterDex/
├── api/
│   └── index.ts                 # Vercel serverless function entrypoint
├── server/
│   ├── db/
│   │   ├── schema.ts            # Drizzle ORM schema (profiles, user_pokemon, expansions, cards)
│   │   └── index.ts             # libSQL connection + auto-migrations
│   ├── repositories/
│   │   ├── collectorRepository.ts
│   │   └── expansionsRepository.ts
│   ├── services/
│   │   ├── tcgdexService.ts     # TCGdex API client & smart query parser
│   │   ├── scraperService.ts    # cartasdepokemon.com.br scraper
│   │   ├── investmentService.ts # 0-100 composite investment score
│   │   └── sheetSeedService.ts  # Google Sheets auto-seeder
│   ├── routes/
│   │   ├── tcgRoutes.ts         # /api/tcg/cards/search & expansion routes
│   │   ├── collectionRoutes.ts  # /api/collection & patch routes
│   │   ├── authRoutes.ts        # /api/auth/google
│   │   └── healthRoutes.ts      # /api/health
│   └── app.ts                   # Hono application factory
├── shared/
│   └── types.ts                 # Shared types (UserPokemon, TcgCardSearchResult, etc.)
├── src/
│   ├── components/              # CardSlot.tsx, CardSelectorModal.tsx, UI components
│   ├── data/                    # Regional Dex ranges & initial state
│   ├── App.tsx                  # 4x4 Binder view, pagination, sidebar
│   └── main.tsx
├── vercel.json                  # Routes /api/(.*) -> api/index.ts, /(.*) -> dist/$1
├── AGENTS.md
└── CONTEXT.md
```

---

## 3. Tracer-Bullet Tickets
1. **Ticket #1**: Backend server integration, libSQL database seam, and TCGdex search engine in `server/`.
2. **Ticket #2**: Wire `CardSelectorModal.tsx` to live TCGdex search and collection persistence.
