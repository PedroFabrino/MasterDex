import type { CardPriceRecord } from '../db/schema.js'
import { collectorRepository } from '../repositories/collectorRepository.js'
import { expansionsRepository } from '../repositories/expansionsRepository.js'
import { pricingRepository } from '../repositories/pricingRepository.js'
import { canonicalPriceService } from './canonicalPriceService.js'
import { exchangeRateService } from './exchangeRateService.js'
import { tcgdexPricingService } from './tcgdexPricingService.js'
import { normalizeCardCondition } from '../../shared/conditionConfig.js'

export interface PortfolioExportItem {
  pokedexId: number
  cardId: string
  cardName?: string | null
  setName?: string | null
  cardCondition?: string | null
  isHolo?: boolean | null
  marketPriceUsd?: number | null
}

export const PORTFOLIO_CSV_HEADER =
  'Card,Set,Game,Variant,Kind,Condition,Grade,Quantity,PurchasePrice (USD),MarketPrice (USD),Currency'

/**
 * Strips trailing collector numbers (e.g., " 4/102", " #025", " TG30/TG30", " SWSH088")
 * while preserving base species names like "Porygon2", "Ho-Oh", "Jirachi ex".
 */
export function cleanCardName(name?: string | null): string {
  if (!name) return ''
  return name.replace(/\s+(#?\d+|[A-Za-z]{1,4}\d+)(\/(#?\d+|[A-Za-z]{1,4}\d+))?$/i, '').trim()
}

/**
 * Maps card condition code to third-party portfolio standard string.
 */
export function mapToPortfolioCondition(rawCondition?: string | null): string {
  if (!rawCondition) return 'NEAR_MINT'
  const norm = rawCondition.trim().toUpperCase()
  switch (norm) {
    case 'NM':
    case 'NEAR_MINT':
    case 'NEAR MINT':
    case 'M':
    case 'MINT':
      return 'NEAR_MINT'
    case 'LP':
    case 'LIGHTLY_PLAYED':
    case 'LIGHTLY PLAYED':
    case 'SP':
      return 'LIGHTLY_PLAYED'
    case 'MP':
    case 'MODERATELY_PLAYED':
    case 'MODERATELY PLAYED':
      return 'MODERATELY_PLAYED'
    case 'HP':
    case 'HEAVILY_PLAYED':
    case 'HEAVILY PLAYED':
      return 'HEAVILY_PLAYED'
    case 'DMG':
    case 'DAMAGED':
    case 'D':
      return 'DAMAGED'
    default:
      return 'NEAR_MINT'
  }
}

/**
 * Maps card variant to 'Holofoil' or 'Normal'.
 */
export function mapToPortfolioVariant(isHolo?: boolean | null, rarity?: string | null): 'Holofoil' | 'Normal' {
  if (typeof isHolo === 'boolean') {
    return isHolo ? 'Holofoil' : 'Normal'
  }
  if (rarity) {
    const r = rarity.toLowerCase()
    if (
      r.includes('holo') ||
      r.includes('ultra') ||
      r.includes('secret') ||
      r.includes('illustration') ||
      r.includes('special') ||
      r.includes('hyper') ||
      r.includes('double') ||
      r.includes('radiant') ||
      r.includes('shining') ||
      r.includes('ace spec')
    ) {
      return 'Holofoil'
    }
  }
  return 'Normal'
}

/**
 * Escapes CSV values conforming to RFC 4180.
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Normalizes any input shape (CollectedSlot, UserPokemonRecord, or PortfolioExportItem).
 * Excludes slots without physical cards (tcgCard == null or cardId == null/empty).
 */
export function normalizeExportItem(raw: any): PortfolioExportItem | null {
  if (!raw) return null
  const pokedexId = Number(raw.pokedexId ?? raw.pokemonId)
  if (!pokedexId || isNaN(pokedexId)) return null

  // If passed as CollectedSlot
  if (raw.tcgCard) {
    return {
      pokedexId,
      cardId: raw.tcgCard.id,
      cardName: raw.tcgCard.name,
      setName: raw.tcgCard.setName,
      cardCondition: raw.cardCondition,
      isHolo: raw.tcgCard.isHolo,
    }
  }

  // If passed with explicit cardId
  if (raw.cardId && typeof raw.cardId === 'string' && raw.cardId.trim().length > 0) {
    return {
      pokedexId,
      cardId: raw.cardId.trim(),
      cardName: raw.cardName,
      setName: raw.setName,
      cardCondition: raw.cardCondition,
      isHolo: raw.isHolo,
      marketPriceUsd: raw.marketPriceUsd,
    }
  }

  return null
}

export class PortfolioExportService {
  /**
   * Generates CSV string from normalized items.
   */
  generatePortfolioCsv(
    items: PortfolioExportItem[],
    quotesMapOrRates?: Map<string, CardPriceRecord[]> | { USD_BRL: number; EUR_BRL: number },
    maybeRates?: { USD_BRL: number; EUR_BRL: number }
  ): string {
    let quotesMap = new Map<string, CardPriceRecord[]>()
    let rates = { USD_BRL: 5.4, EUR_BRL: 5.8 }

    if (quotesMapOrRates instanceof Map) {
      quotesMap = quotesMapOrRates
      if (maybeRates) rates = maybeRates
    } else if (quotesMapOrRates && 'USD_BRL' in quotesMapOrRates) {
      rates = quotesMapOrRates
    }

    // Filter valid physical items and sort numerically by Pokédex ID
    const validItems = items
      .filter((item) => item && item.cardId && item.cardId.trim().length > 0)
      .sort((a, b) => a.pokedexId - b.pokedexId)

    const lines = [PORTFOLIO_CSV_HEADER]

    for (const item of validItems) {
      const cardName = cleanCardName(item.cardName || item.cardId)
      const setName = item.setName || 'Unknown Set'
      const variant = mapToPortfolioVariant(item.isHolo)
      const condition = mapToPortfolioCondition(item.cardCondition)

      let marketPriceStr = ''
      if (typeof item.marketPriceUsd === 'number' && item.marketPriceUsd > 0) {
        marketPriceStr = item.marketPriceUsd.toFixed(2)
      } else {
        const quotes = quotesMap.get(item.cardId) || []
        if (quotes.length > 0) {
          const targetCond = normalizeCardCondition(item.cardCondition)
          const canonical = canonicalPriceService.resolveFromQuotes(quotes, 'tcgplayer', 0, rates, targetCond)
          let usdPrice: number | null = null
          if (canonical.currency === 'USD' && canonical.nativePrice > 0) {
            usdPrice = canonical.nativePrice
          } else if (canonical.priceInBrl > 0 && rates.USD_BRL > 0) {
            usdPrice = canonical.priceInBrl / rates.USD_BRL
          }

          if (usdPrice !== null && usdPrice > 0) {
            marketPriceStr = usdPrice.toFixed(2)
          }
        }
      }

      const row = [
        escapeCsvField(cardName),
        escapeCsvField(setName),
        'POKEMON',
        variant,
        'RAW',
        condition,
        '', // Grade
        '1', // Quantity
        '', // PurchasePrice (USD)
        marketPriceStr, // MarketPrice (USD)
        'USD',
      ].join(',')

      lines.push(row)
    }

    return lines.join('\r\n') + '\r\n'
  }

  /**
   * Generates CSV for an array of items (supports CollectedSlot, UserPokemonRecord, etc.).
   */
  async exportFromItems(rawItems: any[]): Promise<string> {
    const items = rawItems
      .map(normalizeExportItem)
      .filter((x): x is PortfolioExportItem => x !== null && Boolean(x.cardId && x.cardId.trim().length > 0))

    if (items.length === 0) {
      return PORTFOLIO_CSV_HEADER + '\r\n'
    }

    items.sort((a, b) => a.pokedexId - b.pokedexId)

    const cardIds = Array.from(new Set(items.map((x) => x.cardId)))

    try {
      await tcgdexPricingService.ensureCardsPricing(cardIds)
    } catch {
      // Non-blocking pricing sync
    }

    const [quotesMap, rates] = await Promise.all([
      pricingRepository.getPricesByCardIds(cardIds),
      exchangeRateService.getAllRates(),
    ])

    // Enrich missing set names or card names from database/repository
    const missingExpIds = new Set<string>()
    for (const item of items) {
      if (!item.setName) {
        const expId = item.cardId.includes('-') ? item.cardId.slice(0, item.cardId.lastIndexOf('-')) : item.cardId
        missingExpIds.add(expId)
      }
    }

    if (missingExpIds.size > 0) {
      const expMap = new Map<string, string>()
      await Promise.all(
        Array.from(missingExpIds).map(async (expId) => {
          const exp = (await expansionsRepository.getExpansionById(expId)) || (await expansionsRepository.getExpansionBySlug(expId))
          if (exp) {
            expMap.set(expId, exp.name)
            expMap.set(exp.slug, exp.name)
          }
        })
      )

      for (const item of items) {
        if (!item.setName) {
          const expId = item.cardId.includes('-') ? item.cardId.slice(0, item.cardId.lastIndexOf('-')) : item.cardId
          item.setName = expMap.get(expId) || expId
        }
      }
    }

    return this.generatePortfolioCsv(items, quotesMap, rates)
  }

  /**
   * Generates CSV for an authenticated user.
   */
  async exportForUser(userId: string): Promise<string> {
    const assignedCards = await collectorRepository.getAssignedCollectedCards(userId)
    return this.exportFromItems(assignedCards)
  }
}

export const portfolioExportService = new PortfolioExportService()
