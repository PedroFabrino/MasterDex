## Parent
#10

## What to build
Integrate the official Google Identity Services (GIS) SDK on the frontend using `VITE_GOOGLE_OAUTH_CLIENT_ID`. When the user clicks "Sign in with Google" in the application header, directly trigger the authentic Google authentication popup, exchange the received ID token with the backend `POST /api/auth/google`, and update the UI to display the collector's verified Google avatar and name in the header.

## Acceptance criteria
- [ ] Load the official Google Identity Services client script (`https://accounts.google.com/gsi/client`) asynchronously and safely handle loading/initialization states.
- [ ] Initialize the GIS client with `VITE_GOOGLE_OAUTH_CLIENT_ID` from the environment.
- [ ] Clicking "Sign in with Google" in `AppHeader.tsx` / `UserMenu.tsx` directly opens the Google OAuth prompt without intermediate modal dialogs.
- [ ] On Google sign-in response, passes the credential ID token to `POST /api/auth/google`.
- [ ] On successful backend authentication response, updates `currentUser` state, saves user profile to local storage, and clears the logged-out flag.
- [ ] Header displays the authenticated collector's Google profile picture (with fallback avatar) and first name with the active connection pulse indicator.
- [ ] Component and integration tests verify unauthenticated button click, GIS trigger invocation, error handling, and header profile rendering.

## Blocked by
- #11
