## Parent
#27

## What to build
Build a dedicated Collector Settings Page/modal allowing collectors to configure their personal Google Gemini API key (`GEMINI_API_KEY`) under a Bring Your Own Key (BYOK) model. Also allow configuring Favored Card Languages (priority ordering of languages like `PT`, `EN`, `JA` shown in the Card Selector). The API key is securely persisted in the database profile (and `localStorage` for guests) with a test button to verify key connectivity against Gemini API before scanning.

## Acceptance criteria
- [ ] Database schema in `schema.ts` includes `gemini_api_key` and `favored_languages` columns on `collector_profiles` (with defensive migration in `server/db/index.ts`).
- [ ] `GET /api/collector/settings` returns masked settings (e.g. `AIzaSy...****`) and favored languages.
- [ ] `PATCH /api/collector/settings` updates Gemini API key and favored languages in the repository seam.
- [ ] `POST /api/collector/settings/test-key` verifies key validity against Gemini API and returns success or error details.
- [ ] Collector Settings dialog accessible from the user profile menu in the application header.
- [ ] Secure input with show/hide password toggle for the Gemini API key.
- [ ] Full localization in both `en-US` and `pt-BR` via `useTranslation()`.
- [ ] Automated tests cover settings persistence and key validation behavior.

## Blocked by
- None — can start immediately
