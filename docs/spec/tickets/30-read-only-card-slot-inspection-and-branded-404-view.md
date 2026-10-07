## Parent
#36

## What to build
Complete the public viewing experience with read-only card artwork inspection and a branded 404 empty state. In `PublicBinderView`, clicking any collected slot opens a read-only inspection modal displaying the Assigned Card Artwork (high-resolution card scan, set name, collector number, and card print language) with all selection, replacement, and unmarking controls removed. If a visitor accesses a non-existent share slug, or a binder whose sharing state is disabled, render `PublicBinderErrorView` — a polished empty state featuring a Pokéball graphic, a "Couldn't find this binder" headline, an explanation that the binder may be private, and a CTA button to navigate to MasterDex. Ensure complete i18n parity in pt-BR and en-US.

## Acceptance criteria
- [ ] Clicking a collected card slot in `PublicBinderView` opens a read-only artwork inspection modal.
- [ ] Inspection modal displays high-resolution master scan, card name, expansion name, collector number, and print language.
- [ ] Inspection modal contains no edit buttons, "select card" options, or reset actions.
- [ ] When the public API returns 404 (private binder or invalid slug), `PublicBinderErrorView` is rendered.
- [ ] `PublicBinderErrorView` displays a styled Pokéball graphic, clear error message, and a button to return to the home dex.
- [ ] All error and modal strings are routed through `useTranslation` in pt-BR and en-US.
- [ ] Unit and component tests verify slot click opening inspection modal and 404 error rendering.

## Blocked by
- #39
