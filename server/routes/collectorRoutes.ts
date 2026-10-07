import { Hono } from 'hono'
import { z } from 'zod'
import { collectorRepository } from '../repositories/collectorRepository.js'

export const collectorRoutes = new Hono()

const updatePreferencesSchema = z.object({
  userId: z.string().optional(),
  targetRarity: z.enum(['any', 'holo', 'ultra', 'illustration', 'secret']).optional(),
  hiddenExpansions: z.array(z.string()).optional(),
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
