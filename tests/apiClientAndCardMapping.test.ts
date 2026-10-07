import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  mapSearchResultToTcgCard,
  toTcgCard,
  toCollectedSlot,
  mapBackendItemToCollectedSlot,
  mapCollectionItemsToRecord,
  toBatchSyncEntry,
} from "../src/lib/cardMapping.js"
import { apiClient } from "../src/lib/apiClient.js"

describe("Card Mapping Deduplication (Ticket #23)", () => {
  it("maps search result with full set metadata to frontend TcgCard", () => {
    const result = {
      id: "base1-4",
      localId: "4",
      name: "Charizard",
      set: { id: "base1", name: "Base Set", total: 102 },
      imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
      thumbnailUrl: "https://images.pokemontcg.io/base1/4_low.png",
      rarity: "Rare Holo",
      language: "en",
    }

    const mapped = mapSearchResultToTcgCard(result)
    expect(mapped.id).toBe("base1-4")
    expect(mapped.name).toBe("Charizard")
    expect(mapped.setName).toBe("Base Set")
    expect(mapped.number).toBe("4/102")
    expect(mapped.imageUrl).toBe("https://images.pokemontcg.io/base1/4_hires.png")
    expect(mapped.thumbnailUrl).toBe("https://images.pokemontcg.io/base1/4_low.png")
    expect(mapped.isHolo).toBe(true)
    expect(mapped.language).toBe("en")
  })

  it("handles fallback and missing set totals when mapping search result", () => {
    const result = {
      id: "promo-23",
      localId: "23",
      name: "Mewtwo",
      imageUrl: "https://example.com/mewtwo.png",
    }

    const mapped = mapSearchResultToTcgCard(result)
    expect(mapped.id).toBe("promo-23")
    expect(mapped.setName).toBe("PROMO")
    expect(mapped.number).toBe("23")
    expect(mapped.thumbnailUrl).toBe("https://example.com/mewtwo.png")
    expect(mapped.isHolo).toBe(false)
  })

  it("normalizes raw card data via toTcgCard", () => {
    expect(toTcgCard(null)).toBeNull()
    expect(toTcgCard({})).toBeNull()

    const card = toTcgCard({
      cardId: "sv1-25",
      cardName: "Pikachu",
      cardImageUrl: "https://example.com/pika.png",
      cardLanguage: "pt",
    })
    expect(card).not.toBeNull()
    expect(card?.id).toBe("sv1-25")
    expect(card?.name).toBe("Pikachu")
    expect(card?.setName).toBe("SV1")
    expect(card?.number).toBe("25")
    expect(card?.language).toBe("pt")
  })

  it("creates CollectedSlot via toCollectedSlot", () => {
    const slot = toCollectedSlot(25, null)
    expect(slot.pokemonId).toBe(25)
    expect(slot.tcgCard).toBeNull()

    const card = {
      id: "base1-4",
      name: "Charizard",
      setName: "Base Set",
      number: "4/102",
      imageUrl: "https://example.com/char.png",
      language: "en",
    }
    const filledSlot = toCollectedSlot(6, card, "ja")
    expect(filledSlot.pokemonId).toBe(6)
    expect(filledSlot.tcgCard?.name).toBe("Charizard")
    expect(filledSlot.cardLanguage).toBe("ja")
  })

  it("maps dictionary of collection items to Record<number, CollectedSlot>", () => {
    const rawItems = {
      "1": { collected: true, cardId: "base1-44", cardName: "Bulbasaur", cardImageUrl: "https://example.com/b.png" },
      "4": true,
      "invalid": { collected: true },
      "0": { collected: true },
    }

    const record = mapCollectionItemsToRecord(rawItems)
    expect(Object.keys(record)).toHaveLength(2)
    expect(record[1].pokemonId).toBe(1)
    expect(record[1].tcgCard?.name).toBe("Bulbasaur")
    expect(record[4].pokemonId).toBe(4)
    expect(record[4].tcgCard).toBeNull()
    expect(record[0]).toBeUndefined()
  })

  it("generates correct batch sync entries via toBatchSyncEntry", () => {
    const slot = {
      pokemonId: 25,
      tcgCard: {
        id: "sv1-25",
        name: "Pikachu",
        setName: "SV1",
        number: "25",
        imageUrl: "https://example.com/pika.png",
        language: "pt",
      },
      cardLanguage: "pt",
    }

    const entry = toBatchSyncEntry(25, slot)
    expect(entry).toEqual({
      pokedexId: 25,
      collected: true,
      cardId: "sv1-25",
      cardName: "Pikachu",
      cardImageUrl: "https://example.com/pika.png",
      cardLanguage: "pt",
    })
  })
})

describe("Typed API Client (Ticket #23)", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("calls GET /api/collection with userId parameter", async () => {
    const mockJson = { items: { "1": { collected: true } }, totalCount: 1, totalSpecies: 1025 }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockJson),
    } as any)

    const data = await apiClient.getCollection("tester-user")
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/collection?userId=tester-user")
    expect(data.totalCount).toBe(1)
  })

  it("calls PATCH /api/collection/:id with auth token and payload", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, item: {} }),
    } as any)

    await apiClient.patchSlot(
      25,
      { userId: "u123", collected: true, cardId: "sv1-25" },
      "test-session-token"
    )

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/collection/25", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-session-token",
      },
      body: JSON.stringify({ userId: "u123", collected: true, cardId: "sv1-25" }),
    })
  })

  it("calls POST /api/collection/batch with array of entries", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, upserted: 2 }),
    } as any)

    const entries = [
      { pokedexId: 1, collected: true, cardId: null, cardName: null, cardImageUrl: null, cardLanguage: null },
      { pokedexId: 4, collected: true, cardId: "base1-4", cardName: "Charmander", cardImageUrl: "https://example.com", cardLanguage: "en" },
    ]

    const result = await apiClient.batchSyncCollection("u123", entries, "token-abc")
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/collection/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-abc",
      },
      body: JSON.stringify({ userId: "u123", entries }),
    })
    expect(result.upserted).toBe(2)
  })

  it("calls GET /api/tcg/cards/search with encoded parameters", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ query: "charizard", results: [], count: 0, total: 0, hasMore: false }),
    } as any)

    await apiClient.searchCards({
      query: "charizard",
      dexId: 6,
      rarity: "holo",
      lang: "pt",
      limit: 12,
      offset: 24,
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/tcg/cards/search?q=charizard&dexId=6&rarity=holo&lang=pt&limit=12&offset=24",
      { signal: undefined }
    )
  })

  it("calls GET /api/tcg/expansions and GET /api/tcg/expansions/:slug", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ expansions: [] }),
    } as any)

    await apiClient.getExpansions({ rarity: "ultra", sort: "gap_yield", category: "booster", userId: "u123" })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/tcg/expansions?rarity=ultra&sort=gap_yield&category=booster&userId=u123"
    )

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ secretCards: [], cards: [] }),
    } as any)

    await apiClient.getExpansionDetails("151")
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/tcg/expansions/151")
  })
})
