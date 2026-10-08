import { describe, it, expect, beforeAll, vi } from 'vitest'
import { ensureDatabaseTables, rawClient } from '../server/db/index.js'
import { ligapokemonService } from '../server/services/ligapokemonService.js'
import { expansionsRepository } from '../server/repositories/expansionsRepository.js'
import { pricingRepository } from '../server/repositories/pricingRepository.js'
import { app } from '../server/app.js'

describe('LigaPokémon Mapping, Search URL, and Resilient Scrape (Ticket #43)', () => {
  beforeAll(async () => {
    await ensureDatabaseTables(rawClient)
  })

  describe('resolveEditionCode & getSearchUrl', () => {
    it('resolves mapped codes from JSON dictionary', () => {
      expect(
        ligapokemonService.resolveEditionCode({
          id: 'sv01',
          slug: 'scarlet-violet',
        })
      ).toBe('SV1')

      expect(
        ligapokemonService.resolveEditionCode({
          id: 'me05',
          slug: 'reinado-delta',
        })
      ).toBe('DLR')
    })

    it('prioritizes explicit ligapokemonCode if already present on expansion', () => {
      expect(
        ligapokemonService.resolveEditionCode({
          id: 'sv01',
          slug: 'scarlet-violet',
          ligapokemonCode: 'CUSTOM_SV1',
        })
      ).toBe('CUSTOM_SV1')
    })

    it('generates standard Liga search URL', () => {
      const url = ligapokemonService.getSearchUrl('SV1')
      expect(url).toBe('https://www.ligapokemon.com.br/?view=cards/search&card=ed=SV1')
    })
  })

  describe('scrapeExpansionPrices & 7-day TTL', () => {
    const testExpId = 'test-liga-exp-1'
    const testCardId = 'test-liga-card-1'

    beforeAll(async () => {
      await rawClient.execute(`
        INSERT OR IGNORE INTO expansions (id, name, slug, url, base_count, secret_count, investment_score, ligapokemon_code, last_scraped_at)
        VALUES ('${testExpId}', 'Liga Test Expansion', 'liga-test-expansion', 'http://test', 10, 2, 0, 'SV1', ${Date.now()});
      `)
      await rawClient.execute(`
        INSERT OR IGNORE INTO cards (id, expansion_id, local_id, name, rarity, market_price, is_secret)
        VALUES ('${testCardId}', '${testExpId}', 1, 'Pikachu ex', 'Ultra Rare', 0, 1);
      `)
    })

    it('parses HTML override and records prices in card_prices', async () => {
      const sampleHtml = `
        <div class="card-item">
          <div class="nome-ingles">Pikachu ex</div>
          <div class="preco-menor">R$ 150,00</div>
        </div>
      `

      const result = await ligapokemonService.scrapeExpansionPrices(testExpId, {
        htmlOverride: sampleHtml,
        force: true,
      })

      expect(result.success).toBe(true)
      expect(result.cached).toBe(false)
      expect(result.cardsCount).toBeGreaterThan(0)

      const prices = await pricingRepository.getPricesByCardId(testCardId)
      const ligaQuote = prices.find((p) => p.provider === 'ligapokemon')
      expect(ligaQuote).toBeDefined()
      expect(ligaQuote?.nativePrice).toBe(150.0)
      expect(ligaQuote?.currency).toBe('BRL')
    })

    it('returns cached=true within 7 days when force is false', async () => {
      const result = await ligapokemonService.scrapeExpansionPrices(testExpId, {
        force: false,
      })
      expect(result.success).toBe(true)
      expect(result.cached).toBe(true)
    })

    it('handles anti-bot / challenge page gracefully without throwing', async () => {
      const challengeHtml = `<html><head><title>Just a moment... Attention Required! Cloudflare challenge-running</title></head></html>`

      const result = await ligapokemonService.scrapeExpansionPrices(testExpId, {
        htmlOverride: challengeHtml,
        force: true,
      })

      expect(result.success).toBe(false)
      expect(result.warning).toContain('Cloudflare')
    })
  })

  describe('POST /api/tcg/expansions/:slug/scrape-ligapokemon API endpoint', () => {
    it('accepts code override and returns updated expansion', async () => {
      const res = await app.request('/api/tcg/expansions/liga-test-expansion/scrape-ligapokemon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'SV99', force: true }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.expansion).toBeDefined()
      expect(body.expansion.ligapokemonCode).toBe('SV99')
    })
  })
})
