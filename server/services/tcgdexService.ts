import fs from 'node:fs'
import type { TcgCardSearchResult } from '../../shared/types.js'
import { parseTcgQuery, type ParsedTcgQuery } from './tcgQueryParser.js'
import { tcgdexRarityService } from './tcgdexRarity.js'
import { investmentService } from './investmentService.js'

interface TcgDexBriefCard {
  id: string
  localId: string
  name: string
  image?: string
}

export interface TcgDexSetBrief {
  id: string
  name: string
  logo?: string
  symbol?: string
  cardCount?: {
    total?: number
    official?: number
  }
}

export class TcgDexService {
  private setsCache: Map<string, { id: string; name: string; total?: number }> = new Map()
  private setsLoadedAt = 0
  private queryCache: Map<string, { timestamp: number; results: TcgCardSearchResult[] }> = new Map()
  private fullResultsCache: Map<string, { timestamp: number; results: TcgCardSearchResult[] }> = new Map()
  private cacheTtlMs = 1000 * 60 * 30 // 30 minutes

  parseQuery(rawQuery: string): ParsedTcgQuery {
    return parseTcgQuery(rawQuery)
  }

  getCardRarity(card: { id: string; name: string; localId: string }, setTotal?: number) {
    return tcgdexRarityService.getCardRarity(card, setTotal)
  }

  loadFallbackSets(): TcgDexSetBrief[] {
    try {
      const fallbackPath = new URL('../../src/data/tcgdexSets.json', import.meta.url)
      const raw = fs.readFileSync(fallbackPath, 'utf-8')
      return JSON.parse(raw) as TcgDexSetBrief[]
    } catch {
      return []
    }
  }

  loadJapaneseSets(): TcgDexSetBrief[] {
    try {
      const jaPath = new URL('../../src/data/tcgdexJapaneseSets.json', import.meta.url)
      const rawJa = fs.readFileSync(jaPath, 'utf-8')
      return JSON.parse(rawJa) as TcgDexSetBrief[]
    } catch {
      return []
    }
  }

  async getAllSets(): Promise<TcgDexSetBrief[]> {
    const fallback = this.loadFallbackSets()
    if (fallback.length >= 220) {
      return fallback
    }

    try {
      const res = await fetch('https://api.tcgdex.net/v2/en/sets', { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        const sets = (await res.json()) as TcgDexSetBrief[]
        if (Array.isArray(sets) && sets.length > 0) {
          return sets
        }
      }
    } catch (err) {
      console.warn('Failed to fetch sets from TCGdex API, using local catalog:', err)
    }

    return fallback
  }

  async getSetsMap(): Promise<Map<string, { id: string; name: string; total?: number }>> {
    const now = Date.now()
    if (this.setsCache.size > 0 && now - this.setsLoadedAt < this.cacheTtlMs) {
      return this.setsCache
    }

    const sets = await this.getAllSets()
    if (sets.length > 0) {
      this.setsCache.clear()
      for (const s of sets) {
        this.setsCache.set(s.id.toLowerCase(), {
          id: s.id,
          name: s.name,
          total: s.cardCount?.official || s.cardCount?.total,
        })
      }
      const jaSets = this.loadJapaneseSets()
      for (const s of jaSets) {
        this.setsCache.set(s.id.toLowerCase(), {
          id: s.id,
          name: s.name,
          total: s.cardCount?.official || s.cardCount?.total,
        })
      }
      this.setsLoadedAt = now
    }

    return this.setsCache
  }

  private async fetchCardsForLanguage(
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
          const cardsList = Array.isArray(data.cards) ? data.cards : []
          rawCards = cardsList.filter((c) => Boolean(c.image))
        }
      } else {
        const searchParam = parsed.name || parsed.localId || ''
        if (searchParam) {
          const url = `${base}/cards?name=${encodeURIComponent(searchParam)}`
          const res = await fetch(url, { signal: AbortSignal.timeout(4500) })
          if (res.ok) {
            const data = (await res.json()) as TcgDexBriefCard[]
            const cardsList = Array.isArray(data) ? data : []
            rawCards = cardsList.filter((c) => Boolean(c.image))
          } else if (parsed.name && parsed.name.includes(' ')) {
            const firstWord = parsed.name.split(' ')[0]
            const fallbackRes = await fetch(`${base}/cards?name=${encodeURIComponent(firstWord)}`, {
              signal: AbortSignal.timeout(4500),
            })
            if (fallbackRes.ok) {
              const data = (await fallbackRes.json()) as TcgDexBriefCard[]
              const cardsList = Array.isArray(data) ? data : []
              rawCards = cardsList.filter((c) => Boolean(c.image))
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

  async searchCards(
    query: string,
    limit = 20,
    dexId?: number,
    offset = 0,
    rarity = 'any',
    lang = 'all'
  ): Promise<TcgCardSearchResult[]> {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery && !dexId) return []

    const sliceCacheKey = `${dexId ?? 'none'}:${normalizedQuery}:${rarity}:${lang}:${limit}:${offset}`
    const cachedSlice = this.queryCache.get(sliceCacheKey)
    if (cachedSlice && Date.now() - cachedSlice.timestamp < this.cacheTtlMs) {
      return cachedSlice.results
    }

    const fullCacheKey = `${dexId ?? 'none'}:${normalizedQuery}:${lang}`
    let finalResults: TcgCardSearchResult[]

    const cachedFull = this.fullResultsCache.get(fullCacheKey)
    if (cachedFull && Date.now() - cachedFull.timestamp < this.cacheTtlMs) {
      finalResults = cachedFull.results
    } else {
      const parsed = this.parseQuery(query)
      const setsMap = await this.getSetsMap()
      const resolvedDexId =
        dexId ?? (parsed.name ? investmentService.resolvePokemonId(parsed.name) ?? undefined : undefined)

      let rawCards: Array<TcgDexBriefCard & { language: string }> = []

      if (lang === 'all') {
        // Smart parallel queries across English (EN) and Japanese (JA) endpoints
        const [enCards, jaCards] = await Promise.all([
          this.fetchCardsForLanguage('en', parsed, resolvedDexId),
          this.fetchCardsForLanguage('ja', parsed, resolvedDexId),
        ])
        rawCards = [...enCards, ...jaCards]

        // Fallback to Chinese if zero cards match
        if (rawCards.length === 0) {
          const zhCards = await this.fetchCardsForLanguage('zh-tw', parsed, resolvedDexId)
          rawCards = zhCards
        }
      } else {
        rawCards = await this.fetchCardsForLanguage(lang, parsed, resolvedDexId)
      }

      // Build mapped results
      const results: TcgCardSearchResult[] = []
      for (const card of rawCards) {
        if (!card.image) continue

        const setId = (card.id.split('-')[0] || '').toLowerCase()
        const setMeta = setsMap.get(setId)

        const imageUrl = card.image.endsWith('.webp') || card.image.endsWith('.png')
          ? card.image
          : `${card.image}/high.webp`

        const thumbnailUrl = card.image.endsWith('.webp') || card.image.endsWith('.png')
          ? card.image
          : `${card.image}/low.webp`

        const rarityInfo = this.getCardRarity(card, setMeta?.total)

        results.push({
          id: card.id,
          localId: card.localId,
          name: card.name,
          set: {
            id: setId,
            name: setMeta?.name || setId.toUpperCase(),
            total: setMeta?.total,
          },
          imageUrl,
          thumbnailUrl,
          rarity: rarityInfo.rarity,
          language: card.language || 'en',
        })
      }

      // Exact localId matching when a collector number is specified in query
      finalResults = results
      if (parsed.localId) {
        const targetLocalId = parsed.localId.replace(/^0+/, '')
        const exactMatches = results.filter((c) => c.localId.replace(/^0+/, '') === targetLocalId)
        if (exactMatches.length > 0) {
          finalResults = exactMatches
        }
      }

      if (this.fullResultsCache.size > 100) {
        const firstKey = this.fullResultsCache.keys().next().value
        if (firstKey) this.fullResultsCache.delete(firstKey)
      }
      this.fullResultsCache.set(fullCacheKey, { timestamp: Date.now(), results: finalResults })
    }

    // Code query bypass: if user query includes a collector number or fraction,
    // bypass rarity filtering to surface all matching cards across all tiers.
    const parsed = this.parseQuery(query)
    const isCodeQuery = Boolean(parsed.localId)
    let filteredResults = finalResults

    if (!isCodeQuery && rarity && rarity !== 'any') {
      const threshold = investmentService.getTargetRarityThreshold(rarity)
      if (threshold > 0) {
        filteredResults = finalResults.filter((card) => {
          const rInfo = this.getCardRarity(card, card.set?.total)
          return rInfo.tier >= threshold
        })
      }
    }

    const trimmedResults = filteredResults.slice(offset, offset + limit)

    // Store in slice cache
    if (this.queryCache.size > 200) {
      const firstKey = this.queryCache.keys().next().value
      if (firstKey) this.queryCache.delete(firstKey)
    }
    this.queryCache.set(sliceCacheKey, { timestamp: Date.now(), results: trimmedResults })

    return trimmedResults
  }

  async getTotalCount(query: string, dexId?: number, rarity = 'any', lang = 'all'): Promise<number> {
    const normalizedQuery = query.trim().toLowerCase()
    const fullCacheKey = `${dexId ?? 'none'}:${normalizedQuery}:${lang}`
    let finalResults: TcgCardSearchResult[]
    const cached = this.fullResultsCache.get(fullCacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      finalResults = cached.results
    } else {
      await this.searchCards(query, 1000, dexId, 0, 'any', lang)
      finalResults = this.fullResultsCache.get(fullCacheKey)?.results || []
    }

    const parsed = this.parseQuery(query)
    const isCodeQuery = Boolean(parsed.localId)
    if (!isCodeQuery && rarity && rarity !== 'any') {
      const threshold = investmentService.getTargetRarityThreshold(rarity)
      if (threshold > 0) {
        return finalResults.filter((card) => {
          const rInfo = this.getCardRarity(card, card.set?.total)
          return rInfo.tier >= threshold
        }).length
      }
    }

    return finalResults.length
  }
}

export const tcgdexService = new TcgDexService()
