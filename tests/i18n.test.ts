import { describe, it, expect } from 'vitest'
import { pt } from '../src/i18n/locales/pt.js'
import { en } from '../src/i18n/locales/en.js'
import { app } from '../server/app.js'

function getObjectKeyPaths(obj: Record<string, any>, prefix = ''): string[] {
  const paths: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getObjectKeyPaths(value, currentPath))
    } else {
      paths.push(currentPath)
    }
  }
  return paths
}

describe('Internationalization (i18n) Directive & Parity', () => {
  it('enforces strict parity between pt-BR and en-US dictionaries', () => {
    const ptKeys = getObjectKeyPaths(pt).sort()
    const enKeys = getObjectKeyPaths(en).sort()

    expect(ptKeys).toEqual(enKeys)
    expect(ptKeys.length).toBeGreaterThan(50)
  })

  it('guarantees no empty strings exist in either language dictionary', () => {
    const ptKeys = getObjectKeyPaths(pt)
    for (const key of ptKeys) {
      const parts = key.split('.')
      let ptVal: any = pt
      let enVal: any = en
      for (const p of parts) {
        ptVal = ptVal[p]
        enVal = enVal[p]
      }
      expect(typeof ptVal).toBe('string')
      expect(ptVal.trim().length).toBeGreaterThan(0)
      expect(typeof enVal).toBe('string')
      expect(enVal.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('Dual-Resolution Card Search & Lazy Loading API', () => {
  it('returns both high-res imageUrl and lightweight thumbnailUrl', async () => {
    const res = await app.request('/api/tcg/cards/search?q=Charmeleon&dexId=5&limit=5&offset=0')
    expect(res.status).toBe(200)
    const data = (await res.json()) as any

    expect(data.results.length).toBeGreaterThan(0)
    for (const card of data.results) {
      expect(card.imageUrl).toMatch(/\.(webp|png)$/)
      expect(card.thumbnailUrl).toBeDefined()
      expect(card.thumbnailUrl).toMatch(/\.(webp|png)$/)
      expect(card.thumbnailUrl).toContain('low.webp')
      expect(card.imageUrl).toContain('high.webp')
    }
  })

  it('supports pagination with offset, total, and hasMore flags', async () => {
    const resPage1 = await app.request('/api/tcg/cards/search?q=Charmeleon&dexId=5&limit=5&offset=0')
    expect(resPage1.status).toBe(200)
    const data1 = (await resPage1.json()) as any

    expect(data1.count).toBe(5)
    expect(typeof data1.total).toBe('number')
    expect(data1.total).toBeGreaterThanOrEqual(5)
    expect(data1.hasMore).toBe(true)

    const resPage2 = await app.request('/api/tcg/cards/search?q=Charmeleon&dexId=5&limit=5&offset=5')
    expect(resPage2.status).toBe(200)
    const data2 = (await resPage2.json()) as any

    expect(data2.count).toBe(5)
    // Page 2 results should not be identical to Page 1
    expect(data2.results[0].id).not.toBe(data1.results[0].id)
  })
})
