import { Hono } from 'hono'
import { z } from 'zod'
import { collectorRepository } from '../repositories/collectorRepository.js'
import { sheetSeedService } from '../services/sheetSeedService.js'

export const authRoutes = new Hono()

const googleAuthSchema = z.object({
  googleId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().optional().nullable(),
  accessToken: z.string().optional(),
})

// POST /api/auth/google
authRoutes.post('/google', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = googleAuthSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid Google payload', details: parsed.error.issues }, 400)
    }

    const { googleId, email, name, avatarUrl, accessToken } = parsed.data
    const profileId = crypto.randomUUID()

    const profile = await collectorRepository.upsertProfile({
      id: profileId,
      googleId,
      email,
      name,
      avatarUrl,
    })

    let seedResult = { seeded: false, count: 0 }
    if (!profile.seededFromSheet && accessToken) {
      seedResult = await sheetSeedService.autoSeedFromGoogleDrive(profile.id, accessToken)
    }

    return c.json({
      profile,
      seeded: seedResult.seeded,
      seededCount: seedResult.count,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Authentication failed' }, 500)
  }
})
