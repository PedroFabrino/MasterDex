import { describe, it, expect, beforeAll } from 'vitest'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { ensureDatabaseTables } from '../server/db/index.js'
import { app } from '../server/app.js'

describe('Collector Artwork Persistence & Repository Seam', () => {
  beforeAll(async () => {
    await ensureDatabaseTables()
  })

  const userId = `artwork-test-${Date.now()}`

  beforeAll(async () => {
    await collectorRepository.upsertProfile({
      id: userId,
      googleId: `google-${userId}`,
      email: `${userId}@example.com`,
      name: 'Artwork Tester',
    })
  })

  it('persists card artwork when setting a new user pokemon', async () => {
    const item = await collectorRepository.setUserPokemon(userId, 151, {
      collected: true,
      cardId: 'cel25-129',
      cardName: 'Mew ex 129/103',
      cardImageUrl: 'https://assets.tcgdex.net/en/swsh/cel25/129/high.webp',
    })

    expect(item.pokedexId).toBe(151)
    expect(item.collected).toBe(true)
    expect(item.cardId).toBe('cel25-129')
    expect(item.cardName).toBe('Mew ex 129/103')
    expect(item.cardImageUrl).toBe('https://assets.tcgdex.net/en/swsh/cel25/129/high.webp')

    const collection = await collectorRepository.getUserCollection(userId)
    const match = collection.find((c) => c.pokedexId === 151)
    expect(match).toBeDefined()
    expect(match?.cardId).toBe('cel25-129')
  })

  it('updates artwork on an existing collected pokemon', async () => {
    const updated = await collectorRepository.setUserPokemon(userId, 151, {
      cardId: 'sv3pt5-151',
      cardName: 'Mew ex 151/165',
      cardImageUrl: 'https://assets.tcgdex.net/en/sv/sv3pt5/151/high.webp',
    })

    expect(updated.pokedexId).toBe(151)
    expect(updated.collected).toBe(true) // retained
    expect(updated.cardId).toBe('sv3pt5-151')
    expect(updated.cardName).toBe('Mew ex 151/165')
    expect(updated.cardImageUrl).toBe('https://assets.tcgdex.net/en/sv/sv3pt5/151/high.webp')
  })

  it('clears card artwork when null is passed', async () => {
    const cleared = await collectorRepository.setUserPokemon(userId, 151, {
      cardId: null,
      cardName: null,
      cardImageUrl: null,
    })

    expect(cleared.cardId).toBeNull()
    expect(cleared.cardName).toBeNull()
    expect(cleared.cardImageUrl).toBeNull()
    expect(cleared.collected).toBe(true)
  })

  it('preserves existing artwork when passed boolean collected only', async () => {
    // Set artwork again
    await collectorRepository.setUserPokemon(userId, 6, {
      collected: true,
      cardId: 'base1-4',
      cardName: 'Charizard 4/102',
      cardImageUrl: 'https://example.com/charizard.webp',
    })

    // Toggle uncollected with boolean false
    const toggled = await collectorRepository.setUserPokemon(userId, 6, false)
    expect(toggled.collected).toBe(false)
    expect(toggled.cardId).toBe('base1-4')
  })

  it('updates and retrieves artwork through collection API endpoints', async () => {
    const patchRes = await app.request('/api/collection/25', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        collected: true,
        cardId: 'swsh4-44',
        cardName: 'Pikachu VMAX',
        cardImageUrl: 'https://example.com/pikachu.webp',
      }),
    })

    expect(patchRes.status).toBe(200)
    const patchBody = (await patchRes.json()) as any
    expect(patchBody.item.pokedexId).toBe(25)
    expect(patchBody.item.cardId).toBe('swsh4-44')

    const getRes = await app.request(`/api/collection?userId=${userId}`)
    expect(getRes.status).toBe(200)
    const getBody = (await getRes.json()) as any
    expect(getBody.collection['25']).toBe(true)
    expect(getBody.items['25']).toBeDefined()
    expect(getBody.items['25'].cardId).toBe('swsh4-44')
    expect(getBody.items['25'].cardName).toBe('Pikachu VMAX')
  })
})
