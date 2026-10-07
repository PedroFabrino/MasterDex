## Parent
#14

## What to build
Empower collectors to hide any individual expansion directly from their active TCG Investor leaderboard with a 1-click eye-off button on each card. Muted sets are smoothly transitioned into a collapsible Hidden Expansions Tray placed below the main grid, displaying a count badge (e.g. "Hidden Expansions (3)") and enabling instant set restoration via an "Unhide Set" button on each card. Searching in the dashboard bypasses hiding so collectors can search for any muted set by name and unhide it directly with a visible "Hidden" status badge.

## Acceptance criteria
- [ ] Active expansion cards feature a "Hide Set" eye-off action button.
- [ ] Muting a set removes it from the main active grid, adds it to the user's persisted `hiddenExpansions` list, and updates the hidden count.
- [ ] A dedicated, modular `HiddenExpansionsTray` component renders at the bottom of the dashboard when hidden sets exist, expandable/collapsible with a toggle.
- [ ] Cards rendered in the Hidden Expansions Tray feature an "Unhide Set" eye-on button that restores them to the main leaderboard.
- [ ] Searching by query matches across all expansions regardless of hidden status; matching hidden sets display a distinct "Hidden" badge and an inline unhide button.
- [ ] All new interface copy, tooltips, and badges are strictly localized with key parity across `pt-BR` and `en-US`.
- [ ] Component sizes remain strictly under architectural line count limits (all <= 400 lines).
- [ ] Automated tests verify hiding, unhiding, search bypass behavior, and preference synchronization.

## Blocked by
- #16
