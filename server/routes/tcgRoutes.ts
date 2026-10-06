import { Hono } from 'hono'
import { z } from 'zod'
import { scraperService } from '../services/scraperService.js'
import { tcgdexService } from '../services/tcgdexService.js'
import { expansionsRepository } from '../repositories/expansionsRepository.js'

export const tcgRoutes = new Hono()

// GET /api/tcg/cards/search
tcgRoutes.get('/cards/search', async (c) => {
  const q = c.req.query('q') || ''
  if (!q.trim()) {
    return c.json({ query: '', parsed: { name: '' }, results: [], count: 0 })
  }

  try {
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20))
    const parsed = tcgdexService.parseQuery(q)
    const results = await tcgdexService.searchCards(q, limit)

    return c.json({
      query: q,
      parsed,
      results,
      count: results.length,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to search cards' }, 500)
  }
})

const scrapeSchema = z.object({
  url: z.string().url(),
})

const parseHtmlSchema = z.object({
  html: z.string(),
  url: z.string(),
})

// GET /api/tcg/expansions
tcgRoutes.get('/expansions', async (c) => {
  try {
    const list = await expansionsRepository.getAllExpansions()
    return c.json({ expansions: list })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to fetch expansions' }, 500)
  }
})

// GET /api/tcg/expansions/:slug
tcgRoutes.get('/expansions/:slug', async (c) => {
  const slug = c.req.param('slug')
  try {
    const expansion = await expansionsRepository.getExpansionBySlug(slug)
    if (!expansion) {
      return c.json({ error: 'Expansion not found' }, 404)
    }

    const secretCards = await expansionsRepository.getSecretCardsByExpansionId(expansion.id)
    const allCards = await expansionsRepository.getAllCardsByExpansionId(expansion.id)

    return c.json({
      expansion,
      secretCards,
      cards: allCards,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to fetch expansion' }, 500)
  }
})

// POST /api/tcg/expansions/scrape
tcgRoutes.post('/expansions/scrape', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = scrapeSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid URL provided', details: parsed.error.issues }, 400)
    }

    const result = await scraperService.fetchAndParseExpansion(parsed.data.url)
    const existing = await expansionsRepository.getExpansionBySlug(result.expansion.slug)
    const expansionId = existing?.id || crypto.randomUUID()

    const savedExpansion = await expansionsRepository.upsertExpansion({
      ...result.expansion,
      id: expansionId,
      lastScrapedAt: new Date(result.expansion.lastScrapedAt),
    })

    const cardEntities = result.cards.map((c) => ({
      id: `${expansionId}-${c.localId}`,
      expansionId,
      localId: c.localId,
      name: c.name,
      rarity: c.rarity,
      imageUrl: c.imageUrl,
      marketPrice: c.marketPrice,
      isSecret: c.isSecret,
      types: c.types,
    }))

    await expansionsRepository.upsertCards(cardEntities)

    // Record price history for secret cards
    const secretCards = cardEntities.filter((c) => c.isSecret)
    for (const card of secretCards) {
      await expansionsRepository.recordPriceHistory(
        card.id,
        card.marketPrice,
        new Date()
      )
    }

    return c.json({
      expansion: savedExpansion,
      secretCount: secretCards.length,
      metrics: result.metrics,
      message: 'Expansion successfully scraped and saved',
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Scraping failed' }, 500)
  }
})

// POST /api/tcg/expansions/parse-html
tcgRoutes.post('/expansions/parse-html', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = parseHtmlSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid payload' }, 400)
    }

    const result = scraperService.parseExpansionHtml(parsed.data.html, parsed.data.url)
    const existing = await expansionsRepository.getExpansionBySlug(result.expansion.slug)
    const expansionId = existing?.id || crypto.randomUUID()

    const savedExpansion = await expansionsRepository.upsertExpansion({
      ...result.expansion,
      id: expansionId,
      lastScrapedAt: new Date(result.expansion.lastScrapedAt),
    })

    const cardEntities = result.cards.map((c) => ({
      id: `${expansionId}-${c.localId}`,
      expansionId,
      localId: c.localId,
      name: c.name,
      rarity: c.rarity,
      imageUrl: c.imageUrl,
      marketPrice: c.marketPrice,
      isSecret: c.isSecret,
      types: c.types,
    }))

    await expansionsRepository.upsertCards(cardEntities)

    return c.json({
      expansion: savedExpansion,
      secretCount: cardEntities.filter((c) => c.isSecret).length,
      metrics: result.metrics,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'HTML parsing failed' }, 500)
  }
})
