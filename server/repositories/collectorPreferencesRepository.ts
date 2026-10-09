import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  collectorProfiles,
  type CollectorProfileRecord,
} from '../db/schema.js'
import type { ValuationPreference } from '../../shared/types.js'

export function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null
  if (key.length <= 8) return '****'
  return `${key.slice(0, 6)}...${key.slice(-4)}`
}

export interface CollectorSettings {
  geminiApiKey: string | null
  maskedGeminiApiKey: string | null
  hasGeminiApiKey: boolean
  favoredLanguages: string[]
}

export interface CollectorPreferencesData {
  targetRarity: string
  hiddenExpansions: string[]
  valuationPreference: ValuationPreference
}

export class CollectorPreferencesRepository {
  async getPreferences(userId: string): Promise<CollectorPreferencesData> {
    const rows = await db
      .select({
        targetRarity: collectorProfiles.targetRarity,
        hiddenExpansions: collectorProfiles.hiddenExpansions,
        valuationPreference: collectorProfiles.valuationPreference,
      })
      .from(collectorProfiles)
      .where(eq(collectorProfiles.id, userId))
      .limit(1)

    if (rows.length === 0) {
      return {
        targetRarity: 'any',
        hiddenExpansions: [],
        valuationPreference: 'ligapokemon',
      }
    }

    const record = rows[0]
    let hiddenExpansions: string[] = []
    try {
      if (record.hiddenExpansions) {
        hiddenExpansions = JSON.parse(record.hiddenExpansions)
      }
    } catch {
      hiddenExpansions = []
    }

    return {
      targetRarity: record.targetRarity || 'any',
      hiddenExpansions,
      valuationPreference: (record.valuationPreference as ValuationPreference) || 'ligapokemon',
    }
  }

  async updatePreferences(
    userId: string,
    updates: {
      targetRarity?: string
      hiddenExpansions?: string[]
      valuationPreference?: ValuationPreference
    }
  ): Promise<CollectorPreferencesData> {
    const existing = await db
      .select()
      .from(collectorProfiles)
      .where(eq(collectorProfiles.id, userId))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(collectorProfiles).values({
        id: userId,
        email: `${userId}@local.dev`,
        name: userId,
        createdAt: new Date(),
        targetRarity: updates.targetRarity || 'any',
        hiddenExpansions: updates.hiddenExpansions ? JSON.stringify(updates.hiddenExpansions) : '[]',
        valuationPreference: updates.valuationPreference || 'ligapokemon',
      })
      return await this.getPreferences(userId)
    }

    const payload: Partial<CollectorProfileRecord> = {}
    if (updates.targetRarity !== undefined) {
      payload.targetRarity = updates.targetRarity
    }
    if (updates.hiddenExpansions !== undefined) {
      payload.hiddenExpansions = JSON.stringify(updates.hiddenExpansions)
    }
    if (updates.valuationPreference !== undefined) {
      payload.valuationPreference = updates.valuationPreference
    }

    if (Object.keys(payload).length > 0) {
      await db.update(collectorProfiles).set(payload).where(eq(collectorProfiles.id, userId))
    }

    return await this.getPreferences(userId)
  }

  async getSettings(userId: string): Promise<CollectorSettings> {
    const rows = await db
      .select()
      .from(collectorProfiles)
      .where(eq(collectorProfiles.id, userId))
      .limit(1)

    if (rows.length === 0) {
      return {
        geminiApiKey: null,
        maskedGeminiApiKey: null,
        hasGeminiApiKey: false,
        favoredLanguages: ['pt', 'en', 'ja'],
      }
    }

    const profile = rows[0]
    let favoredLanguages: string[] = ['pt', 'en', 'ja']
    try {
      if (profile.favoredLanguages) {
        favoredLanguages = JSON.parse(profile.favoredLanguages)
      }
    } catch {
      favoredLanguages = ['pt', 'en', 'ja']
    }
    return {
      geminiApiKey: profile.geminiApiKey || null,
      maskedGeminiApiKey: maskApiKey(profile.geminiApiKey),
      hasGeminiApiKey: Boolean(profile.geminiApiKey),
      favoredLanguages,
    }
  }

  async updateSettings(
    userId: string,
    updates: { geminiApiKey?: string | null; favoredLanguages?: string[] }
  ): Promise<CollectorSettings> {
    const existing = await db
      .select()
      .from(collectorProfiles)
      .where(eq(collectorProfiles.id, userId))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(collectorProfiles).values({
        id: userId,
        email: `${userId}@local.dev`,
        name: userId,
        createdAt: new Date(),
      })
    }

    const payload: { geminiApiKey?: string | null; favoredLanguages?: string } = {}
    if (updates.geminiApiKey !== undefined) {
      payload.geminiApiKey = updates.geminiApiKey ? updates.geminiApiKey.trim() : null
    }
    if (updates.favoredLanguages !== undefined) {
      payload.favoredLanguages = JSON.stringify(updates.favoredLanguages)
    }

    if (Object.keys(payload).length > 0) {
      await db.update(collectorProfiles).set(payload).where(eq(collectorProfiles.id, userId))
    }

    return await this.getSettings(userId)
  }
}

export const collectorPreferencesRepository = new CollectorPreferencesRepository()
