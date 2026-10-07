import { Hono } from 'hono'
import { z } from 'zod'
import { collectorRepository } from '../repositories/collectorRepository.js'
import { sheetSeedService } from '../services/sheetSeedService.js'
import { seedProfileFromDataset } from '../scripts/seedCollector.js'

export const authRoutes = new Hono()

const googleAuthSchema = z.object({
  credential: z.string().optional(),
  googleId: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
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

    let googleId = parsed.data.googleId
    let email = parsed.data.email
    let name = parsed.data.name
    let avatarUrl = parsed.data.avatarUrl
    const { credential, accessToken } = parsed.data

    if (credential) {
      const tokenRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      )
      if (!tokenRes.ok) {
        return c.json({ error: 'Invalid Google credential token' }, 401)
      }
      const tokenData = (await tokenRes.json()) as any

      const nowSec = Math.floor(Date.now() / 1000)
      if (tokenData.exp && Number(tokenData.exp) < nowSec) {
        return c.json({ error: 'Google token has expired' }, 401)
      }

      const expectedClientId =
        process.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID ||
        '8010736190-ni98j51d06uo3n48kp31ia5atbk9iln5.apps.googleusercontent.com'

      if (expectedClientId && tokenData.aud && tokenData.aud !== expectedClientId) {
        return c.json({ error: 'Token audience mismatch' }, 401)
      }

      googleId = tokenData.sub
      email = tokenData.email
      name = tokenData.name || (email ? email.split('@')[0] : 'Collector')
      avatarUrl = tokenData.picture || null
    }

    if (!googleId || !email) {
      return c.json({ error: 'Missing required credentials' }, 400)
    }

    const profileId = crypto.randomUUID()
    const profile = await collectorRepository.upsertProfile({
      id: profileId,
      googleId,
      email,
      name: name || email.split('@')[0],
      avatarUrl,
    })

    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'pfabrino@gmail.com').toLowerCase().trim()
    const isCreator = email.toLowerCase().trim() === adminEmail

    let seeded = profile.seededFromSheet
    let seededCount = 0

    if (isCreator && !profile.seededFromSheet) {
      seededCount = await seedProfileFromDataset(profile.id)
      seeded = true
      profile.seededFromSheet = true
    } else if (!profile.seededFromSheet && accessToken) {
      const seedResult = await sheetSeedService.autoSeedFromGoogleDrive(profile.id, accessToken)
      seeded = seedResult.seeded
      seededCount = seedResult.count
    }

    return c.json({
      profile,
      seeded,
      seededCount,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Authentication failed' }, 500)
  }
})

// GET /api/auth/profile
authRoutes.get('/profile', async (c) => {
  const userId = c.req.query('userId') || 'pedro'
  try {
    let profile = await collectorRepository.getProfileById(userId)
    if (!profile && userId === 'pedro') {
      profile = await collectorRepository.upsertProfile({
        id: 'pedro',
        googleId: 'google-pedro-dev',
        email: 'pedro@masterdex.local',
        name: 'Pedro Fabrino',
        avatarUrl:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        seededFromSheet: true,
      })
    }

    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    return c.json({ profile })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to fetch profile' }, 500)
  }
})
