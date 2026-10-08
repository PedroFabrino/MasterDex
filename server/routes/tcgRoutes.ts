import { Hono } from 'hono'
import { z } from 'zod'
import { scraperService } from '../services/scraperService.js'
import { tcgdexService } from '../services/tcgdexService.js'
import { expansionsRepository } from '../repositories/expansionsRepository.js'
import { investmentService } from '../services/investmentService.js'
import { pricingRepository } from '../repositories/pricingRepository.js'
import { exchangeRateService } from '../services/exchangeRateService.js'
import { tcgdexPricingService } from '../services/tcgdexPricingService.js'
import { ligapokemonService } from '../services/ligapokemonService.js'
import { canonicalPriceService } from '../services/canonicalPriceService.js'


export const tcgRoutes = new Hono()

// GET /api/tcg/cards/search
tcgRoutes.get('/cards/search', async (c) => {
  const q = c.req.query('q') || ''
  const dexIdParam = c.req.query('dexId')
  const dexId = dexIdParam ? parseInt(dexIdParam, 10) : undefined

  if (!q.trim() && !dexId) {
    return c.json({ query: '', parsed: { name: '' }, results: [], count: 0, total: 0, hasMore: false })
  }

  try {
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '24', 10) || 24))
    const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0)
    const rarity = c.req.query('rarity') || 'any'
    const lang = c.req.query('lang') || 'all'
    const parsed = tcgdexService.parseQuery(q)
    const results = await tcgdexService.searchCards(q, limit, dexId, offset, rarity, lang)
    const total = await tcgdexService.getTotalCount(q, dexId, rarity, lang)

    return c.json({
      query: q,
      parsed,
      dexId,
      rarity,
      lang,
      results,
      count: results.length,
      total,
      hasMore: offset + results.length < total,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to search cards' }, 500)
  }
})

// GET /api/tcg/cards/:id/prices
tcgRoutes.get('/cards/:id/prices', async (c) => {
  const cardId = c.req.param('id')
  try {
    const [prices, rates] = await Promise.all([
      pricingRepository.getPricesByCardId(cardId),
      exchangeRateService.getAllRates(),
    ])
    return c.json({
      cardId,
      prices,
      rates,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to fetch card prices' }, 500)
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
    await expansionsRepository.ensureExpansionsCatalogIndexed()

    const rarity = c.req.query('rarity') || 'any'
    const sort = c.req.query('sort') || 'score'
    const category = c.req.query('category') || 'booster'
    const userId = c.req.query('userId') || undefined
    const preference = (c.req.query('preference') as any) || undefined

    const list = await investmentService.getExpansionsWithYield({
      rarity,
      sort,
      category,
      userId,
      preference,
    })


    const enrichedList = list.map((exp) => {
      const ligapokemonCode = ligapokemonService.resolveEditionCode(exp)
      const ligapokemonUrl = ligapokemonCode ? ligapokemonService.getSearchUrl(ligapokemonCode) : null
      return {
        ...exp,
        ligapokemonCode,
        ligapokemonUrl,
      }
    })

    return c.json({
      expansions: enrichedList,
      count: enrichedList.length,
      filters: {
        category,
        rarity,
        sort,
        userId: userId ?? null,
        preference: preference ?? null,
      },
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to fetch expansions' }, 500)
  }
})

// GET /api/tcg/expansions/:slug
tcgRoutes.get('/expansions/:slug', async (c) => {
  const slug = c.req.param('slug')
  const preference = (c.req.query('preference') as any) || 'ligapokemon'
  try {
    const expansion = await expansionsRepository.getExpansionBySlug(slug)
    if (!expansion) {
      return c.json({ error: 'Expansion not found' }, 404)
    }

    const secretCards = await expansionsRepository.getSecretCardsByExpansionId(expansion.id)
    const allCards = await expansionsRepository.getAllCardsByExpansionId(expansion.id)

    const allCardIds = allCards.map((card) => card.id)
    const [pricesMap, rates] = await Promise.all([
      pricingRepository.getPricesByCardIds(allCardIds),
      exchangeRateService.getAllRates(),
    ])

    const cardsWithPrices = allCards.map((card) => {
      const prices = pricesMap.get(card.id) || []
      const canonical = canonicalPriceService.resolveFromQuotes(prices, preference, card.marketPrice, rates)
      return {
        ...card,
        prices,
        canonicalPrice: canonical.priceInBrl,
        canonicalProvider: canonical.provider,
      }
    })

    const secretsWithPrices = secretCards.map((card) => {
      const prices = pricesMap.get(card.id) || []
      const canonical = canonicalPriceService.resolveFromQuotes(prices, preference, card.marketPrice, rates)
      return {
        ...card,
        prices,
        canonicalPrice: canonical.priceInBrl,
        canonicalProvider: canonical.provider,
      }
    })

    const ligapokemonCode = ligapokemonService.resolveEditionCode(expansion)
    const ligapokemonUrl = ligapokemonCode ? ligapokemonService.getSearchUrl(ligapokemonCode) : null

    return c.json({
      expansion: {
        ...expansion,
        ligapokemonCode,
        ligapokemonUrl,
        valuationPreference: preference,
      },
      secretCards: secretsWithPrices,
      cards: cardsWithPrices,
      rates,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to fetch expansion' }, 500)
  }
})

// POST /api/tcg/expansions/:slug/sync-prices
tcgRoutes.post('/expansions/:slug/sync-prices', async (c) => {
  const slug = c.req.param('slug')
  try {
    const expansion = await expansionsRepository.getExpansionBySlug(slug)
    if (!expansion) {
      return c.json({ error: 'Expansion not found' }, 404)
    }

    const result = await tcgdexPricingService.syncExpansionPrices(expansion.id)
    const updated = await expansionsRepository.getExpansionById(expansion.id)

    return c.json({
      success: true,
      expansion: updated,
      ...result,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to sync expansion prices' }, 500)
  }
})

// POST /api/tcg/expansions/:slug/scrape-ligapokemon
tcgRoutes.post('/expansions/:slug/scrape-ligapokemon', async (c) => {
  const slug = c.req.param('slug')
  try {
    const expansion = await expansionsRepository.getExpansionBySlug(slug)
    if (!expansion) {
      return c.json({ error: 'Expansion not found' }, 404)
    }

    const body = await c.req.json().catch(() => ({}))
    const code = body?.code
    const force = Boolean(body?.force)

    const result = await ligapokemonService.scrapeExpansionPrices(expansion.id, {
      codeOverride: code,
      force,
    })

    const updated = await expansionsRepository.getExpansionById(expansion.id)

    return c.json({
      ...result,
      expansion: updated,
    })
  } catch (error: any) {
    return c.json({ error: error?.message || 'Failed to scrape LigaPokémon' }, 500)
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
