# 0002-libsql-and-hono-for-vercel-serverless

## Context
Deploying `apps/api` and `apps/web` to Vercel requires accommodating Vercel Serverless Functions. Standard Node server daemons (like long-running Express/Fastify instances) and local on-disk SQLite files (`better-sqlite3`) face cold start penalties and ephemeral, non-persistent filesystems in serverless execution. Additionally, rewriting the Vue 3 frontend to React/Next.js would discard existing components, stores, and styles.

## Decision
1. **Server Framework**: Use **Hono** in `apps/api`. Hono provides sub-millisecond overhead, native support for Vercel Serverless and Node runtimes, type-safe route definitions, and seamless REST endpoints.
2. **Database Engine**: Use **Drizzle ORM with libSQL (`@libsql/client` and `drizzle-orm/libsql`)**.
   - In local development: Operates directly against a local SQLite file (`file:local.db`).
   - In Vercel production: Connects to a cloud Turso database instance with persistent distributed storage.
3. **Frontend Preservation**: Maintain the Vue 3 + Vite SPA in `apps/web`, retaining all existing Pokémon collection components, while adding the new TCG Investor view.

## Consequences
- Preserves 100% of the existing Vue 3 codebase without rewriting to React.
- Zero local database setup friction (runs local SQLite in dev).
- Production database persistence unblocked on Vercel serverless.
- Full compliance with the repository seam rule in `AGENTS.md`.
