## Parent
#1

## What to build
Port the backend architecture into `server/` inside MasterDex with shared types in `shared/`, connecting Hono REST API, libSQL / Turso database with Drizzle ORM, repository seam (`collectorRepository`, `expansionsRepository`), TCGdex search engine (`tcgdexService`), Cheerio scraper, and Vercel serverless adapter (`api/index.ts`).

## Acceptance criteria
- [ ] `shared/types.ts` created and exports `UserPokemon`, `TcgCardSearchResult`, `Expansion`, `Card`, `CollectorProfile`.
- [ ] `server/db/schema.ts` and `server/db/index.ts` setup Drizzle ORM and libSQL client with automatic migrations.
- [ ] `server/repositories/` contains `collectorRepository.ts` and `expansionsRepository.ts` (strictly respecting the repository seam).
- [ ] `server/services/tcgdexService.ts` ported with smart query parser and in-memory caching.
- [ ] `server/routes/` mounts health, tcg (with `/cards/search`), collection, and auth routes.
- [ ] `api/index.ts` and `vercel.json` configured for Vercel serverless function execution.
- [ ] Backend dependencies added to `package.json` (`hono`, `@hono/node-server`, `@libsql/client`, `drizzle-orm`, `zod`, `cheerio`).
- [ ] Production build (`npm run build`) and backend tests pass cleanly.

## Blocked by
None — can start immediately
