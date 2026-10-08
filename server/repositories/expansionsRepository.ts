import { eq, desc, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  expansions,
  cards,
  priceHistory,
  type ExpansionRecord,
  type InsertExpansion,
  type CardRecord,
  type InsertCard,
} from '../db/schema.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tcgdexService } from '../services/tcgdexService.js'

export function formatTcgdexImageUrl(url?: string | null, ext = 'png'): string | null {
  if (!url) return null
  if (!url.startsWith('https://assets.tcgdex.net')) return url
  if (/\.(png|webp|jpg|jpeg)$/i.test(url)) return url
  return `${url}.${ext}`
}

let baselineCardsCache: CardRecord[] | null = null
let baselineCardsByExp: Map<string, CardRecord[]> | null = null

function loadBaselineCards(): { all: CardRecord[]; byExp: Map<string, CardRecord[]> } {
  if (baselineCardsCache && baselineCardsByExp) {
    return { all: baselineCardsCache, byExp: baselineCardsByExp }
  }

  try {
    const serverPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/tcgdexSetCards.json')
    const fallbackPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/data/tcgdexSetCards.json')
    const filePath = fs.existsSync(serverPath) ? serverPath : fallbackPath
    if (fs.existsSync(filePath)) {

      const raw = fs.readFileSync(filePath, 'utf-8')
      const items = JSON.parse(raw) as CardRecord[]
      baselineCardsCache = items
      baselineCardsByExp = new Map()
      for (const card of items) {
        const list = baselineCardsByExp.get(card.expansionId) || []
        list.push(card)
        baselineCardsByExp.set(card.expansionId, list)
      }
      return { all: baselineCardsCache, byExp: baselineCardsByExp }
    }
  } catch (err) {
    console.warn('[expansionsRepository] Could not load tcgdexSetCards.json:', err)
  }

  baselineCardsCache = []
  baselineCardsByExp = new Map()
  return { all: baselineCardsCache, byExp: baselineCardsByExp }
}

export class ExpansionsRepository {
  async upsertExpansion(data: InsertExpansion): Promise<ExpansionRecord> {
    const existing = await this.getExpansionBySlug(data.slug)
    if (existing) {
      await db
        .update(expansions)
        .set({
          name: data.name,
          series: data.series,
          url: data.url,
          baseCount: data.baseCount,
          secretCount: data.secretCount,
          investmentScore: data.investmentScore,
          chaseCardName: data.chaseCardName,
          chaseCardPrice: data.chaseCardPrice,
          totalSecretPoolValue: data.totalSecretPoolValue,
          avgSecretPrice: data.avgSecretPrice,
          lastScrapedAt: data.lastScrapedAt,
          logoUrl: data.logoUrl,
          symbolUrl: data.symbolUrl,
          ligapokemonCode: data.ligapokemonCode !== undefined ? data.ligapokemonCode : existing.ligapokemonCode,
        })
        .where(eq(expansions.id, existing.id))

      const updated = await this.getExpansionById(existing.id)
      return updated!
    }

    await db.insert(expansions).values(data)
    const created = await this.getExpansionById(data.id)
    return created!
  }

  async updateLigapokemonCode(id: string, code: string): Promise<void> {
    await db.update(expansions).set({ ligapokemonCode: code }).where(eq(expansions.id, id))
  }

  async getAllExpansions(): Promise<ExpansionRecord[]> {
    const list = await db.select().from(expansions).orderBy(desc(expansions.investmentScore))
    return list.map((e) => ({
      ...e,
      logoUrl: formatTcgdexImageUrl(e.logoUrl),
      symbolUrl: formatTcgdexImageUrl(e.symbolUrl),
    }))
  }

  async getExpansionBySlug(slug: string): Promise<ExpansionRecord | undefined> {
    const rows = await db.select().from(expansions).where(eq(expansions.slug, slug)).limit(1)
    if (!rows[0]) return undefined
    return {
      ...rows[0],
      logoUrl: formatTcgdexImageUrl(rows[0].logoUrl),
      symbolUrl: formatTcgdexImageUrl(rows[0].symbolUrl),
    }
  }

  async getExpansionById(id: string): Promise<ExpansionRecord | undefined> {
    const rows = await db.select().from(expansions).where(eq(expansions.id, id)).limit(1)
    if (!rows[0]) return undefined
    return {
      ...rows[0],
      logoUrl: formatTcgdexImageUrl(rows[0].logoUrl),
      symbolUrl: formatTcgdexImageUrl(rows[0].symbolUrl),
    }
  }

  async getExpansionsCount(): Promise<number> {
    const rows = await db.select().from(expansions)
    return rows.length
  }

  /**
   * Indexes all 220+ official expansions from TCGdex and stores set metadata in local.db.
   */
  async ensureExpansionsCatalogIndexed(): Promise<number> {
    const existingList = await this.getAllExpansions()
    if (existingList.length >= 220) {
      return existingList.length
    }

    const existingSlugs = new Set(existingList.map((e) => e.slug))
    const sets = await tcgdexService.getAllSets()

    const newExpansions: InsertExpansion[] = []
    for (const s of sets) {
      const slug = s.id.toLowerCase()
      if (existingSlugs.has(slug)) {
        continue
      }

      const baseCount = s.cardCount?.official || s.cardCount?.total || 0
      const totalCount = s.cardCount?.total || baseCount
      const secretCount = Math.max(0, totalCount - baseCount)
      const series = s.id.replace(/[0-9].*$/, '').toUpperCase() || 'CORE'

      newExpansions.push({
        id: s.id,
        name: s.name,
        slug,
        series,
        url: `https://www.tcgdex.net/sets/${s.id}`,
        baseCount,
        secretCount,
        investmentScore: 0,
        chaseCardName: null,
        chaseCardPrice: null,
        totalSecretPoolValue: null,
        avgSecretPrice: null,
        lastScrapedAt: new Date(0),
        logoUrl: formatTcgdexImageUrl(s.logo),
        symbolUrl: formatTcgdexImageUrl(s.symbol),
      })
      existingSlugs.add(slug)
    }

    if (newExpansions.length > 0) {
      const batchSize = 40
      for (let i = 0; i < newExpansions.length; i += batchSize) {
        await db.insert(expansions).values(newExpansions.slice(i, i + batchSize))
      }
    }

    return (await this.getAllExpansions()).length
  }

  async upsertCards(cardList: InsertCard[]): Promise<void> {
    for (const card of cardList) {
      const existing = await db
        .select()
        .from(cards)
        .where(eq(cards.id, card.id))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(cards)
          .set({
            name: card.name,
            rarity: card.rarity,
            imageUrl: card.imageUrl,
            marketPrice: card.marketPrice,
            isSecret: card.isSecret,
            types: card.types,
            pokedexId: card.pokedexId,
          })
          .where(eq(cards.id, card.id))
      } else {
        await db.insert(cards).values(card)
      }
    }
  }

  async getSecretCardsByExpansionId(expansionId: string): Promise<CardRecord[]> {
    const dbSecrets = await db
      .select()
      .from(cards)
      .where(eq(cards.expansionId, expansionId))
      .all()
      .then((rows) => rows.filter((r) => r.isSecret).sort((a, b) => b.marketPrice - a.marketPrice))

    if (dbSecrets.length > 0) {
      return dbSecrets
    }

    const { byExp } = loadBaselineCards()
    const baseCards = byExp.get(expansionId) || []
    return baseCards.filter((r) => r.isSecret).sort((a, b) => b.localId - a.localId)
  }

  async getAllCardsByExpansionId(expansionId: string): Promise<CardRecord[]> {
    const dbCards = await db
      .select()
      .from(cards)
      .where(eq(cards.expansionId, expansionId))
      .orderBy(cards.localId)

    if (dbCards.length > 0) {
      return dbCards
    }

    const { byExp } = loadBaselineCards()
    const baseCards = byExp.get(expansionId) || []
    return [...baseCards].sort((a, b) => a.localId - b.localId)
  }

  async getAllCards(): Promise<CardRecord[]> {
    const dbCards = await db.select().from(cards)
    const { all: baseline } = loadBaselineCards()
    if (dbCards.length === 0) {
      return baseline
    }

    const map = new Map<string, CardRecord>()
    for (const c of baseline) {
      map.set(c.id, c)
    }
    for (const c of dbCards) {
      map.set(c.id, c)
    }
    return Array.from(map.values())
  }

  async getCardsByIds(cardIds: string[]): Promise<CardRecord[]> {
    if (cardIds.length === 0) return []
    return await db.select().from(cards).where(inArray(cards.id, cardIds))
  }

  async getCardsGroupedByExpansion(): Promise<{
    allCards: CardRecord[]
    cardsByExp: Map<string, CardRecord[]>
  }> {
    const { all: baseline, byExp: baselineByExp } = loadBaselineCards()
    const dbCards = await db.select().from(cards)

    let cardsByExp = baselineByExp
    if (dbCards.length > 0) {
      cardsByExp = new Map(baselineByExp)
      for (const card of dbCards) {
        const list = cardsByExp.get(card.expansionId) || []
        const filtered = list.filter((c) => c.id !== card.id)
        filtered.push(card)
        cardsByExp.set(card.expansionId, filtered)
      }
    }

    const map = new Map<string, CardRecord>()
    for (const c of baseline) {
      map.set(c.id, c)
    }
    for (const c of dbCards) {
      map.set(c.id, c)
    }

    return { allCards: Array.from(map.values()), cardsByExp }
  }


  async recordPriceHistory(
    cardId: string,
    marketPrice: number,
    recordedAt: Date = new Date(),
    id: string = crypto.randomUUID()
  ): Promise<void> {
    await db.insert(priceHistory).values({
      id,
      cardId,
      marketPrice,
      recordedAt,
    })
  }

  async getPriceHistory(cardId: string) {
    return await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.cardId, cardId))
      .orderBy(desc(priceHistory.recordedAt))
  }

  async findMatchingCards(opts: {
    pokedexId?: number
    localId?: number
    name?: string
  }): Promise<CardRecord[]> {
    const all = await this.getAllCards()
    return all.filter((c) => {
      if (opts.pokedexId && c.pokedexId === opts.pokedexId) return true
      if (opts.localId !== undefined && c.localId === opts.localId) return true
      if (opts.name && c.name.toLowerCase().includes(opts.name.toLowerCase())) return true
      return false
    })
  }
}

export const expansionsRepository = new ExpansionsRepository()

