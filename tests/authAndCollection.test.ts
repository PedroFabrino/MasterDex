import { describe, it, expect, beforeAll } from 'vitest'
import { sheetSeedService } from '../server/services/sheetSeedService.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { ensureDatabaseTables } from '../server/db/index.js'
import { app } from '../server/app.js'

describe('SheetSeedService parsing logic', () => {
  it('parses pokedex numbers with leading hashes or padding', () => {
    expect(sheetSeedService.parsePokedexNumber('#0001')).toBe(1)
    expect(sheetSeedService.parsePokedexNumber('#0025')).toBe(25)
    expect(sheetSeedService.parsePokedexNumber('150')).toBe(150)
    expect(sheetSeedService.parsePokedexNumber('#1025')).toBe(1025)
    expect(sheetSeedService.parsePokedexNumber('invalid')).toBe(0)
  })

  it('parses tabular spreadsheet rows into typed collection entries', () => {
    const rawRows = [
      ['#0001', 'Bulbasaur', 'TRUE'],
      ['#0002', 'Ivysaur', 'FALSE'],
      ['#0003', 'Venusaur', 'TRUE'],
      ['#0004', 'Charmander', 'false'],
    ]

    const parsed = sheetSeedService.parseSheetRows(rawRows)
    expect(parsed.length).toBe(4)
    expect(parsed[0]).toEqual({ pokedexId: 1, collected: true })
    expect(parsed[1]).toEqual({ pokedexId: 2, collected: false })
    expect(parsed[2]).toEqual({ pokedexId: 3, collected: true })
    expect(parsed[3]).toEqual({ pokedexId: 4, collected: false })
  })
})

describe('Auth & Collection API Integration', () => {
  beforeAll(async () => {
    await ensureDatabaseTables()
  })

  const testUser = {
    googleId: 'google-test-12345',
    email: 'collector@example.com',
    name: 'Ash Ketchum',
    avatarUrl: 'https://example.com/avatar.png',
  }

  let createdUserId = ''

  it('creates collector profile via POST /api/auth/google', async () => {
    const res = await app.request('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.profile).toBeDefined()
    expect(body.profile.email).toBe(testUser.email)
    createdUserId = body.profile.id
  })

  it('seeds collection from rows via POST /api/collection/seed-rows', async () => {
    const rows = [
      ['#0001', 'Bulbasaur', 'TRUE'],
      ['#0004', 'Charmander', 'TRUE'],
      ['#0007', 'Squirtle', 'FALSE'],
    ]

    const res = await app.request('/api/collection/seed-rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: createdUserId,
        rows,
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.success).toBe(true)
    expect(body.seededCount).toBe(2)
  })

  it('retrieves user collection via GET /api/collection', async () => {
    const res = await app.request(`/api/collection?userId=${encodeURIComponent(createdUserId)}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.collection).toBeDefined()
    expect(body.collection[1]).toBe(true)
    expect(body.collection[4]).toBe(true)
    expect(body.collection[7]).toBe(false)
    expect(body.count).toBe(2)
  })

  it('updates single pokemon collection status via PATCH /api/collection/:pokemonId', async () => {
    const res = await app.request(`/api/collection/7`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: createdUserId,
        collected: true,
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.item.pokedexId).toBe(7)
    expect(body.item.collected).toBe(true)

    // Verify it updated in collection query
    const verifyRes = await app.request(`/api/collection?userId=${encodeURIComponent(createdUserId)}`)
    const verifyBody = (await verifyRes.json()) as any
    expect(verifyBody.collection[7]).toBe(true)
    expect(verifyBody.count).toBe(3)
  })
})
