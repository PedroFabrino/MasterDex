# Spec: Binder Card Artwork Customization and TCGdex Search Engine

## 1. Summary
Enable Pokémon collectors to customize individual Binder Slots with specific physical TCG card artworks (such as *Mew ex 129/103* from Celebrations) instead of generic game sprites. This specification covers the backend foundation:
1. Extending the database schema and repository seam on `user_pokemon` with assigned card artwork properties (`card_id`, `card_name`, `card_image_url`).
2. Building the TCGdex card search provider with smart query parsing (e.g. separating `"Mew ex 129/103"` into name filter and exact card number).
3. Exposing the search endpoint `GET /api/tcg/cards/search?q=...` and collection patch endpoint `PATCH /api/collection/:pokemonId` with card artwork support.

The frontend 4x4 binder UI and prototype conversion will be addressed in a subsequent dedicated spec.

---

## 2. Architecture & Data Flow

```
User Search Query: "Mew ex 129/103"
                 │
                 ▼
GET /api/tcg/cards/search?q=Mew%20ex%20129/103
                 │
                 ▼
tcgdexService.searchCards(query)
   ├── Smart Regex Parser
   │   ├── queryName: "Mew ex"
   │   └── localId: "129"
   ├── In-Memory LRU Cache check
   └── TCGdex API: https://api.tcgdex.net/v2/en/cards
                 │
                 ▼
Normalized TcgCardSearchResult[]
(id, localId, name, set, imageUrl, rarity)
```

And for collection persistence:
```
PATCH /api/collection/:pokemonId
Body: { collected: true, cardId: "cel25-129", cardName: "Mew ex", cardImageUrl: "https://..." }
                 │
                 ▼
collectorRepository.setUserPokemon(userId, pokedexId, data)
                 │
                 ▼
Drizzle ORM -> user_pokemon table (libSQL / Turso)
```

---

## 3. Database Schema Changes (`apps/api/src/db/schema.ts`)

Extend `user_pokemon` table:
- `card_id`: text (nullable) — TCGdex unique card identifier (e.g. `cel25-129`).
- `card_name`: text (nullable) — Card print name (e.g. `Mew ex`).
- `card_image_url`: text (nullable) — High-resolution card artwork scan URL.

Migration & Compatibility:
`ensureDatabaseTables()` in `apps/api/src/db/index.ts` automatically executes `ALTER TABLE user_pokemon ADD COLUMN ...` defensively if columns are not present.

---

## 4. Shared Types (`packages/shared/src/index.ts`)

```typescript
export interface UserPokemon {
  id: string
  userId: string
  pokedexId: number
  collected: boolean
  cardId?: string | null
  cardName?: string | null
  cardImageUrl?: string | null
  updatedAt: number
}

export interface TcgCardSearchResult {
  id: string
  localId: string
  name: string
  set: {
    id: string
    name: string
    total?: number
  }
  imageUrl: string
  rarity?: string
}
```

---

## 5. API Routes Specification

### `GET /api/tcg/cards/search`
- **Query parameters**:
  - `q` (string, required): Search query (e.g. `Mew`, `Mew ex 129/103`, `Charizard 4/102`).
  - `pokedexId` (number, optional): Scopes or prioritizes results for a given National Dex species.
  - `limit` (number, optional, default: 20).
- **Response**:
  ```json
  {
    "query": "Mew ex 129/103",
    "parsed": {
      "name": "Mew ex",
      "localId": "129"
    },
    "results": [
      {
        "id": "cel25-129",
        "localId": "129",
        "name": "Mew ex",
        "set": {
          "id": "cel25",
          "name": "Celebrations",
          "total": 103
        },
        "imageUrl": "https://assets.tcgdex.net/en/swsh/cel25/129/high.webp",
        "rarity": "Ultra Rare"
      }
    ]
  }
  ```

### `PATCH /api/collection/:pokemonId`
- **Path parameters**:
  - `pokemonId` (number): National Dex ID (#001–#1025).
- **Request body**:
  ```json
  {
    "collected": true,
    "cardId": "cel25-129",
    "cardName": "Mew ex",
    "cardImageUrl": "https://assets.tcgdex.net/en/swsh/cel25/129/high.webp"
  }
  ```
- **Response**: Updated `UserPokemon` record.

---

## 6. Architectural Constraints
- Line limits: Services <= 400 lines, Routes <= 400 lines, Tests <= 500 lines.
- Repository Seam: All queries to `user_pokemon` remain strictly inside `collectorRepository.ts`.
