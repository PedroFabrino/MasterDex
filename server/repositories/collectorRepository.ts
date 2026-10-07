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

  async getProfileByEmail(email: string): Promise<CollectorProfileRecord | undefined> {
    const rows = await db
      .select()
      .from(collectorProfiles)
      .where(eq(collectorProfiles.email, email))
      .limit(1)
    return rows[0]
  }

  async upsertProfile(data: {
    id: string
    googleId?: string | null
    email: string
    name: string
    avatarUrl?: string | null
    seededFromSheet?: boolean
    createdAt?: Date
  }): Promise<CollectorProfileRecord> {
    const existingById = await this.getProfileById(data.id)
    const existingByGoogle = data.googleId ? await this.getProfileByGoogleId(data.googleId) : undefined
    const existingByEmail = await this.getProfileByEmail(data.email)
    const existing = existingById || existingByGoogle || existingByEmail

    if (existing) {
      await db
        .update(collectorProfiles)
        .set({
          name: data.name,
          email: data.email,
          avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : existing.avatarUrl,
          googleId: data.googleId ?? existing.googleId,
          seededFromSheet: data.seededFromSheet !== undefined ? data.seededFromSheet : existing.seededFromSheet,
        })
        .where(eq(collectorProfiles.id, existing.id))
      return (await this.getProfileById(existing.id))!
    }

    await db.insert(collectorProfiles).values({
      id: data.id,
      googleId: data.googleId ?? null,
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
          cardLanguage?: string | null
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
      const nextCardLanguage = opts.cardLanguage !== undefined ? opts.cardLanguage : (record.cardLanguage ?? 'en')

      await db
        .update(userPokemon)
        .set({
          collected: nextCollected,
          cardId: nextCardId,
          cardName: nextCardName,
          cardImageUrl: nextCardImageUrl,
          cardLanguage: nextCardLanguage,
          updatedAt: now,
        })
        .where(eq(userPokemon.id, record.id))

      return {
        ...record,
        collected: nextCollected,
        cardId: nextCardId,
        cardName: nextCardName,
        cardImageUrl: nextCardImageUrl,
        cardLanguage: nextCardLanguage,
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
      cardLanguage: opts.cardLanguage ?? 'en',
      updatedAt: now,
    }
    await db.insert(userPokemon).values(newRecord)
    return newRecord
  }

  async batchUpsertUserPokemon(
    userId: string,
    entries: Array<{
      pokedexId: number
      collected: boolean
      cardId?: string | null
      cardName?: string | null
      cardImageUrl?: string | null
      cardLanguage?: string | null
    }>
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
            cardId: entry.cardId !== undefined ? entry.cardId : match.cardId,
            cardName: entry.cardName !== undefined ? entry.cardName : match.cardName,
            cardImageUrl: entry.cardImageUrl !== undefined ? entry.cardImageUrl : match.cardImageUrl,
            cardLanguage: entry.cardLanguage !== undefined ? entry.cardLanguage : (match.cardLanguage ?? 'en'),
            updatedAt: now,
          })
          .where(eq(userPokemon.id, match.id))
      } else {
        await db.insert(userPokemon).values({
          id: crypto.randomUUID(),
          userId,
          pokedexId: entry.pokedexId,
          collected: entry.collected,
          cardId: entry.cardId ?? null,
          cardName: entry.cardName ?? null,
          cardImageUrl: entry.cardImageUrl ?? null,
          cardLanguage: entry.cardLanguage ?? 'en',
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

  async getPreferences(userId: string): Promise<{ targetRarity: string; hiddenExpansions: string[] }> {
    const profile = await this.getProfileById(userId)
    if (!profile) {
      return { targetRarity: 'any', hiddenExpansions: [] }
    }
    let hiddenExpansions: string[] = []
    try {
      hiddenExpansions = JSON.parse(profile.hiddenExpansions || '[]')
    } catch {
      hiddenExpansions = []
    }
    return {
      targetRarity: profile.targetRarity || 'any',
      hiddenExpansions,
    }
  }

  async updatePreferences(
    userId: string,
    updates: { targetRarity?: string; hiddenExpansions?: string[] }
  ): Promise<{ targetRarity: string; hiddenExpansions: string[] }> {
    const profile = await this.getProfileById(userId)
    if (!profile) {
      await this.upsertProfile({
        id: userId,
        email: `${userId}@local.dev`,
        name: userId,
      })
    }

    const payload: { targetRarity?: string; hiddenExpansions?: string } = {}
    if (updates.targetRarity !== undefined) {
      payload.targetRarity = updates.targetRarity
    }
    if (updates.hiddenExpansions !== undefined) {
      payload.hiddenExpansions = JSON.stringify(updates.hiddenExpansions)
    }

    if (Object.keys(payload).length > 0) {
      await db.update(collectorProfiles).set(payload).where(eq(collectorProfiles.id, userId))
    }

    return await this.getPreferences(userId)
  }
}

export const collectorRepository = new CollectorRepository()
