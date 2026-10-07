import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { investmentService } from '../services/investmentService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const setsPath = path.resolve(__dirname, '../../src/data/tcgdexSets.json')
const outputPath = path.resolve(__dirname, '../../src/data/tcgdexSetCards.json')

export interface CompactCard {
  id: string
  expansionId: string
  localId: number
  name: string
  rarity: string
  imageUrl: string | null
  marketPrice: number
  isSecret: boolean
  pokedexId: number | null
}

export async function syncSetCards(): Promise<number> {
  const setsRaw = fs.readFileSync(setsPath, 'utf-8')
  const sets = JSON.parse(setsRaw) as Array<{
    id: string
    name: string
    cardCount?: { total?: number; official?: number }
  }>

  console.log(`[sync:cards] Starting card catalog sync for ${sets.length} expansions...`)
  const batchSize = 15
  const allCards: CompactCard[] = []

  for (let i = 0; i < sets.length; i += batchSize) {
    const chunk = sets.slice(i, i + batchSize)
    const promises = chunk.map(async (set) => {
      try {
        const res = await fetch(`https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(set.id)}`, {
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) return []
        const setData = await res.json()
        const officialCount = set.cardCount?.official || set.cardCount?.total || 9999
        const rawCards = (setData.cards || []) as Array<{
          id: string
          localId: string
          name: string
          image?: string
        }>

        return rawCards.map((c, idx) => {
          const numId = parseInt(c.localId, 10)
          const isSecret = isNaN(numId)
            ? /^(TG|GG|SV|SVP|SWSH|PROMO)/i.test(c.localId)
            : numId > officialCount

          let rarity = 'Common'
          if (isSecret) {
            rarity = 'Secret Rare'
          } else if (/\b(ex|gx|v|vmax|vstar|ace spec)\b/i.test(c.name)) {
            rarity = 'Ultra Rare'
          } else if (/\b(holo|radiant)\b/i.test(c.name)) {
            rarity = 'Rare Holo'
          }

          const imageUrl = c.image
            ? c.image.endsWith('.webp') || c.image.endsWith('.png')
              ? c.image
              : `${c.image}/high.webp`
            : null

          const pokedexId = investmentService.resolvePokemonId(c.name)

          return {
            id: c.id,
            expansionId: set.id,
            localId: isNaN(numId) ? idx + 1 : numId,
            name: c.name,
            rarity,
            imageUrl,
            marketPrice: 0,
            isSecret,
            pokedexId,
          }
        })
      } catch (err: any) {
        console.warn(`[sync:cards] Warning: failed to fetch set ${set.id}:`, err?.message)
        return []
      }
    })

    const chunkResults = await Promise.all(promises)
    for (const cards of chunkResults) {
      allCards.push(...cards)
    }

    console.log(`[sync:cards] Processed ${Math.min(i + batchSize, sets.length)}/${sets.length} sets (${allCards.length} cards)...`)
  }

  fs.writeFileSync(outputPath, JSON.stringify(allCards, null, 2), 'utf-8')
  console.log(`[sync:cards] Successfully written ${allCards.length} cards to ${outputPath}`)
  return allCards.length
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  syncSetCards()
    .then((count) => {
      console.log(`[sync:cards] Finished! Total cards: ${count}`)
      process.exit(0)
    })
    .catch((err) => {
      console.error('[sync:cards] Error:', err)
      process.exit(1)
    })
}
