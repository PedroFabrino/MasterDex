## Parent
#18

## What to build
Harden backend authentication and prevent unauthenticated IDOR access:
- Require and verify Google ID tokens (`credential`) on `POST /api/auth/google`. Reject payload combinations lacking valid `credential` tokens to eliminate arbitrary account impersonation (especially the admin creator account).
- Implement session verification and profile ownership checks on collection mutation endpoints (`/api/collection/:pokemonId`, `/api/collection/batch`, `/api/collection/seed-*`) rather than blindly trusting client-supplied `userId`.
- Isolate unauthenticated guest mode in the frontend, preventing guest sessions from falling back to `"pedro"` and accidentally overwriting Pedro's live database collection.

## Acceptance criteria
- [ ] `POST /api/auth/google` rejects unauthenticated payloads lacking a cryptographically valid `credential` ID token.
- [ ] Requests to mutate collections for a given profile require verified identity matching the target `userId`.
- [ ] Unauthenticated frontend state uses an explicit guest context and never writes to profile `"pedro"` in `local.db`.
- [ ] All auth and collection tests pass with 100% green status, including regression tests for token verification.

## Blocked by
- #19
