import { pricingRepository } from '../repositories/pricingRepository.js'
import { expansionsRepository } from '../repositories/expansionsRepository.js'
import { exchangeRateService } from '../services/exchangeRateService.js'
import { investmentService } from '../services/investmentService.js'
import type { CardRecord } from '../db/schema.js'

export class TcgdexPricingService {
  async fetchCardPricing(cardId: string): Promise<{
    tcgplayer?: { nativePrice: number; currency: string }
    cardmarket?: { nativePrice: number; currency: string }
  } | null> {
    try {
      const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(cardId)}`, {
        signal: AbortSignal.timeout(4000),
      })
      if (!res.ok) return null
      const data = await res.json()

      const result: {
        tcgplayer?: { nativePrice: number; currency: string }
        cardmarket?: { nativePrice: number; currency: string }
      } = {}

      const resolved = pricingRepository.resolveTcgdexPrice(data)
      if (resolved) {
        result.tcgplayer = resolved
      }

      const cm = data.pricing?.cardmarket
      if (cm) {
        const trend = cm.trend || cm.avg || cm['trend-holo'] || cm['avg-holo'] || 0
        if (trend > 0) {
          result.cardmarket = {
            nativePrice: Math.round(trend * 100) / 100,
            currency: 'EUR',
          }
        }
      }

      return result
    } catch (err: any) {
      console.warn(`[tcgdexPricingService] Failed to fetch pricing for ${cardId}:`, err?.message)
      return null
    }
  }

  async syncExpansionPrices(expansionId: string): Promise<{
    syncedCardsCount: number
    investmentScore: number
    chaseCardPrice: number | null
  }> {
    const expansion = await expansionsRepository.getExpansionById(expansionId)
    if (!expansion) throw new Error(`Expansion not found: ${expansionId}`)

    const allCards = await expansionsRepository.getAllCardsByExpansionId(expansionId)
    if (allCards.length === 0) return { syncedCardsCount: 0, investmentScore: 0, chaseCardPrice: null }

    // Prioritize secret cards and high rarity cards
    const secretCards = allCards.filter((c) => c.isSecret)
    const cardsToSync = secretCards.length > 0 ? secretCards : allCards

    let syncedCount = 0
    const updatedCards: CardRecord[] = []
    const batchSize = 6

    for (let i = 0; i < cardsToSync.length; i += batchSize) {
      const chunk = cardsToSync.slice(i, i + batchSize)
      const results = await Promise.all(
        chunk.map(async (card) => {
          const quotes = await this.fetchCardPricing(card.id)
          if (!quotes) return null

          if (quotes.tcgplayer) {
            await pricingRepository.upsertPrice({
              cardId: card.id,
              provider: 'tcgdex_tcgplayer',
              nativePrice: quotes.tcgplayer.nativePrice,
              currency: quotes.tcgplayer.currency,
            })
          }
          if (quotes.cardmarket) {
            await pricingRepository.upsertPrice({
              cardId: card.id,
              provider: 'tcgdex_cardmarket',
              nativePrice: quotes.cardmarket.nativePrice,
              currency: quotes.cardmarket.currency,
            })
          }

          // Canonical conversion to BRL for card record
          let canonicalBrl = card.marketPrice
          if (quotes.tcgplayer) {
            canonicalBrl = await exchangeRateService.convertToBrl(quotes.tcgplayer.nativePrice, 'USD')
          }

          return {
            ...card,
            marketPrice: canonicalBrl,
          }
        })
      )

      for (const res of results) {
        if (res) {
          updatedCards.push(res)
          syncedCount++
        }
      }
    }

    if (updatedCards.length > 0) {
      await expansionsRepository.upsertCards(
        updatedCards.map((c) => ({
          id: c.id,
          expansionId: c.expansionId,
          localId: c.localId,
          name: c.name,
          rarity: c.rarity,
          imageUrl: c.imageUrl,
          marketPrice: c.marketPrice,
          isSecret: c.isSecret,
          types: c.types,
          pokedexId: c.pokedexId,
        }))
      )
    }

    // Refresh expansion investment metrics
    const currentSecrets = await expansionsRepository.getSecretCardsByExpansionId(expansionId)
    const metrics = investmentService.calculateMetrics(
      expansion.baseCount,
      currentSecrets.map((s) => ({
        localId: s.localId,
        marketPrice: s.marketPrice,
        isSecret: s.isSecret,
      }))
    )

    let chaseCardName = expansion.chaseCardName
    let chaseCardPrice = expansion.chaseCardPrice
    if (currentSecrets.length > 0) {
      const sorted = [...currentSecrets].sort((a, b) => b.marketPrice - a.marketPrice)
      if (sorted[0].marketPrice > 0) {
        chaseCardName = sorted[0].name
        chaseCardPrice = sorted[0].marketPrice
      }
    }

    await expansionsRepository.upsertExpansion({
      ...expansion,
      investmentScore: metrics.investmentScore,
      chaseCardName,
      chaseCardPrice,
      totalSecretPoolValue: metrics.secretPoolValue,
      avgSecretPrice: metrics.avgSecretPrice,
      lastScrapedAt: new Date(),
    })

    return {
      syncedCardsCount: syncedCount,
      investmentScore: metrics.investmentScore,
      chaseCardPrice,
    }
  }
}

export const tcgdexPricingService = new TcgdexPricingService()
