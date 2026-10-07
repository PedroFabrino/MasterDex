## Parent
#27

## What to build
Build a server-side vision recognition service and API endpoint that accepts a base64 binder page image and pocket grid layout (3x3, 4x3, 2x2). The service sends the image to Google Gemini Vision AI in a single pass using the collector's BYOK API key (or server `.env` fallback) and parses the response into structured slot items containing the Pokémon name, National Dex ID (#1..#1025), collector number, set code, and confidence score, mapping them against local card catalog data.

## Acceptance criteria
- [ ] `server/services/binderVisionService.ts` integrates with Google Gemini Vision REST API.
- [ ] Sends single-pass prompt asking Gemini Vision to detect cards in the specified grid layout (e.g. 3x3 slots 0..8) and return structured JSON.
- [ ] Maps detected Pokémon species names to National Pokédex IDs (#1..#1025) using local Pokédex dataset.
- [ ] Matches collector numbers and set symbols against indexed card records in local SQLite / baseline catalog.
- [ ] `POST /api/binder/scan-page` validates payload (image base64, layout format) and executes the vision pipeline.
- [ ] Gracefully reports missing API key or image decoding errors.
- [ ] Unit and integration tests verify JSON parsing, error handling, and mock vision response mapping.

## Blocked by
- #28
