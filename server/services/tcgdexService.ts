import type { TcgCardSearchResult } from '../../shared/types.js'

interface TcgDexBriefCard {
  id: string
  localId: string
  name: string
  image?: string
}

interface TcgDexSetBrief {
  id: string
  name: string
  cardCount?: {
    total?: number
    official?: number
  }
}

export class TcgDexService {
  private baseUrl = 'https://api.tcgdex.net/v2/en'
  private setsCache: Map<string, { id: string; name: string; total?: number }> = new Map()
  private setsLoadedAt = 0
  private queryCache: Map<string, { timestamp: number; results: TcgCardSearchResult[] }> = new Map()
  private cacheTtlMs = 1000 * 60 * 30 // 30 minutes

  /**
   * Smart query parser extracting card name, local collector number, and optional set total.
   * e.g.:
   * - "Mew ex 129/103" -> { name: "Mew ex", localId: "129", total: 103 }
   * - "Mew 129" -> { name: "Mew", localId: "129" }
   * - "129/103 Mew" -> { name: "Mew", localId: "129", total: 103 }
   * - "Pikachu" -> { name: "Pikachu" }
   */
  parseQuery(rawQuery: string): { name: string; localId?: string; total?: number } {
    const trimmed = rawQuery.trim()
    if (!trimmed) {
      return { name: '' }
    }

    // Pattern 1: Trailing number or fraction, e.g., "Mew ex 129/103" or "Charizard 4"
    const trailingMatch = trimmed.match(/^(.*?)\s+(\d+)(?:\/(\d+))?$/i)
    if (trailingMatch) {
      const name = trailingMatch[1].trim()
      const localId = trailingMatch[2]
      const total = trailingMatch[3] ? parseInt(trailingMatch[3], 10) : undefined
      if (name) {
        return { name, localId, total }
      }
    }

    // Pattern 2: Leading fraction/number, e.g., "129/103 Mew" or "4 Charizard"
    const leadingMatch = trimmed.match(/^(\d+)(?:\/(\d+))?\s+(.*)$/i)
    if (leadingMatch) {
      const localId = leadingMatch[1]
      const total = leadingMatch[2] ? parseInt(leadingMatch[2], 10) : undefined
      const name = leadingMatch[3].trim()
      if (name) {
        return { name, localId, total }
      }
    }

    // Pattern 3: Standalone number, e.g., "129/103" or "129"
    const onlyNumberMatch = trimmed.match(/^(\d+)(?:\/(\d+))?$/)
    if (onlyNumberMatch) {
      return {
        name: '',
        localId: onlyNumberMatch[1],
        total: onlyNumberMatch[2] ? parseInt(onlyNumberMatch[2], 10) : undefined,
      }
    }

    return { name: trimmed }
  }

  /**
   * Fetches and caches all set metadata for set name enrichment.
   */
  async getSetsMap(): Promise<Map<string, { id: string; name: string; total?: number }>> {
    const now = Date.now()
    if (this.setsCache.size > 0 && now - this.setsLoadedAt < this.cacheTtlMs) {
      return this.setsCache
    }

    try {
      const res = await fetch(`${this.baseUrl}/sets`, { signal: AbortSignal.timeout(6000) })
      if (res.ok) {
        const sets = (await res.json()) as TcgDexSetBrief[]
        this.setsCache.clear()
        for (const s of sets) {
          this.setsCache.set(s.id.toLowerCase(), {
            id: s.id,
            name: s.name,
            total: s.cardCount?.official || s.cardCount?.total,
          })
        }
        this.setsLoadedAt = now
      }
    } catch (err) {
      console.warn('Failed to refresh TCGdex sets map:', err)
    }

    return this.setsCache
  }

  /**
   * Searches for cards matching the query string.
   */
  async searchCards(query: string, limit = 20): Promise<TcgCardSearchResult[]> {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    // Cache hit
    const cached = this.queryCache.get(normalizedQuery)
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.results
    }

    const parsed = this.parseQuery(query)
    const setsMap = await this.getSetsMap()

    let rawCards: TcgDexBriefCard[] = []

    try {
      const searchParam = parsed.name || parsed.localId || query
      const url = `${this.baseUrl}/cards?name=${encodeURIComponent(searchParam)}`
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) })

      if (res.ok) {
        rawCards = (await res.json()) as TcgDexBriefCard[]
      } else if (parsed.name && parsed.name.includes(' ')) {
        // Fallback: search by first word (e.g. "Mew" instead of "Mew ex")
        const firstWord = parsed.name.split(' ')[0]
        const fallbackRes = await fetch(`${this.baseUrl}/cards?name=${encodeURIComponent(firstWord)}`, {
          signal: AbortSignal.timeout(7000),
        })
        if (fallbackRes.ok) {
          rawCards = (await fallbackRes.json()) as TcgDexBriefCard[]
        }
      }
    } catch (err) {
      console.warn('Error fetching cards from TCGdex:', err)
    }

    // Filter and score results
    const results: TcgCardSearchResult[] = []
    const targetLocalId = parsed.localId?.replace(/^0+/, '')

    for (const card of rawCards) {
      if (!card.image) continue // Only show cards with artwork scans

      const setId = (card.id.split('-')[0] || '').toLowerCase()
      const setMeta = setsMap.get(setId)

      const cardLocalNormalized = String(card.localId || '').replace(/^0+/, '')
      const isExactNumberMatch = targetLocalId && cardLocalNormalized === targetLocalId

      const imageUrl = card.image.endsWith('.webp') || card.image.endsWith('.png')
        ? card.image
        : `${card.image}/high.webp`

      results.push({
        id: card.id,
        localId: card.localId,
        name: card.name,
        set: {
          id: setId,
          name: setMeta?.name || setId.toUpperCase(),
          total: parsed.total || setMeta?.total,
        },
        imageUrl,
      })
    }

    // Sort: Exact number matches first, then matching name length / relevance
    if (targetLocalId) {
      results.sort((a, b) => {
        const aMatches = a.localId.replace(/^0+/, '') === targetLocalId ? 1 : 0
        const bMatches = b.localId.replace(/^0+/, '') === targetLocalId ? 1 : 0
        return bMatches - aMatches
      })
    }

    const trimmedResults = results.slice(0, limit)

    // Store in cache (limit cache size to 100)
    if (this.queryCache.size > 100) {
      const firstKey = this.queryCache.keys().next().value
      if (firstKey) this.queryCache.delete(firstKey)
    }
    this.queryCache.set(normalizedQuery, { timestamp: Date.now(), results: trimmedResults })

    return trimmedResults
  }
}

export const tcgdexService = new TcgDexService()
