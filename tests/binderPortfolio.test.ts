import { describe, it, expect, beforeAll } from 'vitest'
import { ensureDatabaseTables, rawClient } from '../server/db/index.js'
import { portfolioService, getGenerationAndRegion } from '../server/services/portfolioService.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { pricingRepository } from '../server/repositories/pricingRepository.js'
import { app } from '../server/app.js'

describe('Binder Portfolio Valuation & Analytics (Ticket #45)', () => {
  beforeAll(async () => {
    await ensureDatabaseTables(rawClient)
  })

  describe('getGenerationAndRegion mapping', () => {
    it('correctly maps Dex IDs across all 9 generations', () => {
      expect(getGenerationAndRegion(25)).toEqual({ generation: 1, regionName: 'Kanto' })
      expect(getGenerationAndRegion(151)).toEqual({ generation: 1, regionName: 'Kanto' })
      expect(getGenerationAndRegion(152)).toEqual({ generation: 2, regionName: 'Johto' })
      expect(getGenerationAndRegion(251)).toEqual({ generation: 2, regionName: 'Johto' })
      expect(getGenerationAndRegion(252)).toEqual({ generation: 3, regionName: 'Hoenn' })
      expect(getGenerationAndRegion(387)).toEqual({ generation: 4, regionName: 'Sinnoh' })
      expect(getGenerationAndRegion(494)).toEqual({ generation: 5, regionName: 'Unova' })
      expect(getGenerationAndRegion(650)).toEqual({ generation: 6, regionName: 'Kalos' })
      expect(getGenerationAndRegion(722)).toEqual({ generation: 7, regionName: 'Alola' })
      expect(getGenerationAndRegion(810)).toEqual({ generation: 8, regionName: 'Galar' })
      expect(getGenerationAndRegion(906)).toEqual({ generation: 9, regionName: 'Paldea' })
      expect(getGenerationAndRegion(1025)).toEqual({ generation: 9, regionName: 'Paldea' })
    })
  })

  describe('portfolioService.getPortfolioSummary', () => {
    const emptyUserId = 'test-portfolio-empty-user'
    const activeUserId = 'test-portfolio-active-user'

    beforeAll(async () => {
      await collectorRepository.upsertProfile({
        id: emptyUserId,
        email: 'empty-test@example.com',
        name: 'Empty User',
      })
      await collectorRepository.upsertProfile({
        id: activeUserId,
        email: 'active-test@example.com',
        name: 'Active User',
      })
      await rawClient.execute(`
        INSERT OR IGNORE INTO expansions (id, name, slug, url, base_count, secret_count, investment_score, last_scraped_at)
        VALUES ('test-exp-portfolio', 'Portfolio Test Exp', 'test-exp-portfolio', 'http://test', 100, 10, 0, ${Date.now()});
      `)
      await rawClient.execute(`
        INSERT OR IGNORE INTO cards (id, expansion_id, local_id, name, rarity, market_price, is_secret)
        VALUES ('test-card-pika-001', 'test-exp-portfolio', 25, 'Pikachu Special Art', 'Rare Holo', 0, 0);
      `)
      await rawClient.execute(`
        INSERT OR IGNORE INTO cards (id, expansion_id, local_id, name, rarity, market_price, is_secret)
        VALUES ('test-card-ray-001', 'test-exp-portfolio', 384, 'Rayquaza Gold Star', 'Secret Rare', 0, 1);
      `)
    })

    it('returns empty summary with 0 valuation when no cards are assigned', async () => {
      const summary = await portfolioService.getPortfolioSummary(emptyUserId)
      expect(summary.totalBrl).toBe(0)
      expect(summary.totalUsd).toBe(0)
      expect(summary.cardCount).toBe(0)
      expect(summary.topCards).toEqual([])
      expect(summary.regionalDistribution.length).toBe(9)
      expect(summary.regionalDistribution.every((r) => r.cardCount === 0)).toBe(true)
      expect(summary.comparison.ligapokemonBrl).toBe(0)
      expect(summary.comparison.tcgplayerBrl).toBe(0)
    })

    it('evaluates retro sprites as R$ 0 and strictly values physical cards', async () => {
      // Slot 1: Bulbasaur as retro sprite (collected = true, cardId = undefined/null)
      await collectorRepository.setUserPokemon(activeUserId, 1, {
        collected: true,
      })

      // Slot 25: Pikachu with physical card assignment
      const pikachuCardId = 'test-card-pika-001'
      await collectorRepository.setUserPokemon(activeUserId, 25, {
        collected: true,
        cardId: pikachuCardId,
        cardName: 'Pikachu Special Art',
        cardImageUrl: 'https://example.com/pika.png',
      })

      // Slot 384: Rayquaza (Gen 3 - Hoenn) with physical card assignment
      const rayquazaCardId = 'test-card-ray-001'
      await collectorRepository.setUserPokemon(activeUserId, 384, {
        collected: true,
        cardId: rayquazaCardId,
        cardName: 'Rayquaza Gold Star',
        cardImageUrl: 'https://example.com/ray.png',
      })

      // Insert quotes for Pikachu: Liga = R$ 100, TCG = $15
      await pricingRepository.upsertPrice({
        cardId: pikachuCardId,
        provider: 'ligapokemon',
        nativePrice: 100.0,
        currency: 'BRL',
      })
      await pricingRepository.upsertPrice({
        cardId: pikachuCardId,
        provider: 'tcgdex_tcgplayer',
        nativePrice: 15.0,
        currency: 'USD',
      })

      // Insert quotes for Rayquaza: Liga = R$ 500, TCG = $80
      await pricingRepository.upsertPrice({
        cardId: rayquazaCardId,
        provider: 'ligapokemon',
        nativePrice: 500.0,
        currency: 'BRL',
      })
      await pricingRepository.upsertPrice({
        cardId: rayquazaCardId,
        provider: 'tcgdex_tcgplayer',
        nativePrice: 80.0,
        currency: 'USD',
      })

      const summary = await portfolioService.getPortfolioSummary(activeUserId, 'ligapokemon')

      // Card count should only count the 2 physical assigned cards, NOT Bulbasaur (retro sprite)
      expect(summary.cardCount).toBe(2)
      expect(summary.totalBrl).toBe(600.0)
      expect(summary.totalUsd).toBeGreaterThan(0)

      // Top cards should rank Rayquaza (R$ 500) before Pikachu (R$ 100)
      expect(summary.topCards.length).toBe(2)
      expect(summary.topCards[0].name).toBe('Rayquaza Gold Star')
      expect(summary.topCards[0].priceInBrl).toBe(500.0)
      expect(summary.topCards[1].name).toBe('Pikachu Special Art')
      expect(summary.topCards[1].priceInBrl).toBe(100.0)

      // Regional distribution: Kanto (Gen 1) = 1 card, Hoenn (Gen 3) = 1 card
      const kanto = summary.regionalDistribution.find((r) => r.generation === 1)
      const hoenn = summary.regionalDistribution.find((r) => r.generation === 3)
      expect(kanto).toBeDefined()
      expect(kanto?.cardCount).toBe(1)
      expect(kanto?.totalBrl).toBe(100.0)

      expect(hoenn).toBeDefined()
      expect(hoenn?.cardCount).toBe(1)
      expect(hoenn?.totalBrl).toBe(500.0)

      // Multi-market comparison
      expect(summary.comparison.ligapokemonBrl).toBe(600.0)
      expect(summary.comparison.tcgplayerBrl).toBeGreaterThan(0)
    })

    it('respects valuation preference tcgplayer and converts currency', async () => {
      const summary = await portfolioService.getPortfolioSummary(activeUserId, 'tcgplayer')
      expect(summary.cardCount).toBe(2)
      // Pikachu ($15) + Rayquaza ($80) = $95 * USD_BRL
      expect(summary.totalBrl).toBeGreaterThan(400.0)
      expect(summary.totalUsd).toBeCloseTo(95.0, 0)
      expect(summary.topCards[0].provider).toBe('tcgdex_tcgplayer')
    })
  })

  describe('API: GET /api/collector/portfolio', () => {
    it('returns portfolio metrics for current user', async () => {
      const res = await app.request('/api/collector/portfolio?userId=test-portfolio-active-user')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.portfolio).toBeDefined()
      expect(body.portfolio.cardCount).toBe(2)
      expect(body.portfolio.totalBrl).toBe(600.0)
      expect(body.portfolio.topCards.length).toBe(2)
      expect(body.portfolio.regionalDistribution.length).toBe(9)
    })

    it('accepts preference query parameter', async () => {
      const res = await app.request(
        '/api/collector/portfolio?userId=test-portfolio-active-user&preference=tcgplayer'
      )
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.portfolio.totalUsd).toBeCloseTo(95.0, 0)
    })
  })
})
