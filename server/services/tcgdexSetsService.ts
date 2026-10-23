import fs from 'node:fs'

export interface TcgDexSetBrief {
  id: string
  name: string
  logo?: string
  symbol?: string
  cardCount?: {
    total?: number
    official?: number
  }
}

export class TcgDexSetsService {
  private setsCache: Map<string, { id: string; name: string; total?: number }> = new Map()
  private setsLoadedAt = 0
  private cacheTtlMs = 1000 * 60 * 30 // 30 minutes

  loadFallbackSets(): TcgDexSetBrief[] {
    try {
      const fallbackPath = new URL('../../src/data/tcgdexSets.json', import.meta.url)
      const raw = fs.readFileSync(fallbackPath, 'utf-8')
      return JSON.parse(raw) as TcgDexSetBrief[]
    } catch {
      return []
    }
  }

  loadJapaneseSets(): TcgDexSetBrief[] {
    try {
      const jaPath = new URL('../../src/data/tcgdexJapaneseSets.json', import.meta.url)
      const rawJa = fs.readFileSync(jaPath, 'utf-8')
      return JSON.parse(rawJa) as TcgDexSetBrief[]
    } catch {
      return []
    }
  }

  async getAllSets(): Promise<TcgDexSetBrief[]> {
    const fallback = this.loadFallbackSets()
    if (fallback.length >= 220) {
      return fallback
    }

    try {
      const res = await fetch('https://api.tcgdex.net/v2/en/sets', { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        const sets = (await res.json()) as TcgDexSetBrief[]
        if (Array.isArray(sets) && sets.length > 0) {
          return sets
        }
      }
    } catch (err) {
      console.warn('Failed to fetch sets from TCGdex API, using local catalog:', err)
    }

    return fallback
  }

  async getSetsMap(): Promise<Map<string, { id: string; name: string; total?: number }>> {
    const now = Date.now()
    if (this.setsCache.size > 0 && now - this.setsLoadedAt < this.cacheTtlMs) {
      return this.setsCache
    }

    const sets = await this.getAllSets()
    if (sets.length > 0) {
      this.setsCache.clear()
      for (const s of sets) {
        this.setsCache.set(s.id.toLowerCase(), {
          id: s.id,
          name: s.name,
          total: s.cardCount?.official || s.cardCount?.total,
        })
      }
      const jaSets = this.loadJapaneseSets()
      for (const s of jaSets) {
        this.setsCache.set(s.id.toLowerCase(), {
          id: s.id,
          name: s.name,
          total: s.cardCount?.official || s.cardCount?.total,
        })
      }
      this.setsLoadedAt = now
    }

    return this.setsCache
  }
}

export const tcgdexSetsService = new TcgDexSetsService()
