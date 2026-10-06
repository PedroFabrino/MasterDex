import { describe, it, expect } from 'vitest'
import { tcgdexService } from '../server/services/tcgdexService.js'
import { app } from '../server/app.js'

describe('TcgDexService query parser', () => {
  it('parses trailing number and fraction format', () => {
    const res1 = tcgdexService.parseQuery('Mew ex 129/103')
    expect(res1.name).toBe('Mew ex')
    expect(res1.localId).toBe('129')
    expect(res1.total).toBe(103)

    const res2 = tcgdexService.parseQuery('Charizard 4/102')
    expect(res2.name).toBe('Charizard')
    expect(res2.localId).toBe('4')
    expect(res2.total).toBe(102)

    const res3 = tcgdexService.parseQuery('Mew 129')
    expect(res3.name).toBe('Mew')
    expect(res3.localId).toBe('129')
    expect(res3.total).toBeUndefined()
  })

  it('parses leading number and fraction format', () => {
    const res = tcgdexService.parseQuery('129/103 Mew ex')
    expect(res.name).toBe('Mew ex')
    expect(res.localId).toBe('129')
    expect(res.total).toBe(103)
  })

  it('handles plain name without numbers', () => {
    const res = tcgdexService.parseQuery('Pikachu')
    expect(res.name).toBe('Pikachu')
    expect(res.localId).toBeUndefined()
  })

  it('handles standalone numbers and fractions', () => {
    const res = tcgdexService.parseQuery('129/103')
    expect(res.name).toBe('')
    expect(res.localId).toBe('129')
    expect(res.total).toBe(103)
  })

  it('handles empty string gracefully', () => {
    const res = tcgdexService.parseQuery('   ')
    expect(res.name).toBe('')
  })
})

describe('TcgDexService search and caching', () => {
  it('returns empty array on blank query', async () => {
    const results = await tcgdexService.searchCards('  ')
    expect(results).toEqual([])
  })

  it('fetches cards and caches subsequent requests', async () => {
    const query = 'Pikachu'
    const results1 = await tcgdexService.searchCards(query, 5)

    expect(Array.isArray(results1)).toBe(true)
    if (results1.length > 0) {
      const first = results1[0]
      expect(first.id).toBeDefined()
      expect(first.name).toContain('Pikachu')
      expect(first.imageUrl).toMatch(/\.(webp|png)$/)
      expect(first.set).toBeDefined()
      expect(first.set.name).toBeDefined()
    }

    // Verify cache hit returns identical array
    const results2 = await tcgdexService.searchCards(query, 5)
    expect(results2).toBe(results1)
  })
})

describe('TCG Cards Search API route', () => {
  it('returns empty results on empty query param', async () => {
    const res = await app.request('/api/tcg/cards/search?q=')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.results).toEqual([])
    expect(body.count).toBe(0)
  })

  it('returns parsed query and card list for valid query', async () => {
    const res = await app.request('/api/tcg/cards/search?q=Mew%20ex%20129/103&limit=5')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.query).toBe('Mew ex 129/103')
    expect(body.parsed.name).toBe('Mew ex')
    expect(body.parsed.localId).toBe('129')
    expect(body.parsed.total).toBe(103)
    expect(Array.isArray(body.results)).toBe(true)
  })
})
