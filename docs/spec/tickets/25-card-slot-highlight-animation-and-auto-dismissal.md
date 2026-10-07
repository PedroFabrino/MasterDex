## Parent
#32

## What to build
A visual Slot Highlight animation on `CardSlot` that visually accentuates a target Pokémon card slot with an animated amber/gold pulsing ring upon navigation. The highlight automatically centers or scrolls smoothly into view if the slot is out of viewport, persists for 2.5 seconds with graceful auto-dismissal, and dismisses immediately if the collector clicks the slot to open the Card Selector Modal.

## Acceptance criteria
- [ ] `CardSlot` accepts an `isHighlighted?: boolean` prop.
- [ ] When `isHighlighted` is true, the slot renders an amber/gold glowing pulse ring (`ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-pulse`).
- [ ] The highlight ring contrasts prominently against both uncollected slots, collected green borders, and assigned TCG purple badges.
- [ ] When highlighted, the slot element smoothly scrolls into view if positioned outside the current visible viewport.
- [ ] Highlight dismisses automatically after 2.5 seconds.
- [ ] Clicking on a highlighted slot immediately clears the highlight and opens the Card Selector Modal normally.
- [ ] Unit tests verify `isHighlighted` styling, scroll invocation, and dismissal behavior.

## Blocked by
- None — can start immediately
