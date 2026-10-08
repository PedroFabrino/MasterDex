import { Hono } from 'hono'
import { z } from 'zod'
import { collectorRepository } from '../repositories/collectorRepository.js'
import { portfolioService } from '../services/portfolioService.js'

export const collectorRoutes = new Hono()

const updatePreferencesSchema = z.object({
  userId: z.string().optional(),
  targetRarity: z.enum(['any', 'holo', 'ultra', 'illustration', 'secret']).optional(),
  hiddenExpansions: z.array(z.string()).optional(),
  valuationPreference: z.enum(['ligapokemon', 'tcgplayer']).optional(),
})

// GET /api/collector/preferences
collectorRoutes.get('/preferences', async (c) => {
  const userId = c.req.query('userId') || 'guest'
  try {
    const preferences = await collectorRepository.getPreferences(userId)
    return c.json({
      userId,
      preferences,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to get preferences' }, 500)
  }
})

// PATCH /api/collector/preferences
collectorRoutes.patch('/preferences', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = updatePreferencesSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid preferences payload', details: parsed.error.issues }, 400)
    }

    const userId = parsed.data.userId || 'guest'
    const updated = await collectorRepository.updatePreferences(userId, {
      targetRarity: parsed.data.targetRarity,
      hiddenExpansions: parsed.data.hiddenExpansions,
      valuationPreference: parsed.data.valuationPreference,
    })

    return c.json({
      success: true,
      userId,
      preferences: updated,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to update preferences' }, 500)
  }
})

// GET /api/collector/portfolio
collectorRoutes.get('/portfolio', async (c) => {
  const userId = c.req.query('userId') || 'guest'
  const preference = (c.req.query('preference') as any) || undefined
  try {
    const portfolio = await portfolioService.getPortfolioSummary(userId, preference)
    return c.json({
      success: true,
      userId,
      portfolio,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to get portfolio summary' }, 500)
  }
})

const updateSettingsSchema = z.object({
  userId: z.string().optional(),
  geminiApiKey: z.string().nullable().optional(),
  favoredLanguages: z.array(z.string()).optional(),
})

const testKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
})

// GET /api/collector/settings
collectorRoutes.get('/settings', async (c) => {
  const userId = c.req.query('userId') || 'guest'
  try {
    const settings = await collectorRepository.getSettings(userId)
    return c.json({
      userId,
      settings: {
        maskedGeminiApiKey: settings.maskedGeminiApiKey,
        hasGeminiApiKey: settings.hasGeminiApiKey,
        favoredLanguages: settings.favoredLanguages,
      },
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to get settings' }, 500)
  }
})

// PATCH /api/collector/settings
collectorRoutes.patch('/settings', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = updateSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid settings payload', details: parsed.error.issues }, 400)
    }

    const userId = parsed.data.userId || 'guest'
    const updated = await collectorRepository.updateSettings(userId, {
      geminiApiKey: parsed.data.geminiApiKey,
      favoredLanguages: parsed.data.favoredLanguages,
    })

    return c.json({
      success: true,
      userId,
      settings: {
        maskedGeminiApiKey: updated.maskedGeminiApiKey,
        hasGeminiApiKey: updated.hasGeminiApiKey,
        favoredLanguages: updated.favoredLanguages,
      },
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to update settings' }, 500)
  }
})

// POST /api/collector/settings/test-key
collectorRoutes.post('/settings/test-key', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = testKeySchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'API key is required', details: parsed.error.issues }, 400)
    }

    const apiKey = parsed.data.apiKey.trim()
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as any
      const errorMessage = errorData?.error?.message || `Google API error (${response.status})`
      return c.json(
        {
          valid: false,
          error: errorMessage,
        },
        400
      )
    }

    const data = (await response.json().catch(() => ({}))) as any
    const modelCount = Array.isArray(data?.models) ? data.models.length : 0

    return c.json({
      valid: true,
      message: 'Gemini API key is valid',
      modelCount,
    })
  } catch (error: any) {
    return c.json(
      {
        valid: false,
        error: error?.message || 'Network error connecting to Google Gemini API',
      },
      500
    )
  }
})

