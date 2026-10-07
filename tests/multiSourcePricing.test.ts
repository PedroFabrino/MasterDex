import { describe, it, expect, beforeAll, vi } from 'vitest'
import { ensureDatabaseTables, rawClient } from '../server/db/index.js'
import { exchangeRateService } from '../server/services/exchangeRateService.js'
import { pricingRepository } from '../server/repositories/pricingRepository.js'
import { app } from '../server/app.js'

describe('Multi-Source Pricing & Exchange Rate Engine (Ticket #42)', () => {
  beforeAll(async () => {
    await ensureDatabaseTables(rawClient)
  })

  describe('exchangeRateService', () => {
    it('caches exchange rate and converts USD to BRL', async () => {
      // Mock network fetch for AwesomeAPI
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (typeof url === 'string' && url.includes('awesomeapi')) {
          return new Response(JSON.stringify({ USDBRL: { bid: '5.40' } }), { status: 200 })
        }
        return new Response('Not found', { status: 404 })
      })

      const rate = await exchangeRateService.getRate('USD_BRL', true)
      expect(rate).toBe(5.40)

      const converted = await exchangeRateService.convertToBrl(10, 'USD')
      expect(converted).toBe(54.00)

      fetchSpy.mockRestore()
    })

    it('falls back to last-known rate if network fails', async () => {
      // Mock network failure
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

      const rate = await exchangeRateService.getRate('USD_BRL')
      expect(rate).toBeGreaterThan(0)

      fetchSpy.mockRestore()
    })
  })

  describe('pricingRepository', () => {
    const testCardId = 'test-pricing-card-1'

    beforeAll(async () => {
      // Ensure parent expansion and card exist for foreign key constraint
      await rawClient.execute(`
        INSERT OR IGNORE INTO expansions (id, name, slug, url, base_count, secret_count, investment_score, last_scraped_at)
        VALUES ('test-exp-p', 'Test Exp', 'test-exp-p', 'http://test', 100, 10, 0, ${Date.now()});
      `)
      await rawClient.execute(`
        INSERT OR IGNORE INTO cards (id, expansion_id, local_id, name, rarity, market_price, is_secret)
        VALUES ('${testCardId}', 'test-exp-p', 1, 'Pikachu Test', 'Rare Holo', 0, 0);
      `)
    })

    it('upserts multi-source card prices and queries quotes', async () => {
      await pricingRepository.upsertPrice({
        cardId: testCardId,
        provider: 'tcgdex_tcgplayer',
        nativePrice: 20.0,
        currency: 'USD',
      })

      await pricingRepository.upsertPrice({
        cardId: testCardId,
        provider: 'tcgdex_cardmarket',
        nativePrice: 17.5,
        currency: 'EUR',
      })

      await pricingRepository.upsertPrice({
        cardId: testCardId,
        provider: 'ligapokemon',
        nativePrice: 110.0,
        currency: 'BRL',
      })

      const prices = await pricingRepository.getPricesByCardId(testCardId)
      expect(prices.length).toBe(3)

      const tcgplayer = prices.find((p) => p.provider === 'tcgdex_tcgplayer')
      expect(tcgplayer?.nativePrice).toBe(20.0)
      expect(tcgplayer?.currency).toBe('USD')

      const liga = prices.find((p) => p.provider === 'ligapokemon')
      expect(liga?.nativePrice).toBe(110.0)
      expect(liga?.currency).toBe('BRL')
    })

    it('extracts smart variant pricing from TCGdex card payload', () => {
      const commonCard = {
        rarity: 'Common',
        pricing: {
          tcgplayer: {
            normal: { marketPrice: 0.25 },
            holofoil: { marketPrice: 2.5 },
          },
        },
      }
      const secretCard = {
        rarity: 'Special Illustration Rare',
        pricing: {
          tcgplayer: {
            normal: { marketPrice: 15.0 },
            holofoil: { marketPrice: 120.0 },
          },
        },
      }

      const commonResolved = pricingRepository.resolveTcgdexPrice(commonCard as any)
      expect(commonResolved?.nativePrice).toBe(0.25)

      const secretResolved = pricingRepository.resolveTcgdexPrice(secretCard as any)
      expect(secretResolved?.nativePrice).toBe(120.0)
    })
  })

  describe('API endpoint integration', () => {
    it('returns card prices via GET /api/tcg/cards/:id/prices', async () => {
      const res = await app.request('/api/tcg/cards/test-pricing-card-1/prices')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.cardId).toBe('test-pricing-card-1')
      expect(Array.isArray(data.prices)).toBe(true)
      expect(data.prices.length).toBeGreaterThanOrEqual(1)
      expect(data.rates).toBeDefined()
    })
  })
})
