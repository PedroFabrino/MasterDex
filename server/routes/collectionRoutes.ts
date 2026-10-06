import { Hono } from 'hono'
import { z } from 'zod'
import { collectorRepository } from '../repositories/collectorRepository.js'
import { sheetSeedService } from '../services/sheetSeedService.js'

export const collectionRoutes = new Hono()

const updateCollectionSchema = z.object({
  userId: z.string().min(1),
  collected: z.boolean().optional(),
  cardId: z.string().nullable().optional(),
  cardName: z.string().nullable().optional(),
  cardImageUrl: z.string().nullable().optional(),
})

const reseedSchema = z.object({
  userId: z.string().min(1),
  accessToken: z.string().min(1),
})

const seedRowsSchema = z.object({
  userId: z.string().min(1),
  rows: z.array(z.array(z.string())),
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
      { collected: boolean; cardId?: string | null; cardName?: string | null; cardImageUrl?: string | null }
    > = {}

    for (const item of list) {
      statusMap[item.pokedexId] = item.collected
      itemsMap[item.pokedexId] = {
        collected: item.collected,
        cardId: item.cardId,
        cardName: item.cardName,
        cardImageUrl: item.cardImageUrl,
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

    const updated = await collectorRepository.setUserPokemon(
      parsed.data.userId,
      pokemonId,
      {
        collected: parsed.data.collected,
        cardId: parsed.data.cardId,
        cardName: parsed.data.cardName,
        cardImageUrl: parsed.data.cardImageUrl,
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
