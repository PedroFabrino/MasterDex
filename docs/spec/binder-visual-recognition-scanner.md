# Spec: Binder Visual Recognition Scanner and BYOK Settings

## Problem Statement

Manually searching, verifying, and assigning cards one-by-one for a physical collection spanning hundreds or thousands of Pokémon cards in multi-page binders is tedious and time-consuming. Collectors often have physical 9-pocket (3x3), 12-pocket (4x3), or 4-pocket (2x2) binders containing their sets. 

However, running automated multi-page visual recognition using cloud Vision AI across thousands of user uploads creates unsustainable API billing costs if paid entirely by the application host. Without a "Bring Your Own Key" (BYOK) architecture, public scaling of a video/photo binder scanner is cost-prohibitive.

## Solution

1. **Collector Settings Page & BYOK Gemini API Key**:
   - Provide a dedicated Collector Settings Page/modal where collectors can configure personal preferences, language defaults, and their own Google Gemini API key (`GEMINI_API_KEY`).
   - Securely persist the key in collector settings, with a test ping button to verify connectivity.
   - Fall back to the server `.env` key for local development or admin sessions.
2. **Automated Binder Visual Recognition Pipeline**:
   - Allow collectors to scan their binder using a mobile-friendly **Live Camera Viewfinder** (with 3x3 / 4x3 overlay guides and tap-to-snap / stillness auto-capture) or by uploading batch page photos / video files.
   - Slices the page mathematically according to the selected pocket grid template (`3x3` 9-pocket, `4x3` 12-pocket, `2x2` 4-pocket).
   - Sends the high-resolution page to Google Gemini Vision AI in a single-pass prompt, returning structured JSON for all slots: Pokémon species name, National Dex ID (#1..#1025), set code, collector number, and confidence score.
3. **Staging Review Grid**:
   - Presents a visual pre-commit review grid matching the physical binder layout: original cropped slot photo side-by-side with matched MasterDex card art and confidence indicator.
   - Collectors can quickly correct any ambiguous slot using an inline search.
   - 1-click "Confirm All & Add to Binder" bulk-populates the collector's MasterDex with verified card artwork and ownership status.

## User Stories

1. As a collector, I want a Collector Settings view where I can input my own Google Gemini API key, so that I can run visual binder scans without burdening the host platform with AI costs.
2. As a collector, I want to test my Gemini API key with a 1-click test button in Settings, so that I know my key is valid before starting a scan.
3. As a collector, I want to select my physical binder pocket layout (3x3, 4x3, or 2x2), so that the scanner accurately segments my page into the correct card slots.
4. As a collector, I want a full-screen camera viewfinder with a grid overlay matching my binder, so that I can easily align each page and snap photos in seconds.
5. As a collector, I want camera auto-stillness capture or tap-to-capture with a multi-page queue counter, so that I can flip through dozens of binder pages without interrupting my flow.
6. As a collector, I want to upload batch photos or a video recording of my binder as an alternative to live camera scanning, so that I can scan pre-recorded videos or high-res photos.
7. As a collector, I want to review all detected cards in a Staging Review Grid matching my physical binder, so that I can verify matched Pokémon species and artwork before anything is saved.
8. As a collector, I want to click any mismatched slot in the staging grid and quickly select the correct card, so that recognition mistakes are corrected in seconds.
9. As a collector, I want a 1-click "Confirm & Add to Binder" button that bulk-persists all reviewed cards to my National Dex collection.
10. As an international collector, I want all scanner UI text, guides, error banners, and settings labels to be localized with 100% key parity in Portuguese (`pt-BR`) and English (`en-US`).

## Implementation Decisions

- **Collector Settings Seam & BYOK Storage**:
  - Add `gemini_api_key` (text, nullable, masked on return) and `favored_languages` (text JSON) to `collector_profiles` in `server/db/schema.ts`.
  - Expose `GET /api/collector/settings` and `PATCH /api/collector/settings`.
  - Provide `POST /api/collector/settings/test-key` validating the key against Gemini `models.list` or a lightweight probe.
  - Client stores key securely in `localStorage` for guest mode and database profile for authenticated collectors.
- **Backend Vision Service**:
  - `server/services/binderVisionService.ts`: Uses `@google/genai` or standard Gemini REST API with user's BYOK key (falling back to server `process.env.GEMINI_API_KEY`).
  - Structured prompt instructs Gemini Vision to return a JSON array for the page slots:
    ```json
    [
      { "slotIndex": 0, "pokedexId": 25, "pokemonName": "Pikachu", "collectorNumber": "025/165", "setCode": "MEW", "confidence": 0.98 }
    ]
    ```
  - `POST /api/binder/scan-page`: Validates base64 image + layout, queries Vision service, and matches detected cards to local card index.
- **Frontend Live Viewfinder & Grid Slicing**:
  - `BinderScannerModal.tsx`: Uses `navigator.mediaDevices.getUserMedia`, renders responsive grid guide SVG overlay (`3x3` or `4x3`), and manages the captured pages queue.
- **Frontend Staging Review**:
  - `StagingReviewModal.tsx`: Displays captured pocket crops side-by-side with matched MasterDex card artwork, with inline search correction and batch commit action.
- **Architectural Line Limits & i18n**:
  - All new files decompose into modular components <= 400 lines each.
  - Zero hardcoded strings. Add all translation keys to `pt-BR` and `en-US`.

## Testing Decisions

- Test `POST /api/collector/settings` saves and retrieves masked Gemini API key.
- Test `binderVisionService` parses structured JSON slot response and maps to National Dex species.
- Test `POST /api/binder/scan-page` handles missing/invalid API key gracefully.
- Test all new frontend components stay within <= 400 lines limit.

## Out of Scope

- Card grading assessment (e.g. PSA/Beckett condition grading).
- Counterfeit / fake card authenticity analysis.
- Live continuous 30fps video OCR streaming on the server.
