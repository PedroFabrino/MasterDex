import { describe, it, expect } from 'vitest'
import { app } from '../server/app.js'
import { tcgdexService } from '../server/services/tcgdexService.js'

describe('30th anniversary cards search regression tests', () => {
  it('tcgdexService.searchCards returns 30th anniversary cards for Exeggcute (dexId: 102)', async () => {
    const results = await tcgdexService.searchCards('Exeggcute', 100, 102)
    const thCards = results.filter((c) => c.set?.id === '30th' || c.id?.startsWith('30th'))
    expect(thCards.length).toBeGreaterThan(0)
    const card = thCards[0]
    expect(card.set.id).toBe('30th')
    expect(card.set.name).toBe('30th Celebration')
    expect(card.imageUrl).toContain('/me/30th/')
  })

  it('GET /api/tcg/cards/search returns 30th anniversary cards for Exeggcute (dexId: 102)', async () => {
    const res = await app.request('/api/tcg/cards/search?q=Exeggcute&dexId=102&limit=100')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    const thCards = body.results.filter((c: any) => c.set?.id === '30th' || c.id?.startsWith('30th'))
    expect(thCards.length).toBeGreaterThan(0)
  })

  it('GET /api/tcg/cards/search returns 30th anniversary cards when searching "30th" in Pikachu selector (dexId: 25)', async () => {
    const res = await app.request('/api/tcg/cards/search?q=30th&dexId=25&limit=100')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    const thCards = body.results.filter((c: any) => c.set?.id === '30th' || c.id?.startsWith('30th'))
    expect(thCards.length).toBeGreaterThan(0)
    expect(thCards.some((c: any) => c.localId === '023' || c.localId === '23')).toBe(true)
  })

  it('GET /api/tcg/cards/search returns 30th Classic Collection cards for Charizard when searching "30th" (dexId: 6)', async () => {
    const res = await app.request('/api/tcg/cards/search?q=30th&dexId=6&limit=100')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    const thCards = body.results.filter((c: any) => c.set?.id === '30th-c' || c.id?.startsWith('30th-c'))
    expect(thCards.length).toBeGreaterThan(0)
    expect(thCards[0].set.id).toBe('30th-c')
    expect(thCards[0].set.name).toBe('30th Classic Collection')
  })

  it('GET /api/tcg/cards/search returns 30th Classic Collection cards when searching "Charizard 30th" (dexId: 6)', async () => {
    const res = await app.request('/api/tcg/cards/search?q=Charizard%2030th&dexId=6&limit=100')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    const thCards = body.results.filter((c: any) => c.set?.id === '30th-c' || c.id?.startsWith('30th-c'))
    expect(thCards.length).toBeGreaterThan(0)
    expect(thCards[0].set.id).toBe('30th-c')
    expect(thCards[0].set.name).toBe('30th Classic Collection')
  })

  it('GET /api/tcg/cards/search returns 30th Classic Collection cards for set query "30th-c"', async () => {
    const res = await app.request('/api/tcg/cards/search?q=30th-c&limit=50')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.results.length).toBeGreaterThan(0)
    const charizard = body.results.find((c: any) => c.id === '30th-c-001')
    expect(charizard).toBeDefined()
    expect(charizard.set.id).toBe('30th-c')
    expect(charizard.set.name).toBe('30th Classic Collection')
  })
})
