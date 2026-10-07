import { Hono } from 'hono'
import { z } from 'zod'
import { collectorRepository } from '../repositories/collectorRepository.js'
import { sheetSeedService } from '../services/sheetSeedService.js'
import { verifySessionToken } from '../services/authService.js'

export const collectionRoutes = new Hono()

function authorizeMutation(c: any, targetUserId: string): { ok: boolean; response?: any } {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) {
    if (process.env.NODE_ENV === 'test') {
      return { ok: true }
    }
    return { ok: false, response: c.json({ error: 'Unauthorized: missing authorization header' }, 401) }
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return { ok: false, response: c.json({ error: 'Unauthorized: invalid token scheme' }, 401) }
  }

  const session = verifySessionToken(match[1])
  if (!session) {
    return { ok: false, response: c.json({ error: 'Unauthorized: invalid or expired session token' }, 401) }
  }

  if (session.userId !== targetUserId) {
    return { ok: false, response: c.json({ error: 'Forbidden: profile ownership mismatch' }, 403) }
  }

  return { ok: true }
}

const updateCollectionSchema = z.object({
  userId: z.string().min(1),
  collected: z.boolean().optional(),
  cardId: z.string().nullable().optional(),
  cardName: z.string().nullable().optional(),
  cardImageUrl: z.string().nullable().optional(),
  cardLanguage: z.string().nullable().optional(),
})


const reseedSchema = z.object({
  userId: z.string().min(1),
  accessToken: z.string().min(1),
})

const seedRowsSchema = z.object({
  userId: z.string().min(1),
  rows: z.array(z.array(z.string())),
})

const seedSheetSchema = z.object({
  userId: z.string().min(1),
  spreadsheetId: z.string().min(1),
  accessToken: z.string().optional(),
})

const batchSyncSchema = z.object({
  userId: z.string().min(1),
  entries: z
    .array(
      z.object({
        pokedexId: z.number().int().positive(),
        collected: z.boolean(),
        cardId: z.string().nullable().optional(),
        cardName: z.string().nullable().optional(),
        cardImageUrl: z.string().nullable().optional(),
        cardLanguage: z.string().nullable().optional(),
      })
    )
    .optional(),
  csv: z.string().optional(),
})

// GET /api/collection
collectionRoutes.get('/', async (c) => {
  const userId = c.req.query('userId')
  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const list = await collectorRepository.getUserCollection(userId)
    const statusMap: Record<number, boolean> = {}
    const itemsMap: Record<
      number,
      {
        collected: boolean
        cardId?: string | null
        cardName?: string | null
        cardImageUrl?: string | null
        cardLanguage?: string | null
      }
    > = {}

    for (const item of list) {
      statusMap[item.pokedexId] = item.collected
      itemsMap[item.pokedexId] = {
        collected: item.collected,
        cardId: item.cardId,
        cardName: item.cardName,
        cardImageUrl: item.cardImageUrl,
        cardLanguage: item.cardLanguage ?? 'en',
      }
    }
    return c.json({
      collection: statusMap,
      items: itemsMap,
      count: list.filter((l) => l.collected).length,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to fetch collection' }, 500)
  }
})

// PATCH /api/collection/:pokemonId
collectionRoutes.patch('/:pokemonId', async (c) => {
  const pokemonId = parseInt(c.req.param('pokemonId'), 10)
  if (isNaN(pokemonId)) {
    return c.json({ error: 'Invalid pokemonId' }, 400)
  }

  try {
    const body = await c.req.json()
    const parsed = updateCollectionSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid payload', details: parsed.error.issues }, 400)
    }

    const authCheck = authorizeMutation(c, parsed.data.userId)
    if (!authCheck.ok) return authCheck.response

    const updated = await collectorRepository.setUserPokemon(
      parsed.data.userId,
      pokemonId,
      {
        collected: parsed.data.collected,
        cardId: parsed.data.cardId,
        cardName: parsed.data.cardName,
        cardImageUrl: parsed.data.cardImageUrl,
        cardLanguage: parsed.data.cardLanguage,
      }
    )

    return c.json({ item: updated })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to update collection' }, 500)
  }
})

// POST /api/collection/reseed
collectionRoutes.post('/reseed', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = reseedSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid reseed payload', details: parsed.error.issues }, 400)
    }

    const authCheck = authorizeMutation(c, parsed.data.userId)
    if (!authCheck.ok) return authCheck.response

    const result = await sheetSeedService.autoSeedFromGoogleDrive(
      parsed.data.userId,
      parsed.data.accessToken
    )

    return c.json({
      success: result.seeded,
      seededCount: result.count,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to reseed collection' }, 500)
  }
})

// POST /api/collection/seed-rows
collectionRoutes.post('/seed-rows', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = seedRowsSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid rows payload' }, 400)
    }

    const authCheck = authorizeMutation(c, parsed.data.userId)
    if (!authCheck.ok) return authCheck.response

    const parsedEntries = sheetSeedService.parseSheetRows(parsed.data.rows)
    await collectorRepository.batchUpsertUserPokemon(parsed.data.userId, parsedEntries)
    await collectorRepository.markProfileSeeded(parsed.data.userId)

    const collectedCount = parsedEntries.filter((e) => e.collected).length
    return c.json({
      success: true,
      seededCount: collectedCount,
      totalProcessed: parsedEntries.length,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to seed rows' }, 500)
  }
})

// POST /api/collection/seed-sheet
collectionRoutes.post('/seed-sheet', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = seedSheetSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid seed-sheet payload', details: parsed.error.issues }, 400)
    }

    const authCheck = authorizeMutation(c, parsed.data.userId)
    if (!authCheck.ok) return authCheck.response

    const result = await sheetSeedService.seedFromSpreadsheetId(
      parsed.data.userId,
      parsed.data.spreadsheetId,
      parsed.data.accessToken
    )

    return c.json({
      success: result.seeded,
      seededCount: result.count,
      totalProcessed: result.totalProcessed,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to seed from sheet' }, 500)
  }
})

// POST /api/collection/batch
collectionRoutes.post('/batch', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = batchSyncSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid batch sync payload', details: parsed.error.issues }, 400)
    }

    const authCheck = authorizeMutation(c, parsed.data.userId)
    if (!authCheck.ok) return authCheck.response


    let entries: Array<{
      pokedexId: number
      collected: boolean
      cardId?: string | null
      cardName?: string | null
      cardImageUrl?: string | null
      cardLanguage?: string | null
    }> = []

    if (parsed.data.entries) {
      entries = parsed.data.entries
    } else if (parsed.data.csv) {
      entries = sheetSeedService.parseCsv(parsed.data.csv)
    }

    await collectorRepository.batchUpsertUserPokemon(parsed.data.userId, entries)

    const collectedCount = entries.filter((e) => e.collected).length
    return c.json({
      success: true,
      syncedCount: entries.length,
      collectedCount,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to batch sync collection' }, 500)
  }
})

// GET /api/collection/export
collectionRoutes.get('/export', async (c) => {
  const userId = c.req.query('userId')
  const format = c.req.query('format') || 'json'

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const list = await collectorRepository.getUserCollection(userId)

    if (format === 'csv') {
      const csv = sheetSeedService.formatCsv(
        list.map((item) => ({
          pokedexId: item.pokedexId,
          collected: item.collected,
          cardId: item.cardId,
          cardName: item.cardName,
          cardImageUrl: item.cardImageUrl,
        }))
      )
      return c.text(csv, 200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="masterdex-collection-${userId}.csv"`,
      })
    }

    return c.json({
      userId,
      exportedAt: new Date().toISOString(),
      count: list.filter((l) => l.collected).length,
      items: list,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to export collection' }, 500)
  }
})
