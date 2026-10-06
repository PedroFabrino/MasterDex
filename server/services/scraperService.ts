import * as cheerio from 'cheerio'
import { investmentService } from './investmentService.js'
import type { Expansion, Card, InvestmentMetrics } from '../../shared/types.js'

export interface ParsedExpansionResult {
  expansion: Omit<Expansion, 'id'> & { id?: string }
  cards: Array<Omit<Card, 'id' | 'expansionId'> & { id?: string }>
  metrics: InvestmentMetrics
}

export class ScraperService {
  parseExpansionHtml(html: string, url: string): ParsedExpansionResult {
    const $ = cheerio.load(html)

    // 1. Extract Base Count
    let baseCount = 0
    const scriptMatch = html.match(/var\s+_officialCards\s*=\s*(\d+);/)
    if (scriptMatch && scriptMatch[1]) {
      baseCount = parseInt(scriptMatch[1], 10)
    }

    if (!baseCount) {
      // Fallback: look for "XX base" in text
      const baseTextMatch = html.match(/(\d+)\s+base/i)
      if (baseTextMatch && baseTextMatch[1]) {
        baseCount = parseInt(baseTextMatch[1], 10)
      }
    }

    // 2. Extract Expansion Name & Series & Slug
    let name = $('h1').first().text().trim()
    if (!name) {
      const title = $('title').text().trim()
      name = title.split(':')[0]?.trim() || 'Expansão Pokémon TCG'
    }

    const cleanUrl = url.split('?')[0].replace(/\/+$/, '')
    const urlParts = cleanUrl.split('/')
    const slug = urlParts[urlParts.length - 1] || 'expansion'
    const seriesSlug = urlParts[urlParts.length - 2] || null
    const series = seriesSlug
      ? seriesSlug.charAt(0).toUpperCase() + seriesSlug.slice(1).replace(/-/g, ' ')
      : null

    // 3. Extract Cards
    const parsedCardsMap = new Map<number, Omit<Card, 'id' | 'expansionId'> & { id?: string }>()

    $('[data-card-id], [data-card-local-id], [data-card-preview-item]').each((_, el) => {
      const $el = $(el)
      const localIdAttr = $el.attr('data-card-local-id')
      if (!localIdAttr) return

      const localId = parseInt(localIdAttr, 10)
      if (isNaN(localId)) return

      const cardName =
        $el.attr('data-card-name') ||
        $el.attr('data-card-preview-name') ||
        $el.find('h2, h3, .card-name').first().text().trim() ||
        `Card #${localId}`

      const rawPrice = $el.attr('data-card-price')
      const marketPrice = rawPrice ? parseFloat(rawPrice) : 0

      const rarity = $el.attr('data-card-rarity') || 'unknown'
      const imageUrl = $el.attr('data-card-image') || $el.attr('data-card-preview-image') || null
      const types = $el.attr('data-card-types') || null
      const isSecret = baseCount > 0 ? localId > baseCount : false

      // Keep most detailed entry for card
      if (!parsedCardsMap.has(localId) || marketPrice > (parsedCardsMap.get(localId)?.marketPrice || 0)) {
        parsedCardsMap.set(localId, {
          localId,
          name: cardName,
          rarity,
          imageUrl,
          marketPrice: isNaN(marketPrice) ? 0 : marketPrice,
          isSecret,
          types,
        })
      }
    })

    const allCards = Array.from(parsedCardsMap.values()).sort((a, b) => a.localId - b.localId)

    // Fallback base count if still 0
    if (baseCount === 0 && allCards.length > 0) {
      baseCount = Math.max(...allCards.map((c) => c.localId))
    }

    // Refresh isSecret based on resolved base count
    for (const card of allCards) {
      card.isSecret = card.localId > baseCount
    }

    const secretCards = allCards.filter((c) => c.isSecret)
    const metrics = investmentService.calculateMetrics(baseCount, secretCards)

    // Determine Top Chase Card
    let chaseCardName: string | null = null
    let chaseCardPrice: number | null = null

    if (secretCards.length > 0) {
      const sortedSecrets = [...secretCards].sort((a, b) => b.marketPrice - a.marketPrice)
      chaseCardName = sortedSecrets[0].name
      chaseCardPrice = sortedSecrets[0].marketPrice
    }

    return {
      expansion: {
        name,
        slug,
        series,
        url: cleanUrl,
        baseCount,
        secretCount: secretCards.length,
        investmentScore: metrics.investmentScore,
        chaseCardName,
        chaseCardPrice,
        totalSecretPoolValue: metrics.secretPoolValue,
        avgSecretPrice: metrics.avgSecretPrice,
        lastScrapedAt: Date.now(),
      },
      cards: allCards,
      metrics,
    }
  }

  async fetchAndParseExpansion(url: string): Promise<ParsedExpansionResult> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch expansion webpage (status ${response.status})`)
    }

    const html = await response.text()
    return this.parseExpansionHtml(html, url)
  }
}

export const scraperService = new ScraperService()
