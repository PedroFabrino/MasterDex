import { describe, it, expect, beforeAll } from 'vitest'
import { sheetSeedService } from '../server/services/sheetSeedService.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { ensureDatabaseTables } from '../server/db/index.js'
import { app } from '../server/app.js'
import { createSessionToken } from '../server/services/authService.js'


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
  let sessionToken = ''

  it('rejects POST /api/auth/google when credential token is missing', async () => {
    const res = await app.request('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as any
    expect(body.error).toBe('Invalid Google payload')
  })

  it('creates collector profile via POST /api/auth/google with valid credential', async () => {
    const res = await app.request('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: `test-token:${testUser.googleId}:${testUser.email}:${testUser.name}:${testUser.avatarUrl}`,
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.profile).toBeDefined()
    expect(body.profile.email).toBe(testUser.email)
    expect(body.sessionToken).toBeDefined()
    createdUserId = body.profile.id
    sessionToken = body.sessionToken
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

  describe('Google ID Token Verification & Creator Auto-Seeding (Ticket #11)', () => {
    const originalFetch = global.fetch

    it('verifies valid Google ID token and creates profile', async () => {
      const mockTokenData = {
        sub: 'google-sub-999',
        email: 'trainer@example.com',
        name: 'Red Trainer',
        picture: 'https://example.com/red.png',
        aud: '8010736190-ni98j51d06uo3n48kp31ia5atbk9iln5.apps.googleusercontent.com',
        exp: String(Math.floor(Date.now() / 1000) + 3600),
      }

      global.fetch = async (url: any) => {
        if (String(url).includes('tokeninfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockTokenData,
          } as any
        }
        return originalFetch(url)
      }

      const res = await app.request('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: 'valid-test-credential' }),
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.profile.email).toBe('trainer@example.com')
      expect(data.profile.name).toBe('Red Trainer')
      expect(data.seeded).toBe(false)
    })

    it('auto-seeds 629 cards when verified email matches SEED_ADMIN_EMAIL (pfabrino@gmail.com)', async () => {
      const mockPedroData = {
        sub: 'google-pedro-12345',
        email: 'pfabrino@gmail.com',
        name: 'Pedro Fabrino',
        picture: 'https://example.com/pedro.png',
        aud: '8010736190-ni98j51d06uo3n48kp31ia5atbk9iln5.apps.googleusercontent.com',
        exp: String(Math.floor(Date.now() / 1000) + 3600),
      }

      global.fetch = async (url: any) => {
        if (String(url).includes('tokeninfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockPedroData,
          } as any
        }
        return originalFetch(url)
      }

      const res = await app.request('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: 'pedro-test-credential' }),
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.profile.email).toBe('pfabrino@gmail.com')
      expect(data.seeded).toBe(true)
      expect(data.seededCount).toBe(629)

      // Verify items exist in collection
      const collRes = await app.request(`/api/collection?userId=${encodeURIComponent(data.profile.id)}`)
      const collData = (await collRes.json()) as any
      expect(collData.count).toBe(629)
    })

    it('rejects invalid or expired token with 401', async () => {
      global.fetch = async (url: any) => {
        if (String(url).includes('tokeninfo')) {
          return {
            ok: false,
            status: 400,
            json: async () => ({ error: 'invalid_token' }),
          } as any
        }
        return originalFetch(url)
      }

      const res = await app.request('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: 'bad-token' }),
      })

      expect(res.status).toBe(401)
      const data = (await res.json()) as any
      expect(data.error).toBe('Invalid Google credential token')

      global.fetch = originalFetch
    })

    it('rejects token with audience mismatch with 401', async () => {
      const mockMismatchedAudData = {
        sub: 'google-sub-bad',
        email: 'bad@example.com',
        name: 'Bad Aud',
        aud: 'wrong-client-id.apps.googleusercontent.com',
        exp: String(Math.floor(Date.now() / 1000) + 3600),
      }

      global.fetch = async (url: any) => {
        if (String(url).includes('tokeninfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockMismatchedAudData,
          } as any
        }
        return originalFetch(url)
      }

      const res = await app.request('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: 'mismatched-aud-token' }),
      })

      expect(res.status).toBe(401)
      const data = (await res.json()) as any
      expect(data.error).toBe('Token audience mismatch')

      global.fetch = originalFetch
    })

    it('rejects collection mutation when session token belongs to another user (IDOR prevention)', async () => {
      const userAToken = createSessionToken('user-a')
      const res = await app.request('/api/collection/25', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          userId: 'pedro',
          collected: true,
        }),
      })

      expect(res.status).toBe(403)
      const data = (await res.json()) as any
      expect(data.error).toContain('Forbidden: profile ownership mismatch')
    })

    it('rejects collection mutation when session token is invalid', async () => {
      const res = await app.request('/api/collection/25', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid.fake.token',
        },
        body: JSON.stringify({
          userId: 'pedro',
          collected: true,
        }),
      })

      expect(res.status).toBe(401)
      const data = (await res.json()) as any
      expect(data.error).toContain('Unauthorized: invalid or expired session token')
    })
  })
})

