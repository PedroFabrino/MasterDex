## Parent
#36

## What to build
Provide a seamless sharing management interface for collectors. Add a dedicated "Share" button to the application header. For authenticated users, clicking it opens a `ShareBinderModal` (also mirrored in `AuthModal` / profile settings) allowing collectors to toggle their Public Sharing state ON/OFF, copy their public share link to the clipboard with instant toast notification, and open a test preview of their shared binder. If an unauthenticated guest clicks the "Share" button, prompt the Google Sign-in modal explaining that an account is required to publish a binder link. Ensure zero hardcoded strings with complete pt-BR and en-US translations.

## Acceptance criteria
- [ ] Application header includes a "Share" button with a share icon.
- [ ] Unauthenticated guests clicking "Share" are prompted with the Google Sign-in modal.
- [ ] Authenticated collectors clicking "Share" open `ShareBinderModal`.
- [ ] `ShareBinderModal` displays the Public Sharing toggle switch, reflecting the current state from the backend.
- [ ] Toggling the switch calls `PATCH /api/collector/sharing` and updates the collector's sharing state.
- [ ] A 1-click "Copy Link" button copies `https://<domain>/share/<shareSlug>` to clipboard with toast confirmation.
- [ ] Profile modal (`AuthModal`) mirrors the public sharing toggle and link copy button.
- [ ] All user-facing labels, buttons, and toasts are mapped through `useTranslation` in both `pt-BR` and `en-US`.
- [ ] UI component tests verify modal opening, toggle interaction, copy functionality, and guest auth prompt.

## Blocked by
- #37
