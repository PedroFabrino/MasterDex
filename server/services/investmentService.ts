import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { InvestmentMetrics, ExpansionCategory, ValuationPreference } from '../../shared/types.js'
import type { CardRecord, ExpansionRecord } from '../db/schema.js'
import { expansionsRepository } from '../repositories/expansionsRepository.js'
import { collectorRepository } from '../repositories/collectorRepository.js'
import { canonicalPriceService } from './canonicalPriceService.js'


export interface CardPriceInput {
  localId: number
  marketPrice: number
  isSecret: boolean
}

export type TargetRarity = 'any' | 'holo' | 'ultra' | 'illustration' | 'secret'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pokedexPath = path.resolve(__dirname, '../../src/data/pokedex.json')

let exactSpeciesMap: Map<string, number> | null = null
let sortedSpeciesList: Array<{ id: number; name: string }> | null = null

function loadPokedexIndex(): { exactMap: Map<string, number>; sorted: Array<{ id: number; name: string }> } {
  if (exactSpeciesMap && sortedSpeciesList) {
    return { exactMap: exactSpeciesMap, sorted: sortedSpeciesList }
  }

  try {
    const raw = fs.readFileSync(pokedexPath, 'utf-8')
    const list = JSON.parse(raw) as Array<{ id: number; name: string }>
    exactSpeciesMap = new Map()
    for (const p of list) {
      exactSpeciesMap.set(p.name.toLowerCase(), p.id)
    }
    sortedSpeciesList = [...list].sort((a, b) => b.name.length - a.name.length)
  } catch {
    exactSpeciesMap = new Map()
    sortedSpeciesList = []
  }

  return { exactMap: exactSpeciesMap, sorted: sortedSpeciesList }
}

const resolutionCache = new Map<string, number | null>()

export class InvestmentService {
  calculateMetrics(baseCount: number, secretCards: CardPriceInput[]): InvestmentMetrics {
    if (baseCount <= 0 || secretCards.length === 0) {
      return {
        chaseCardCeiling: 0,
        avgSecretPrice: 0,
        secretPoolValue: 0,
        secretDensity: 0,
        investmentScore: 0,
      }
    }

    const secretPrices = secretCards.map((c) => Math.max(0, c.marketPrice))
    const chaseCardCeiling = Math.max(...secretPrices, 0)
    const secretPoolValue = secretPrices.reduce((sum, p) => sum + p, 0)
    const avgSecretPrice = secretPoolValue / secretPrices.length
    const secretDensity = secretCards.length / baseCount

    // Component calculations normalized to 100
    // Ceiling: R$ 1000+ maxes out the ceiling score (40% weight)
    const normalizedCeiling = Math.min(100, chaseCardCeiling / 10) * 0.4
    // Average price: R$ 150+ average secret price maxes out avg score (40% weight)
    const normalizedAvg = Math.min(100, avgSecretPrice / 1.5) * 0.4
    // Density: ratio of 0.5 (50% secrets vs base, e.g. 42/84) maxes out density score (20% weight)
    const normalizedDensity = Math.min(100, secretDensity * 200) * 0.2

    const rawScore = normalizedCeiling + normalizedAvg + normalizedDensity
    const investmentScore = Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10))

    return {
      chaseCardCeiling: Math.round(chaseCardCeiling * 100) / 100,
      avgSecretPrice: Math.round(avgSecretPrice * 100) / 100,
      secretPoolValue: Math.round(secretPoolValue * 100) / 100,
      secretDensity: Math.round(secretDensity * 1000) / 1000,
      investmentScore,
    }
  }

  /**
   * Returns numeric tier:
   * 0: Any / Common / Uncommon / Normal
   * 1: Holo Rare / Rare Holo / Holo / Reverse Holo / Rare / Radiant
   * 2: Ultra Rare / Double Rare / ex / EX / GX / V / VMAX / VSTAR / ACE SPEC
   * 3: Illustration Rare / Special Illustration Rare / SIR / AR / SAR / Special Art / TG / GG
   * 4: Secret Rare / Hyper Rare / Rainbow / Gold / SA+
   */
  getRarityTier(rarity?: string | null, isSecret?: boolean): number {
    if (isSecret) return 4
    if (!rarity) return 0
    const r = rarity.toLowerCase().trim()

    if (
      r.includes('secret') ||
      r.includes('hyper') ||
      r.includes('rainbow') ||
      r.includes('gold') ||
      r.includes('sa+')
    ) {
      return 4
    }
    if (
      r.includes('illustration') ||
      r.includes('sir') ||
      r.includes('sar') ||
      r.includes('special art') ||
      r.includes('trainer gallery') ||
      r.includes('galarian gallery')
    ) {
      return 3
    }
    if (
      r.includes('ultra') ||
      r.includes('double') ||
      r.includes('vmax') ||
      r.includes('vstar') ||
      r.includes('ace spec') ||
      /\b(ex|gx|v)\b/.test(r)
    ) {
      return 2
    }
    if (r.includes('holo') || r.includes('rare') || r.includes('radiant')) {
      return 1
    }
    return 0
  }

  getTargetRarityThreshold(filter: string = 'any'): number {
    switch (filter.toLowerCase().trim()) {
      case 'holo':
        return 1
      case 'ultra':
        return 2
      case 'illustration':
        return 3
      case 'secret':
        return 4
      case 'any':
      default:
        return 0
    }
  }

  /**
   * Resolves card name to Pokédex National Dex ID (1..1025) or null if non-Pokémon (trainer/energy).
   */
  resolvePokemonId(cardName: string): number | null {
    if (!cardName) return null
    if (resolutionCache.has(cardName)) {
      return resolutionCache.get(cardName)!
    }

    const { exactMap, sorted } = loadPokedexIndex()
    const lower = cardName.toLowerCase().trim()

    if (exactMap.has(lower)) {
      const res = exactMap.get(lower)!
      resolutionCache.set(cardName, res)
      return res
    }

    // Clean common prefixes, suffixes, forms
    const cleaned = lower
      .replace(/\b(mega|primal|radiant|shining|alolan|galarian|hisuian|paldean|gigantamax)\s+/gi, '')
      .replace(/\s+\b(ex|gx|v|vmax|vstar|lv\.x|prime|break|star|fb|sp|c|g)\b/gi, '')
      .replace(/\s*\(.*?\)/g, '')
      .trim()

    if (exactMap.has(cleaned)) {
      const res = exactMap.get(cleaned)!
      resolutionCache.set(cardName, res)
      return res
    }

    // Match against sorted species list with word boundaries
    for (const p of sorted) {
      const pLower = p.name.toLowerCase()
      const regex = new RegExp('(^|\\s|[-])' + pLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '($|\\s|[-])', 'i')
      if (regex.test(lower)) {
        resolutionCache.set(cardName, p.id)
        return p.id
      }
    }

    resolutionCache.set(cardName, null)
    return null
  }

  /**
   * Computes Collection Gap Yield: count of cards in expansion matching/exceeding target rarity
   * for which user does not own a card of >= target rarity.
   */
  calculateCollectionGapYield(
    expansionCards: CardRecord[],
    userOwnedRarityMap: Map<number, number>,
    targetRarity: string = 'any'
  ): number {
    const threshold = this.getTargetRarityThreshold(targetRarity)
    let gapCount = 0

    for (const card of expansionCards) {
      const cardTier = this.getRarityTier(card.rarity, card.isSecret)
      if (cardTier < threshold) {
        continue
      }

      const dexId = card.pokedexId || this.resolvePokemonId(card.name)
      if (!dexId) {
        continue // Trainer / Energy
      }

      const ownedTier = userOwnedRarityMap.get(dexId)
      if (ownedTier === undefined || ownedTier < threshold) {
        gapCount++
      }
    }

    return gapCount
  }

  /**
   * Sorts expansions by gap_yield, score, chase, or pool.
   */
  sortExpansions<
    T extends {
      collectionGapYield: number
      investmentScore: number
      chaseCardPrice?: number | null
      totalSecretPoolValue?: number | null
      name: string
    }
  >(list: T[], sortBy: string = 'score'): T[] {
    const norm = sortBy.toLowerCase().trim()

    return [...list].sort((a, b) => {
      if (norm === 'gap_yield' || norm === 'gap') {
        const diff = b.collectionGapYield - a.collectionGapYield
        if (diff !== 0) return diff
        return b.investmentScore - a.investmentScore
      }
      if (norm === 'chase' || norm === 'chase_price') {
        const aVal = a.chaseCardPrice ?? 0
        const bVal = b.chaseCardPrice ?? 0
        const diff = bVal - aVal
        if (diff !== 0) return diff
        return b.investmentScore - a.investmentScore
      }
      if (norm === 'pool' || norm === 'pool_value') {
        const aVal = a.totalSecretPoolValue ?? 0
        const bVal = b.totalSecretPoolValue ?? 0
        const diff = bVal - aVal
        if (diff !== 0) return diff
        return b.investmentScore - a.investmentScore
      }
      // Default: 'score' / 'investment_score'
      const diff = b.investmentScore - a.investmentScore
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Classifies an expansion as 'booster' or 'promo' deterministically based on set ID and name.
   */
  classifyExpansionCategory(id: string, name: string): ExpansionCategory {
    const normId = id.toLowerCase().trim()
    const normName = name.toLowerCase().trim()

    const isPromoId =
      normId.endsWith('p') ||
      normId.startsWith('pop') ||
      normId.startsWith('tk-') ||
      ['wp', 'bp', 'np', 'sp', 'miscp'].includes(normId)

    const isPromoName =
      normName.includes('promo') ||
      normName.includes('promotional') ||
      normName.includes('trainer kit') ||
      normName.includes('mcdonald') ||
      normName.includes('trick or trade') ||
      normName.includes('jumbo')

    return isPromoId || isPromoName ? 'promo' : 'booster'
  }

  async getExpansionsWithYield(options: {
    userId?: string
    rarity?: string
    sort?: string
    category?: string
    preference?: ValuationPreference
  }): Promise<Array<ExpansionRecord & { collectionGapYield: number; category: ExpansionCategory; valuationPreference?: ValuationPreference }>> {
    const allExpansions = await expansionsRepository.getAllExpansions()
    const { allCards, cardsByExp } = await expansionsRepository.getCardsGroupedByExpansion()

    // Filter by expansion category ('booster' | 'promo' | 'all', default: 'booster')
    const requestedCategory = (options.category || 'booster').toLowerCase()
    const filteredExpansions = allExpansions.filter((exp) => {
      if (requestedCategory === 'all') return true
      const cat = this.classifyExpansionCategory(exp.id, exp.name)
      return cat === requestedCategory
    })

    // Map user owned pokemon to their highest rarity tier
    const userOwnedRarityMap = new Map<number, number>()
    let resolvedPreference = options.preference
    if (options.userId) {
      const cardsById = new Map<string, CardRecord>()
      for (const card of allCards) {
        cardsById.set(card.id, card)
      }

      const [userCollection, userPrefs] = await Promise.all([
        collectorRepository.getUserCollection(options.userId),
        collectorRepository.getPreferences(options.userId),
      ])

      if (!resolvedPreference) {
        resolvedPreference = userPrefs.valuationPreference
      }

      for (const item of userCollection) {
        if (!item.collected) continue

        let ownedTier = 0 // default sprite tier
        if (item.cardId) {
          const card = cardsById.get(item.cardId)
          if (card) {
            ownedTier = this.getRarityTier(card.rarity, card.isSecret)
          } else {
            ownedTier = 1
          }
        }

        const existingTier = userOwnedRarityMap.get(item.pokedexId) ?? -1
        if (ownedTier > existingTier) {
          userOwnedRarityMap.set(item.pokedexId, ownedTier)
        }
      }
    }

    const pref = resolvedPreference || 'ligapokemon'
    const rarityFilter = (options.rarity as TargetRarity) || 'any'
    const enriched = filteredExpansions.map((exp) => {
      const expCards = cardsByExp.get(exp.id) || []
      const collectionGapYield = this.calculateCollectionGapYield(
        expCards,
        userOwnedRarityMap,
        rarityFilter
      )
      const category = this.classifyExpansionCategory(exp.id, exp.name)

      return {
        ...exp,
        collectionGapYield,
        category,
      }
    })

    const canonicalEnriched = await canonicalPriceService.enrichExpansionsWithCanonicalMetrics(
      enriched,
      cardsByExp,
      pref,
      (base, secrets) => this.calculateMetrics(base, secrets)
    )

    const sortBy = options.sort || 'score'
    return this.sortExpansions(canonicalEnriched, sortBy)
  }
}

export const investmentService = new InvestmentService()

