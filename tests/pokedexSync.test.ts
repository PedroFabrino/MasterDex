import { describe, it, expect, vi, afterEach } from 'vitest'
import pokedexData from '../src/data/pokedex.json' with { type: 'json' }
import {
  POKEMON,
  DEX_REGIONS,
  getPagePokemon,
  getTotalPages,
  getRegionForPage,
} from '../src/data/pokemon.js'
import { app } from '../server/app.js'
import {
  checkPokeApiParity,
  getLocalPokedexCount,
} from '../server/routes/pokedexRoutes.js'
import { runSyncPokedex } from '../server/scripts/syncPokedex.js'

describe('Pokédex Dataset & 9-Region Pagination', () => {
  it('contains exactly 1025 official species from #001 Bulbasaur to #1025 Pecharunt', () => {
    expect(pokedexData.length).toBe(1025)
    expect(POKEMON.length).toBe(1025)

    expect(pokedexData[0]).toEqual({
      id: 1,
      name: 'Bulbasaur',
      spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
    })

    expect(pokedexData[1024]).toEqual({
      id: 1025,
      name: 'Pecharunt',
      spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1025.png',
    })

    // Sequential IDs with no gaps
    for (let i = 0; i < 1025; i++) {
      expect(pokedexData[i].id).toBe(i + 1)
      expect(typeof pokedexData[i].name).toBe('string')
      expect(pokedexData[i].name.length).toBeGreaterThan(0)
      expect(pokedexData[i].spriteUrl).toBe(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i + 1}.png`
      )
    }
  })

  it('calculates exactly 65 pages in 4x4 (16 cards/page) grid layout', () => {
    expect(getTotalPages()).toBe(65)

    const page1 = getPagePokemon(1)
    expect(page1.length).toBe(16)
    expect(page1[0].id).toBe(1)
    expect(page1[15].id).toBe(16)

    const page64 = getPagePokemon(64)
    expect(page64.length).toBe(16)
    expect(page64[0].id).toBe(1009)
    expect(page64[15].id).toBe(1024)

    const page65 = getPagePokemon(65)
    expect(page65.length).toBe(1)
    expect(page65[0].id).toBe(1025)
    expect(page65[0].name).toBe('Pecharunt')
  })

  it('defines all 9 regions with accurate dex and page ranges', () => {
    expect(DEX_REGIONS.length).toBe(9)

    const regionIds = DEX_REGIONS.map((r) => r.id)
    expect(regionIds).toEqual([
      'kanto',
      'johto',
      'hoenn',
      'sinnoh',
      'unova',
      'kalos',
      'alola',
      'galar',
      'paldea',
    ])

    const kanto = DEX_REGIONS.find((r) => r.id === 'kanto')!
    expect(kanto.dexStart).toBe(1)
    expect(kanto.dexEnd).toBe(151)
    expect(kanto.pageStart).toBe(1)
    expect(kanto.pageEnd).toBe(10)

    const johto = DEX_REGIONS.find((r) => r.id === 'johto')!
    expect(johto.dexStart).toBe(152)
    expect(johto.dexEnd).toBe(251)
    expect(johto.pageStart).toBe(11)
    expect(johto.pageEnd).toBe(16)

    const hoenn = DEX_REGIONS.find((r) => r.id === 'hoenn')!
    expect(hoenn.dexStart).toBe(252)
    expect(hoenn.dexEnd).toBe(386)
    expect(hoenn.pageStart).toBe(16)
    expect(hoenn.pageEnd).toBe(25)

    const sinnoh = DEX_REGIONS.find((r) => r.id === 'sinnoh')!
    expect(sinnoh.dexStart).toBe(387)
    expect(sinnoh.dexEnd).toBe(493)
    expect(sinnoh.pageStart).toBe(25)
    expect(sinnoh.pageEnd).toBe(31)

    const unova = DEX_REGIONS.find((r) => r.id === 'unova')!
    expect(unova.dexStart).toBe(494)
    expect(unova.dexEnd).toBe(649)
    expect(unova.pageStart).toBe(31)
    expect(unova.pageEnd).toBe(41)

    const kalos = DEX_REGIONS.find((r) => r.id === 'kalos')!
    expect(kalos.dexStart).toBe(650)
    expect(kalos.dexEnd).toBe(721)
    expect(kalos.pageStart).toBe(41)
    expect(kalos.pageEnd).toBe(46)

    const alola = DEX_REGIONS.find((r) => r.id === 'alola')!
    expect(alola.dexStart).toBe(722)
    expect(alola.dexEnd).toBe(809)
    expect(alola.pageStart).toBe(46)
    expect(alola.pageEnd).toBe(51)

    const galar = DEX_REGIONS.find((r) => r.id === 'galar')!
    expect(galar.dexStart).toBe(810)
    expect(galar.dexEnd).toBe(905)
    expect(galar.pageStart).toBe(51)
    expect(galar.pageEnd).toBe(57)

    const paldea = DEX_REGIONS.find((r) => r.id === 'paldea')!
    expect(paldea.dexStart).toBe(906)
    expect(paldea.dexEnd).toBe(1025)
    expect(paldea.pageStart).toBe(57)
    expect(paldea.pageEnd).toBe(65)
  })

  it('maps pages to valid DexRegions', () => {
    expect(getRegionForPage(1).id).toBe('kanto')
    expect(getRegionForPage(10).id).toBe('kanto')
    expect(getRegionForPage(11).id).toBe('johto')
    expect(getRegionForPage(35).id).toBe('unova')
    expect(getRegionForPage(65).id).toBe('paldea')
  })
})

describe('Pokédex Sync Check API & Script', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads local dataset count as 1025', () => {
    expect(getLocalPokedexCount()).toBe(1025)
  })

  it('checks parity with PokeAPI species count', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 1025 }),
    } as Response)

    const result = await checkPokeApiParity()
    expect(result.parity).toBe(true)
    expect(result.status).toBe('synced')
    expect(result.speciesCount).toBe(1025)
    expect(result.localCount).toBe(1025)
  })

  it('detects disparity when PokeAPI species count differs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 1026 }),
    } as Response)

    const result = await checkPokeApiParity()
    expect(result.parity).toBe(false)
    expect(result.status).toBe('out_of_sync')
    expect(result.speciesCount).toBe(1026)
  })

  it('responds with 200 via GET /api/pokedex/sync-check', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 1025 }),
    } as Response)

    const res = await app.request('/api/pokedex/sync-check')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.status).toBe('synced')
    expect(body.speciesCount).toBe(1025)
    expect(body.localCount).toBe(1025)
    expect(body.parity).toBe(true)
  })

  it('responds with 502 via GET /api/pokedex/sync-check on upstream failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'))

    const res = await app.request('/api/pokedex/sync-check')
    expect(res.status).toBe(502)
    const body = (await res.json()) as any
    expect(body.status).toBe('error')
    expect(body.parity).toBe(false)
    expect(body.message).toContain('Network offline')
  })

  it('executes runSyncPokedex script successfully with parity', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 1025 }),
    } as Response)

    const result = await runSyncPokedex()
    expect(result.success).toBe(true)
    expect(result.parity).toBe(true)
    expect(result.speciesCount).toBe(1025)
    expect(result.localCount).toBe(1025)
  })
})
