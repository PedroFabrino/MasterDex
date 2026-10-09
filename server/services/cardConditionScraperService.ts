import { expansionsRepository } from '../repositories/expansionsRepository.js'
import { pricingRepository } from '../repositories/pricingRepository.js'
import { ligapokemonService } from './ligapokemonService.js'
import {
  LIGA_QUALID_TO_CONDITION,
  type CardCondition,
} from '../../shared/conditionConfig.js'

export interface ConditionScrapeResult {
  success: boolean
  cached: boolean
  cardId: string
  quotes: Partial<Record<CardCondition, number>>
  warning?: string
}

export interface QueueItem {
  cardId: string
  cardName?: string
  expansionId?: string
  force?: boolean
}

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7

export class CardConditionScraperService {
  private queue: QueueItem[] = []
  private queuedIds = new Set<string>()
  private isProcessing = false
  private processIntervalMs = 1000

  /**
   * Enqueues a card for background condition scraping.
   */
  enqueue(item: QueueItem): void {
    if (this.queuedIds.has(item.cardId) && !item.force) {
      return
    }
    this.queuedIds.add(item.cardId)
    this.queue.push(item)
    this.startProcessing()
  }

  getQueueLength(): number {
    return this.queue.length
  }

  private startProcessing(): void {
    if (this.isProcessing) return
    this.isProcessing = true
    this.processNext()
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    const item = this.queue.shift()!
    this.queuedIds.delete(item.cardId)

    try {
      await this.scrapeCardConditions(item.cardId, {
        cardName: item.cardName,
        expansionId: item.expansionId,
        force: item.force,
      })
    } catch (err: any) {
      console.warn(`[cardConditionScraperService] Error processing ${item.cardId}:`, err?.message)
    }

    // Rate-limited delay before processing next item
    setTimeout(() => this.processNext(), this.processIntervalMs)
  }

  /**
   * Scrapes condition prices for a single card directly.
   */
  async scrapeCardConditions(
    cardId: string,
    options?: {
      cardName?: string
      expansionId?: string
      force?: boolean
      htmlOverride?: string
    }
  ): Promise<ConditionScrapeResult> {
    // 7-day TTL check
    if (!options?.force) {
      const existing = await pricingRepository.getPricesByCardId(cardId)
      const ligaQuotes = existing.filter((p) => p.provider === 'ligapokemon')
      const now = Date.now()
      if (ligaQuotes.length > 0) {
        const oldest = Math.min(...ligaQuotes.map((q) => q.recordedAt.getTime()))
        if (now - oldest < SEVEN_DAYS_MS) {
          const quotes: Partial<Record<CardCondition, number>> = {}
          for (const q of ligaQuotes) {
            quotes[q.condition as CardCondition] = q.nativePrice
          }
          return { success: true, cached: true, cardId, quotes }
        }
      }
    }

    let html = options?.htmlOverride || ''
    if (!html) {
      let cardName = options?.cardName
      let expansionId = options?.expansionId

      if (!cardName || !expansionId) {
        const cardRecord = await expansionsRepository.getCardById(cardId)
        if (cardRecord) {
          cardName = cardName || cardRecord.name
          expansionId = expansionId || cardRecord.expansionId
        }
      }

      if (!cardName) {
        return { success: false, cached: false, cardId, quotes: {}, warning: 'Card name could not be resolved' }
      }

      let editionCode: string | null = null
      if (expansionId) {
        const exp = await expansionsRepository.getExpansionById(expansionId)
        if (exp) {
          editionCode = ligapokemonService.resolveEditionCode(exp)
        }
      }

      if (!editionCode) {
        const rawExpId = cardId.split('-')[0]
        editionCode = ligapokemonService.resolveEditionCode({ id: rawExpId, slug: rawExpId })
      }

      if (!editionCode) {
        return { success: false, cached: false, cardId, quotes: {}, warning: 'Liga edition code unmapped' }
      }

      const url = `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(cardName)}&ed=${encodeURIComponent(editionCode)}`
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
          },
          signal: AbortSignal.timeout(6000),
        })

        if (!res.ok) {
          return { success: false, cached: false, cardId, quotes: {}, warning: `HTTP ${res.status}` }
        }
        html = await res.text()
      } catch (err: any) {
        return { success: false, cached: false, cardId, quotes: {}, warning: err?.message || 'Network error' }
      }
    }

    const parsedQuotes = this.parseStockPrices(html)
    const quotesToUpsert: Array<{ condition: CardCondition; price: number }> = []

    for (const [cond, price] of Object.entries(parsedQuotes)) {
      if (price && price > 0) {
        quotesToUpsert.push({ condition: cond as CardCondition, price })
        await pricingRepository.upsertPrice({
          cardId,
          provider: 'ligapokemon',
          condition: cond,
          nativePrice: price,
          currency: 'BRL',
        })
      }
    }

    return {
      success: Object.keys(parsedQuotes).length > 0,
      cached: false,
      cardId,
      quotes: parsedQuotes,
    }
  }

  /**
   * Parses Liga cards_stock script array and computes minimum price per CardCondition.
   */
  parseStockPrices(html: string): Partial<Record<CardCondition, number>> {
    const matchStock = html.match(/var cards_stock\s*=\s*(\[.*?\]);/s)
    if (!matchStock) return {}

    let stockList: any[] = []
    try {
      stockList = JSON.parse(matchStock[1])
    } catch {
      return {}
    }

    const grouped: Record<CardCondition, number[]> = {
      NM: [],
      LP: [],
      MP: [],
      HP: [],
      DMG: [],
    }

    for (const item of stockList) {
      const q = item.qualid
      const condition = LIGA_QUALID_TO_CONDITION[q]
      if (condition && item.precoFinal) {
        const price = parseFloat(item.precoFinal)
        if (!isNaN(price) && price > 0) {
          grouped[condition].push(price)
        }
      }
    }

    const result: Partial<Record<CardCondition, number>> = {}
    for (const [cond, prices] of Object.entries(grouped) as [CardCondition, number[]][]) {
      if (prices.length > 0) {
        result[cond] = Math.min(...prices)
      }
    }

    return result
  }
}

export const cardConditionScraperService = new CardConditionScraperService()
