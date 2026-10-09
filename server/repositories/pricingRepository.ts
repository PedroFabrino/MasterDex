import { eq, inArray, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  cardPrices,
  exchangeRates,
  type CardPriceRecord,
  type ExchangeRateRecord,
} from '../db/schema.js'

export interface UpsertPriceInput {
  cardId: string
  provider: 'tcgdex_tcgplayer' | 'tcgdex_cardmarket' | 'tcgcsv' | 'ligapokemon' | string
  condition?: string
  nativePrice: number
  currency: 'USD' | 'EUR' | 'BRL' | string
  recordedAt?: Date
}

export class PricingRepository {
  async upsertPrice(input: UpsertPriceInput): Promise<void> {
    const recordedAt = input.recordedAt || new Date()
    const condition = input.condition || 'NM'
    const id = `${input.cardId}:${input.provider}:${condition}`

    const existing = await db
      .select()
      .from(cardPrices)
      .where(
        and(
          eq(cardPrices.cardId, input.cardId),
          eq(cardPrices.provider, input.provider),
          eq(cardPrices.condition, condition)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(cardPrices)
        .set({
          nativePrice: input.nativePrice,
          currency: input.currency,
          condition,
          recordedAt,
        })
        .where(eq(cardPrices.id, existing[0].id))
    } else {
      await db.insert(cardPrices).values({
        id,
        cardId: input.cardId,
        provider: input.provider,
        condition,
        nativePrice: input.nativePrice,
        currency: input.currency,
        recordedAt,
      })
    }
  }

  async upsertPricesBatch(inputs: UpsertPriceInput[]): Promise<void> {
    for (const item of inputs) {
      await this.upsertPrice(item)
    }
  }

  async getPricesByCardId(cardId: string): Promise<CardPriceRecord[]> {
    return await db.select().from(cardPrices).where(eq(cardPrices.cardId, cardId))
  }

  async getPricesByCardIdAndCondition(cardId: string, condition = 'NM'): Promise<CardPriceRecord[]> {
    return await db
      .select()
      .from(cardPrices)
      .where(and(eq(cardPrices.cardId, cardId), eq(cardPrices.condition, condition)))
  }

  async getPricesByCardIds(cardIds: string[]): Promise<Map<string, CardPriceRecord[]>> {
    const map = new Map<string, CardPriceRecord[]>()
    if (cardIds.length === 0) return map

    const batchSize = 100
    for (let i = 0; i < cardIds.length; i += batchSize) {
      const slice = cardIds.slice(i, i + batchSize)
      const rows = await db.select().from(cardPrices).where(inArray(cardPrices.cardId, slice))
      for (const row of rows) {
        const list = map.get(row.cardId) || []
        list.push(row)
        map.set(row.cardId, list)
      }
    }
    return map
  }

  async upsertExchangeRate(pair: string, rate: number, fetchedAt: Date = new Date()): Promise<void> {
    const existing = await db.select().from(exchangeRates).where(eq(exchangeRates.pair, pair)).limit(1)
    if (existing.length > 0) {
      await db.update(exchangeRates).set({ rate, fetchedAt }).where(eq(exchangeRates.pair, pair))
    } else {
      await db.insert(exchangeRates).values({ pair, rate, fetchedAt })
    }
  }

  async getExchangeRate(pair: string): Promise<ExchangeRateRecord | undefined> {
    const rows = await db.select().from(exchangeRates).where(eq(exchangeRates.pair, pair)).limit(1)
    return rows[0]
  }

  /**
   * Smart rarity selection for TCGdex pricing payload.
   * Commons/Uncommons pick normal.marketPrice.
   * Holo / Ultra / Secret / Illustration pick holofoil.marketPrice.
   */
  resolveTcgdexPrice(card: {
    rarity?: string | null
    pricing?: {
      tcgplayer?: any
      cardmarket?: any
    } | null
  }): { nativePrice: number; currency: 'USD' } | null {
    const tcgplayer = card?.pricing?.tcgplayer
    if (!tcgplayer) return null

    const rarity = (card.rarity || '').toLowerCase()
    const isSpecialOrHolo =
      rarity.includes('holo') ||
      rarity.includes('rare') ||
      rarity.includes('ultra') ||
      rarity.includes('secret') ||
      rarity.includes('illustration') ||
      rarity.includes('special') ||
      rarity.includes('hyper') ||
      rarity.includes('double')

    const holofoil = tcgplayer.holofoil?.marketPrice || tcgplayer['reverse-holofoil']?.marketPrice || 0
    const normal = tcgplayer.normal?.marketPrice || 0

    let selected = 0
    if (isSpecialOrHolo) {
      selected = holofoil > 0 ? holofoil : normal
    } else {
      selected = normal > 0 ? normal : holofoil
    }

    if (selected <= 0) {
      // Fallback to any non-zero market price
      for (const key of Object.keys(tcgplayer)) {
        if (typeof tcgplayer[key] === 'object' && tcgplayer[key]?.marketPrice > 0) {
          selected = tcgplayer[key].marketPrice
          break
        }
      }
    }

    if (selected <= 0) return null
    return {
      nativePrice: Math.round(selected * 100) / 100,
      currency: 'USD',
    }
  }
}

export const pricingRepository = new PricingRepository()
