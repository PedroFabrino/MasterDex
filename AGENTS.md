# AGENTS.md — Pokemon Tracker & TCG Investor Instructions

## Issue Tracking & Task Management

- **Issue Tracker**: Always use **GitHub Issues** via GitHub CLI (`gh`). Never store tickets solely in local `.scratch` directories; always publish them to GitHub Issues.
- **Triage Labels**: Every spec and vertical-slice ticket must include the labels `enhancement` and `ready-for-agent`:
  ```bash
  gh issue create --title "<Title>" --body-file "<file>" --label "enhancement,ready-for-agent"
  ```
- **Spec Issues**:
  - Titled: `Spec: <Feature Title>`.
  - Body: Complete specification generated from the `/to-spec` template (stored locally under `docs/spec/<feature-slug>.md` and published as a parent issue).
- **Ticket Issues**:
  - Broken down via `/to-tickets` as vertical tracer-bullet slices (schema -> API -> UI -> tests).
  - Titled: Short, action-oriented name of the vertical slice.
  - Body format:
    ```markdown
    ## Parent
    #<Spec-Issue-Number>

    ## What to build
    <End-to-end user-observable behavior>

    ## Acceptance criteria
    - [ ] Criterion 1
    - [ ] Criterion 2

    ## Blocked by
    - #<Blocking-Ticket-Number> (or "None — can start immediately")
    ```
  - Published in dependency order (blockers first) so dependency issue numbers can be referenced in `Blocked by`.
  - Frontier: Always work on tickets whose blockers are all closed.

## Architectural Rules

- **No Monoliths**: Hard file line count limits are stop conditions:
  - API routes <= 400 lines
  - Services <= 400 lines
  - Vue views/components <= 400 lines
  - Composables <= 300 lines
  - Tests <= 500 lines
  Decompose before adding code to any file approaching these limits.
- **Repository Seam**: Repositories are the only place for database / ORM / data-store queries in the backend.
- **Internationalization (i18n) Directive**:
  - Zero hardcoded user-facing strings: Every label, title, button, dialog text, tooltip, empty state, placeholder, and status message across all UI components must be routed through the i18n translation dictionary (`useTranslation`).
  - No exceptions: Hardcoding raw Portuguese or English text directly in JSX/TSX is strictly forbidden.
  - Parity enforcement: All translation keys must exist in both `pt-BR` and `en-US` dictionaries with strict TypeScript typing.
- **Knowledge Graph**: Run `graphify update .` after code modifications.

