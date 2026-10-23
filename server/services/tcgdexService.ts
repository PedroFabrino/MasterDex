import type { TcgCardSearchResult } from '../../shared/types.js'
import { parseTcgQuery, type ParsedTcgQuery } from './tcgQueryParser.js'
import { tcgdexRarityService } from './tcgdexRarity.js'
import { investmentService } from './investmentService.js'
import { ptcgAssetService } from './ptcgAssetService.js'
import { tcgdexSetsService, type TcgDexSetBrief } from './tcgdexSetsService.js'
import { tcgdexApiClient, type TcgDexBriefCard } from './tcgdexApiClient.js'
import { expansionsRepository } from '../repositories/expansionsRepository.js'

export type { TcgDexSetBrief }

export class TcgDexService {
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
    return tcgdexSetsService.loadFallbackSets()
  }

  loadJapaneseSets(): TcgDexSetBrief[] {
    return tcgdexSetsService.loadJapaneseSets()
  }

  async getAllSets(): Promise<TcgDexSetBrief[]> {
    return tcgdexSetsService.getAllSets()
  }

  async getSetsMap(): Promise<Map<string, { id: string; name: string; total?: number }>> {
    return tcgdexSetsService.getSetsMap()
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

      // Fetch local baseline cards from repository for resolved Pokémon species (for 'all' or 'en')
      let localCards: Array<TcgDexBriefCard & { language: string }> = []
      if (lang === 'all' || lang === 'en') {
        if (resolvedDexId) {
          try {
            const matched = await expansionsRepository.findMatchingCards({ pokedexId: resolvedDexId })
            localCards = matched.map((c) => ({
              id: c.id,
              localId: String(c.localId),
              name: c.name,
              image: c.imageUrl || undefined,
              imageUrl: c.imageUrl,
              language: 'en',
            }))
          } catch (err) {
            console.warn('[tcgdexService] Could not retrieve local matching cards:', err)
          }
        } else if (parsed.name) {
          const cleanName = parsed.name.toLowerCase().trim()
          if (cleanName === '30th' || cleanName === '30th-c' || cleanName.includes('30th celebration') || cleanName.includes('30th classic')) {
            const targetExpId = (cleanName.includes('-c') || cleanName.includes('classic')) ? '30th-c' : '30th'
            try {
              const expCards = await expansionsRepository.getAllCardsByExpansionId(targetExpId)
              localCards = expCards.map((c) => ({
                id: c.id,
                localId: String(c.localId),
                name: c.name,
                image: c.imageUrl || undefined,
                imageUrl: c.imageUrl,
                language: 'en',
              }))
            } catch (err) {
              console.warn('[tcgdexService] Could not retrieve local expansion cards:', err)
            }
          }
        }
      }

      if (lang === 'all') {
        const [ptCards, enCards, jaCards] = await Promise.all([
          tcgdexApiClient.fetchCardsForLanguage('pt', parsed, resolvedDexId),
          tcgdexApiClient.fetchCardsForLanguage('en', parsed, resolvedDexId),
          tcgdexApiClient.fetchCardsForLanguage('ja', parsed, resolvedDexId),
        ])
        const cardMap = new Map<string, TcgDexBriefCard & { language: string }>()
        for (const c of localCards) {
          cardMap.set(c.id, c)
        }
        for (const c of [...ptCards, ...enCards, ...jaCards]) {
          const existing = cardMap.get(c.id)
          if (!existing) {
            cardMap.set(c.id, c)
          } else if (!existing.image && c.image) {
            cardMap.set(c.id, { ...existing, image: c.image })
          }
        }
        rawCards = Array.from(cardMap.values())

        if (rawCards.length === 0) {
          const zhCards = await tcgdexApiClient.fetchCardsForLanguage('zh-tw', parsed, resolvedDexId)
          rawCards = zhCards
        }
      } else {
        const remoteCards = await tcgdexApiClient.fetchCardsForLanguage(lang, parsed, resolvedDexId)
        const cardMap = new Map<string, TcgDexBriefCard & { language: string }>()
        if (lang === 'en') {
          for (const c of localCards) {
            cardMap.set(c.id, c)
          }
        }
        for (const c of remoteCards) {
          const existing = cardMap.get(c.id)
          if (!existing) {
            cardMap.set(c.id, c)
          } else if (!existing.image && c.image) {
            cardMap.set(c.id, { ...existing, image: c.image })
          }
        }
        rawCards = Array.from(cardMap.values())
      }

      if (
        dexId === 151 &&
        parsed.name?.toLowerCase().includes('mew') &&
        !parsed.name?.toLowerCase().includes('mewtwo')
      ) {
        rawCards = rawCards.filter((c) => !c.name.toLowerCase().includes('mewtwo'))
      }

      // Build mapped results with accurate hyphenated setId resolution and CDN image preservation
      const results: TcgCardSearchResult[] = []
      for (const card of rawCards) {
        const lastHyphenIndex = card.id.lastIndexOf('-')
        const setId = (lastHyphenIndex > 0 ? card.id.slice(0, lastHyphenIndex) : card.id).toLowerCase()
        const localId = lastHyphenIndex > 0 ? card.id.slice(lastHyphenIndex + 1) : card.localId
        const setMeta = setsMap.get(setId)

        const defaultAssetUrl = `https://assets.tcgdex.net/${card.language || 'en'}/${setId}/${localId}`
        const explicitImage = card.image || card.imageUrl
        const imageUrl = explicitImage
          ? explicitImage.endsWith('.webp') || explicitImage.endsWith('.png')
            ? explicitImage
            : `${explicitImage}/high.webp`
          : `${defaultAssetUrl}/high.webp`

        const thumbnailUrl = explicitImage
          ? explicitImage.endsWith('.webp') || explicitImage.endsWith('.png')
            ? explicitImage.replace(/\/high\.(webp|png)$/i, '/low.$1')
            : `${explicitImage}/low.webp`
          : `${defaultAssetUrl}/low.webp`

        if (!imageUrl) continue

        const rarityInfo = this.getCardRarity({ ...card, localId }, setMeta?.total)

        results.push({
          id: card.id,
          localId,
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
          ...(!explicitImage ? { _missingScan: true } : {}),
        } as TcgCardSearchResult)
      }

      finalResults = results

      // Specific query term filtering when dexId is provided and query specifies extra keywords (e.g. "30th", "celebration", "Charizard 30th")
      if (resolvedDexId && parsed.name) {
        const rawTokens = parsed.name.toLowerCase().trim().split(/\s+/).filter(Boolean)
        const filterTokens = rawTokens.filter((t) => t.length > 1 && investmentService.resolvePokemonId(t) !== resolvedDexId)
        if (filterTokens.length > 0) {
          const matchingResults = results.filter((c) => {
            const setName = (c.set?.name || '').toLowerCase()
            const setId = (c.set?.id || '').toLowerCase()
            const cardName = c.name.toLowerCase()
            const cardId = c.id.toLowerCase()
            const localId = c.localId.toLowerCase()
            return filterTokens.every((token) =>
              setName.includes(token) ||
              setId.includes(token) ||
              cardName.includes(token) ||
              cardId.includes(token) ||
              localId === token
            )
          })
          if (matchingResults.length > 0) {
            finalResults = matchingResults
          }
        }
      }

      // Exact localId matching when a collector number is specified in query
      if (parsed.localId) {
        const targetLocalId = parsed.localId.toLowerCase().replace(/^0+/, '')
        const exactMatches = finalResults.filter((c) => c.localId.toLowerCase().replace(/^0+/, '') === targetLocalId)
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

    // Lazily enrich paginated cards missing official scans via ptcgAssetService
    const enrichedResults = await Promise.all(
      trimmedResults.map(async (card) => {
        if ((card as any)._missingScan && card.language !== 'ja') {
          const setId = card.set?.id || (card.id.split('-')[0] || '').toLowerCase()
          const isPromoOrGallery =
            setId === 'mep' ||
            setId.endsWith('p') ||
            setId.endsWith('gg') ||
            setId.endsWith('tg') ||
            /^[a-z]{1,4}\d+/i.test(card.localId)
          if (isPromoOrGallery) {
            const ptcgAsset = await ptcgAssetService.resolveCardImage(setId, card.localId, card.name)
            if (ptcgAsset) {
              return { ...card, imageUrl: ptcgAsset.imageUrl, thumbnailUrl: ptcgAsset.thumbnailUrl }
            }
          }
        }
        return card
      })
    )

    // Store in slice cache
    if (this.queryCache.size > 200) {
      const firstKey = this.queryCache.keys().next().value
      if (firstKey) this.queryCache.delete(firstKey)
    }
    this.queryCache.set(sliceCacheKey, { timestamp: Date.now(), results: enrichedResults })

    return enrichedResults
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
