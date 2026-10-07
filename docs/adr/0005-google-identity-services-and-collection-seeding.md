# Google Identity Services Authentication and Collection Seeding Architecture

MasterDex authenticates collectors via Google Identity Services (GIS) OAuth 2.0 without requiring third-party write scopes. 

## Finalized Decisions
1. **Google Identity Provider**: Frontend uses `@react-oauth/google` initialized with `VITE_GOOGLE_OAUTH_CLIENT_ID`. Clicking "Sign in with Google" in the header directly triggers the Google OAuth popup without intermediate modal screens.
2. **Backend Token Verification**: `POST /api/auth/google` receives the ID token, queries `https://oauth2.googleapis.com/tokeninfo?id_token=...`, verifies expiration and audience matching `VITE_GOOGLE_OAUTH_CLIENT_ID`, and securely extracts user credentials (`sub`, `email`, `name`, `picture`).
3. **Creator Account & Auto-Seeding**: The backend checks `SEED_ADMIN_EMAIL` (defaulting to `pfabrino@gmail.com`). When this account logs in and has not been seeded, the server automatically populates their collection with the 629 cards from the Google Sheet seed dataset.
4. **Guest Merge with Conflict Resolution**: When a user logs in, any cards marked in the local session are merged into the profile with "newer takes priority" semantics before syncing with the backend database.
5. **No Mock Testing Artifacts**: All test fixtures ("Perfil Oficial do Pedro", mock forms) are completely excluded from the UI. When authenticated, clicking the user's avatar opens the profile inspector with cloud synchronization status and sign-out capabilities.
