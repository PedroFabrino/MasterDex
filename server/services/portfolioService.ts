import type {
  PortfolioSummary,
  PortfolioTopCard,
  PortfolioRegionalBreakdown,
  ValuationPreference,
} from '../../shared/types.js'
import { collectorRepository } from '../repositories/collectorRepository.js'
import { tcgdexPricingService } from './tcgdexPricingService.js'
import { exchangeRateService } from './exchangeRateService.js'
import { canonicalPriceService } from './canonicalPriceService.js'

export const REGIONS_BY_GEN: Record<number, string> = {
  1: 'Kanto',
  2: 'Johto',
  3: 'Hoenn',
  4: 'Sinnoh',
  5: 'Unova',
  6: 'Kalos',
  7: 'Alola',
  8: 'Galar',
  9: 'Paldea',
}

export function getGenerationAndRegion(dexId: number): { generation: number; regionName: string } {
  if (dexId <= 151) return { generation: 1, regionName: 'Kanto' }
  if (dexId <= 251) return { generation: 2, regionName: 'Johto' }
  if (dexId <= 386) return { generation: 3, regionName: 'Hoenn' }
  if (dexId <= 493) return { generation: 4, regionName: 'Sinnoh' }
  if (dexId <= 649) return { generation: 5, regionName: 'Unova' }
  if (dexId <= 721) return { generation: 6, regionName: 'Kalos' }
  if (dexId <= 809) return { generation: 7, regionName: 'Alola' }
  if (dexId <= 905) return { generation: 8, regionName: 'Galar' }
  return { generation: 9, regionName: 'Paldea' }
}

export class PortfolioService {
  async getPortfolioSummary(
    userId: string,
    preference?: ValuationPreference
  ): Promise<PortfolioSummary> {
    const assignedCards = await collectorRepository.getAssignedCollectedCards(userId)

    let pref = preference
    if (!pref) {
      const prefs = await collectorRepository.getPreferences(userId)
      pref = prefs.valuationPreference || 'ligapokemon'
    }

    const emptySummary: PortfolioSummary = {
      totalBrl: 0,
      totalUsd: 0,
      cardCount: 0,
      topCards: [],
      regionalDistribution: Object.entries(REGIONS_BY_GEN).map(([gen, name]) => ({
        generation: parseInt(gen, 10),
        regionName: name,
        cardCount: 0,
        totalBrl: 0,
        percentage: 0,
      })),
      comparison: {
        ligapokemonBrl: 0,
        tcgplayerBrl: 0,
      },
    }

    if (assignedCards.length === 0) {
      return emptySummary
    }

    const cardIds = assignedCards.map((c) => c.cardId).filter(Boolean) as string[]
    const [pricesMap, rates] = await Promise.all([
      tcgdexPricingService.ensureCardsPricing(cardIds),
      exchangeRateService.getAllRates(),
    ])

    const usdRate = rates.USD_BRL || 5.4
    let totalBrl = 0
    let totalLigaBrl = 0
    let totalTcgBrl = 0

    const enrichedCards: Array<{
      pokedexId: number
      cardId: string
      name: string
      imageUrl?: string | null
      priceInBrl: number
      priceInUsd: number
      provider: string
      generation: number
      regionName: string
    }> = []

    const genBuckets = new Map<number, { count: number; totalBrl: number }>()
    for (let g = 1; g <= 9; g++) {
      genBuckets.set(g, { count: 0, totalBrl: 0 })
    }

    for (const item of assignedCards) {
      if (!item.cardId) continue

      const quotes = pricesMap.get(item.cardId) || []
      const canonical = canonicalPriceService.resolveFromQuotes(quotes, pref, 0, rates)
      const ligaCanonical = canonicalPriceService.resolveFromQuotes(quotes, 'ligapokemon', 0, rates)
      const tcgCanonical = canonicalPriceService.resolveFromQuotes(quotes, 'tcgplayer', 0, rates)

      const priceInBrl = canonical.priceInBrl
      const priceInUsd = Math.round((priceInBrl / usdRate) * 100) / 100

      totalBrl += priceInBrl
      totalLigaBrl += ligaCanonical.priceInBrl
      totalTcgBrl += tcgCanonical.priceInBrl

      const { generation, regionName } = getGenerationAndRegion(item.pokedexId)
      const bucket = genBuckets.get(generation)
      if (bucket) {
        bucket.count++
        bucket.totalBrl += priceInBrl
      }

      enrichedCards.push({
        pokedexId: item.pokedexId,
        cardId: item.cardId,
        name: item.cardName || `Pokémon #${item.pokedexId}`,
        imageUrl: item.cardImageUrl,
        priceInBrl,
        priceInUsd,
        provider: canonical.provider,
        generation,
        regionName,
      })
    }

    const round2 = (val: number) => Math.round(val * 100) / 100
    const roundedTotalBrl = round2(totalBrl)
    const roundedTotalUsd = round2(totalBrl / usdRate)

    // Top 5 chase cards owned
    const topCards: PortfolioTopCard[] = [...enrichedCards]
      .sort((a, b) => b.priceInBrl - a.priceInBrl)
      .slice(0, 5)
      .map((c) => ({
        pokedexId: c.pokedexId,
        cardId: c.cardId,
        name: c.name,
        imageUrl: c.imageUrl,
        priceInBrl: c.priceInBrl,
        priceInUsd: c.priceInUsd,
        provider: c.provider,
      }))

    // Regional distribution (Gen 1-9)
    const regionalDistribution: PortfolioRegionalBreakdown[] = []
    for (let g = 1; g <= 9; g++) {
      const bucket = genBuckets.get(g) || { count: 0, totalBrl: 0 }
      const gTotal = round2(bucket.totalBrl)
      const percentage = roundedTotalBrl > 0 ? round2((gTotal / roundedTotalBrl) * 100) : 0
      regionalDistribution.push({
        generation: g,
        regionName: REGIONS_BY_GEN[g],
        cardCount: bucket.count,
        totalBrl: gTotal,
        percentage,
      })
    }

    return {
      totalBrl: roundedTotalBrl,
      totalUsd: roundedTotalUsd,
      cardCount: assignedCards.length,
      topCards,
      regionalDistribution,
      comparison: {
        ligapokemonBrl: round2(totalLigaBrl),
        tcgplayerBrl: round2(totalTcgBrl),
      },
    }
  }
}

export const portfolioService = new PortfolioService()
