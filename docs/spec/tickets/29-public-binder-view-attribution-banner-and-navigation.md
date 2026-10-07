## Parent
#36

## What to build
Build the public spectator experience for shared binders. When a user navigates to `/share/:shareSlug` (with query/hash fallback support), the client fetches the public binder payload from `/api/share/:shareSlug` and renders `PublicBinderView`. The view features an attribution top banner with the owner's avatar, name, and total collected stats (e.g. "742 / 1025"), alongside a "Create your own MasterDex" CTA (or "Back to My Binder" if the visitor has a local/logged-in session). The public view supports interactive navigation across all 9 Pokédex regions, pagination, and real-time species search, with all collection mutation controls, edit buttons, and preferences strictly hidden/disabled.

## Acceptance criteria
- [ ] Client router detects `/share/:shareSlug` and initiates public binder hydration.
- [ ] Attribution banner displays the collector's avatar, name, completion count, and percentage.
- [ ] If the visitor is logged in, a "Back to My Binder" button is displayed; if unauthenticated, a "Create your own MasterDex" button is shown.
- [ ] Visitors can freely switch between all 9 Pokédex regions and flip pages.
- [ ] Binder search allows real-time lookup and auto-scroll/jump to matching species.
- [ ] Collected slots display the Assigned Card Artwork while uncollected slots show default sprites.
- [ ] All card collection mutation actions (mark collected, unmark, edit artwork, import/export) are disabled.
- [ ] Zero hardcoded strings directive satisfied across pt-BR and en-US dictionaries.
- [ ] Component and routing tests verify public binder rendering, search, navigation, and absence of mutation triggers.

## Blocked by
- #37
