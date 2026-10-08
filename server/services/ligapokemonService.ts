import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import { expansionsRepository } from '../repositories/expansionsRepository.js'
import { pricingRepository } from '../repositories/pricingRepository.js'
import { investmentService } from './investmentService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const setsMapPath = path.resolve(__dirname, '../data/ligapokemonSets.json')

let setsMapCache: Record<string, string> | null = null

function loadLigapokemonSetsMap(): Record<string, string> {
  if (setsMapCache) return setsMapCache
  try {
    if (fs.existsSync(setsMapPath)) {
      const raw = fs.readFileSync(setsMapPath, 'utf-8')
      setsMapCache = JSON.parse(raw) as Record<string, string>
      return setsMapCache
    }
  } catch (err) {
    console.warn('[ligapokemonService] Could not load ligapokemonSets.json:', err)
  }
  setsMapCache = {}
  return setsMapCache
}

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7

export class LigaPokemonService {
  resolveEditionCode(expansion: {
    id: string
    slug: string
    name?: string | null
    ligapokemonCode?: string | null
  }): string | null {
    if (expansion.ligapokemonCode && expansion.ligapokemonCode.trim()) {
      return expansion.ligapokemonCode.trim().toUpperCase()
    }

    const map = loadLigapokemonSetsMap()
    const idKey = expansion.id.toLowerCase()
    if (map[idKey]) return map[idKey].toUpperCase()

    const slugKey = expansion.slug.toLowerCase()
    if (map[slugKey]) return map[slugKey].toUpperCase()

    // Smart heuristic for Scarlet & Violet / Sword & Shield standard numbering
    const svMatch = idKey.match(/^sv0?(\d+)$/)
    if (svMatch) {
      return `SV${svMatch[1]}`
    }

    return null
  }

  getSearchUrl(editionCode: string): string {
    return `https://www.ligapokemon.com.br/?view=cards/search&card=ed=${encodeURIComponent(editionCode)}`
  }

  async scrapeExpansionPrices(
    expansionId: string,
    options?: { force?: boolean; htmlOverride?: string; codeOverride?: string }
  ): Promise<{
    success: boolean
    cached: boolean
    cardsCount: number
    warning?: string
  }> {
    const expansion = await expansionsRepository.getExpansionById(expansionId)
    if (!expansion) {
      throw new Error(`Expansion not found: ${expansionId}`)
    }

    const code =
      options?.codeOverride ||
      this.resolveEditionCode(expansion)

    if (!code) {
      return {
        success: false,
        cached: false,
        cardsCount: 0,
        warning: 'No LigaPokémon edition code mapped for expansion.',
      }
    }

    // Persist code override if passed
    if (options?.codeOverride && options.codeOverride !== expansion.ligapokemonCode) {
      await expansionsRepository.updateLigapokemonCode(expansion.id, options.codeOverride)
    }

    const allCards = await expansionsRepository.getAllCardsByExpansionId(expansionId)
    if (allCards.length === 0) {
      return { success: true, cached: false, cardsCount: 0 }
    }

    // 7-day TTL check
    const cardIds = allCards.map((c) => c.id)
    const existingPrices = await pricingRepository.getPricesByCardIds(cardIds)
    const now = Date.now()

    let hasRecentCache = false
    let cachedCount = 0
    for (const [_, prices] of existingPrices) {
      const ligaPrice = prices.find((p) => p.provider === 'ligapokemon')
      if (ligaPrice) {
        cachedCount++
        if (now - ligaPrice.recordedAt.getTime() < SEVEN_DAYS_MS) {
          hasRecentCache = true
        }
      }
    }

    if (hasRecentCache && cachedCount > 0 && !options?.force) {
      return {
        success: true,
        cached: true,
        cardsCount: cachedCount,
      }
    }

    // Fetch HTML
    let html = options?.htmlOverride || ''
    if (!html) {
      try {
        const url = this.getSearchUrl(code)
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
          },
          signal: AbortSignal.timeout(6000),
        })

        if (!res.ok) {
          return {
            success: false,
            cached: false,
            cardsCount: 0,
            warning: `LigaPokémon returned HTTP ${res.status}. Fallback to global prices.`,
          }
        }

        html = await res.text()
      } catch (err: any) {
        return {
          success: false,
          cached: false,
          cardsCount: 0,
          warning: `LigaPokémon fetch failed (${err?.message || 'timeout'}). Fallback to global prices.`,
        }
      }
    }

    // Anti-bot check
    if (
      html.includes('cf-browser-verification') ||
      html.includes('challenge-platform') ||
      html.includes('challenge-running') ||
      html.includes('cf-challenge') ||
      html.includes('Attention Required!')
    ) {
      return {
        success: false,
        cached: false,
        cardsCount: 0,
        warning: 'LigaPokémon Cloudflare challenge detected. Fallback to global prices.',
      }
    }

    const $ = cheerio.load(html)
    let parsedCount = 0
    const cardMapByNum = new Map<number, typeof allCards[0]>()
    const cardMapByName = new Map<string, typeof allCards[0]>()
    for (const c of allCards) {
      cardMapByNum.set(c.localId, c)
      cardMapByName.set(c.name.trim().toLowerCase(), c)
    }

    // Parse LigaPokémon card entries
    const items = $('[data-card-id], [data-card-preview-item], .item-card, .card-item, tr[id^="card_"]').toArray()
    for (const el of items) {
      const $el = $(el)
      const rawPrice =
        $el.attr('data-card-price') ||
        $el.find('.preco-menor, .card-price, .item-preco').text()

      const rawNum =
        $el.attr('data-card-local-id') ||
        $el.find('.card-num, .item-num, .num').text()

      const matchNum = rawNum ? rawNum.match(/\d+/) : null
      const localId = matchNum ? parseInt(matchNum[0], 10) : null

      const rawName = $el.find('.nome-ingles, .nome-aux, .card-name').text().trim().toLowerCase()

      let card = localId && cardMapByNum.has(localId) ? cardMapByNum.get(localId) : undefined
      if (!card && rawName && cardMapByName.has(rawName)) {
        card = cardMapByName.get(rawName)
      }

      if (!card) continue

      const matchPrice = rawPrice ? rawPrice.match(/[\d.,]+/) : null
      if (matchPrice) {
        const cleanPrice = parseFloat(matchPrice[0].replace(/\./g, '').replace(',', '.'))
        if (!isNaN(cleanPrice) && cleanPrice > 0) {
          await pricingRepository.upsertPrice({
            cardId: card.id,
            provider: 'ligapokemon',
            nativePrice: cleanPrice,
            currency: 'BRL',
          })
          parsedCount++
        }
      }
    }

    return {
      success: true,
      cached: false,
      cardsCount: parsedCount,
    }
  }
}

export const ligapokemonService = new LigaPokemonService()
