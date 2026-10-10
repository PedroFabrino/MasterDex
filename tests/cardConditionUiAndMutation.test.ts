import { describe, it, expect, beforeAll, vi } from 'vitest'
import { app } from '../server/app.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { ensureDatabaseTables } from '../server/db/index.js'
import { cardConditionScraperService } from '../server/services/cardConditionScraperService.js'
import {
  mapBackendItemToCollectedSlot,
  toBatchSyncEntry,
  toCollectedSlot,
} from '../src/lib/cardMapping.js'
import { mergeCloudAndLocalCollection } from '../src/lib/collectionMerge.js'
import {
  CARD_CONDITIONS,
  CONDITION_BASELINE_MULTIPLIERS,
  normalizeCardCondition,
} from '../shared/conditionConfig.js'

describe('Card Condition UI & Collection Mutation Pipeline (Tickets #37 & #38)', () => {
  const testUserId = `condition-test-${Date.now()}`

  beforeAll(async () => {
    await ensureDatabaseTables()
    await collectorRepository.upsertProfile({
      id: testUserId,
      googleId: `google-${testUserId}`,
      email: `${testUserId}@example.com`,
      name: 'Condition Tester',
    })
  })

  describe('API Endpoints (collectionRoutes)', () => {
    it('accepts and persists valid cardCondition via PATCH /api/collection/:pokemonId', async () => {
      const enqueueSpy = vi.spyOn(cardConditionScraperService, 'enqueue')

      const res = await app.request('/api/collection/6', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          collected: true,
          cardId: 'base1-4',
          cardName: 'Charizard',
          cardImageUrl: 'https://example.com/charizard.webp',
          cardCondition: 'DMG',
        }),
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.item.cardCondition).toBe('DMG')

      // Verifies background condition scrape was enqueued for non-NM card
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 'base1-4',
          cardName: 'Charizard',
        })
      )
      enqueueSpy.mockRestore()
    })

    it('rejects invalid cardCondition payload on PATCH /api/collection/:pokemonId', async () => {
      const res = await app.request('/api/collection/6', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          collected: true,
          cardCondition: 'POOR_CONDITION',
        }),
      })

      expect(res.status).toBe(400)
    })

    it('returns cardCondition in itemsMap via GET /api/collection', async () => {
      const res = await app.request(`/api/collection?userId=${testUserId}`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body.items['6']).toBeDefined()
      expect(body.items['6'].cardCondition).toBe('DMG')
    })

    it('handles batch sync with cardCondition via POST /api/collection/batch', async () => {
      const enqueueSpy = vi.spyOn(cardConditionScraperService, 'enqueue')

      const res = await app.request('/api/collection/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          entries: [
            {
              pokedexId: 9,
              collected: true,
              cardId: 'base1-2',
              cardName: 'Blastoise',
              cardImageUrl: 'https://example.com/blastoise.webp',
              cardCondition: 'HP',
            },
            {
              pokedexId: 3,
              collected: true,
              cardId: 'base1-15',
              cardName: 'Venusaur',
              cardImageUrl: 'https://example.com/venusaur.webp',
              cardCondition: 'NM',
            },
          ],
        }),
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body.success).toBe(true)

      // Verifies only the non-NM card (HP) was enqueued for scraping
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 'base1-2',
          cardName: 'Blastoise',
        })
      )
      enqueueSpy.mockRestore()

      // Verify stored condition
      const checkRes = await app.request(`/api/collection?userId=${testUserId}`)
      const checkBody = (await checkRes.json()) as any
      expect(checkBody.items['9'].cardCondition).toBe('HP')
      expect(checkBody.items['3'].cardCondition).toBe('NM')
    })
  })

  describe('Frontend Data Mappings & Merge', () => {
    it('maps backend item with cardCondition to CollectedSlot', () => {
      const slot = mapBackendItemToCollectedSlot(6, {
        collected: true,
        cardId: 'base1-4',
        cardName: 'Charizard',
        cardCondition: 'DMG',
      })

      expect(slot.pokemonId).toBe(6)
      expect(slot.cardCondition).toBe('DMG')
      expect(slot.tcgCard?.name).toBe('Charizard')
    })

    it('generates batch sync entry including cardCondition', () => {
      const slot = toCollectedSlot(
        6,
        {
          id: 'base1-4',
          name: 'Charizard',
          setName: 'Base Set',
          number: '4/102',
          imageUrl: 'https://example.com/char.png',
        },
        'en',
        'HP'
      )

      expect(slot.cardCondition).toBe('HP')
      const entry = toBatchSyncEntry(6, slot)
      expect(entry.cardCondition).toBe('HP')
      expect(entry.cardId).toBe('base1-4')
    })

    it('merges cloud items preserving cardCondition', () => {
      const cloudItems = {
        '150': {
          pokedexId: 150,
          collected: true,
          cardId: 'base1-10',
          cardName: 'Mewtwo',
          cardCondition: 'LP',
        },
      }

      const { merged } = mergeCloudAndLocalCollection(cloudItems, {})
      expect(merged[150]).toBeDefined()
      expect(merged[150].cardCondition).toBe('LP')
    })
  })

  describe('Condition Configuration & Multipliers', () => {
    it('contains all 5 canonical conditions with correct discount multipliers', () => {
      expect(CARD_CONDITIONS).toEqual(['NM', 'LP', 'MP', 'HP', 'DMG'])
      expect(CONDITION_BASELINE_MULTIPLIERS.NM).toBe(1.0)
      expect(CONDITION_BASELINE_MULTIPLIERS.LP).toBe(0.85)
      expect(CONDITION_BASELINE_MULTIPLIERS.MP).toBe(0.7)
      expect(CONDITION_BASELINE_MULTIPLIERS.HP).toBe(0.5)
      expect(CONDITION_BASELINE_MULTIPLIERS.DMG).toBe(0.3)
    })

    it('normalizes various condition aliases properly', () => {
      expect(normalizeCardCondition('d')).toBe('DMG')
      expect(normalizeCardCondition('damaged')).toBe('DMG')
      expect(normalizeCardCondition('sp')).toBe('LP')
      expect(normalizeCardCondition('m')).toBe('NM')
      expect(normalizeCardCondition('hp')).toBe('HP')
      expect(normalizeCardCondition(null)).toBe('NM')
      expect(normalizeCardCondition(undefined)).toBe('NM')
      expect(normalizeCardCondition('unknown')).toBe('NM')
    })
  })
})
