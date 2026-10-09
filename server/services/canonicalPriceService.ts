import type { ValuationPreference } from '../../shared/types.js'
import type { CardPriceRecord } from '../db/schema.js'
import { pricingRepository } from '../repositories/pricingRepository.js'
import { exchangeRateService } from './exchangeRateService.js'

import {
  findNearestCondition,
  getConditionRelativeRatio,
  CONDITION_BASELINE_MULTIPLIERS,
  type CardCondition,
} from '../../shared/conditionConfig.js'

export interface CanonicalPriceResult {
  priceInBrl: number
  nativePrice: number
  currency: string
  provider: string
  isFallback: boolean
  condition?: string
  conditionDerivation?: 'exact' | 'nearest' | 'fallback'
  nearestConditionUsed?: string | null
  allQuotes: Array<{
    provider: string
    condition?: string
    nativePrice: number
    currency: string
    priceInBrl: number
  }>
}

export class CanonicalPriceService {
  resolveFromQuotes(
    quotes: CardPriceRecord[],
    preference: ValuationPreference = 'ligapokemon',
    defaultMarketPrice = 0,
    rates: { USD_BRL: number; EUR_BRL: number } = { USD_BRL: 5.4, EUR_BRL: 5.8 },
    targetCondition: CardCondition = 'NM'
  ): CanonicalPriceResult {
    const allQuotes = quotes.map((q) => {
      const curr = q.currency.toUpperCase()
      let brl = q.nativePrice
      if (curr === 'USD') brl = q.nativePrice * rates.USD_BRL
      else if (curr === 'EUR') brl = q.nativePrice * rates.EUR_BRL
      return {
        provider: q.provider,
        condition: q.condition || 'NM',
        nativePrice: q.nativePrice,
        currency: q.currency,
        priceInBrl: Math.round(brl * 100) / 100,
      }
    })

    // Tier 1: Exact match for targetCondition on LigaPokémon when preferred
    if (preference === 'ligapokemon') {
      const exactLiga = allQuotes.find(
        (q) => q.provider === 'ligapokemon' && (q.condition || 'NM') === targetCondition && q.nativePrice > 0
      )
      if (exactLiga) {
        return {
          priceInBrl: exactLiga.priceInBrl,
          nativePrice: exactLiga.nativePrice,
          currency: exactLiga.currency,
          provider: exactLiga.provider,
          isFallback: false,
          condition: targetCondition,
          conditionDerivation: 'exact',
          allQuotes,
        }
      }

      // Tier 2: Scaled quote from nearest available condition on LigaPokémon (when at least one non-NM condition exists)
      if (targetCondition !== 'NM') {
        const availableLiga = allQuotes.filter((q) => q.provider === 'ligapokemon' && q.nativePrice > 0)
        const availableConditions = Array.from(
          new Set(availableLiga.map((q) => (q.condition || 'NM') as CardCondition))
        )
        const nonNmConditions = availableConditions.filter((c) => c !== 'NM')

        if (nonNmConditions.length > 0) {
          const nearest = findNearestCondition(targetCondition, availableConditions)
          if (nearest && nearest !== targetCondition) {
            const nearestQuote = availableLiga.find((q) => (q.condition || 'NM') === nearest)!
            const ratio = getConditionRelativeRatio(targetCondition, nearest)
            const scaledBrl = Math.round(nearestQuote.priceInBrl * ratio * 100) / 100
            const scaledNative = Math.round(nearestQuote.nativePrice * ratio * 100) / 100
            return {
              priceInBrl: scaledBrl,
              nativePrice: scaledNative,
              currency: nearestQuote.currency,
              provider: nearestQuote.provider,
              isFallback: false,
              condition: targetCondition,
              conditionDerivation: 'nearest',
              nearestConditionUsed: nearest,
              allQuotes,
            }
          }
        }
      }
    }

    // Tier 3: Resolve NM baseline quote and scale by baseline multiplier if non-NM
    const nmQuotes = allQuotes.filter((q) => (q.condition || 'NM') === 'NM')
    const quotesForBase = nmQuotes.length > 0 ? nmQuotes : allQuotes

    const ligaQuote = quotesForBase.find((q) => q.provider === 'ligapokemon')
    const tcgplayerQuote = quotesForBase.find(
      (q) =>
        q.provider === 'tcgdex_tcgplayer' ||
        q.provider === 'tcgplayer' ||
        q.provider === 'tcgcsv'
    )
    const otherQuote = quotesForBase[0]

    let baseResult: { priceInBrl: number; nativePrice: number; currency: string; provider: string; isFallback: boolean }

    if (preference === 'ligapokemon') {
      if (ligaQuote && ligaQuote.nativePrice > 0) {
        baseResult = {
          priceInBrl: ligaQuote.priceInBrl,
          nativePrice: ligaQuote.nativePrice,
          currency: ligaQuote.currency,
          provider: ligaQuote.provider,
          isFallback: false,
        }
      } else if (tcgplayerQuote && tcgplayerQuote.nativePrice > 0) {
        baseResult = {
          priceInBrl: tcgplayerQuote.priceInBrl,
          nativePrice: tcgplayerQuote.nativePrice,
          currency: tcgplayerQuote.currency,
          provider: tcgplayerQuote.provider,
          isFallback: true,
        }
      } else if (otherQuote && otherQuote.nativePrice > 0) {
        baseResult = {
          priceInBrl: otherQuote.priceInBrl,
          nativePrice: otherQuote.nativePrice,
          currency: otherQuote.currency,
          provider: otherQuote.provider,
          isFallback: true,
        }
      } else {
        baseResult = {
          priceInBrl: Math.round(defaultMarketPrice * 100) / 100,
          nativePrice: defaultMarketPrice,
          currency: 'BRL',
          provider: 'default',
          isFallback: true,
        }
      }
    } else {
      // preference === 'tcgplayer'
      if (tcgplayerQuote && tcgplayerQuote.nativePrice > 0) {
        baseResult = {
          priceInBrl: tcgplayerQuote.priceInBrl,
          nativePrice: tcgplayerQuote.nativePrice,
          currency: tcgplayerQuote.currency,
          provider: tcgplayerQuote.provider,
          isFallback: false,
        }
      } else if (ligaQuote && ligaQuote.nativePrice > 0) {
        baseResult = {
          priceInBrl: ligaQuote.priceInBrl,
          nativePrice: ligaQuote.nativePrice,
          currency: ligaQuote.currency,
          provider: ligaQuote.provider,
          isFallback: true,
        }
      } else if (otherQuote && otherQuote.nativePrice > 0) {
        baseResult = {
          priceInBrl: otherQuote.priceInBrl,
          nativePrice: otherQuote.nativePrice,
          currency: otherQuote.currency,
          provider: otherQuote.provider,
          isFallback: true,
        }
      } else {
        baseResult = {
          priceInBrl: Math.round(defaultMarketPrice * 100) / 100,
          nativePrice: defaultMarketPrice,
          currency: 'BRL',
          provider: 'default',
          isFallback: true,
        }
      }
    }

    if (targetCondition !== 'NM') {
      const mult = CONDITION_BASELINE_MULTIPLIERS[targetCondition] ?? 1.0
      return {
        ...baseResult,
        priceInBrl: Math.round(baseResult.priceInBrl * mult * 100) / 100,
        nativePrice: Math.round(baseResult.nativePrice * mult * 100) / 100,
        condition: targetCondition,
        conditionDerivation: 'fallback',
        allQuotes,
      }
    }

    return {
      ...baseResult,
      condition: 'NM',
      conditionDerivation: 'exact',
      allQuotes,
    }
  }

  async resolveCardCanonicalPrice(
    cardId: string,
    preference: ValuationPreference = 'ligapokemon',
    defaultMarketPrice = 0
  ): Promise<CanonicalPriceResult> {
    const [prices, rates] = await Promise.all([
      pricingRepository.getPricesByCardId(cardId),
      exchangeRateService.getAllRates(),
    ])
    return this.resolveFromQuotes(prices, preference, defaultMarketPrice, rates)
  }

  async enrichExpansionsWithCanonicalMetrics<T extends { id: string; baseCount: number; chaseCardName?: string | null; chaseCardPrice?: number | null; totalSecretPoolValue?: number | null; avgSecretPrice?: number | null; investmentScore: number }>(
    expansions: T[],
    cardsByExp: Map<string, any[]>,
    preference: ValuationPreference = 'ligapokemon',
    calculateMetricsFn?: (baseCount: number, secretCards: Array<{ localId: number; marketPrice: number; isSecret: boolean }>) => {
      chaseCardCeiling: number
      avgSecretPrice: number
      secretPoolValue: number
      secretDensity: number
      investmentScore: number
    }
  ): Promise<T[]> {
    const allSecretCards: any[] = []
    for (const exp of expansions) {
      const expCards = cardsByExp.get(exp.id) || []
      for (const c of expCards) {
        if (c.isSecret) allSecretCards.push(c)
      }
    }

    if (allSecretCards.length === 0) {
      return expansions.map((e) => ({ ...e, valuationPreference: preference }))
    }

    const secretCardIds = allSecretCards.map((c) => c.id)
    const [pricesMap, rates] = await Promise.all([
      pricingRepository.getPricesByCardIds(secretCardIds),
      exchangeRateService.getAllRates(),
    ])

    return expansions.map((exp) => {
      const expCards = cardsByExp.get(exp.id) || []
      const expSecrets = expCards.filter((c) => c.isSecret)
      if (expSecrets.length === 0) {
        return { ...exp, valuationPreference: preference }
      }

      const canonicalSecretPrices = expSecrets.map((c) => {
        const quotes = pricesMap.get(c.id) || []
        const canonical = this.resolveFromQuotes(quotes, preference, c.marketPrice, rates)
        return {
          localId: c.localId,
          marketPrice: canonical.priceInBrl,
          isSecret: true,
          name: c.name,
        }
      })

      const topChase = [...canonicalSecretPrices].sort((a, b) => b.marketPrice - a.marketPrice)[0]
      const chaseCardPrice = topChase ? topChase.marketPrice : exp.chaseCardPrice
      const chaseCardName = topChase ? topChase.name : exp.chaseCardName

      let investmentScore = exp.investmentScore
      let totalSecretPoolValue = exp.totalSecretPoolValue
      let avgSecretPrice = exp.avgSecretPrice

      if (calculateMetricsFn) {
        const metrics = calculateMetricsFn(exp.baseCount, canonicalSecretPrices)
        investmentScore = metrics.investmentScore
        totalSecretPoolValue = metrics.secretPoolValue
        avgSecretPrice = metrics.avgSecretPrice
      }

      return {
        ...exp,
        chaseCardPrice,
        chaseCardName,
        investmentScore,
        totalSecretPoolValue,
        avgSecretPrice,
        valuationPreference: preference,
      }
    })
  }
}

export const canonicalPriceService = new CanonicalPriceService()
