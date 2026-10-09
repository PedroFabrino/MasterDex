## Parent
#46

## What to build
Render condition visual indicators on binder slots and provide transparent valuation disclosures in the Portfolio Modal. On `CardSlot.tsx`, display a subtle condition badge (e.g. `D`, `HP`, `MP`, `LP`) next to the language badge only when the card is non-NM, leaving NM cards visually clean. In `PortfolioModal.tsx`, display the condition badge on valued cards and show a detailed derivation indicator/tooltip disclosing how the valuation was achieved (verified Liga quote, nearest-condition interpolation, or baseline discount). Ensure full public shared binder support and type-safe internationalization.

## Acceptance criteria
- [ ] `CardSlot.tsx` displays condition badge (e.g., `D`, `HP`) alongside language badge when `cardCondition !== 'NM'`; no badge is rendered for `NM` cards.
- [ ] `PortfolioModal.tsx` lists top chase cards with condition pills and accurate condition-adjusted prices in BRL and USD.
- [ ] `PortfolioModal.tsx` displays price derivation context (e.g., `Liga (D) — R$ 1.300`, `Liga (Baseado em HP) — R$ 1.200`, or `Estimado (30% de NM)`).
- [ ] Public shared binder accurately reflects condition badges and calculated portfolio worth for visitors.
- [ ] Zero hardcoded user-facing strings: complete parity across `pt-BR` and `en-US` dictionaries.
- [ ] End-to-end and component tests pass verifying visual rendering and valuation accuracy.

## Blocked by
- #49
