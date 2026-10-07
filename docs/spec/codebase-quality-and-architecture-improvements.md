# Spec: Codebase Quality, Architecture Seams, and Security Hardening

## Problem Statement

A comprehensive two-axis code review (Standards and Spec Conformance) of the MasterDex repository revealed critical security vulnerabilities, architectural seam inversions, Fowler code smells, and strict repository standard violations:

1. **Authentication Bypass & Broken Access Control (IDOR)**:
   - `/api/auth/google` accepts unverified credentials (`googleId` and `email` without `credential`), permitting arbitrary user impersonation, including the administrative creator (`pfabrino@gmail.com`).
   - `/api/collection` endpoints trust client-supplied `userId` query/body parameters without session verification, enabling unauthorized reads and writes across collector profiles.
   - Unauthenticated frontend sessions default to `"pedro"`, causing guest actions to pollute or overwrite the production administrator's collection in `local.db`.

2. **Repository Seam & Architectural Violations**:
   - `server/routes/healthRoutes.ts` directly executes raw SQL (`SELECT 1;`) instead of delegating to a repository, violating the core directive in `AGENTS.md` ("Repositories are the only place for database / ORM / data-store queries in the backend").
   - `ExpansionsRepository` has inverted domain responsibility: it imports `collectorRepository` and `investmentService` to perform business workflow orchestration inside a data-access class.
   - Backend services and repositories use `fs.readFileSync` to read large datasets (`tcgdexSetCards.json` - 6.2 MB, `pokedex.json`) from the frontend `src/data/` directory, creating fragile path couplings that fail in bundled serverless environments (Vercel).

3. **Internationalization (i18n) Non-Compliance**:
   - Hardcoded strings exist in `src/components/AppHeader.tsx`, `src/components/mode-toggle.tsx`, and `src/components/CardSlot.tsx`, directly violating the zero-hardcoded-strings directive in `AGENTS.md`.
   - Language parity and translation keys are missing for header progress indicators and export status notifications.

4. **Frontend God Component & State Sprawl**:
   - `src/App.tsx` (362 lines, approaching the 400-line hard stop limit) manages 10 separate `useState` hooks, inline raw fetches, and triggers N+1 individual PATCH HTTP requests inside a React state updater loop during cloud/local collection merges instead of calling the batch sync API.
   - Card mapping logic and fetch calls are duplicated across four distinct UI components without a centralized API client.

5. **Legacy / Dead Scraper Code**:
   - `scraperService.ts` and `/api/tcg/expansions/scrape` remain exposed despite ADR 0003 and ADR 0004 adopting TCGdex as the official Card Search Provider and Expansion Catalog.

## Solution

1. **Enforce Strict Authentication & Authorization**:
   - Require verified Google ID tokens on `/api/auth/google`. Reject payload combinations lacking valid `credential` tokens.
   - Introduce session authentication / token verification middleware on all `/api/collection` and `/api/collector` endpoints.
   - Cleanly isolate guest mode on the client: guests operate strictly in local memory and `localStorage` with a distinct `guest` identity, never defaulting to `"pedro"`.
2. **Restore Repository Seams & Service Architecture**:
   - Move database health checking into a repository method (`collectorRepository.pingDatabase()`) and remove `rawClient` imports from `healthRoutes.ts`.
   - Move collection gap yield orchestration from `ExpansionsRepository` into `investmentService` / `expansionService`, keeping `ExpansionsRepository` pure data access.
   - Move shared/backend JSON datasets into a dedicated `server/data/` or `shared/data/` directory outside `src/`, providing clean asset loading for Vercel serverless.
3. **Achieve 100% Internationalization (i18n) Parity**:
   - Remove all hardcoded Portuguese and English strings in `AppHeader.tsx`, `mode-toggle.tsx`, and `CardSlot.tsx`.
   - Add required translation keys to `en.ts` and `pt.ts` with strict TypeScript dictionary typing. Fix incorrect message in `FileBackupTab.tsx`.
4. **Decompose Frontend State & Extract Typed API Client**:
   - Extract collection state and synchronization into a dedicated `useCollection` hook (`src/hooks/useCollection.ts` <= 250 lines).
   - Use `/api/collection/batch` for syncing merged local slots instead of firing individual concurrent HTTP requests.
   - Create a typed API client (`src/lib/apiClient.ts`) to eliminate duplicated card mapping and untyped fetch calls.
5. **Deprecate or Remove Legacy Scraper Endpoints**:
   - Cleanly deprecate or restrict `/api/tcg/expansions/scrape` behind administrative authorization, removing unused external scraping modal triggers.

## User Stories

1. As a collector, I want my Google Sign-In to be cryptographically verified by the backend, so that nobody can impersonate my profile or modify my collection.
2. As a guest collector, I want my unauthenticated PokéBinder changes to stay on my local device without overwriting other users' collections in the database.
3. As a developer, I want all database queries to reside strictly inside repositories, so that the codebase complies with the documented repository seam architecture.
4. As an international collector, I want every button, progress label, header counter, and theme option to be localized in my active language (pt-BR or en-US) without hardcoded strings.
5. As a developer, I want backend services to load data assets from server-safe directories rather than frontend `src/` folders, so that production serverless deployments never fail.
6. As a developer, I want a centralized, typed API client and custom collection hook, so that `App.tsx` remains clean, modular, and well under the 400-line limit.
7. As a collector logging in with local cards, I want my cards to synchronize to the cloud in a single atomic batch request, so that network latency is minimized and data is not lost.

## Implementation Decisions

- **Authentication & Authorization**:
  - `server/routes/authRoutes.ts`: In production/testing, enforce that `credential` must be present. Verify token with `https://oauth2.googleapis.com/tokeninfo`.
  - Issue signed session tokens (JWT or secure HMAC profile session cookies/headers) or validated bearer tokens for collection mutations.
- **Repository Seams**:
  - `server/repositories/collectorRepository.ts`: Add `ping(): Promise<boolean>`.
  - `server/routes/healthRoutes.ts`: Delegate health checks to `collectorRepository.ping()`.
  - Refactor `ExpansionsRepository.getExpansionsWithYield` to decouple cross-repository queries into `investmentService`.
- **Dataset Relocation**:
  - Relocate `tcgdexSetCards.json` and server baseline sets from `src/data/` to `server/data/` or `shared/data/`.
- **i18n Dictionary Additions**:
  - Add `header.speciesProgressTooltip`, `header.tcgCardsCount`, `header.tcgCardsTooltip`, `theme.toggleTheme`, `theme.light`, `theme.dark`, `theme.system`, `backupModal.exportSuccess` to both `pt.ts` and `en.ts`.
- **Frontend Architecture**:
  - Create `src/lib/apiClient.ts` providing typed functions: `fetchCollection`, `patchSlot`, `batchSyncCollection`, `searchCards`, `fetchExpansions`.
  - Create `src/hooks/useCollection.ts` managing `collected` state, local storage persistence, guest isolation, and batch syncing.
  - Slim down `src/App.tsx` from 362 lines to ~180 lines.

## Testing Decisions

- **Security Verification**:
  - Unit test: Rejecting `/api/auth/google` requests that lack valid Google ID token credentials.
  - Unit test: Preventing guest collection mutations from affecting other profiles.
- **Seam & Architectural Proof**:
  - Verify zero `db` or `rawClient` imports outside `server/repositories/`.
  - Verify all 80+ existing vitest test suites pass with 100% green status.
  - Verify i18n test suite validates 100% parity across all new dictionary keys.

## Out of Scope

- Implementing third-party OAuth providers other than Google Identity Services.
- Full database migration away from SQLite/libSQL.

## Further Notes

- Sliced into vertical tracer-bullet refactoring tickets adhering strictly to the `AGENTS.md` vertical slice criteria and line limit rules.
