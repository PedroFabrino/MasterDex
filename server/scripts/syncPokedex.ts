import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pokedexPath = path.resolve(__dirname, '../../src/data/pokedex.json')

export async function runSyncPokedex(): Promise<{
  success: boolean
  parity: boolean
  speciesCount: number
  localCount: number
}> {
  console.log('[sync:pokedex] Checking local dataset...')
  let localCount = 0
  try {
    const raw = fs.readFileSync(pokedexPath, 'utf-8')
    const data = JSON.parse(raw)
    localCount = Array.isArray(data) ? data.length : 0
  } catch (err: any) {
    console.error(`[sync:pokedex] Failed to read ${pokedexPath}:`, err.message)
    return { success: false, parity: false, speciesCount: 0, localCount: 0 }
  }

  console.log(`[sync:pokedex] Local dataset contains ${localCount} species.`)
  console.log('[sync:pokedex] Querying PokeAPI species count...')

  try {
    const pokeApiBase = process.env.POKEAPI_URL || 'https://pokeapi.co/api/v2'
    const res = await fetch(`${pokeApiBase}/pokemon-species?limit=1`)
    if (!res.ok) {
      throw new Error(`PokeAPI responded with HTTP ${res.status}`)
    }
    const data = (await res.json()) as { count: number }
    const speciesCount = data.count
    const parity = speciesCount === localCount

    console.log(`[sync:pokedex] PokeAPI reports ${speciesCount} species.`)
    if (parity) {
      console.log(`[sync:pokedex] [SUCCESS] Parity verified! Both PokeAPI and local dataset have ${speciesCount} species.`)
      return { success: true, parity: true, speciesCount, localCount }
    } else {
      console.warn(`[sync:pokedex] [WARNING] Parity mismatch! PokeAPI has ${speciesCount} vs local ${localCount}.`)
      return { success: true, parity: false, speciesCount, localCount }
    }
  } catch (err: any) {
    console.error('[sync:pokedex] [ERROR] Failed to query PokeAPI:', err.message)
    return { success: false, parity: false, speciesCount: 0, localCount }
  }
}

// Execute directly if run as CLI script
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const result = await runSyncPokedex()
  if (!result.success || !result.parity) {
    process.exit(1)
  }
}
