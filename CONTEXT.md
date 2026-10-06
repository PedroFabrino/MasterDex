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

### Investment & Valuation

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

**Price History**:
A chronological series of recorded market prices for a card used to analyze investment value appreciation or decline over time.
_Avoid_: Price log, trend history

### User & Collection

**Collector Profile**:
The authenticated user entity authenticated via Google Identity, maintaining ownership records of Pokémon species and TCG cards.
_Avoid_: User account, player

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
