import type { ValuationPreference } from '../../shared/types.js'
import type { CardPriceRecord } from '../db/schema.js'
import { pricingRepository } from '../repositories/pricingRepository.js'
import { exchangeRateService } from './exchangeRateService.js'

export interface CanonicalPriceResult {
  priceInBrl: number
  nativePrice: number
  currency: string
  provider: string
  isFallback: boolean
  allQuotes: Array<{
    provider: string
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
    rates: { USD_BRL: number; EUR_BRL: number } = { USD_BRL: 5.4, EUR_BRL: 5.8 }
  ): CanonicalPriceResult {
    const allQuotes = quotes.map((q) => {
      const curr = q.currency.toUpperCase()
      let brl = q.nativePrice
      if (curr === 'USD') brl = q.nativePrice * rates.USD_BRL
      else if (curr === 'EUR') brl = q.nativePrice * rates.EUR_BRL
      return {
        provider: q.provider,
        nativePrice: q.nativePrice,
        currency: q.currency,
        priceInBrl: Math.round(brl * 100) / 100,
      }
    })

    const ligaQuote = allQuotes.find((q) => q.provider === 'ligapokemon')
    const tcgplayerQuote = allQuotes.find(
      (q) =>
        q.provider === 'tcgdex_tcgplayer' ||
        q.provider === 'tcgplayer' ||
        q.provider === 'tcgcsv'
    )
    const otherQuote = allQuotes[0]

    if (preference === 'ligapokemon') {
      if (ligaQuote && ligaQuote.nativePrice > 0) {
        return {
          priceInBrl: ligaQuote.priceInBrl,
          nativePrice: ligaQuote.nativePrice,
          currency: ligaQuote.currency,
          provider: ligaQuote.provider,
          isFallback: false,
          allQuotes,
        }
      }
      if (tcgplayerQuote && tcgplayerQuote.nativePrice > 0) {
        return {
          priceInBrl: tcgplayerQuote.priceInBrl,
          nativePrice: tcgplayerQuote.nativePrice,
          currency: tcgplayerQuote.currency,
          provider: tcgplayerQuote.provider,
          isFallback: true,
          allQuotes,
        }
      }
    } else {
      // preference === 'tcgplayer'
      if (tcgplayerQuote && tcgplayerQuote.nativePrice > 0) {
        return {
          priceInBrl: tcgplayerQuote.priceInBrl,
          nativePrice: tcgplayerQuote.nativePrice,
          currency: tcgplayerQuote.currency,
          provider: tcgplayerQuote.provider,
          isFallback: false,
          allQuotes,
        }
      }
      if (ligaQuote && ligaQuote.nativePrice > 0) {
        return {
          priceInBrl: ligaQuote.priceInBrl,
          nativePrice: ligaQuote.nativePrice,
          currency: ligaQuote.currency,
          provider: ligaQuote.provider,
          isFallback: true,
          allQuotes,
        }
      }
    }

    if (otherQuote && otherQuote.nativePrice > 0) {
      return {
        priceInBrl: otherQuote.priceInBrl,
        nativePrice: otherQuote.nativePrice,
        currency: otherQuote.currency,
        provider: otherQuote.provider,
        isFallback: true,
        allQuotes,
      }
    }

    return {
      priceInBrl: Math.round(defaultMarketPrice * 100) / 100,
      nativePrice: defaultMarketPrice,
      currency: 'BRL',
      provider: 'default',
      isFallback: true,
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
