## Parent
#36

## What to build
Extend the collector profiles schema and repository seam to support public binder sharing. Assign each collector profile a unique, persistent share slug (e.g. `md-` prefixed alphanumeric code) and an `is_public` boolean toggle (default false). Implement repository methods to fetch public binders and toggle sharing state. Expose `GET /api/share/:shareSlug` returning sanitized public binder data (collector name, avatar, and owned card slots) when sharing is enabled, or a 404 response when private or not found. Expose `PATCH /api/collector/sharing` to update sharing state. Ensure internal user identifiers (database UUID, google ID, email, preferences) are strictly excluded from public responses.

## Acceptance criteria
- [ ] Schema `collector_profiles` includes `share_slug` (text, unique) and `is_public` (integer boolean, default false).
- [ ] `CollectorRepository` provides `getPublicSharedBinder(shareSlug)`, `updateSharingState(userId, isPublic)`, and auto-generates a share slug for profiles missing one.
- [ ] `GET /api/share/:shareSlug` returns 200 with sanitized profile attribution (name, avatar, shareSlug) and collected slots when `is_public` is true.
- [ ] `GET /api/share/:shareSlug` returns 404 with error message when `is_public` is false or the slug does not exist.
- [ ] Public API response strictly excludes `email`, `googleId`, internal primary key `id`, and preferences.
- [ ] `PATCH /api/collector/sharing` updates the collector's public sharing state in the database.
- [ ] Integration tests verify repository queries, API responses, privacy enforcement, and sanitization.

## Blocked by
- None — can start immediately
