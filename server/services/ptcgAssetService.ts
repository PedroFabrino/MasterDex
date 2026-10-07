export interface PtcgAssetResult {
  imageUrl: string
  thumbnailUrl: string
}

export class PtcgAssetService {
  private cache = new Map<string, PtcgAssetResult | null>()
  private baseUrl = 'https://api.pokemontcgapi.com/v1'

  private getApiKey(): string | undefined {
    return process.env.PTCG_API_KEY || 'ptcg_live_F4YjXQfMKP4mB7pRfQMWGBYFab1DdyHDooY1JY7N'
  }

  async resolveCardImage(setId: string, localId: string): Promise<PtcgAssetResult | null> {
    const cleanSet = (setId || '').toLowerCase().trim()
    const cleanNum = (localId || '').trim()
    const normNum = cleanNum.replace(/^0+/, '') || cleanNum
    if (!cleanSet || !normNum) return null

    const cacheKey = `${cleanSet}:${normNum}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null
    }

    const apiKey = this.getApiKey()
    if (!apiKey) return null

    try {
      // 1. Direct card endpoint attempt (e.g. /cards/mep-23)
      const directId = `${cleanSet}-${normNum}`
      const directRes = await fetch(`${this.baseUrl}/cards/${encodeURIComponent(directId)}?include=images`, {
        headers: { 'X-Api-Key': apiKey },
        signal: AbortSignal.timeout(3000),
      })

      if (directRes.ok) {
        const data = (await directRes.json()) as { images?: Array<{ url: string }> }
        const img = data.images?.[0]?.url
        if (img) {
          const res: PtcgAssetResult = { imageUrl: img, thumbnailUrl: img }
          this.storeInCache(cacheKey, res)
          return res
        }
      }

      // 2. Query endpoint attempt (e.g. q=set.code:mep number:23)
      const queryParam = `set.code:${cleanSet} number:${normNum}`
      const queryRes = await fetch(
        `${this.baseUrl}/cards?q=${encodeURIComponent(queryParam)}&include=images&limit=1`,
        {
          headers: { 'X-Api-Key': apiKey },
          signal: AbortSignal.timeout(3000),
        }
      )

      if (queryRes.ok) {
        const qData = (await queryRes.json()) as { data?: Array<{ images?: Array<{ url: string }> }> }
        const img = qData.data?.[0]?.images?.[0]?.url
        if (img) {
          const res: PtcgAssetResult = { imageUrl: img, thumbnailUrl: img }
          this.storeInCache(cacheKey, res)
          return res
        }
      }
    } catch {
      // Fail silently to prevent search latency or crashes
    }

    this.storeInCache(cacheKey, null)
    return null
  }

  private storeInCache(key: string, val: PtcgAssetResult | null) {
    if (this.cache.size > 500) {
      const first = this.cache.keys().next().value
      if (first) this.cache.delete(first)
    }
    this.cache.set(key, val)
  }
}

export const ptcgAssetService = new PtcgAssetService()
