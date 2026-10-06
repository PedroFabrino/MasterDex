# 0001-revamp-to-monorepo-spa-and-backend

## Context
The application originated as a static client-only Vue 3 SPA hosted on GitHub Pages, tracking National Dex Pokémon species and synchronizing directly to Google Sheets via client-side OAuth popups. Introducing Pokémon TCG expansion investment analysis (SA+ secret rare counts, real-time market pricing in BRL, and investment score calculations) requires web scraping and data aggregation from sources like `cartasdepokemon.com.br`. In a browser-only environment, this hits CORS restrictions, high client memory overhead, and ephemeral local storage limitations.

## Decision
We are revamping the architecture into a monorepo containing a client SPA (`apps/web`) and a server backend (`apps/api`):
1. **Topology**: npm/pnpm workspaces separating `apps/web` (Vue 3 + Vite + Tailwind) and `apps/api` (Node.js + TypeScript).
2. **Backend Role**: Responsible for external web scraping, PDF parsing, pricing aggregation, investment score computation, and storing user collections.
3. **Database Seam**: Drizzle ORM with strict repository seams (`repositories/`) for all database operations.
4. **Authentication & Persistence**: Google OAuth authentication with database collection storage, seeded on first connection from the user's existing Google Sheet.
5. **Deployment Target**: Vercel-compatible serverless backend and SPA, or containerized Docker deployment.

## Consequences
- Eliminates browser CORS issues for TCG expansion scraping and pricing.
- Replaces client-side Google Sheet latency and rate limits with indexed database queries.
- Requires cloud/server hosting (Vercel or Docker) instead of static GitHub Pages.
