import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import app from '../server/app.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { ensureDatabaseTables } from '../server/db/index.js'

describe('Collector Preferences Seam (Ticket #16)', () => {
  beforeAll(async () => {
    await ensureDatabaseTables()
  })

  const testUserId = `test-pref-${Date.now()}`

  beforeEach(async () => {
    // Ensure test user exists
    await collectorRepository.upsertProfile({
      id: testUserId,
      email: `${testUserId}@example.com`,
      name: 'Preference Tester',
    })
  })

  it('GET /api/collector/preferences returns default values for new user', async () => {
    const res = await app.request(`/api/collector/preferences?userId=${encodeURIComponent(testUserId)}`)
    expect(res.status).toBe(200)

    const body = (await res.json()) as any
    expect(body.userId).toBe(testUserId)
    expect(body.preferences).toBeDefined()
    expect(body.preferences.targetRarity).toBe('any')
    expect(body.preferences.hiddenExpansions).toEqual([])
  })

  it('PATCH /api/collector/preferences updates and persists targetRarity', async () => {
    const patchRes = await app.request('/api/collector/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        targetRarity: 'illustration',
      }),
    })
    expect(patchRes.status).toBe(200)

    const patchBody = (await patchRes.json()) as any
    expect(patchBody.success).toBe(true)
    expect(patchBody.preferences.targetRarity).toBe('illustration')

    // Verify GET returns the persisted value
    const getRes = await app.request(`/api/collector/preferences?userId=${encodeURIComponent(testUserId)}`)
    const getBody = (await getRes.json()) as any
    expect(getBody.preferences.targetRarity).toBe('illustration')
  })

  it('PATCH /api/collector/preferences updates and persists hiddenExpansions', async () => {
    const patchRes = await app.request('/api/collector/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        hiddenExpansions: ['swshp', 'basep'],
      }),
    })
    expect(patchRes.status).toBe(200)

    const patchBody = (await patchRes.json()) as any
    expect(patchBody.success).toBe(true)
    expect(patchBody.preferences.hiddenExpansions).toEqual(['swshp', 'basep'])

    // Verify GET returns updated hidden list
    const getRes = await app.request(`/api/collector/preferences?userId=${encodeURIComponent(testUserId)}`)
    const getBody = (await getRes.json()) as any
    expect(getBody.preferences.hiddenExpansions).toEqual(['swshp', 'basep'])
  })

  it('PATCH /api/collector/preferences rejects invalid targetRarity value', async () => {
    const patchRes = await app.request('/api/collector/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        targetRarity: 'invalid-tier',
      }),
    })
    expect(patchRes.status).toBe(400)
  })
})
