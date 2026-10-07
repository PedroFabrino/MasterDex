import { describe, it, expect, vi } from 'vitest'
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
  it('returns empty array on blank query without dexId', async () => {
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

  it('scopes card searches to dexId, excluding similar named species', async () => {
    // dexId 151 = Mew. Un-scoped "Mew" would return Mewtwo cards, but dexId=151 must only return Mew.
    const results = await tcgdexService.searchCards('Mew', 20, 151)
    expect(results.length).toBeGreaterThan(0)

    for (const card of results) {
      // Must not contain Mewtwo
      expect(card.name.toLowerCase()).not.toContain('mewtwo')
      expect(card.name.toLowerCase()).toContain('mew')
    }
  })

  it('strictly filters to exact localId matches when collector number is specified', async () => {
    // Query specifying exact localId "151" for Mew (e.g. 151-Mew ex from 151 set)
    const exactResults = await tcgdexService.searchCards('Mew ex 151', 10, 151)
    if (exactResults.length > 0) {
      for (const card of exactResults) {
        expect(card.localId.replace(/^0+/, '')).toBe('151')
      }
    }

    // When an exact number does not exist, it falls back to name search
    const fallbackResults = await tcgdexService.searchCards('Mew ex 9999', 10, 151)
    expect(fallbackResults.length).toBeGreaterThan(0)
    for (const card of fallbackResults) {
      expect(card.name.toLowerCase()).toContain('mew')
    }
  })

  it('preserves authentic set total from metadata rather than query string override', async () => {
    // User searches with query fraction "/999"
    const results = await tcgdexService.searchCards('Mew 129/999', 5, 151)
    if (results.length > 0) {
      const card = results[0]
      // Set total must NOT be overridden by the query fraction 999
      expect(card.set.total).not.toBe(999)
    }
  })

  it('locates promo cards like Charizard 023 promo (MEP-023) across query variations', async () => {
    const res1 = await tcgdexService.searchCards('charizard 023 promo', 5)
    expect(res1.length).toBeGreaterThan(0)
    expect(res1[0].id).toBe('mep-023')
    expect(res1[0].localId).toBe('023')

    const res2 = await tcgdexService.searchCards('mep 023', 5)
    expect(res2.length).toBeGreaterThan(0)
    expect(res2[0].id).toBe('mep-023')
  })
})

describe('TCG Cards Search API route', () => {
  it('returns empty results on empty query param without dexId', async () => {
    const res = await app.request('/api/tcg/cards/search?q=')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.results).toEqual([])
    expect(body.count).toBe(0)
  })

  it('returns parsed query and card list for valid query with dexId parameter', async () => {
    const res = await app.request('/api/tcg/cards/search?q=Mew%20ex&dexId=151&limit=5')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.query).toBe('Mew ex')
    expect(body.dexId).toBe(151)
    expect(body.parsed.name).toBe('Mew ex')
    expect(Array.isArray(body.results)).toBe(true)

    // Ensure all results are Mew variants and never Mewtwo
    for (const r of body.results) {
      expect(r.name.toLowerCase()).not.toContain('mewtwo')
      expect(r.name.toLowerCase()).toContain('mew')
    }
  })

  it('filters results by rarity threshold for plain name queries', async () => {
    // When querying Mew with rarity=ultra, all returned cards must be at least Ultra Rare (tier 2+)
    const res = await app.request('/api/tcg/cards/search?q=Mew&dexId=151&rarity=ultra&limit=10')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.rarity).toBe('ultra')
    expect(body.results.length).toBeGreaterThan(0)
    for (const card of body.results) {
      const rarityInfo = tcgdexService.getCardRarity(card, card.set?.total)
      expect(rarityInfo.tier).toBeGreaterThanOrEqual(2)
    }
  })

  it('bypasses rarity filter when collector number is specified in query', async () => {
    // Query with collector code "151" but requesting high rarity threshold "secret"
    // Code bypass must activate, returning the card matching 151 across all rarities
    const res = await app.request('/api/tcg/cards/search?q=Mew%20151&dexId=151&rarity=secret&limit=10')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.results.length).toBeGreaterThan(0)
    // Results should contain the matching localId 151 card even if not secret tier
    const found = body.results.some((c: any) => c.localId.replace(/^0+/, '') === '151')
    expect(found).toBe(true)
  })

  it('keeps CardSelectorModal and CardSelectorGrid within architectural line limits (<= 400)', async () => {
    const fs = await import('node:fs')
    const modalPath = new URL('../src/components/CardSelectorModal.tsx', import.meta.url)
    const gridPath = new URL('../src/components/CardSelectorGrid.tsx', import.meta.url)

    const modalLines = fs.readFileSync(modalPath, 'utf-8').split('\n').length
    const gridLines = fs.readFileSync(gridPath, 'utf-8').split('\n').length

    expect(modalLines).toBeLessThanOrEqual(400)
    expect(gridLines).toBeLessThanOrEqual(400)
  })

  it('supports multi-language search with lang=all and specific lang parameter', async () => {
    // General search with lang=all
    const resAll = await app.request('/api/tcg/cards/search?q=Pikachu&dexId=25&lang=all&limit=10')
    expect(resAll.status).toBe(200)
    const bodyAll = (await resAll.json()) as any
    expect(bodyAll.lang).toBe('all')
    expect(bodyAll.results.length).toBeGreaterThan(0)
    expect(bodyAll.results[0].language).toBeDefined()

    // Scoped search with lang=ja
    const resJa = await app.request('/api/tcg/cards/search?q=Pikachu&dexId=25&lang=ja&limit=5')
    expect(resJa.status).toBe(200)
    const bodyJa = (await resJa.json()) as any
    expect(bodyJa.lang).toBe('ja')
    for (const card of bodyJa.results) {
      expect(card.language).toBe('ja')
    }
  })

  it('accurately resolves Japanese Pokémon species scans and secret card totals without 404s', async () => {
    // Search Japanese cards for Venusaur (dexId 3)
    const res = await app.request('/api/tcg/cards/search?q=Venusaur&dexId=3&lang=ja&limit=10')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.results.length).toBeGreaterThan(0)

    // All results must be authentic Japanese Venusaur cards
    for (const card of body.results) {
      expect(card.language).toBe('ja')
      expect(card.imageUrl).toMatch(/\.(webp|png)$/)
      expect(card.thumbnailUrl).toMatch(/\.(webp|png)$/)
      // Must NOT return unrelated Pokémon like Aerodactyl or Reshiram
      expect(card.name).not.toContain('プテラ') // Aerodactyl
      expect(card.name).not.toContain('レシラム') // Reshiram
    }

    // Verify sv2a set metadata in setsMap
    const setsMap = await tcgdexService.getSetsMap()
    const sv2aMeta = setsMap.get('sv2a')
    expect(sv2aMeta).toBeDefined()
    expect(sv2aMeta?.total).toBe(165)

    // Verify SV2a-200 SAR gets Secret Rare tier 4
    const sar = body.results.find((c: any) => c.id.toLowerCase() === 'sv2a-200')
    if (sar) {
      expect(sar.rarity).toBe('Secret Rare')
    }
  })

  it('keeps tcgdexService and CardPrintLanguageSelector within architectural line limits (<= 400)', async () => {
    const fs = await import('node:fs')
    const servicePath = new URL('../server/services/tcgdexService.ts', import.meta.url)
    const langSelectorPath = new URL('../src/components/CardPrintLanguageSelector.tsx', import.meta.url)

    const serviceLines = fs.readFileSync(servicePath, 'utf-8').split('\n').length
    const langSelectorLines = fs.readFileSync(langSelectorPath, 'utf-8').split('\n').length

    expect(serviceLines).toBeLessThanOrEqual(400)
    expect(langSelectorLines).toBeLessThanOrEqual(400)
  })
})
