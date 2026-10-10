import type { TcgCard, CollectedSlot } from "@/data/pokemon"
import type { TcgCardSearchResult } from "../../shared/types"

export interface RawCardData {
  id?: string | null
  cardId?: string | null
  name?: string | null
  cardName?: string | null
  setName?: string | null
  number?: string | null
  cardNumber?: string | null
  imageUrl?: string | null
  cardImageUrl?: string | null
  thumbnailUrl?: string | null
  language?: string | null
  cardLanguage?: string | null
  isHolo?: boolean
}

export interface BatchSyncEntry {
  pokedexId: number
  collected: boolean
  cardId?: string | null
  cardName?: string | null
  cardImageUrl?: string | null
  cardLanguage?: string | null
}

/**
 * Standardizes a TcgCardSearchResult into the frontend TcgCard representation.
 */
export function mapSearchResultToTcgCard(r: TcgCardSearchResult): TcgCard {
  return {
    id: r.id,
    name: r.name,
    setName: r.set?.name || r.id.split("-")[0]?.toUpperCase() || "TCG",
    number: r.set?.total ? `${r.localId}/${r.set.total}` : String(r.localId ?? "1"),
    imageUrl: r.imageUrl,
    thumbnailUrl: r.thumbnailUrl || r.imageUrl,
    isHolo:
      Boolean(r.rarity?.toLowerCase().includes("holo")) ||
      Boolean(r.rarity?.toLowerCase().includes("rare")),
    language: r.language || "en",
  }
}

/**
 * Normalizes raw or partial card data into a valid TcgCard or null.
 */
export function toTcgCard(raw: RawCardData | null | undefined): TcgCard | null {
  if (!raw) return null
  const id = raw.id || raw.cardId
  if (!id) return null

  const name = raw.name || raw.cardName || ""
  const setName = raw.setName || id.split("-")[0]?.toUpperCase() || "TCG"
  const number = raw.number || raw.cardNumber || id.split("-")[1] || "1"
  const imageUrl = raw.imageUrl || raw.cardImageUrl || ""
  const thumbnailUrl = raw.thumbnailUrl || imageUrl
  const language = raw.language || raw.cardLanguage || "en"

  return {
    id,
    name,
    setName,
    number,
    imageUrl,
    thumbnailUrl,
    isHolo: raw.isHolo,
    language,
  }
}

/**
 * Converts a slot parameters into a CollectedSlot object.
 */
export function toCollectedSlot(
  pokemonId: number,
  card: TcgCard | null,
  cardLanguage?: string
): CollectedSlot {
  return {
    pokemonId,
    tcgCard: card,
    cardLanguage: card ? (cardLanguage ?? card.language) : undefined,
  }
}

/**
 * Maps a single backend or backup JSON item to a CollectedSlot.
 */
export function mapBackendItemToCollectedSlot(pokemonId: number, item: any): CollectedSlot {
  if (!item) return { pokemonId, tcgCard: null }

  if (item.tcgCard) {
    return {
      pokemonId,
      tcgCard: item.tcgCard,
      cardLanguage: item.cardLanguage || item.tcgCard.language || undefined,
    }
  }

  const card = toTcgCard({
    cardId: item.cardId,
    cardName: item.cardName,
    cardNumber: item.cardNumber || item.number,
    cardImageUrl: item.cardImageUrl || item.imageUrl,
    cardLanguage: item.cardLanguage,
    thumbnailUrl: item.thumbnailUrl,
  })

  return {
    pokemonId,
    tcgCard: card,
    cardLanguage: item.cardLanguage || card?.language || undefined,
  }
}

/**
 * Maps a full collection dictionary from API or backup file into Record<number, CollectedSlot>.
 */
export function mapCollectionItemsToRecord(items: Record<string, any>): Record<number, CollectedSlot> {
  const result: Record<number, CollectedSlot> = {}
  for (const [idStr, item] of Object.entries(items)) {
    const id = Number(idStr)
    if (isNaN(id) || id <= 0) continue
    const isCollected = item === true || Boolean(item?.collected) || Boolean(item?.pokemonId)
    if (isCollected) {
      result[id] = mapBackendItemToCollectedSlot(id, item)
    }
  }
  return result
}

/**
 * Converts a CollectedSlot to a batch sync payload entry.
 */
export function toBatchSyncEntry(pokemonId: number, slot: CollectedSlot): BatchSyncEntry {
  return {
    pokedexId: pokemonId,
    collected: true,
    cardId: slot.tcgCard?.id ?? null,
    cardName: slot.tcgCard?.name ?? null,
    cardImageUrl: slot.tcgCard?.imageUrl ?? null,
    cardLanguage: slot.cardLanguage ?? slot.tcgCard?.language ?? null,
  }
}
