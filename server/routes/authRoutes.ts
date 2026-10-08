import { Hono } from 'hono'
import { z } from 'zod'
import { collectorRepository } from '../repositories/collectorRepository.js'
import { sheetSeedService } from '../services/sheetSeedService.js'
import { seedProfileFromDataset } from '../scripts/seedCollector.js'
import { verifyGoogleIdToken, createSessionToken } from '../services/authService.js'

export const authRoutes = new Hono()

const googleAuthSchema = z.object({
  credential: z.string().min(1),
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

    const { credential, accessToken } = parsed.data
    const verified = await verifyGoogleIdToken(credential)
    if (!verified.ok) {
      return c.json({ error: verified.error }, 401)
    }

    const { googleId, email, name, avatarUrl } = verified.payload


    const profileId = crypto.randomUUID()
    const profile = await collectorRepository.upsertProfile({
      id: profileId,
      googleId,
      email,
      name,
      avatarUrl,
    })

    const sessionToken = createSessionToken(profile.id)

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
      profile: {
        ...profile,
        sessionToken,
      },
      token: sessionToken,
      sessionToken,
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

    const sessionToken = createSessionToken(profile.id)
    return c.json({
      profile: {
        ...profile,
        sessionToken,
      },
      sessionToken,
      token: sessionToken,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to fetch profile' }, 500)
  }
})
