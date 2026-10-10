import { type CollectedSlot } from "../data/pokemon.js"

export interface MergeResult {
  merged: Record<number, CollectedSlot>
  slotsToSync: Array<{ pokemonId: number; slot: CollectedSlot }>
}

/**
 * Merges cloud collection items with unauthenticated local session cards.
 * Rule: Local session interactions take priority ("newer takes priority").
 * Any newly marked local slots that are absent from cloud collection are queued for sync.
 */
export function mergeCloudAndLocalCollection(
  cloudItems: Record<string, any> = {},
  localCollection: Record<number, CollectedSlot> = {}
): MergeResult {
  const merged: Record<number, CollectedSlot> = {}
  const slotsToSync: Array<{ pokemonId: number; slot: CollectedSlot }> = []

  // 1. Ingest authoritative cloud items
  for (const [idStr, item] of Object.entries<any>(cloudItems)) {
    const id = Number(idStr)
    if (item.collected) {
      merged[id] = {
        pokemonId: id,
        tcgCard: item.cardId
          ? {
              id: item.cardId,
              name: item.cardName || "",
              setName: item.cardId.split("-")[0]?.toUpperCase() || "TCG",
              number: item.cardNumber || item.number || item.cardId.split("-")[1] || "1",
              imageUrl: item.cardImageUrl || "",
              language: item.cardLanguage || "en",
            }
          : null,
        cardLanguage: item.cardLanguage || undefined,
        cardCondition: item.cardCondition || undefined,
      }
    }
  }

  // 2. Merge local guest cards: local additions or card artworks take priority
  for (const [idStr, localSlot] of Object.entries(localCollection)) {
    const id = Number(idStr)
    if (!merged[id] || (localSlot.tcgCard && !merged[id].tcgCard)) {
      merged[id] = localSlot
      slotsToSync.push({ pokemonId: id, slot: localSlot })
    }
  }

  return { merged, slotsToSync }
}
