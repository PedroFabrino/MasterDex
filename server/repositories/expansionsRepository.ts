import { eq, desc } from 'drizzle-orm'
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
        })
        .where(eq(expansions.id, existing.id))

      const updated = await this.getExpansionById(existing.id)
      return updated!
    }

    await db.insert(expansions).values(data)
    const created = await this.getExpansionById(data.id)
    return created!
  }

  async getAllExpansions(): Promise<ExpansionRecord[]> {
    return await db.select().from(expansions).orderBy(desc(expansions.investmentScore))
  }

  async getExpansionBySlug(slug: string): Promise<ExpansionRecord | undefined> {
    const rows = await db.select().from(expansions).where(eq(expansions.slug, slug)).limit(1)
    return rows[0]
  }

  async getExpansionById(id: string): Promise<ExpansionRecord | undefined> {
    const rows = await db.select().from(expansions).where(eq(expansions.id, id)).limit(1)
    return rows[0]
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
          })
          .where(eq(cards.id, card.id))
      } else {
        await db.insert(cards).values(card)
      }
    }
  }

  async getSecretCardsByExpansionId(expansionId: string): Promise<CardRecord[]> {
    return await db
      .select()
      .from(cards)
      .where(eq(cards.expansionId, expansionId))
      .all()
      .then((rows) => rows.filter((r) => r.isSecret).sort((a, b) => b.marketPrice - a.marketPrice))
  }

  async getAllCardsByExpansionId(expansionId: string): Promise<CardRecord[]> {
    return await db
      .select()
      .from(cards)
      .where(eq(cards.expansionId, expansionId))
      .orderBy(cards.localId)
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
}

export const expansionsRepository = new ExpansionsRepository()
