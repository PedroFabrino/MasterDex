# Spec: Shared Binder Collection

## Problem Statement

Pokémon TCG collectors using MasterDex invest significant effort into curating their master binder, selecting specific card print artworks, languages, and tracking their collected species across all nine generations. Currently, collections are either confined to local browser storage or accessible only when authenticated to the personal account. There is no mechanism for collectors to share their binder with friends, trade partners, or online communities to showcase their progress, compare cards, or show uncollected species without compromising account security or giving others edit permissions.

## Solution

Introduce a secure, read-only Shared Binder experience. Every authenticated Collector Profile is assigned a persistent, unguessable Share Slug (e.g., `md-a1b2c3d4`) with a collector-controlled Sharing State toggle (Private by default). When enabled, external visitors can access the collector's live binder at `/share/:shareSlug` in a dedicated Public Binder View. The public view features an attribution banner with the collector's profile name, avatar, and completion statistics, along with full interactive read-only exploration across all nine regions, search, and high-resolution card artwork inspection, while strictly stripping all mutation controls and keeping internal personal data (email, Google ID, database keys) sanitized. If sharing is disabled or an invalid link is visited, a branded Public Binder Error View (Pokéball 404 empty state) is displayed.

## User Stories

1. As an authenticated collector, I want to open a "Share Binder" dialog from the application header, so that I can easily obtain my public binder link to share with others.
2. As an authenticated collector, I want my public sharing state to be private (disabled) by default, so that my collection is not visible to external visitors until I choose to share it.
3. As an authenticated collector, I want to toggle my Sharing State between Enabled and Disabled at any time from both the Share dialog and my profile settings, so that I can revoke public access whenever I desire.
4. As an authenticated collector, I want a single-click "Copy Link" button in the Share dialog, so that I can quickly copy my public share URL to my clipboard with immediate toast confirmation.
5. As an authenticated collector, I want a permanent, immutable Share Slug assigned to my profile, so that links I share in messages or forums continue working indefinitely as long as sharing remains enabled.
6. As an unauthenticated guest collector, I want clicking the "Share" button to prompt the sign-in modal with an explanation, so that I know signing in with Google is required to publish my binder while preserving my local collection.
7. As an external visitor with a valid share link, I want to access `/share/:shareSlug` without signing in, so that I can explore the collector's binder without needing an account.
8. As an external visitor, I want to see an attribution header displaying the collector's avatar, name, and total collection count (e.g., "742 / 1025"), so that I immediately know whose binder I am admiring and how complete it is.
9. As an external visitor, I want to navigate across all nine regions (Kanto through Paldea) and flip between binder pages, so that I can browse the collector's full National Dex seamlessly.
10. As an external visitor, I want to use Binder Search to quickly locate any Pokémon species by name, so that I can jump directly to that Pokémon's Binder Slot in the shared collection.
11. As an external visitor, I want to clearly distinguish collected Binder Slots (displaying the collector's Assigned Card Artwork) from uncollected slots (faded/grayscale default sprites), so that I can understand which cards the collector still needs.
12. As an external visitor, I want to click any collected Binder Slot to open a read-only detail view of the Assigned Card Artwork (including high-resolution image, set name, card number, and print language), so that I can see the exact card print the collector chose.
13. As an external visitor, I want all editing capabilities (marking cards collected, unmarking, swapping card artwork, importing backups) to be completely disabled and hidden in the Public Binder View, so that I cannot accidentally or maliciously modify the owner's collection.
14. As an external visitor who does not own a MasterDex account, I want a prominent "Create your own MasterDex" call-to-action in the banner, so that I can start tracking my own Pokémon collection.
15. As an external visitor who is already logged into my own MasterDex account on that browser, I want a "Back to My Binder" button in the header, so that I can quickly return to managing my own collection.
16. As an external visitor following a link where sharing is disabled or the slug is invalid, I want to see a polished Public Binder Error View with a styled Pokéball graphic explaining that the binder is private or unavailable, so that I understand why the page cannot be displayed instead of seeing a broken screen.
17. As an international collector, I want all labels, buttons, tooltips, dialogs, and error messages for the sharing feature to be fully translated in both Portuguese (pt-BR) and English (en-US), so that the interface respects my language preference.

## Implementation Decisions

- **Schema Extension**: Extend the `collector_profiles` table with two fields:
  - `share_slug`: text, unique, indexed, populated with an unguessable alphanumeric slug (e.g., `md-` prefixed random 10-character string).
  - `is_public`: integer (boolean mode), defaulting to `false`.
- **Repository Seam**: All database interactions are encapsulated inside `CollectorRepository`:
  - `getPublicSharedBinder(shareSlug)`: Resolves public profile details and collected slot items. Strictly returns sanitized public data (`name`, `avatarUrl`, `shareSlug`, and list of collected `userPokemon` items). It never exposes `email`, `googleId`, internal primary key, or preferences.
  - `updateSharingState(userId, isPublic)`: Updates the boolean flag for the collector.
  - `ensureShareSlug(userId)`: Guarantees every user has an immutable share slug upon sign-in or migration.
- **Backend API Seam**:
  - `GET /api/share/:shareSlug`: Public unauthenticated endpoint returning the sanitized binder payload if `is_public` is true; otherwise returns 404 with `{ error: "Binder not found or private" }`.
  - `GET /api/collector/sharing`: Authenticated endpoint returning `{ isPublic, shareSlug, shareUrl }`.
  - `PATCH /api/collector/sharing`: Authenticated endpoint accepting `{ isPublic: boolean }`.
- **Client Route & View Resolution**:
  - Path-based URL routing `/share/:shareSlug` with SPA path detection in `App.tsx` (with fallback parsing for `?share=` and `#share/`).
  - When in public view mode, renders `PublicBinderView` instead of the editing binder/investor dashboard.
  - Read-only card inspection modal reuses the visual preview of `CardSelectorModal` in inspection-only mode without search or selection buttons.
  - When the API returns 404/error, renders `PublicBinderErrorView`.
- **Share Management UI**:
  - `ShareBinderModal` component invoked from the `AppHeader` "Share" button.
  - Profile modal (`AuthModal`) updated with the public sharing toggle and link copy button for unified settings management.
- **Strict Internationalization**:
  - New translation namespaces in `src/i18n/locales/pt-BR.json` and `src/i18n/locales/en-US.json` covering all user-facing strings (e.g. `share.modalTitle`, `share.enableToggle`, `share.copiedToast`, `share.publicBanner`, `share.errorTitle`).

## Testing Decisions

- **Backend Seam Verification**:
  - Test `GET /api/share/:shareSlug` against the Hono app instance:
    - Returns 200 with sanitized data when `is_public` is true.
    - Returns 404 when `is_public` is false.
    - Returns 404 when `shareSlug` does not exist.
    - Verifies that private fields (`email`, `googleId`, internal user `id`) are completely absent from the response.
    - Verifies that `PATCH /api/collector/sharing` correctly toggles state in SQLite.
- **Frontend Component & Integration Tests**:
  - Test `ShareBinderModal`: toggling switch triggers API call; clicking copy copies formatted URL.
  - Test `PublicBinderView`: renders collector banner, pages, and read-only card inspection.
  - Test `PublicBinderErrorView`: renders branded 404 message when binder is private.

## Out of Scope

- Forking / cloning another collector's binder into the visitor's account.
- Dynamic side-by-side binder comparison highlights between visitor and owner.
- Password-protected or expiring temporary share links.
- Public comments, likes, or visitor view counters.
- Server-side rendered OpenGraph image generation.

## Further Notes

- Existing users in the database without a `share_slug` will automatically have one generated upon first API request or migration without breaking existing data.
- The feature adheres strictly to the project line count limits (components, services, routes <= 400 lines) and the zero-hardcoded-strings i18n directive.
