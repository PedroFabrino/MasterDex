import fs from 'node:fs'
import { investmentService } from './investmentService.js'

export interface CardRarityResolution {
  rarity: string
  isSecret: boolean
  tier: number
}

export class TcgDexRarityService {
  private cardMetadataMap: Map<string, { rarity: string; isSecret: boolean }> = new Map()
  private metadataLoaded = false

  private ensureMetadataLoaded() {
    if (this.metadataLoaded) return
    try {
      const serverDataPath = new URL('../data/tcgdexSetCards.json', import.meta.url)
      const fallbackPath = new URL('../../src/data/tcgdexSetCards.json', import.meta.url)
      const targetPath = fs.existsSync(serverDataPath) ? serverDataPath : fallbackPath
      if (fs.existsSync(targetPath)) {
        const raw = fs.readFileSync(targetPath, 'utf-8')

        const cards = JSON.parse(raw) as Array<{ id: string; rarity?: string; isSecret?: boolean }>
        for (const c of cards) {
          if (c.id) {
            this.cardMetadataMap.set(c.id.toLowerCase(), {
              rarity: c.rarity || 'Common',
              isSecret: Boolean(c.isSecret),
            })
          }
        }
      }
    } catch (err) {
      console.warn('Could not load tcgdexSetCards.json metadata:', err)
    }
    this.metadataLoaded = true
  }

  getCardRarity(
    card: { id: string; name: string; localId: string },
    setTotal?: number
  ): CardRarityResolution {
    this.ensureMetadataLoaded()
    const known = this.cardMetadataMap.get(card.id.toLowerCase())
    if (known) {
      let tier = investmentService.getRarityTier(known.rarity, known.isSecret)
      if (tier < 2 && /\b(ex|gx|v|vmax|vstar|ace spec)\b/i.test(card.name)) {
        tier = 2
      }
      return { rarity: known.rarity, isSecret: known.isSecret, tier }
    }

    let isSecret = false
    let rarity = 'Common'
    const localNum = parseInt(card.localId, 10)
    if (setTotal && !isNaN(localNum) && localNum > setTotal) {
      isSecret = true
      rarity = 'Secret Rare'
    } else if (/\b(illustration|special art|sir|sar|ar)\b/i.test(card.name)) {
      rarity = 'Illustration Rare'
    } else if (/\b(ex|gx|v|vmax|vstar|ace spec)\b/i.test(card.name)) {
      rarity = 'Ultra Rare'
    } else if (/\b(holo|radiant|shining|rare)\b/i.test(card.name)) {
      rarity = 'Rare Holo'
    }

    let tier = investmentService.getRarityTier(rarity, isSecret)
    if (tier < 2 && /\b(ex|gx|v|vmax|vstar|ace spec)\b/i.test(card.name)) {
      tier = 2
      rarity = 'Ultra Rare'
    }

    return { rarity, isSecret, tier }
  }
}

export const tcgdexRarityService = new TcgDexRarityService()
