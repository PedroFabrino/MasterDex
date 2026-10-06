import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  collectorProfiles,
  userPokemon,
  type CollectorProfileRecord,
  type UserPokemonRecord,
} from '../db/schema.js'

export class CollectorRepository {
  async getProfileByGoogleId(googleId: string): Promise<CollectorProfileRecord | undefined> {
    const rows = await db
      .select()
      .from(collectorProfiles)
      .where(eq(collectorProfiles.googleId, googleId))
      .limit(1)
    return rows[0]
  }

  async getProfileById(id: string): Promise<CollectorProfileRecord | undefined> {
    const rows = await db
      .select()
      .from(collectorProfiles)
      .where(eq(collectorProfiles.id, id))
      .limit(1)
    return rows[0]
  }

  async upsertProfile(data: {
    id: string
    googleId: string
    email: string
    name: string
    avatarUrl?: string | null
    seededFromSheet?: boolean
    createdAt?: Date
  }): Promise<CollectorProfileRecord> {
    const existing = await this.getProfileByGoogleId(data.googleId)
    if (existing) {
      await db
        .update(collectorProfiles)
        .set({
          name: data.name,
          email: data.email,
          avatarUrl: data.avatarUrl,
        })
        .where(eq(collectorProfiles.id, existing.id))
      return (await this.getProfileById(existing.id))!
    }

    await db.insert(collectorProfiles).values({
      id: data.id,
      googleId: data.googleId,
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl,
      seededFromSheet: data.seededFromSheet ?? false,
      createdAt: data.createdAt ?? new Date(),
    })
    return (await this.getProfileById(data.id))!
  }

  async getUserCollection(userId: string): Promise<UserPokemonRecord[]> {
    return await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, userId))
  }

  async setUserPokemon(
    userId: string,
    pokedexId: number,
    options:
      | boolean
      | {
          collected?: boolean
          cardId?: string | null
          cardName?: string | null
          cardImageUrl?: string | null
        }
  ): Promise<UserPokemonRecord> {
    const existing = await db
      .select()
      .from(userPokemon)
      .where(and(eq(userPokemon.userId, userId), eq(userPokemon.pokedexId, pokedexId)))
      .limit(1)

    const now = new Date()
    const opts = typeof options === 'boolean' ? { collected: options } : options

    if (existing.length > 0) {
      const record = existing[0]
      const nextCollected = opts.collected !== undefined ? opts.collected : record.collected
      const nextCardId = opts.cardId !== undefined ? opts.cardId : record.cardId
      const nextCardName = opts.cardName !== undefined ? opts.cardName : record.cardName
      const nextCardImageUrl = opts.cardImageUrl !== undefined ? opts.cardImageUrl : record.cardImageUrl

      await db
        .update(userPokemon)
        .set({
          collected: nextCollected,
          cardId: nextCardId,
          cardName: nextCardName,
          cardImageUrl: nextCardImageUrl,
          updatedAt: now,
        })
        .where(eq(userPokemon.id, record.id))

      return {
        ...record,
        collected: nextCollected,
        cardId: nextCardId,
        cardName: nextCardName,
        cardImageUrl: nextCardImageUrl,
        updatedAt: now,
      }
    }

    const newRecord: UserPokemonRecord = {
      id: crypto.randomUUID(),
      userId,
      pokedexId,
      collected: opts.collected ?? true,
      cardId: opts.cardId ?? null,
      cardName: opts.cardName ?? null,
      cardImageUrl: opts.cardImageUrl ?? null,
      updatedAt: now,
    }
    await db.insert(userPokemon).values(newRecord)
    return newRecord
  }

  async batchUpsertUserPokemon(
    userId: string,
    entries: Array<{ pokedexId: number; collected: boolean }>
  ): Promise<void> {
    const existing = await this.getUserCollection(userId)
    const existingMap = new Map(existing.map((e) => [e.pokedexId, e]))
    const now = new Date()

    for (const entry of entries) {
      const match = existingMap.get(entry.pokedexId)
      if (match) {
        await db
          .update(userPokemon)
          .set({
            collected: entry.collected,
            updatedAt: now,
          })
          .where(eq(userPokemon.id, match.id))
      } else {
        await db.insert(userPokemon).values({
          id: crypto.randomUUID(),
          userId,
          pokedexId: entry.pokedexId,
          collected: entry.collected,
          updatedAt: now,
        })
      }
    }
  }

  async markProfileSeeded(userId: string): Promise<void> {
    await db
      .update(collectorProfiles)
      .set({ seededFromSheet: true })
      .where(eq(collectorProfiles.id, userId))
  }
}

export const collectorRepository = new CollectorRepository()
