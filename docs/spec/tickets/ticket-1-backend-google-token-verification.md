## Parent
#10

## What to build
Provide a secure backend Google authentication endpoint `POST /api/auth/google` that accepts a Google ID token (`credential`), verifies it cryptographically against Google's `tokeninfo` endpoint (checking expiry, issuer, and client ID audience), upserts the `collector_profiles` record in libSQL, and automatically seeds 629 collected Pokémon from the seed dataset if the verified email matches `SEED_ADMIN_EMAIL` (defaulting to `pfabrino@gmail.com`).

## Acceptance criteria
- [ ] `POST /api/auth/google` accepts `{ credential: string }` and queries Google's `https://oauth2.googleapis.com/tokeninfo?id_token={token}`.
- [ ] Validates token expiration and verifies `aud` strictly matches `VITE_GOOGLE_OAUTH_CLIENT_ID` (or env config).
- [ ] Rejects invalid, expired, or audience-mismatched tokens with HTTP 401/400.
- [ ] Extracts verified Google user fields (`sub` as googleId, `email`, `name`, `picture` as avatarUrl) and upserts `collector_profiles`.
- [ ] Checks verified email against `SEED_ADMIN_EMAIL` (defaulting to `pfabrino@gmail.com`); if matched and `seededFromSheet = false`, automatically seeds 629 collected Pokémon into `user_pokemon` from bundled `collectorSeed.json` and marks profile as seeded.
- [ ] Automated tests cover valid token verification, audience verification, creator seed auto-injection, and rejection of invalid tokens with mocked Google tokeninfo responses.

## Blocked by
None — can start immediately
