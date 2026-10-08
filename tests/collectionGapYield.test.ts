import { describe, it, expect, beforeAll } from 'vitest'
import { ensureDatabaseTables } from '../server/db/index.js'
import { expansionsRepository } from '../server/repositories/expansionsRepository.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { investmentService } from '../server/services/investmentService.js'
import { app } from '../server/app.js'

describe('Server-Side Collection Gap Yield & Expansion Catalog API', () => {
  const testUserId = `user-gap-test-${Date.now()}`
  const expAId = `exp-test-a-${Date.now()}`
  const expBId = `exp-test-b-${Date.now()}`

  beforeAll(async () => {
    await ensureDatabaseTables()

    // Create test user
    await collectorRepository.upsertProfile({
      id: testUserId,
      googleId: `google-gap-${Date.now()}`,
      email: 'gap-collector@test.com',
      name: 'Gary Oak',
    })

    // Setup Test Expansion A (High value set with Charizard & Darkrai)
    await expansionsRepository.upsertExpansion({
      id: expAId,
      name: 'Solar Flare Test Set',
      slug: `solar-flare-${Date.now()}`,
      series: 'SV',
      url: 'https://example.com/solar-flare',
      baseCount: 100,
      secretCount: 20,
      investmentScore: 95.0,
      chaseCardName: 'Charizard ex SIR',
      chaseCardPrice: 1200.0,
      totalSecretPoolValue: 5000.0,
      avgSecretPrice: 250.0,
      lastScrapedAt: new Date(),
    })

    // Setup Test Expansion B (Moderate set with Pikachu)
    await expansionsRepository.upsertExpansion({
      id: expBId,
      name: 'Thunder Storm Test Set',
      slug: `thunder-storm-${Date.now()}`,
      series: 'SV',
      url: 'https://example.com/thunder-storm',
      baseCount: 80,
      secretCount: 10,
      investmentScore: 70.0,
      chaseCardName: 'Pikachu Gold',
      chaseCardPrice: 400.0,
      totalSecretPoolValue: 1500.0,
      avgSecretPrice: 150.0,
      lastScrapedAt: new Date(),
    })

    // Insert cards for Expansion A
    await expansionsRepository.upsertCards([
      {
        id: `${expAId}-c1`,
        expansionId: expAId,
        localId: 1,
        name: 'Bulbasaur',
        rarity: 'Common',
        marketPrice: 1.0,
        isSecret: false,
      },
      {
        id: `${expAId}-c6-rare`,
        expansionId: expAId,
        localId: 6,
        name: 'Charizard',
        rarity: 'Rare Holo',
        marketPrice: 25.0,
        isSecret: false,
      },
      {
        id: `${expAId}-c6-sir`,
        expansionId: expAId,
        localId: 106,
        name: 'Charizard ex (Special Art)',
        rarity: 'Special Illustration Rare',
        marketPrice: 1200.0,
        isSecret: true,
      },
      {
        id: `${expAId}-c491-sir`,
        expansionId: expAId,
        localId: 107,
        name: 'Darkrai ex',
        rarity: 'Illustration Rare',
        marketPrice: 350.0,
        isSecret: true,
      },
      {
        id: `${expAId}-c-trainer`,
        expansionId: expAId,
        localId: 108,
        name: "Professor's Research",
        rarity: 'Special Illustration Rare',
        marketPrice: 80.0,
        isSecret: true,
      },
    ])

    // Insert cards for Expansion B
    await expansionsRepository.upsertCards([
      {
        id: `${expBId}-c25-common`,
        expansionId: expBId,
        localId: 25,
        name: 'Pikachu',
        rarity: 'Common',
        marketPrice: 2.0,
        isSecret: false,
      },
      {
        id: `${expBId}-c25-secret`,
        expansionId: expBId,
        localId: 85,
        name: 'Pikachu',
        rarity: 'Hyper Rare',
        marketPrice: 400.0,
        isSecret: true,
      },
    ])
  })

  it('indexes all 220+ official expansions from TCGdex and stores set metadata in local.db', async () => {
    const totalCount = await expansionsRepository.ensureExpansionsCatalogIndexed()
    expect(totalCount).toBeGreaterThanOrEqual(220)

    const list = await expansionsRepository.getAllExpansions()
    expect(list.length).toBeGreaterThanOrEqual(220)

    // Check specific known set
    const base1 = list.find((e) => e.id === 'base1')
    expect(base1).toBeDefined()
    expect(base1?.name).toBe('Base Set')
    expect(base1?.baseCount).toBe(102)
    expect(base1?.url).toContain('base1')
  })

  describe('Collection Gap Yield domain calculations', () => {
    it('calculates gap yield for an empty collection across rarity tiers', async () => {
      const expACards = await expansionsRepository.getAllCardsByExpansionId(expAId)
      const emptyUserMap = new Map<number, number>()

      // 'any': Bulbasaur (1), Charizard Holo (1), Charizard SIR (1), Darkrai SIR (1). (Trainer ignored) -> 4
      const yieldAny = investmentService.calculateCollectionGapYield(expACards, emptyUserMap, 'any')
      expect(yieldAny).toBe(4)

      // 'holo': Charizard Holo (tier 1), Charizard SIR (tier 4/3), Darkrai SIR (tier 3). Bulbasaur tier 0 ignored. -> 3
      const yieldHolo = investmentService.calculateCollectionGapYield(expACards, emptyUserMap, 'holo')
      expect(yieldHolo).toBe(3)

      // 'illustration': Charizard SIR (tier 3+), Darkrai SIR (tier 3+). -> 2
      const yieldIllustration = investmentService.calculateCollectionGapYield(
        expACards,
        emptyUserMap,
        'illustration'
      )
      expect(yieldIllustration).toBe(2)

      // 'secret': Charizard SIR (isSecret = true, tier 4), Darkrai SIR (isSecret = true, tier 4). -> 2
      const yieldSecret = investmentService.calculateCollectionGapYield(
        expACards,
        emptyUserMap,
        'secret'
      )
      expect(yieldSecret).toBe(2)
    })

    it('correctly handles basic sprite collector ownership upgrading to illustration tier', async () => {
      const expACards = await expansionsRepository.getAllCardsByExpansionId(expAId)

      // User owns Charizard (#6) as basic sprite (tier 0)
      const userMapWithSprite = new Map<number, number>([
        [6, 0], // Charizard collected as sprite
      ])

      // With 'any' filter, sprite satisfies Charizard slot, so only Bulbasaur and Darkrai are gaps
      const yieldAny = investmentService.calculateCollectionGapYield(expACards, userMapWithSprite, 'any')
      // Bulbasaur (gap) + Darkrai (gap) = 2. Charizard slot already satisfied by sprite at tier 0 >= 0!
      expect(yieldAny).toBe(2)

      // With 'illustration' filter, sprite (tier 0 < 3) does NOT satisfy illustration tier!
      // So Charizard SIR IS a gap, and Darkrai SIR IS a gap -> total 2
      const yieldIllustration = investmentService.calculateCollectionGapYield(
        expACards,
        userMapWithSprite,
        'illustration'
      )
      expect(yieldIllustration).toBe(2)

      // Now user assigns Illustration Rare (tier 3) to Charizard slot
      const userMapWithIR = new Map<number, number>([
        [6, 3], // Charizard owns tier 3
      ])
      const yieldWithIR = investmentService.calculateCollectionGapYield(
        expACards,
        userMapWithIR,
        'illustration'
      )
      // Charizard is now satisfied at tier 3 >= 3! Only Darkrai is a gap -> 1
      expect(yieldWithIR).toBe(1)
    })

    it('ignores non-Pokemon trainer cards from gap calculations', async () => {
      const expACards = await expansionsRepository.getAllCardsByExpansionId(expAId)
      const trainerCard = expACards.find((c) => c.name.includes("Professor's Research"))
      expect(trainerCard).toBeDefined()

      const dexId = investmentService.resolvePokemonId(trainerCard!.name)
      expect(dexId).toBeNull()
    })
  })

  describe('GET /api/tcg/expansions API endpoint', () => {
    it('defaults to booster category and excludes promotional compilations like swshp', async () => {
      const res = await app.request('/api/tcg/expansions')
      expect(res.status).toBe(200)

      const body = (await res.json()) as any
      expect(body.expansions).toBeDefined()
      expect(Array.isArray(body.expansions)).toBe(true)
      expect(body.filters.category).toBe('booster')
      // Booster expansions count should be around 164-166
      expect(body.count).toBeGreaterThanOrEqual(160)
      expect(body.count).toBeLessThan(220)

      // Ensure promotional compilations like SWSH Promos are excluded from booster default
      const swshp = body.expansions.find((e: any) => e.id === 'swshp')
      expect(swshp).toBeUndefined()

      const first = body.expansions[0]
      expect(first).toHaveProperty('collectionGapYield')
      expect(first).toHaveProperty('investmentScore')
      expect(first).toHaveProperty('baseCount')
      expect(first.category).toBe('booster')
    })

    it('returns promotional collections when category=promo is requested', async () => {
      const res = await app.request('/api/tcg/expansions?category=promo')
      expect(res.status).toBe(200)

      const body = (await res.json()) as any
      expect(body.filters.category).toBe('promo')
      expect(body.count).toBeGreaterThanOrEqual(50)
      const swshp = body.expansions.find((e: any) => e.id === 'swshp')
      expect(swshp).toBeDefined()
      expect(swshp.name).toContain('Promos')
      expect(swshp.category).toBe('promo')
    })

    it('returns all 220+ expansions when category=all is requested', async () => {
      const res = await app.request('/api/tcg/expansions?category=all')
      expect(res.status).toBe(200)

      const body = (await res.json()) as any
      expect(body.expansions).toBeDefined()
      expect(Array.isArray(body.expansions)).toBe(true)
      expect(body.count).toBeGreaterThanOrEqual(220)
      expect(body.filters).toEqual({
        category: 'all',
        rarity: 'any',
        sort: 'score',
        userId: null,
        preference: null,
      })
    })

    it('supports user collection awareness via userId and rarity filter', async () => {
      // Seed user with Charizard as basic sprite
      await collectorRepository.setUserPokemon(testUserId, 6, {
        collected: true,
        cardId: null,
      })

      // Query with rarity=any
      const resAny = await app.request(
        `/api/tcg/expansions?userId=${encodeURIComponent(testUserId)}&rarity=any`
      )
      expect(resAny.status).toBe(200)
      const bodyAny = (await resAny.json()) as any
      const expAFromAny = bodyAny.expansions.find((e: any) => e.id === expAId)
      expect(expAFromAny).toBeDefined()
      // Bulbasaur + Darkrai = 2 (Charizard slot satisfied at tier 0)
      expect(expAFromAny.collectionGapYield).toBe(2)

      // Query with rarity=illustration
      const resIR = await app.request(
        `/api/tcg/expansions?userId=${encodeURIComponent(testUserId)}&rarity=illustration`
      )
      expect(resIR.status).toBe(200)
      const bodyIR = (await resIR.json()) as any
      const expAFromIR = bodyIR.expansions.find((e: any) => e.id === expAId)
      expect(expAFromIR).toBeDefined()
      // Charizard SIR + Darkrai SIR = 2 (sprite does not satisfy illustration tier!)
      expect(expAFromIR.collectionGapYield).toBe(2)
    })

    it('sorts expansions server-side by gap_yield', async () => {
      const res = await app.request('/api/tcg/expansions?sort=gap_yield')
      expect(res.status).toBe(200)

      const body = (await res.json()) as any
      const list = body.expansions
      expect(list.length).toBeGreaterThan(1)

      // Verify descending order by collectionGapYield
      for (let i = 0; i < list.length - 1; i++) {
        expect(list[i].collectionGapYield).toBeGreaterThanOrEqual(list[i + 1].collectionGapYield)
      }
    })

    it('sorts expansions server-side by score and chase price', async () => {
      const resScore = await app.request('/api/tcg/expansions?sort=score')
      const bodyScore = (await resScore.json()) as any
      const scoreList = bodyScore.expansions
      expect(scoreList[0].investmentScore).toBeGreaterThanOrEqual(scoreList[1].investmentScore)

      const resChase = await app.request('/api/tcg/expansions?sort=chase')
      const bodyChase = (await resChase.json()) as any
      const chaseList = bodyChase.expansions
      const chase0 = chaseList[0].chaseCardPrice ?? 0
      const chase1 = chaseList[1].chaseCardPrice ?? 0
      expect(chase0).toBeGreaterThanOrEqual(chase1)
    })
  })
})
