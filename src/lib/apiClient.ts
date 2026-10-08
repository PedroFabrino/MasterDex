import type {
  Expansion,
  CollectorProfile,
  CollectorPreferences,
  TcgCardSearchResult,
  PortfolioSummary,
} from "../../shared/types"
import type { BatchSyncEntry } from "./cardMapping"

export interface SearchCardsParams {
  query: string
  dexId?: number
  rarity?: string
  lang?: string
  limit?: number
  offset?: number
}

export interface SearchCardsResponse {
  query: string
  results: TcgCardSearchResult[]
  count: number
  total: number
  hasMore: boolean
}

export interface GetExpansionsParams {
  category?: string
  sort?: string
  order?: string
  rarity?: string
  minCards?: number
  lang?: string
  userId?: string
  preference?: 'ligapokemon' | 'tcgplayer'
}

export interface PatchSlotPayload {
  userId: string
  collected: boolean
  cardId?: string | null
  cardName?: string | null
  cardImageUrl?: string | null
  cardLanguage?: string | null
}

export interface UpdatePreferencesPayload {
  userId?: string
  targetRarity?: string
  targetLanguage?: string
  hiddenExpansions?: string[]
  valuationPreference?: 'ligapokemon' | 'tcgplayer'
}

export interface CollectionResponse {
  items: Record<string, any>
  totalCount: number
  totalSpecies: number
}

export interface ExpansionDetailsResponse {
  expansion?: any
  secretCards: any[]
  cards: any[]
  rates?: { USD_BRL: number; EUR_BRL: number }
}

export const apiClient = {
  async getCollection(userId: string): Promise<CollectionResponse> {
    const res = await fetch(`/api/collection?userId=${encodeURIComponent(userId)}`)
    if (!res.ok) throw new Error(`Failed to fetch collection (${res.status})`)
    return res.json()
  },

  async patchSlot(
    pokemonId: number,
    payload: PatchSlotPayload,
    sessionToken?: string
  ): Promise<{ success: boolean; item: any }> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`
    }
    const res = await fetch(`/api/collection/${pokemonId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Failed to patch slot (${res.status})`)
    return res.json()
  },

  async batchSyncCollection(
    userId: string,
    entries: BatchSyncEntry[],
    sessionToken?: string
  ): Promise<{ success: boolean; upserted: number }> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`
    }
    const res = await fetch("/api/collection/batch", {
      method: "POST",
      headers,
      body: JSON.stringify({ userId, entries }),
    })
    if (!res.ok) throw new Error(`Failed to batch sync collection (${res.status})`)
    return res.json()
  },

  async seedSheet(
    userId: string,
    spreadsheetId: string,
    apiKey?: string
  ): Promise<{ success: boolean; seededCount: number; totalSpecies: number }> {
    const res = await fetch("/api/collection/seed-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, spreadsheetId, apiKey }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to seed from spreadsheet")
    }
    return data
  },

  async seedRows(
    userId: string,
    rows: string[][]
  ): Promise<{ success: boolean; seededCount: number }> {
    const res = await fetch("/api/collection/seed-rows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, rows }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to import rows")
    }
    return data
  },

  async searchCards(
    params: SearchCardsParams,
    signal?: AbortSignal
  ): Promise<SearchCardsResponse> {
    const queryParts: string[] = [`q=${encodeURIComponent(params.query)}`]
    if (params.dexId !== undefined) queryParts.push(`dexId=${params.dexId}`)
    if (params.rarity) queryParts.push(`rarity=${encodeURIComponent(params.rarity)}`)
    queryParts.push(`lang=${encodeURIComponent(params.lang || "all")}`)
    queryParts.push(`limit=${params.limit ?? 24}`)
    queryParts.push(`offset=${params.offset ?? 0}`)

    const res = await fetch(`/api/tcg/cards/search?${queryParts.join("&")}`, { signal })
    if (!res.ok) throw new Error(`Search failed (${res.status})`)
    return res.json()
  },

  async getExpansions(
    params?: GetExpansionsParams
  ): Promise<{ expansions: (Expansion & { collectionGapYield?: number })[] }> {
    const queryParts: string[] = []
    if (params?.rarity) queryParts.push(`rarity=${encodeURIComponent(params.rarity)}`)
    if (params?.sort) queryParts.push(`sort=${encodeURIComponent(params.sort)}`)
    if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category)}`)
    if (params?.userId) queryParts.push(`userId=${encodeURIComponent(params.userId)}`)
    if (params?.preference) queryParts.push(`preference=${encodeURIComponent(params.preference)}`)

    const queryStr = queryParts.length > 0 ? `?${queryParts.join("&")}` : ""
    const res = await fetch(`/api/tcg/expansions${queryStr}`)
    if (!res.ok) throw new Error(`Failed to load expansions (${res.status})`)
    return res.json()
  },

  async getExpansionDetails(
    slug: string,
    preference?: 'ligapokemon' | 'tcgplayer'
  ): Promise<ExpansionDetailsResponse> {
    const queryStr = preference ? `?preference=${encodeURIComponent(preference)}` : ""
    const res = await fetch(`/api/tcg/expansions/${encodeURIComponent(slug)}${queryStr}`)
    if (!res.ok) throw new Error(`Failed to load expansion details (${res.status})`)
    return res.json()
  },

  async getCollectorPreferences(
    userId?: string
  ): Promise<{ preferences: CollectorPreferences | null }> {
    const queryStr = userId ? `?userId=${encodeURIComponent(userId)}` : ""
    const res = await fetch(`/api/collector/preferences${queryStr}`)
    if (!res.ok) throw new Error(`Failed to load preferences (${res.status})`)
    return res.json()
  },

  async updateCollectorPreferences(payload: UpdatePreferencesPayload): Promise<any> {
    const res = await fetch("/api/collector/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Failed to update preferences (${res.status})`)
    return res.json()
  },

  async getPortfolioSummary(
    userId?: string,
    preference?: 'ligapokemon' | 'tcgplayer'
  ): Promise<{ userId: string; portfolio: PortfolioSummary }> {
    const queryParts: string[] = []
    if (userId) queryParts.push(`userId=${encodeURIComponent(userId)}`)
    if (preference) queryParts.push(`preference=${encodeURIComponent(preference)}`)
    const queryStr = queryParts.length > 0 ? `?${queryParts.join("&")}` : ""
    const res = await fetch(`/api/collector/portfolio${queryStr}`)
    if (!res.ok) throw new Error(`Failed to load portfolio summary (${res.status})`)
    return res.json()
  },

  async scrapeExpansion(url: string): Promise<{ success: boolean; secretCount: number }> {
    const res = await fetch("/api/tcg/expansions/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to scrape expansion")
    return data
  },

  async syncExpansionPrices(slug: string): Promise<any> {
    const res = await fetch(`/api/tcg/expansions/${encodeURIComponent(slug)}/sync-prices`, {
      method: "POST",
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to sync expansion prices")
    return data
  },

  async getCardPrices(cardId: string): Promise<{ cardId: string; prices: any[]; rates: Record<string, number> }> {
    const res = await fetch(`/api/tcg/cards/${encodeURIComponent(cardId)}/prices`)
    if (!res.ok) throw new Error(`Failed to load card prices (${res.status})`)
    return res.json()
  },

  async scrapeLigapokemon(slug: string, options?: { code?: string; force?: boolean }): Promise<any> {
    const res = await fetch(`/api/tcg/expansions/${encodeURIComponent(slug)}/scrape-ligapokemon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options || {}),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to scrape LigaPokémon")
    return data
  },

  async loginWithGoogle(
    credential: string,
    signal?: AbortSignal
  ): Promise<{ profile: CollectorProfile; seeded: boolean; seededCount: number }> {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
      signal,
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || `Authentication failed (${res.status})`)
    }
    return res.json()
  },

  async get<T = any>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP error ${res.status}`)
    }
    return res.json()
  },

  async post<T = any>(url: string, body?: any, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: body ? JSON.stringify(body) : undefined,
      ...init,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP error ${res.status}`)
    }
    return res.json()
  },

  async patch<T = any>(url: string, body?: any, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: body ? JSON.stringify(body) : undefined,
      ...init,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP error ${res.status}`)
    }
    return res.json()
  },
}
