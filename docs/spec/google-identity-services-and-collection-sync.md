## Problem Statement

MasterDex users currently experience an incomplete and confusing authentication workflow. Unauthenticated visitors are presented with artificial mock fixtures and manual form inputs ("Perfil Oficial do Pedro", "Nome", "E-mail Google") rather than genuine, cryptographically secure Google authentication. There is no live integration with Google Identity Services (GIS) to validate user identity against Google's authentication servers.

Furthermore, collection data synchronization between local unauthenticated sessions and authenticated cloud profiles is disjointed. When the app creator signs in with their verified Google account, their 629-card seed collection from Google Sheets is not automatically linked to their real identity without developer CLI scripts. If visitors mark cards in their binder before signing in, their progress risks being lost or clobbered rather than merged intelligently.

## Solution

Deliver a production-ready, seamless Google Authentication and Cloud Collection Synchronization system using Google Identity Services (GIS).

Unauthenticated collectors are presented with a clean, standard Google Sign-In action in the header that directly initiates the official Google OAuth 2.0 authentication flow without intermediate modal barriers. The frontend exchanges the Google ID token credential with the backend API, which securely verifies the token signature, audience, and expiration with Google's verification servers (`tokeninfo`).

Upon successful verification, the backend upserts the collector profile. If the authenticated account matches the creator's configured email (`SEED_ADMIN_EMAIL`), the backend automatically seeds the collection with all 629 Pokémon from the official Google Sheet seed. When a visitor marks cards locally prior to logging in, the application merges their recent session updates into their cloud profile using conflict resolution where newer user marks take priority. All developer mock fixtures and artificial input forms are completely eliminated from the user interface.

## User Stories

1. As an unauthenticated collector, I want to see a prominent "Sign in with Google" button in the application header, so that I can easily connect my Google account.
2. As a collector, I want clicking the header "Sign in with Google" button to directly trigger the official Google Identity Services popup, so that I experience a fast, standard single-sign-on without intermediate popup dialogs.
3. As a collector, I want the application to load the official Google Identity Services SDK in the browser securely, so that authentication is performed directly against Google without third-party intermediaries.
4. As a security-conscious user, I want the application to only request basic profile identity scopes (`openid`, `profile`, `email`), so that I am not asked for invasive Google Drive or Google Sheets access permissions.
5. As a system administrator, I want the frontend to send the Google ID token credential to the backend authentication endpoint, so that authentication state is validated and established authoritatively on the server.
6. As a backend service, I want to verify Google ID tokens with Google's tokeninfo endpoint, checking audience, expiration, and issuer, so that spoofed or forged authentication requests are strictly rejected.
7. As a new collector logging in for the first time, I want my verified Google profile (ID, name, email, avatar image) to be stored in the database, so that my account persists across browser sessions.
8. As the application creator, when I sign in with my designated Google email (`SEED_ADMIN_EMAIL`), I want my collection to automatically populate with the 629 collected Pokémon from the official Google Sheet seed dataset, so that I do not need to manually run developer CLI scripts.
9. As a new non-admin collector, when I sign in for the first time, I want my collection to initialize cleanly without accidental seed injection, so that I can track my personal collection from scratch.
10. As a collector who marked several Pokémon in the binder while browsing as a guest, when I sign in with Google, I want my local card marks to merge into my account, so that I do not lose any progress made before logging in.
11. As a collector logging in whose local session conflicts with an existing cloud profile, I want the most recent changes to take priority, so that my newest card assignments are preserved.
12. As an authenticated collector, I want my profile avatar and first name displayed in the header with an active connection indicator, so that I know my session is live and synchronized.
13. As an authenticated collector, I want clicking my avatar in the header to open a profile dialog showing my verified name, email, and cloud sync status, so that I can inspect my active account details.
14. As an authenticated collector, I want an explicit "Sign Out" button inside the profile dialog, so that I can disconnect my Google session whenever desired.
15. As a collector who clicks "Sign Out", I want my session to clear immediately and remain logged out, so that the application never flashes or auto-authenticates me back in.
16. As a collector after signing out, I want the application header to immediately display the "Sign in with Google" button again, so that I can sign in as another user or browse as a guest.
17. As an end user, I want all mock forms, manual text fields, and "Perfil Oficial do Pedro" test cards removed from the interface, so that the application looks and functions like a professional production product.
18. As a developer, I want all authentication routes and collection sync behavior covered by automated tests, so that regressions in token verification or collection merge are prevented.

## Implementation Decisions

### 1. Google Identity Services Integration
- Use the official Google Identity Services client (`accounts.google.com/gsi/client`) initialized with the client ID configured in `VITE_GOOGLE_OAUTH_CLIENT_ID`.
- Expose the sign-in trigger directly from the header component.
- Handle token response via callback, dispatching to the backend API.

### 2. Server-Side Token Verification & Profile Provisioning
- The backend authentication route (`POST /api/auth/google`) accepts the Google ID token (`credential`).
- The backend queries Google's `https://oauth2.googleapis.com/tokeninfo?id_token={token}` endpoint, validating that:
  - The request succeeds with HTTP 200.
  - The `aud` field matches `VITE_GOOGLE_OAUTH_CLIENT_ID`.
  - The token has not expired (`exp` > current timestamp).
- Verified payload supplies `googleId` (`sub`), `email`, `name`, and `avatarUrl` (`picture`).
- The backend upserts the collector profile into `collector_profiles`.

### 3. Automatic Creator Collection Seeding
- The server checks if the verified user email matches `SEED_ADMIN_EMAIL` (defaulting to `pfabrino@gmail.com`).
- If matched and the profile has `seededFromSheet = false`, the server automatically seeds the user's collection from the bundled Google Sheet seed dataset (629 collected Pokémon) and marks `seededFromSheet = true`.

### 4. Client Collection Merge Logic
- On authentication success, client retrieves the cloud collection from `GET /api/collection?userId=...`.
- If the client session contains unauthenticated local card marks, the client performs a merge: any slot actively toggled in the local session is synchronized to the backend via `PATCH /api/collection/:pokemonId`.
- Updated collection state is saved to local storage and UI state.

### 5. Clean Profile Modal & Sign-Out
- Replace mock `AuthModal` contents with a clean profile inspection modal shown only when authenticated.
- Profile dialog displays Google avatar, full name, email address, cloud sync status indicator, and a prominent red "Sign Out" button.
- Signing out clears session tokens, sets the logged-out persistence flag, and resets collection state to guest mode.

## Testing Decisions

- **Backend API Seam (`POST /api/auth/google`)**: Test valid token verification, token rejection on mismatched `aud` or expired tokens, profile creation, and creator automatic seeding. Mock external network requests to Google's tokeninfo endpoint.
- **Collection Merge Seam**: Test that local guest card marks merge correctly into both new accounts and existing creator accounts.
- **Frontend Header & Profile Seam**: Test that unauthenticated state renders the Google Sign-In button, clicking triggers GIS prompt, authenticated state renders avatar, and signing out clears state cleanly without loops.

## Out of Scope

- Google Drive / Google Sheets user write permissions or Drive file picker (basic identity scopes only).
- Traditional username / password authentication (Google OAuth 2.0 is the sole identity provider).
- Multi-tenancy team sharing or collection collaboration across different users.

## Further Notes

- Architectural decisions recorded in `docs/adr/0005-google-identity-services-and-collection-seeding.md`.
- Domain terms updated in `CONTEXT.md` (`Google Identity Provider`, `Collector Profile`, `Collection Seed`).
