import { eq, and, isNotNull } from 'drizzle-orm'
import { db, rawClient } from '../db/index.js'
import {
  collectorProfiles,
  userPokemon,
  type CollectorProfileRecord,
  type UserPokemonRecord,
} from '../db/schema.js'
import { collectorPreferencesRepository } from './collectorPreferencesRepository.js'

export class CollectorRepository {
  async pingDatabase(timeoutMs = 3000): Promise<boolean> {
    const pingTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Database ping timed out (${timeoutMs}ms)`)), timeoutMs)
    )
    await Promise.race([rawClient.execute('SELECT 1;'), pingTimeout])
    return true
  }

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

  async getAssignedCollectedCards(userId: string) {
    return await db
      .select({
        pokedexId: userPokemon.pokedexId,
        cardId: userPokemon.cardId,
        cardName: userPokemon.cardName,
        cardImageUrl: userPokemon.cardImageUrl,
        cardLanguage: userPokemon.cardLanguage,
        cardCondition: userPokemon.cardCondition,
      })
      .from(userPokemon)
      .where(
        and(
          eq(userPokemon.userId, userId),
          eq(userPokemon.collected, true),
          isNotNull(userPokemon.cardId)
        )
      )
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
          cardCondition?: string | null
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
      const nextCardCondition = (opts.cardCondition ? opts.cardCondition : record.cardCondition) ?? 'NM'

      await db
        .update(userPokemon)
        .set({
          collected: nextCollected,
          cardId: nextCardId,
          cardName: nextCardName,
          cardImageUrl: nextCardImageUrl,
          cardLanguage: nextCardLanguage,
          cardCondition: nextCardCondition,
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
        cardCondition: nextCardCondition,
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
      cardCondition: opts.cardCondition ?? 'NM',
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
      cardCondition?: string | null
    }>
  ): Promise<void> {
    const existing = await this.getUserCollection(userId)
    const existingMap = new Map(existing.map((e) => [e.pokedexId, e]))
    const now = new Date()

    const toInsert: Array<any> = []
    const toUpdate: Array<{ id: string; values: any }> = []

    for (const entry of entries) {
      const match = existingMap.get(entry.pokedexId)
      if (match) {
        toUpdate.push({
          id: match.id,
          values: {
            collected: entry.collected,
            cardId: entry.cardId !== undefined ? entry.cardId : match.cardId,
            cardName: entry.cardName !== undefined ? entry.cardName : match.cardName,
            cardImageUrl: entry.cardImageUrl !== undefined ? entry.cardImageUrl : match.cardImageUrl,
            cardLanguage: entry.cardLanguage !== undefined ? entry.cardLanguage : (match.cardLanguage ?? 'en'),
            cardCondition: entry.cardCondition !== undefined ? entry.cardCondition : (match.cardCondition ?? 'NM'),
            updatedAt: now,
          },
        })
      } else {
        toInsert.push({
          id: crypto.randomUUID(),
          userId,
          pokedexId: entry.pokedexId,
          collected: entry.collected,
          cardId: entry.cardId ?? null,
          cardName: entry.cardName ?? null,
          cardImageUrl: entry.cardImageUrl ?? null,
          cardLanguage: entry.cardLanguage ?? 'en',
          cardCondition: entry.cardCondition ?? 'NM',
          updatedAt: now,
        })
      }
    }

    const CHUNK_SIZE = 50
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE)
      await db.insert(userPokemon).values(chunk)
    }

    for (const item of toUpdate) {
      await db.update(userPokemon).set(item.values).where(eq(userPokemon.id, item.id))
    }
  }

  async markProfileSeeded(userId: string): Promise<void> {
    await db
      .update(collectorProfiles)
      .set({ seededFromSheet: true })
      .where(eq(collectorProfiles.id, userId))
  }

  async getPreferences(userId: string) {
    return await collectorPreferencesRepository.getPreferences(userId)
  }

  async updatePreferences(
    userId: string,
    updates: {
      targetRarity?: string
      hiddenExpansions?: string[]
      valuationPreference?: 'ligapokemon' | 'tcgplayer'
    }
  ) {
    return await collectorPreferencesRepository.updatePreferences(userId, updates)
  }

  async getSettings(userId: string) {
    return await collectorPreferencesRepository.getSettings(userId)
  }

  async updateSettings(
    userId: string,
    updates: { geminiApiKey?: string | null; favoredLanguages?: string[] }
  ) {
    return await collectorPreferencesRepository.updateSettings(userId, updates)
  }
}

export { maskApiKey, type CollectorSettings } from './collectorPreferencesRepository.js'
export const collectorRepository = new CollectorRepository()

