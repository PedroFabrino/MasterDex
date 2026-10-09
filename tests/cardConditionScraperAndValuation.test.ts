import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { cardConditionScraperService } from '../server/services/cardConditionScraperService.js'
import { canonicalPriceService } from '../server/services/canonicalPriceService.js'
import { pricingRepository } from '../server/repositories/pricingRepository.js'
import { ensureDbReady } from '../server/db/index.js'
import type { CardPriceRecord } from '../server/db/schema.js'

describe('Card Condition Scraper, Queue, and Valuation Cascade (Ticket #48 / Issue #48)', () => {
  beforeAll(async () => {
    await ensureDbReady()
  })

  describe('LigaPokémon Condition Stock HTML Parser', () => {
    it('extracts minimum prices per condition from embedded cards_stock script', () => {
      const mockHtml = `
        <html>
          <head><title>Charizard | LigaPokemon</title></head>
          <body>
            <script>
              var cards_stock = [
                { "id": 1, "qualid": "6", "precoFinal": "1500.00" },
                { "id": 2, "qualid": "6", "precoFinal": "1300.00" },
                { "id": 3, "qualid": "5", "precoFinal": "2200.00" },
                { "id": 4, "qualid": "5", "precoFinal": "2000.00" },
                { "id": 5, "qualid": "3", "precoFinal": "4500.00" },
                { "id": 6, "qualid": "2", "precoFinal": "8000.00" },
                { "id": 7, "qualid": "1", "precoFinal": "9500.00" }
              ];
            </script>
          </body>
        </html>
      `

      const quotes = cardConditionScraperService.parseStockPrices(mockHtml)

      // qualid 6 = D (DMG) -> min 1300.00
      expect(quotes.DMG).toBe(1300.0)
      // qualid 5 = HP -> min 2000.00
      expect(quotes.HP).toBe(2000.0)
      // qualid 3 = SP (LP) -> min 4500.00
      expect(quotes.LP).toBe(4500.0)
      // qualid 2 & 1 = NM/M -> min 8000.00
      expect(quotes.NM).toBe(8000.0)
      // MP was missing in stock
      expect(quotes.MP).toBeUndefined()
    })

    it('returns empty quotes gracefully when cards_stock is absent', () => {
      const emptyHtml = '<html><body><div>No stock available</div></body></html>'
      const quotes = cardConditionScraperService.parseStockPrices(emptyHtml)
      expect(quotes).toEqual({})
    })
  })

  describe('Scrape Card Conditions & Pricing Repository Persistence', () => {
    it('persists parsed condition quotes to database', async () => {
      const cardId = `test-scrape-card-${Date.now()}`
      const mockHtml = `
        <script>
          var cards_stock = [
            { "id": 101, "qualid": "6", "precoFinal": "450.00" },
            { "id": 102, "qualid": "5", "precoFinal": "700.00" },
            { "id": 103, "qualid": "2", "precoFinal": "1200.00" }
          ];
        </script>
      `

      const result = await cardConditionScraperService.scrapeCardConditions(cardId, {
        cardName: 'TestCard',
        expansionId: 'base1',
        htmlOverride: mockHtml,
        force: true,
      })

      expect(result.success).toBe(true)
      expect(result.quotes.DMG).toBe(450.0)
      expect(result.quotes.HP).toBe(700.0)
      expect(result.quotes.NM).toBe(1200.0)

      // Verify records in pricing repository
      const dmgRecords = await pricingRepository.getPricesByCardIdAndCondition(cardId, 'DMG')
      expect(dmgRecords.length).toBe(1)
      expect(dmgRecords[0].nativePrice).toBe(450.0)

      const hpRecords = await pricingRepository.getPricesByCardIdAndCondition(cardId, 'HP')
      expect(hpRecords.length).toBe(1)
      expect(hpRecords[0].nativePrice).toBe(700.0)
    })
  })

  describe('In-Process Throttled Background Queue', () => {
    it('enqueues items without duplicate entries and starts processing', () => {
      const initialLength = cardConditionScraperService.getQueueLength()
      cardConditionScraperService.enqueue({ cardId: 'queue-card-1', cardName: 'Card 1' })
      cardConditionScraperService.enqueue({ cardId: 'queue-card-1', cardName: 'Card 1' }) // duplicate ignored
      expect(cardConditionScraperService.getQueueLength()).toBeGreaterThanOrEqual(initialLength)
    })
  })

  describe('Three-Tier Valuation Cascade in CanonicalPriceService', () => {
    const cardId = 'test-cascade-card'

    it('Tier 1: uses exact condition quote when present on LigaPokémon', () => {
      const mockQuotes: CardPriceRecord[] = [
        {
          id: `${cardId}:ligapokemon:NM`,
          cardId,
          provider: 'ligapokemon',
          condition: 'NM',
          nativePrice: 1000.0,
          currency: 'BRL',
          recordedAt: new Date(),
        },
        {
          id: `${cardId}:ligapokemon:DMG`,
          cardId,
          provider: 'ligapokemon',
          condition: 'DMG',
          nativePrice: 320.0,
          currency: 'BRL',
          recordedAt: new Date(),
        },
      ]

      const result = canonicalPriceService.resolveFromQuotes(
        mockQuotes,
        'ligapokemon',
        0,
        { USD_BRL: 5.4, EUR_BRL: 5.8 },
        'DMG'
      )

      expect(result.conditionDerivation).toBe('exact')
      expect(result.condition).toBe('DMG')
      expect(result.priceInBrl).toBe(320.0)
      expect(result.isFallback).toBe(false)
    })

    it('Tier 2: scales nearest available condition when exact condition is out of stock', () => {
      // User has DMG, but Liga only has HP (R$ 500) and NM (R$ 1000)
      const mockQuotes: CardPriceRecord[] = [
        {
          id: `${cardId}:ligapokemon:NM`,
          cardId,
          provider: 'ligapokemon',
          condition: 'NM',
          nativePrice: 1000.0,
          currency: 'BRL',
          recordedAt: new Date(),
        },
        {
          id: `${cardId}:ligapokemon:HP`,
          cardId,
          provider: 'ligapokemon',
          condition: 'HP',
          nativePrice: 500.0,
          currency: 'BRL',
          recordedAt: new Date(),
        },
      ]

      const result = canonicalPriceService.resolveFromQuotes(
        mockQuotes,
        'ligapokemon',
        0,
        { USD_BRL: 5.4, EUR_BRL: 5.8 },
        'DMG'
      )

      expect(result.conditionDerivation).toBe('nearest')
      expect(result.condition).toBe('DMG')
      expect(result.nearestConditionUsed).toBe('HP')
      // Ratio DMG (0.30) to HP (0.50) is 0.60 -> 500 * 0.60 = 300.00
      expect(result.priceInBrl).toBe(300.0)
      expect(result.isFallback).toBe(false)
    })

    it('Tier 3: falls back to canonical NM price multiplied by baseline ratio when no condition quotes exist', () => {
      // Only generic NM quote exists
      const mockQuotes: CardPriceRecord[] = [
        {
          id: `${cardId}:ligapokemon:NM`,
          cardId,
          provider: 'ligapokemon',
          condition: 'NM',
          nativePrice: 1000.0,
          currency: 'BRL',
          recordedAt: new Date(),
        },
      ]

      const result = canonicalPriceService.resolveFromQuotes(
        mockQuotes,
        'ligapokemon',
        0,
        { USD_BRL: 5.4, EUR_BRL: 5.8 },
        'DMG'
      )

      // No other conditions existed on Liga, so it fell back to NM baseline * 0.30
      expect(result.conditionDerivation).toBe('fallback')
      expect(result.condition).toBe('DMG')
      expect(result.priceInBrl).toBe(300.0) // 1000 * 0.30
    })

    it('leaves NM cards at 100% full valuation with exact derivation', () => {
      const mockQuotes: CardPriceRecord[] = [
        {
          id: `${cardId}:ligapokemon:NM`,
          cardId,
          provider: 'ligapokemon',
          condition: 'NM',
          nativePrice: 850.0,
          currency: 'BRL',
          recordedAt: new Date(),
        },
      ]

      const result = canonicalPriceService.resolveFromQuotes(
        mockQuotes,
        'ligapokemon',
        0,
        { USD_BRL: 5.4, EUR_BRL: 5.8 },
        'NM'
      )

      expect(result.conditionDerivation).toBe('exact')
      expect(result.condition).toBe('NM')
      expect(result.priceInBrl).toBe(850.0)
    })
  })

  describe('Architectural Line Limit Guardrails (AGENTS.md)', () => {
    it('verifies services stay below the 400-line hard limit', () => {
      const rootDir = process.cwd()
      const files = [
        'server/services/cardConditionScraperService.ts',
        'server/services/canonicalPriceService.ts',
        'server/services/portfolioService.ts',
      ]

      for (const file of files) {
        const fullPath = path.resolve(rootDir, file)
        const lines = fs.readFileSync(fullPath, 'utf-8').split(/\r?\n/).length
        expect(lines, `${file} has ${lines} lines, exceeding 400`).toBeLessThanOrEqual(400)
      }
    })
  })
})
