import { Hono } from 'hono'
import { z } from 'zod'
import { binderVisionService } from '../services/binderVisionService.js'
import { collectorRepository } from '../repositories/collectorRepository.js'

export const binderRoutes = new Hono()

const scanPageSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  layout: z.enum(['2x2', '3x3', '4x3', '4x4']).optional().default('3x3'),
  userId: z.string().optional(),
  apiKey: z.string().optional(),
})

// POST /api/binder/scan-page
binderRoutes.post('/scan-page', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = scanPageSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid scan request payload', details: parsed.error.issues }, 400)
    }

    const { image, layout, userId, apiKey: explicitKey } = parsed.data

    let effectiveApiKey = explicitKey?.trim()

    // If no explicit key provided, check user's saved key
    if (!effectiveApiKey && userId && userId !== 'guest') {
      const settings = await collectorRepository.getSettings(userId)
      if (settings?.geminiApiKey) {
        effectiveApiKey = settings.geminiApiKey
      }
    }

    // Fall back to server environment variable if configured
    if (!effectiveApiKey) {
      effectiveApiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.VITE_GEMINI_API_KEY
    }

    if (!effectiveApiKey) {
      return c.json(
        {
          error: 'Missing Gemini API key. Please configure your key in Collector Settings.',
          code: 'MISSING_API_KEY',
        },
        400
      )
    }

    const result = await binderVisionService.scanBinderPage({
      image,
      layout,
      apiKey: effectiveApiKey,
    })

    return c.json(result)
  } catch (error: any) {
    console.error('[binderRoutes] Scan page error:', error)
    const isClientError =
      error?.message?.includes('API key') || error?.message?.includes('Invalid image')
    return c.json(
      {
        error: error?.message || 'Failed to scan binder page',
      },
      isClientError ? 400 : 500
    )
  }
})
