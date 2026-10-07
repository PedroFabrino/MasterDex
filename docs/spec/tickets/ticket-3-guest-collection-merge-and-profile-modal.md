## Parent
#10

## What to build
Deliver seamless guest-to-cloud collection merging upon sign-in with "newer takes priority" conflict resolution, eliminate all mock testing fixtures ("Perfil Oficial do Pedro" and manual forms) from the UI, and replace the auth modal with a production Profile Modal that opens when clicking the header avatar, providing verified account inspection, cloud sync status, and a reliable "Sign Out" action.

## Acceptance criteria
- [ ] Completely remove all mock fixtures ("Perfil Oficial do Pedro", manual "Nome" and "E-mail Google" input fields) from the application.
- [ ] When a guest user who has marked cards in local session logs in with Google, intelligently merge their local card marks with the retrieved cloud collection: local changes take priority over prior stored states, and newly added slots are synced to `PATCH /api/collection/:pokemonId`.
- [ ] Clicking the authenticated user's avatar button in the header opens a clean Profile Modal displaying their verified Google avatar, full name, email, cloud sync active indicator, and database ID.
- [ ] Profile Modal contains an explicit "Sign Out" button that clears `currentUser`, sets `masterdex_logged_out = "true"`, resets session collection state, closes the modal, and restores the header "Sign in with Google" button without loop flashing.
- [ ] Integration tests verify guest collection merge logic, profile modal interactions, and sign-out state resets.
- [ ] All modified modules strictly respect line count limits (components <= 400 lines, tests <= 500 lines) and `npm run test` passes.

## Blocked by
- #12
