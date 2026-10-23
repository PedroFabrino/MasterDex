import type { ParsedTcgQuery } from './tcgQueryParser.js'

export interface TcgDexBriefCard {
  id: string
  localId: string
  name: string
  image?: string
  imageUrl?: string | null
}

export class TcgDexApiClient {
  async fetchCardsForLanguage(
    langCode: string,
    parsed: ParsedTcgQuery,
    dexId?: number
  ): Promise<Array<TcgDexBriefCard & { language: string }>> {
    const base = `https://api.tcgdex.net/v2/${langCode}`
    let rawCards: TcgDexBriefCard[] = []

    try {
      if (dexId) {
        const url = `${base}/dex-ids/${dexId}`
        const res = await fetch(url, { signal: AbortSignal.timeout(4500) })
        if (res.ok) {
          const data = (await res.json()) as { cards?: TcgDexBriefCard[] }
          rawCards = Array.isArray(data.cards) ? data.cards : []
        }
      } else {
        // Direct card ID lookup (e.g. "mep-023")
        if (parsed.name && parsed.localId) {
          try {
            const cardId = `${parsed.name.toLowerCase()}-${parsed.localId}`
            const directRes = await fetch(`${base}/cards/${encodeURIComponent(cardId)}`, {
              signal: AbortSignal.timeout(3000),
            })
            if (directRes.ok) {
              const cardData = (await directRes.json()) as TcgDexBriefCard
              if (cardData && cardData.id) {
                rawCards = [cardData]
              }
            }
          } catch {
            // Ignore direct lookup error
          }
        }

        // Set ID cards lookup if no direct card and name matches a set (e.g. "mep", "30th")
        if (rawCards.length === 0 && parsed.name && !parsed.name.includes(' ')) {
          try {
            const setRes = await fetch(`${base}/sets/${encodeURIComponent(parsed.name.toLowerCase())}`, {
              signal: AbortSignal.timeout(3000),
            })
            if (setRes.ok) {
              const setData = (await setRes.json()) as { cards?: TcgDexBriefCard[] }
              if (Array.isArray(setData.cards)) {
                rawCards = setData.cards
              }
            }
          } catch {
            // Ignore set lookup error
          }
        }

        if (rawCards.length === 0) {
          const searchParam = parsed.name || parsed.localId || ''
          if (searchParam) {
            const url = `${base}/cards?name=${encodeURIComponent(searchParam)}`
            const res = await fetch(url, { signal: AbortSignal.timeout(4500) })
            if (res.ok) {
              const data = (await res.json()) as TcgDexBriefCard[]
              rawCards = Array.isArray(data) ? data : []
            } else if (parsed.name && parsed.name.includes(' ')) {
              const firstWord = parsed.name.split(' ')[0]
              const fallbackRes = await fetch(`${base}/cards?name=${encodeURIComponent(firstWord)}`, {
                signal: AbortSignal.timeout(4500),
              })
              if (fallbackRes.ok) {
                const data = (await fallbackRes.json()) as TcgDexBriefCard[]
                rawCards = Array.isArray(data) ? data : []
              }
            }
          }
        }
      }
    } catch {
      // Continue on timeout or language error
    }

    return rawCards.map((c) => ({
      ...c,
      language: langCode,
    }))
  }
}

export const tcgdexApiClient = new TcgDexApiClient()
