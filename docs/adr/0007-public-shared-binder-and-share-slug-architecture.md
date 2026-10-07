# Public Shared Binder & Share Slug Architecture

## Context & Decision
To enable collectors to showcase their physical binder collections to friends and communities, we introduced a public read-only sharing system. We chose to assign each authenticated collector profile a persistent, auto-generated alphanumeric `shareSlug` (stored in `collector_profiles`) paired with a collector-controlled `is_public` toggle, rather than exposing internal user UUIDs or issuing temporary expiring tokens. Public binder requests are served via a dedicated sanitized API endpoint (`GET /api/share/:shareSlug`) that returns only public profile attribution (display name, avatar) and collected slot artwork, strictly excluding email, Google ID, or internal identifiers. If sharing is disabled or the slug is invalid, the frontend displays a branded Public Binder Error View.

## Status
Accepted

## Considered Options
- **Internal User UUID in URL (`/share/:userId`)**: Rejected to prevent leaking internal database identifiers and user tracking.
- **Dynamic Expiring Tokens**: Rejected because collectors share links in bios, chats, and forum signatures where broken links degrade user experience.
- **Anonymous Cloud Uploads for Guests**: Rejected to prevent database bloat, spam, and unmanageable orphan links.
