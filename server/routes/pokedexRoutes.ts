import { Hono } from 'hono'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const pokedexRoutes = new Hono()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pokedexPath = path.resolve(__dirname, '../../src/data/pokedex.json')

export function getLocalPokedexCount(): number {
  try {
    const raw = fs.readFileSync(pokedexPath, 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data.length : 1025
  } catch {
    return 1025
  }
}

export async function checkPokeApiParity(pokeApiUrl: string = 'https://pokeapi.co/api/v2') {
  const localCount = getLocalPokedexCount()
  const res = await fetch(`${pokeApiUrl}/pokemon-species?limit=1`)
  if (!res.ok) {
    throw new Error(`PokeAPI request failed with status ${res.status}`)
  }
  const data = (await res.json()) as { count: number }
  const speciesCount = data.count
  const parity = speciesCount === localCount

  return {
    status: parity ? 'synced' : 'out_of_sync',
    speciesCount,
    localCount,
    parity,
  }
}

pokedexRoutes.get('/sync-check', async (c) => {
  try {
    const pokeApiBase = process.env.POKEAPI_URL || 'https://pokeapi.co/api/v2'
    const result = await checkPokeApiParity(pokeApiBase)
    return c.json(result)
  } catch (error: any) {
    return c.json(
      {
        status: 'error',
        speciesCount: 0,
        localCount: getLocalPokedexCount(),
        parity: false,
        message: error?.message || 'Sync check failed',
      },
      502
    )
  }
})
