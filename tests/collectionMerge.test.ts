import { describe, it, expect } from "vitest"
import { mergeCloudAndLocalCollection } from "../src/lib/collectionMerge.js"
import { type CollectedSlot } from "../src/data/pokemon.js"

describe("Guest Collection Merge Logic (Ticket #13)", () => {
  it("populates cloud items when local collection is empty", () => {
    const cloudItems = {
      "1": { pokedexId: 1, collected: true, cardId: "base1-44", cardName: "Bulbasaur", cardImageUrl: "https://example.com/b.png" },
      "25": { pokedexId: 25, collected: true, cardId: null, cardName: null, cardImageUrl: null },
    }
    const localCollection: Record<number, CollectedSlot> = {}

    const { merged, slotsToSync } = mergeCloudAndLocalCollection(cloudItems, localCollection)

    expect(Object.keys(merged).length).toBe(2)
    expect(merged[1].collected).toBe(undefined) // slot type only stores tcgCard & pokemonId
    expect(merged[1].tcgCard?.name).toBe("Bulbasaur")
    expect(merged[25].pokemonId).toBe(25)
    expect(merged[25].tcgCard).toBeNull()
    expect(slotsToSync.length).toBe(0)
  })

  it("merges newly marked guest cards into account and queues them for sync", () => {
    const cloudItems = {
      "1": { pokedexId: 1, collected: true, cardId: null, cardName: null, cardImageUrl: null },
    }
    const localCollection: Record<number, CollectedSlot> = {
      "4": { pokemonId: 4, tcgCard: null }, // marked as guest
      "7": {
        pokemonId: 7,
        tcgCard: { id: "base1-63", name: "Squirtle", setName: "BASE1", number: "63", imageUrl: "https://example.com/s.png" },
      },
    }

    const { merged, slotsToSync } = mergeCloudAndLocalCollection(cloudItems, localCollection)

    expect(Object.keys(merged).length).toBe(3)
    expect(merged[1].pokemonId).toBe(1)
    expect(merged[4].pokemonId).toBe(4)
    expect(merged[7].tcgCard?.name).toBe("Squirtle")

    // Slots 4 and 7 were added in local session and must sync to backend
    expect(slotsToSync.length).toBe(2)
    expect(slotsToSync.map((s) => s.pokemonId).sort()).toEqual([4, 7])
  })

  it("applies 'newer takes priority' when guest assigned new card artwork to an existing species", () => {
    const cloudItems = {
      "6": { pokedexId: 6, collected: true, cardId: null, cardName: null, cardImageUrl: null }, // basic sprite in cloud
    }
    const localCollection: Record<number, CollectedSlot> = {
      "6": {
        pokemonId: 6,
        tcgCard: { id: "base1-4", name: "Charizard", setName: "BASE1", number: "4", imageUrl: "https://example.com/char.png" },
      },
    }

    const { merged, slotsToSync } = mergeCloudAndLocalCollection(cloudItems, localCollection)

    // Local custom artwork takes priority over basic sprite
    expect(merged[6].tcgCard?.name).toBe("Charizard")
    expect(slotsToSync.length).toBe(1)
    expect(slotsToSync[0].pokemonId).toBe(6)
  })
})
