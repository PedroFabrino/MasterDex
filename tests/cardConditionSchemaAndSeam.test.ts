import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  CONDITION_BASELINE_MULTIPLIERS,
  getConditionRelativeRatio,
  LIGA_QUALID_TO_CONDITION,
  findNearestCondition,
  normalizeCardCondition,
  type CardCondition,
} from '../shared/conditionConfig.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { pricingRepository } from '../server/repositories/pricingRepository.js'
import { ensureDbReady } from '../server/db/index.js'

describe('Card Condition Schema, Config, and Repository Seam (Ticket #47 / Issue #47)', () => {
  beforeAll(async () => {
    await ensureDbReady()
  })

  describe('Shared Condition Configuration & Utilities', () => {
    it('defines standard 5-tier card conditions with NM as default', () => {
      expect(CARD_CONDITIONS).toEqual(['NM', 'LP', 'MP', 'HP', 'DMG'])
      expect(DEFAULT_CARD_CONDITION).toBe('NM')
    })

    it('defines calibrated baseline multipliers against NM', () => {
      expect(CONDITION_BASELINE_MULTIPLIERS.NM).toBe(1.0)
      expect(CONDITION_BASELINE_MULTIPLIERS.LP).toBe(0.85)
      expect(CONDITION_BASELINE_MULTIPLIERS.MP).toBe(0.7)
      expect(CONDITION_BASELINE_MULTIPLIERS.HP).toBe(0.5)
      expect(CONDITION_BASELINE_MULTIPLIERS.DMG).toBe(0.3)
    })

    it('calculates accurate relative condition ratios', () => {
      // DMG (0.30) relative to HP (0.50) -> 0.60 (60%)
      expect(getConditionRelativeRatio('DMG', 'HP')).toBe(0.6)
      // DMG (0.30) relative to NM (1.00) -> 0.30
      expect(getConditionRelativeRatio('DMG', 'NM')).toBe(0.3)
      // HP (0.50) relative to MP (0.70) -> 0.71
      expect(getConditionRelativeRatio('HP', 'MP')).toBe(0.71)
      // Identity ratio
      expect(getConditionRelativeRatio('NM', 'NM')).toBe(1.0)
    })

    it('maps LigaPokémon qualid stock IDs 1:1 to CardCondition', () => {
      expect(LIGA_QUALID_TO_CONDITION[1]).toBe('NM') // M
      expect(LIGA_QUALID_TO_CONDITION[2]).toBe('NM') // NM
      expect(LIGA_QUALID_TO_CONDITION[3]).toBe('LP') // SP
      expect(LIGA_QUALID_TO_CONDITION[4]).toBe('MP') // MP
      expect(LIGA_QUALID_TO_CONDITION[5]).toBe('HP') // HP
      expect(LIGA_QUALID_TO_CONDITION[6]).toBe('DMG') // D
    })

    it('finds nearest available condition in the hierarchy', () => {
      // When exact condition exists
      expect(findNearestCondition('DMG', ['NM', 'HP', 'DMG'])).toBe('DMG')

      // When DMG is missing, nearest should be HP
      expect(findNearestCondition('DMG', ['NM', 'MP', 'HP'])).toBe('HP')

      // When only NM exists, nearest is NM
      expect(findNearestCondition('DMG', ['NM'])).toBe('NM')

      // When LP is requested and only MP and NM exist, LP is equidistant, finds adjacent
      expect(['NM', 'MP']).toContain(findNearestCondition('LP', ['NM', 'MP']))

      // Empty available conditions returns null
      expect(findNearestCondition('DMG', [])).toBeNull()
    })

    it('normalizes Brazilian aliases and case variations', () => {
      expect(normalizeCardCondition('D')).toBe('DMG')
      expect(normalizeCardCondition('damaged')).toBe('DMG')
      expect(normalizeCardCondition('sp')).toBe('LP')
      expect(normalizeCardCondition('m')).toBe('NM')
      expect(normalizeCardCondition('nm')).toBe('NM')
      expect(normalizeCardCondition(null)).toBe('NM')
      expect(normalizeCardCondition('unknown')).toBe('NM')
    })
  })

  describe('Collector Repository Condition Persistence', () => {
    const testUserId = `test-cond-user-${Date.now()}`

    beforeAll(async () => {
      await collectorRepository.upsertProfile({
        id: testUserId,
        email: `${testUserId}@example.com`,
        name: 'Test Condition Collector',
      })
    })

    it('defaults cardCondition to NM when omitted in setUserPokemon', async () => {
      const result = await collectorRepository.setUserPokemon(testUserId, 1, {
        collected: true,
        cardId: 'base1-1',
        cardName: 'Alakazam',
      })
      expect(result.cardCondition).toBe('NM')
    })

    it('persists and returns Damaged (DMG) condition in setUserPokemon', async () => {
      const result = await collectorRepository.setUserPokemon(testUserId, 6, {
        collected: true,
        cardId: 'base1-4',
        cardName: 'Charizard',
        cardCondition: 'DMG',
      })
      expect(result.cardCondition).toBe('DMG')

      // Verify slot retrieval in user collection
      const collection = await collectorRepository.getUserCollection(testUserId)
      const charizard = collection.find((c) => c.pokedexId === 6)
      expect(charizard?.cardCondition).toBe('DMG')
    })

    it('returns cardCondition in getAssignedCollectedCards', async () => {
      await collectorRepository.setUserPokemon(testUserId, 9, {
        collected: true,
        cardId: 'base1-2',
        cardName: 'Blastoise',
        cardCondition: 'HP',
      })

      const assigned = await collectorRepository.getAssignedCollectedCards(testUserId)
      const blastoise = assigned.find((c) => c.pokedexId === 9)
      expect(blastoise?.cardCondition).toBe('HP')
    })

    it('persists cardCondition across batchUpsertUserPokemon', async () => {
      await collectorRepository.batchUpsertUserPokemon(testUserId, [
        { pokedexId: 25, collected: true, cardId: 'base1-58', cardName: 'Pikachu', cardCondition: 'LP' },
        { pokedexId: 150, collected: true, cardId: 'base1-10', cardName: 'Mewtwo', cardCondition: 'MP' },
      ])

      const collection = await collectorRepository.getUserCollection(testUserId)
      const pikachu = collection.find((c) => c.pokedexId === 25)
      const mewtwo = collection.find((c) => c.pokedexId === 150)
      expect(pikachu?.cardCondition).toBe('LP')
      expect(mewtwo?.cardCondition).toBe('MP')
    })
  })

  describe('Pricing Repository Condition Storage', () => {
    const cardId = `test-card-cond-${Date.now()}`

    it('upserts and retrieves distinct condition prices for same card & provider', async () => {
      // Insert Near Mint quote
      await pricingRepository.upsertPrice({
        cardId,
        provider: 'ligapokemon',
        condition: 'NM',
        nativePrice: 1000.0,
        currency: 'BRL',
      })

      // Insert Damaged quote
      await pricingRepository.upsertPrice({
        cardId,
        provider: 'ligapokemon',
        condition: 'DMG',
        nativePrice: 350.0,
        currency: 'BRL',
      })

      const nmQuotes = await pricingRepository.getPricesByCardIdAndCondition(cardId, 'NM')
      expect(nmQuotes.length).toBe(1)
      expect(nmQuotes[0].nativePrice).toBe(1000.0)
      expect(nmQuotes[0].condition).toBe('NM')

      const dmgQuotes = await pricingRepository.getPricesByCardIdAndCondition(cardId, 'DMG')
      expect(dmgQuotes.length).toBe(1)
      expect(dmgQuotes[0].nativePrice).toBe(350.0)
      expect(dmgQuotes[0].condition).toBe('DMG')

      // All prices for cardId contains both
      const allQuotes = await pricingRepository.getPricesByCardId(cardId)
      expect(allQuotes.length).toBe(2)
    })
  })

  describe('Architectural Line Limit Guardrails (AGENTS.md)', () => {
    it('verifies modified repositories stay below the 400-line hard limit', () => {
      const rootDir = process.cwd()
      const files = [
        'server/repositories/collectorRepository.ts',
        'server/repositories/collectorPreferencesRepository.ts',
        'server/repositories/pricingRepository.ts',
        'shared/conditionConfig.ts',
      ]

      for (const file of files) {
        const fullPath = path.resolve(rootDir, file)
        const lines = fs.readFileSync(fullPath, 'utf-8').split(/\r?\n/).length
        expect(lines, `${file} has ${lines} lines, exceeding 400`).toBeLessThanOrEqual(400)
      }
    })
  })
})
