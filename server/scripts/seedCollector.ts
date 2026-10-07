import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureDatabaseTables } from '../db/index.js'
import { collectorRepository } from '../repositories/collectorRepository.js'

export const PEDRO_PROFILE = {
  id: 'pedro',
  googleId: 'google-pedro-dev',
  email: 'pedro@masterdex.local',
  name: 'Pedro Fabrino',
  avatarUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  seededFromSheet: true,
}

export const PEDRO_SEED_COLLECTION: Array<{
  pokedexId: number
  collected: boolean
  cardId?: string | null
  cardName?: string | null
  cardImageUrl?: string | null
}> = [
  // Gen 1 (Kanto)
  { pokedexId: 1, collected: true, cardId: 'base1-44', cardName: 'Bulbasaur', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/44/high.webp' },
  { pokedexId: 4, collected: true, cardId: 'base1-46', cardName: 'Charmander', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/46/high.webp' },
  { pokedexId: 6, collected: true, cardId: 'base1-4', cardName: 'Charizard', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/4/high.webp' },
  { pokedexId: 7, collected: true, cardId: 'base1-63', cardName: 'Squirtle', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/63/high.webp' },
  { pokedexId: 9, collected: true, cardId: 'base1-2', cardName: 'Blastoise', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/2/high.webp' },
  { pokedexId: 25, collected: true, cardId: 'base1-58', cardName: 'Pikachu', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/58/high.webp' },
  { pokedexId: 94, collected: true, cardId: 'base1-20', cardName: 'Gengar', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/20/high.webp' },
  { pokedexId: 130, collected: true, cardId: 'base1-6', cardName: 'Gyarados', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/6/high.webp' },
  { pokedexId: 133, collected: true, cardId: 'base1-55', cardName: 'Eevee', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/55/high.webp' },
  { pokedexId: 143, collected: true, cardId: 'base1-11', cardName: 'Snorlax', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/11/high.webp' },
  { pokedexId: 149, collected: true, cardId: 'base1-19', cardName: 'Dragonite', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/19/high.webp' },
  { pokedexId: 150, collected: true, cardId: 'base1-10', cardName: 'Mewtwo', cardImageUrl: 'https://assets.tcgdex.net/en/base/base1/10/high.webp' },
  { pokedexId: 151, collected: true, cardId: 'me-151', cardName: 'Mew ex', cardImageUrl: 'https://assets.tcgdex.net/en/me/me/151/high.webp' },

  // Gen 2 (Johto)
  { pokedexId: 157, collected: true, cardId: 'neo1-17', cardName: 'Typhlosion', cardImageUrl: 'https://assets.tcgdex.net/en/neo/neo1/17/high.webp' },
  { pokedexId: 196, collected: true, cardId: 'neo2-1', cardName: 'Espeon', cardImageUrl: 'https://assets.tcgdex.net/en/neo/neo2/1/high.webp' },
  { pokedexId: 197, collected: true, cardId: 'neo2-13', cardName: 'Umbreon', cardImageUrl: 'https://assets.tcgdex.net/en/neo/neo2/13/high.webp' },
  { pokedexId: 212, collected: true, cardId: 'neo2-10', cardName: 'Scizor', cardImageUrl: 'https://assets.tcgdex.net/en/neo/neo2/10/high.webp' },
  { pokedexId: 248, collected: true, cardId: 'neo2-12', cardName: 'Tyranitar', cardImageUrl: 'https://assets.tcgdex.net/en/neo/neo2/12/high.webp' },
  { pokedexId: 249, collected: true, cardId: 'neo1-9', cardName: 'Lugia', cardImageUrl: 'https://assets.tcgdex.net/en/neo/neo1/9/high.webp' },
  { pokedexId: 250, collected: true, cardId: 'neo3-7', cardName: 'Ho-Oh', cardImageUrl: 'https://assets.tcgdex.net/en/neo/neo3/7/high.webp' },

  // Gen 3 (Hoenn)
  { pokedexId: 257, collected: true, cardId: 'rs-3', cardName: 'Blaziken', cardImageUrl: 'https://assets.tcgdex.net/en/ex/ex1/3/high.webp' },
  { pokedexId: 282, collected: true, cardId: 'rs-7', cardName: 'Gardevoir', cardImageUrl: 'https://assets.tcgdex.net/en/ex/ex1/7/high.webp' },
  { pokedexId: 330, collected: true, cardId: 'dr-4', cardName: 'Flygon', cardImageUrl: 'https://assets.tcgdex.net/en/ex/ex3/4/high.webp' },
  { pokedexId: 350, collected: true, cardId: 'em-11', cardName: 'Milotic', cardImageUrl: 'https://assets.tcgdex.net/en/ex/ex9/11/high.webp' },
  { pokedexId: 384, collected: true, cardId: 'dr-9', cardName: 'Rayquaza', cardImageUrl: 'https://assets.tcgdex.net/en/ex/ex3/9/high.webp' },
  { pokedexId: 385, collected: true, cardId: 'hl-8', cardName: 'Jirachi', cardImageUrl: 'https://assets.tcgdex.net/en/ex/ex5/8/high.webp' },

  // Gen 4 (Sinnoh)
  { pokedexId: 445, collected: true, cardId: 'dp4-9', cardName: 'Garchomp', cardImageUrl: 'https://assets.tcgdex.net/en/dp/dp4/9/high.webp' },
  { pokedexId: 448, collected: true, cardId: 'dp1-6', cardName: 'Lucario', cardImageUrl: 'https://assets.tcgdex.net/en/dp/dp1/6/high.webp' },
  { pokedexId: 483, collected: true, cardId: 'dp1-1', cardName: 'Dialga', cardImageUrl: 'https://assets.tcgdex.net/en/dp/dp1/1/high.webp' },
  { pokedexId: 484, collected: true, cardId: 'dp1-11', cardName: 'Palkia', cardImageUrl: 'https://assets.tcgdex.net/en/dp/dp1/11/high.webp' },
  { pokedexId: 487, collected: true, cardId: 'dp5-4', cardName: 'Giratina', cardImageUrl: 'https://assets.tcgdex.net/en/dp/dp5/4/high.webp' },
  { pokedexId: 493, collected: true, cardId: 'pl4-1', cardName: 'Arceus', cardImageUrl: 'https://assets.tcgdex.net/en/pl/pl4/1/high.webp' },

  // Gen 5 (Unova)
  { pokedexId: 571, collected: true, cardId: 'bw4-71', cardName: 'Zoroark', cardImageUrl: 'https://assets.tcgdex.net/en/bw/bw4/71/high.webp' },
  { pokedexId: 643, collected: true, cardId: 'bw1-113', cardName: 'Reshiram', cardImageUrl: 'https://assets.tcgdex.net/en/bw/bw1/113/high.webp' },
  { pokedexId: 644, collected: true, cardId: 'bw1-114', cardName: 'Zekrom', cardImageUrl: 'https://assets.tcgdex.net/en/bw/bw1/114/high.webp' },

  // Gen 6 (Kalos)
  { pokedexId: 658, collected: true, cardId: 'xy1-41', cardName: 'Greninja', cardImageUrl: 'https://assets.tcgdex.net/en/xy/xy1/41/high.webp' },
  { pokedexId: 700, collected: true, cardId: 'xy3-72', cardName: 'Sylveon', cardImageUrl: 'https://assets.tcgdex.net/en/xy/xy3/72/high.webp' },
  { pokedexId: 716, collected: true, cardId: 'xy1-96', cardName: 'Xerneas', cardImageUrl: 'https://assets.tcgdex.net/en/xy/xy1/96/high.webp' },
  { pokedexId: 717, collected: true, cardId: 'xy1-78', cardName: 'Yveltal', cardImageUrl: 'https://assets.tcgdex.net/en/xy/xy1/78/high.webp' },

  // Gen 7 (Alola)
  { pokedexId: 724, collected: true, cardId: 'sm1-11', cardName: 'Decidueye', cardImageUrl: 'https://assets.tcgdex.net/en/sm/sm1/11/high.webp' },
  { pokedexId: 778, collected: true, cardId: 'sm2-58', cardName: 'Mimikyu', cardImageUrl: 'https://assets.tcgdex.net/en/sm/sm2/58/high.webp' },
  { pokedexId: 791, collected: true, cardId: 'sm1-89', cardName: 'Solgaleo-GX', cardImageUrl: 'https://assets.tcgdex.net/en/sm/sm1/89/high.webp' },
  { pokedexId: 792, collected: true, cardId: 'sm1-66', cardName: 'Lunala-GX', cardImageUrl: 'https://assets.tcgdex.net/en/sm/sm1/66/high.webp' },

  // Gen 8 (Galar)
  { pokedexId: 823, collected: true, cardId: 'swsh1-151', cardName: 'Corviknight', cardImageUrl: 'https://assets.tcgdex.net/en/swsh/swsh1/151/high.webp' },
  { pokedexId: 887, collected: true, cardId: 'swsh2-91', cardName: 'Dragapult', cardImageUrl: 'https://assets.tcgdex.net/en/swsh/swsh2/91/high.webp' },
  { pokedexId: 888, collected: true, cardId: 'swsh1-138', cardName: 'Zacian V', cardImageUrl: 'https://assets.tcgdex.net/en/swsh/swsh1/138/high.webp' },
  { pokedexId: 889, collected: true, cardId: 'swsh1-139', cardName: 'Zamazenta V', cardImageUrl: 'https://assets.tcgdex.net/en/swsh/swsh1/139/high.webp' },

  // Gen 9 (Paldea)
  { pokedexId: 908, collected: true, cardId: 'sv1-15', cardName: 'Meowscarada ex', cardImageUrl: 'https://assets.tcgdex.net/en/sv/sv1/15/high.webp' },
  { pokedexId: 959, collected: true, cardId: 'sv2-105', cardName: 'Tinkaton ex', cardImageUrl: 'https://assets.tcgdex.net/en/sv/sv2/105/high.webp' },
  { pokedexId: 1005, collected: true, cardId: 'sv4-124', cardName: 'Roaring Moon ex', cardImageUrl: 'https://assets.tcgdex.net/en/sv/sv4/124/high.webp' },
  { pokedexId: 1006, collected: true, cardId: 'sv4-89', cardName: 'Iron Valiant ex', cardImageUrl: 'https://assets.tcgdex.net/en/sv/sv4/89/high.webp' },
  { pokedexId: 1007, collected: true, cardId: 'sv1-125', cardName: 'Koraidon ex', cardImageUrl: 'https://assets.tcgdex.net/en/sv/sv1/125/high.webp' },
  { pokedexId: 1008, collected: true, cardId: 'sv1-81', cardName: 'Miraidon ex', cardImageUrl: 'https://assets.tcgdex.net/en/sv/sv1/81/high.webp' },
  { pokedexId: 1025, collected: true, cardId: 'sv6-95', cardName: 'Pecharunt ex', cardImageUrl: 'https://assets.tcgdex.net/en/sv/sv6/95/high.webp' },
]

export async function seedProfileFromDataset(userId: string): Promise<number> {
  const artMap = new Map(PEDRO_SEED_COLLECTION.map((c) => [c.pokedexId, c]))

  let finalEntries: Array<{
    pokedexId: number
    collected: boolean
    cardId?: string | null
    cardName?: string | null
    cardImageUrl?: string | null
  }> = []

  try {
    const seedPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../src/data/collectorSeed.json'
    )
    const raw = fs.readFileSync(seedPath, 'utf-8')
    const sheetEntries = JSON.parse(raw) as Array<{ pokedexId: number; name: string; collected: boolean }>

    finalEntries = sheetEntries.map((e) => {
      const art = artMap.get(e.pokedexId)
      return {
        pokedexId: e.pokedexId,
        collected: e.collected,
        cardId: art?.cardId ?? null,
        cardName: art?.cardName ?? (e.collected ? e.name : null),
        cardImageUrl: art?.cardImageUrl ?? null,
      }
    })
  } catch (err: any) {
    console.warn('[seed:collector] Falling back to baseline collection:', err.message)
    finalEntries = PEDRO_SEED_COLLECTION
  }

  const collectedCount = finalEntries.filter((p) => p.collected).length
  await collectorRepository.batchUpsertUserPokemon(userId, finalEntries)
  await collectorRepository.markProfileSeeded(userId)
  return collectedCount
}

export async function runSeedCollector(): Promise<{
  success: boolean
  profile: any
  seededCount: number
  totalProcessed: number
}> {
  console.log('[seed:collector] Ensuring database tables...')
  await ensureDatabaseTables()

  console.log(`[seed:collector] Upserting profile "${PEDRO_PROFILE.id}" (${PEDRO_PROFILE.name})...`)
  const profile = await collectorRepository.upsertProfile(PEDRO_PROFILE)

  const seededCount = await seedProfileFromDataset(PEDRO_PROFILE.id)
  console.log(`[seed:collector] [SUCCESS] Profile "${profile.id}" populated with ${seededCount} collected Pokémon in local.db.`)

  return {
    success: true,
    profile,
    seededCount,
    totalProcessed: 1025,
  }
}

// Execute directly if run as CLI script
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runSeedCollector()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed:collector] [ERROR]', err)
      process.exit(1)
    })
}
