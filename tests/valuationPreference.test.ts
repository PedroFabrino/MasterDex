import { describe, it, expect, beforeAll } from 'vitest'
import { ensureDatabaseTables, rawClient } from '../server/db/index.js'
import { canonicalPriceService } from '../server/services/canonicalPriceService.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { app } from '../server/app.js'
import type { CardPriceRecord } from '../server/db/schema.js'

describe('Collector Valuation Preference & Canonical Ranking (Ticket #44)', () => {
  beforeAll(async () => {
    await ensureDatabaseTables(rawClient)
  })

  describe('canonicalPriceService.resolveFromQuotes', () => {
    const rates = { USD_BRL: 5.5, EUR_BRL: 6.0 }

    const mockQuotes: CardPriceRecord[] = [
      {
        id: 'c1:ligapokemon',
        cardId: 'c1',
        provider: 'ligapokemon',
        nativePrice: 150.0,
        currency: 'BRL',
        recordedAt: new Date(),
      },
      {
        id: 'c1:tcgdex_tcgplayer',
        cardId: 'c1',
        provider: 'tcgdex_tcgplayer',
        nativePrice: 30.0,
        currency: 'USD',
        recordedAt: new Date(),
      },
    ]

    it('prefers LigaPokémon (BRL) when preference is ligapokemon', () => {
      const result = canonicalPriceService.resolveFromQuotes(mockQuotes, 'ligapokemon', 0, rates)
      expect(result.provider).toBe('ligapokemon')
      expect(result.priceInBrl).toBe(150.0)
      expect(result.currency).toBe('BRL')
      expect(result.isFallback).toBe(false)
    })

    it('prefers TCGplayer (normalized to BRL) when preference is tcgplayer', () => {
      const result = canonicalPriceService.resolveFromQuotes(mockQuotes, 'tcgplayer', 0, rates)
      expect(result.provider).toBe('tcgdex_tcgplayer')
      // $30 * 5.50 = 165.0
      expect(result.priceInBrl).toBe(165.0)
      expect(result.nativePrice).toBe(30.0)
      expect(result.currency).toBe('USD')
      expect(result.isFallback).toBe(false)
    })

    it('falls back to TCGplayer when LigaPokémon price is absent', () => {
      const tcgOnly: CardPriceRecord[] = [mockQuotes[1]]
      const result = canonicalPriceService.resolveFromQuotes(tcgOnly, 'ligapokemon', 0, rates)
      expect(result.provider).toBe('tcgdex_tcgplayer')
      expect(result.priceInBrl).toBe(165.0)
      expect(result.isFallback).toBe(true)
    })

    it('falls back to LigaPokémon when TCGplayer price is absent', () => {
      const ligaOnly: CardPriceRecord[] = [mockQuotes[0]]
      const result = canonicalPriceService.resolveFromQuotes(ligaOnly, 'tcgplayer', 0, rates)
      expect(result.provider).toBe('ligapokemon')
      expect(result.priceInBrl).toBe(150.0)
      expect(result.isFallback).toBe(true)
    })
  })

  describe('collectorRepository preferences persistence', () => {
    const testUserId = 'test-valuation-user-1'

    it('defaults valuationPreference to ligapokemon', async () => {
      const prefs = await collectorRepository.getPreferences(testUserId)
      expect(prefs.valuationPreference).toBe('ligapokemon')
    })

    it('persists valuationPreference updates to tcgplayer', async () => {
      const updated = await collectorRepository.updatePreferences(testUserId, {
        valuationPreference: 'tcgplayer',
      })
      expect(updated.valuationPreference).toBe('tcgplayer')

      const reloaded = await collectorRepository.getPreferences(testUserId)
      expect(reloaded.valuationPreference).toBe('tcgplayer')
    })
  })

  describe('API: PATCH /api/collector/preferences', () => {
    it('accepts and updates valuationPreference', async () => {
      const res = await app.request('/api/collector/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-api-user-pref',
          valuationPreference: 'tcgplayer',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.preferences.valuationPreference).toBe('tcgplayer')
    })
  })

  describe('Leaderboard Ranking with Mixed Currency Cards', () => {
    it('enriches expansions with canonical metrics based on valuation preference', async () => {
      const expA = {
        id: 'exp-a',
        baseCount: 100,
        chaseCardName: 'Pikachu BRL',
        chaseCardPrice: 100,
        totalSecretPoolValue: 100,
        avgSecretPrice: 100,
        investmentScore: 50,
      }

      const cardsByExp = new Map<string, any[]>()
      cardsByExp.set('exp-a', [
        {
          id: 'card-a1',
          expansionId: 'exp-a',
          localId: 101,
          name: 'Pikachu BRL',
          marketPrice: 100,
          isSecret: true,
        },
      ])

      const result = await canonicalPriceService.enrichExpansionsWithCanonicalMetrics(
        [expA],
        cardsByExp,
        'ligapokemon'
      )

      expect(result.length).toBe(1)
      expect(result[0].valuationPreference).toBe('ligapokemon')
      expect(result[0].chaseCardPrice).toBeDefined()
    })
  })
})
