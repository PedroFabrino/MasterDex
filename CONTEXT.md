# Pokemon Tracker - TCG Investment Context

Domain terminology for evaluating Pokémon Trading Card Game (TCG) expansions and sets for collector investment based on secret rare card values, integrated with a unified collector profile.

## Language

### Expansions & Sets

**Expansion**:
A formal release of Pokémon Trading Card Game cards characterized by a distinct name, series, and numbering structure.
_Avoid_: Box, edition, release

**Base Count**:
The official number of standard cards in an expansion, appearing as the denominator on non-secret card collector numbers (e.g., the 84 in 084/084).
_Avoid_: Standard count, total base, normal size

**Secret Rare**:
Any card whose collector number strictly exceeds the expansion's base count (e.g., 085/084 up to 120/084), representing special art, full art, illustration rares, and hyper rares.
_Avoid_: Secret art plus, SA+, bonus card

**Tracked Expansion**:
An expansion saved to a collector profile's watchlist for active investment monitoring.
_Avoid_: Pinned set, favorite expansion

**Booster Expansion**:
An official Pokémon TCG expansion distributed through sealed booster packs or booster boxes featuring a base card checklist and randomized secret rares.
_Avoid_: Main box, normal set, core booster

**Promotional Collection**:
A non-booster compilation of fixed promo cards released across blisters, tins, or special retail events with no sealed booster box chase mechanic.
_Avoid_: Promo dump, black star set, promo pack

**Hidden Expansion**:
An expansion intentionally muted from the active investor leaderboard by the collector.
_Avoid_: Deleted set, muted box, blacklisted expansion

**Hidden Expansions Tray**:
A collapsible user interface section positioned below the primary leaderboard displaying muted expansions with individual unhide actions.
_Avoid_: Trash bin, archived sets list, hidden drawer

**Expansion Category Filter**:
A collector-facing control filtering the expansion directory by release type (Booster Expansions, Promotional Collections, or All).
_Avoid_: Set type toggle, booster switch

**International Expansion**:
A Pokémon TCG expansion printed in non-Western languages (Japanese, Traditional/Simplified Chinese, Korean) characterized by localized set codes and regional artwork variations.
_Avoid_: Foreign set, asian print, imported box

**Collector Preferences**:
The persisted configuration records (comprising Target Rarity Filter and Hidden Expansion selections) associated with a Collector Profile or local device storage.
_Avoid_: User settings JSON, client state, profile options

**Expansion Catalog**:
The complete directory of all official Pokémon TCG expansions indexed from the Card Search Provider (TCGdex).
_Avoid_: Set list, all sets dump

**Binder Scanner**:
An automated visual recognition pipeline segmenting physical binder pages into grid pocket tiles and matching detected cards to Pokémon species and artwork.
_Avoid_: Card camera, photo bot, OCR video reader

**Staging Review Grid**:
An interactive pre-commit interface displaying scanned binder cards side-by-side with detected species for user verification before persistence.
_Avoid_: Scan staging area, import preview, temp table

**Collector API Key**:
A collector-supplied Google Gemini API key persisted in Collector Settings to authorize personal vision recognition workloads without central service billing.
_Avoid_: Gemini token, user secret, auth bearer

**Collector Settings Page**:
The dedicated configuration view where collectors manage authentication identity, application language, favored card languages, and third-party AI keys.
_Avoid_: Options modal, preference tab, config view

**Card Print Language**:
The specific regional linguistic edition (e.g., Portuguese, English, Japanese, Traditional Chinese, Korean) of a physical card owned by the collector and assigned to a Binder Slot.
_Avoid_: Card nationality, print origin, foreign version

**Favored Languages**:
The collector-configured priority order of card print languages displayed as quick-selection pills in the Card Selector and Collector Settings.
_Avoid_: Preferred tongues, language defaults, priority locales

### Investment & Valuation

**Collection Gap Yield**:
The total number of cards in an expansion matching or exceeding the collector's Target Rarity Filter for which the collector does not yet own a card of equal or greater rarity assigned to that Pokémon's Binder Slot.
_Avoid_: New card count, missing loot, pack value

**Target Rarity Filter**:
The collector-configured and persisted rarity threshold (default: Any Rarity / All Cards; selectable: Holo Rare+, Ultra Rare+, Illustration Rare+, Secret Rare / SA+) defining what minimum tier of card satisfies a Binder Slot.
_Avoid_: Rarity toggle, tier setting


**Chase Card**:
The single most valuable secret rare card in an expansion that drives the primary collector demand and ceiling price.
_Avoid_: Grail, jackpot card

**Secret Pool Value**:
The aggregate monetary sum of all secret rare cards identified in an expansion.
_Avoid_: Total set cap, secret market cap

**Investment Score**:
A composite benchmark ranking an expansion's investment appeal based on chase card ceiling, average secret card price, and secret card distribution.
_Avoid_: Rating, set rank, ROI score

**Market Price**:
The estimated secondary market monetary value of an individual card denominated in Brazilian Real (BRL / R$).
_Avoid_: Retail price, MSRP, card cost

**Pricing Provider**:
An external market quotation source (specifically LigaPokémon, TCGdex / TCGplayer, or TCGCSV) providing secondary market card valuations.
_Avoid_: Price API, scraper source, market website

**Native Quotation**:
The raw numeric market price captured from a Pricing Provider in its original currency (BRL for LigaPokémon, USD for TCGplayer, EUR for Cardmarket).
_Avoid_: Raw price, foreign cost, unadjusted price

**Canonical Market Price**:
The resolved reference price (standardized in BRL) selected according to the collector's Valuation Preference to calculate set Investment Scores, Chase Card rankings, and Portfolio Worth.
_Avoid_: Master price, official price, single price

**Valuation Preference**:
The collector-configured priority setting (e.g., Brazilian Market / LigaPokémon vs. Global Market / TCGplayer) governing which Pricing Provider acts as the primary source for leaderboard sorting and portfolio aggregation.
_Avoid_: Price setting, market mode, currency option

**Binder Portfolio Value**:
The cumulative monetary worth of all physical cards represented by Assigned Card Artworks across the collector's owned Binder Slots.
_Avoid_: Binder value, collection worth, dex net worth

**Price History**:
A chronological series of recorded market prices for a card used to analyze investment value appreciation or decline over time.
_Avoid_: Price log, trend history

### User & Collection

**Collector Profile**:
The authenticated user entity authenticated via Google Identity, maintaining ownership records of Pokémon species and TCG cards.
_Avoid_: User account, player

**Google Identity Provider**:
The external OAuth 2.0 authentication service (Google Identity Services) verifying collector credentials, issuing ID/access tokens, and asserting profile identity.
_Avoid_: Good api, Google login API, mock login

**Collection Seed**:
The one-time process of importing an existing Google Sheet into the collector's relational database store.
_Avoid_: Sheet dump, initial upload

**Expansion Ingestion Job**:
A server-side routine that fetches an expansion webpage, parses card attributes and base count, aggregates pricing, and records the expansion snapshot.
_Avoid_: Scrape task, crawler

### Binder & Card Customization

**Binder Slot**:
The visual tile representing a Pokémon species within the National Dex collection grid (#001 to #1025).
_Avoid_: Grid box, dex cell, card container

**Assigned Card Artwork**:
A specific physical Pokémon TCG card (featuring artwork scan, set name, and collector number) designated to visually represent an owned card in a Binder Slot.
_Avoid_: Custom skin, card overlay, replaced sprite

**Default Sprite Anchor**:
The persistent first position in the card artwork selector displaying the official game sprite, functioning as the default selection and the reset mechanism.
_Avoid_: Reset button, sprite option, default tile

**Card Search Provider**:
The integration service that queries external TCG databases using card names and collector numbers to return high-resolution card artwork and set metadata.
_Avoid_: Card scraper, external fetcher

**Thumbnail Card Scan**:
The lightweight lower-resolution image representation (~245x342 webp) utilized for responsive grid rendering in the Card Selector Modal and compact binder surfaces to optimize bandwidth and rendering latency.
_Avoid_: Low-res pic, small thumb, mini card

**Master Card Scan**:
The authentic high-resolution scan (~734x1024 webp) preserving fine card text, holofoil patterns, and collector stamps assigned to an owned Binder Slot.
_Avoid_: High-res file, big picture, heavy scan

**Binder Search**:
The collector-facing lookup interface permitting real-time search of Pokémon species by name to navigate directly to their corresponding Binder Slot.
_Avoid_: Card finder, quick jump, slot search, dex query

**Slot Highlight**:
A temporary visual accentuation (animated pulse and glowing ring) applied to a target Binder Slot upon navigation to identify its position within the binder page grid.
_Avoid_: Card focus, slot marker, selection glow, card ping

### Internationalization & Interface

**Localized Dictionary**:
The type-safe, centralized catalog of user interface text strings maintained with strict key parity across supported locales (pt-BR and en-US).
_Avoid_: Translation JSON, string dump, hardcoded labels

**Interface Locale**:
The active linguistic context (pt-BR or en-US) governing all rendered user interface copy, persisted in collector preferences.
_Avoid_: Current language, language setting

### Sharing & Public Presentation

**Shared Binder**:
The public, read-only presentation of a Collector Profile's Binder Slots accessible to external visitors.
_Avoid_: Shared collection, public dex, published cards

**Public Binder View**:
The dedicated read-only interface rendering a Shared Binder for visitors, featuring collector attribution and card inspection without mutation controls.
_Avoid_: Viewer mode, spectator screen, read-only dex

**Public Share Link**:
The persistent web URL associated with a Collector Profile providing direct access to their Shared Binder when public sharing is enabled.
_Avoid_: Shared URL, binder invite, friend link

**Sharing State**:
The collector-configured binary setting (Enabled or Disabled) governing whether external visitors can access the collector's Shared Binder.
_Avoid_: Privacy switch, public flag, visibility mode

**Share Slug**:
A compact, unique alphanumeric string identifying a Collector Profile's Shared Binder in the Public Share Link.
_Avoid_: Share ID, profile code, binder hash

**Public Binder Error View**:
The branded empty state interface displayed to visitors when a Shared Binder link is private, disabled, or non-existent.
_Avoid_: Error page, 404 card, not found screen

