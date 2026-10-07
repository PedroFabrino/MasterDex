# ADR 0006: Dual-Resolution Card Artwork Scans and Type-Safe Internationalization (i18n)

## Status
Accepted

## Context
1. **Card Artwork Network and Rendering Cost**:
   The Card Artwork Selector Modal loaded 24 full-resolution (`high.webp`) card scans (~100–350 KB each) simultaneously, consuming 3–7 MB per modal view. In addition, hard limits truncated the species search at 24 cards, preventing collectors from browsing full card variants for prolific Pokémon (e.g. Charmeleon, Pikachu, Mew).
2. **Hardcoded and Mixed-Language UI Copy**:
   The application exhibited inconsistent linguistic UX, mixing Portuguese ("Remover da Coleção", "Backup & Importação") with English ("Select Card Artwork", "Empty Slot", "TCG Card"). Furthermore, string literals were scattered throughout React components without a centralized translation architecture.

## Decision

### 1. Dual-Resolution Card Artwork (`imageUrl` and `thumbnailUrl`)
- Extend card search results with both:
  - `thumbnailUrl`: Lightweight `/low.webp` scan (~20–40 KB, ~245×342 px) optimized for responsive selector grids and compact previews.
  - `imageUrl`: Master `/high.webp` scan (~734×1024 px) preserving high fidelity for assigned Binder Slots and expanded inspection.
- The Card Selector Modal renders `thumbnailUrl` for grid tiles, reducing network payloads by ~85%.

### 2. Incremental Paginated Card Loading (Lazy Loading)
- Relax the server query cap and introduce pagination support (`offset` and `limit`) with an initial batch of 24 cards.
- Implement lazy loading (infinite scroll / load more on demand) in `CardSelectorModal` to traverse through all available cards without truncating species catalogs.

### 3. Type-Safe Zero-Dependency i18n Architecture
- Build a lightweight native React Context provider (`I18nProvider`) with strong TypeScript typing (`Dictionary` contract).
- Maintain complete key parity between `pt-BR` and `en-US` in `src/i18n/locales/`.
- Compile-time checking (`tsc`) strictly prevents missing keys across both locales.
- Add an explicit directive in `AGENTS.md` forbidding hardcoded strings in UI components.

## Consequences
- **Positive**: Substantially faster modal rendering and drastically lower mobile data usage.
- **Positive**: Collectors can discover all historical cards for any Pokémon via incremental scrolling.
- **Positive**: Unified, consistent bilingual interface with instant locale switching and zero translation gaps.
