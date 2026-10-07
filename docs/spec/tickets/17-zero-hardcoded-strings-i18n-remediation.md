## Parent
#18

## What to build
Attain complete compliance with the repository's strict internationalization (i18n) directive:
- Route all hardcoded strings in `src/components/AppHeader.tsx` (collection and TCG card counters and tooltips) through `useTranslation`.
- Localize `src/components/mode-toggle.tsx` ("Toggle theme", "Light", "Dark", "System") with dictionary keys.
- Localize hardcoded strings in `src/components/CardSlot.tsx` and fix the export success message in `src/components/import/FileBackupTab.tsx`.
- Guarantee 100% translation key parity between `pt-BR` and `en-US` with strict TypeScript dictionary types.

## Acceptance criteria
- [ ] Zero raw user-facing Portuguese or English strings exist directly inside JSX/TSX in `AppHeader.tsx`, `mode-toggle.tsx`, and `CardSlot.tsx`.
- [ ] Exporting collection JSON/CSV in `FileBackupTab.tsx` displays the correct export success message instead of the import success message.
- [ ] All new translation keys exist in both `src/i18n/locales/en.ts` and `src/i18n/locales/pt.ts` conforming strictly to `TranslationDictionary`.
- [ ] `tests/i18n.test.ts` passes with 100% key parity across all namespaces.

## Blocked by
- None — can start immediately
