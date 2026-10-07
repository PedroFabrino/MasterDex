import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { app } from '../server/app.js'
import { ensureDatabaseTables } from '../server/db/index.js'
import { sheetSeedService } from '../server/services/sheetSeedService.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { runSeedCollector, PEDRO_PROFILE, PEDRO_SEED_COLLECTION } from '../server/scripts/seedCollector.js'

describe('Collection Persistence & In-App Import/Backup (Ticket #14 / Issue #9)', () => {
  beforeAll(async () => {
    await ensureDatabaseTables()
  })

  describe('Developer CLI Seed Script (npm run seed:collector)', () => {
    it('populates profile pedro in SQLite/libSQL with 50+ iconic collected cards', async () => {
      const result = await runSeedCollector()
      expect(result.success).toBe(true)
      expect(result.profile.id).toBe('pedro')
      expect(result.profile.name).toBe('Pedro Fabrino')
      expect(result.seededCount).toBeGreaterThanOrEqual(50)

      // Verify via GET /api/collection?userId=pedro
      const res = await app.request('/api/collection?userId=pedro')
      expect(res.status).toBe(200)
      const data = (await res.json()) as any

      expect(data.count).toBe(result.seededCount)
      expect(data.collection[1]).toBe(true) // Bulbasaur
      expect(data.collection[151]).toBe(true) // Mew
      expect(data.collection[1025]).toBe(true) // Pecharunt

      // Check card artwork metadata attached to Mew (#151)
      const mew = data.items[151]
      expect(mew.collected).toBe(true)
      expect(mew.cardId).toBe('me-151')
      expect(mew.cardName).toBe('Mew ex')
      expect(mew.cardImageUrl).toContain('tcgdex.net')
    })
  })

  describe('CSV & Google Sheet Parser and Serializer', () => {
    it('parses MasterDex CSV with card metadata and quotes', () => {
      const sampleCsv = `Pokedex,Name,Collected,CardId,CardName,CardImageUrl
#0001,"Bulbasaur",TRUE,"base1-44","Bulbasaur","https://assets.tcgdex.net/44.webp"
#0006,"Charizard",TRUE,"base1-4","Charizard","https://assets.tcgdex.net/4.webp"
#0007,"Squirtle",FALSE,"","",""`

      const parsed = sheetSeedService.parseCsv(sampleCsv)
      expect(parsed.length).toBe(3)
      expect(parsed[0].pokedexId).toBe(1)
      expect(parsed[0].collected).toBe(true)
      expect(parsed[0].cardId).toBe('base1-44')
      expect(parsed[0].cardName).toBe('Bulbasaur')

      expect(parsed[1].pokedexId).toBe(6)
      expect(parsed[1].collected).toBe(true)
      expect(parsed[1].cardId).toBe('base1-4')

      expect(parsed[2].pokedexId).toBe(7)
      expect(parsed[2].collected).toBe(false)
    })

    it('parses Google Sheets GEN tab format (#0001, Bulbasaur, TRUE)', () => {
      const gsheetRows = [
        ['#0025', 'Pikachu', 'TRUE'],
        ['#0133', 'Eevee', 'TRUE'],
        ['#0150', 'Mewtwo', 'FALSE'],
      ]

      const parsed = sheetSeedService.parseSheetRows(gsheetRows)
      expect(parsed[0]).toEqual({ pokedexId: 25, collected: true })
      expect(parsed[1]).toEqual({ pokedexId: 133, collected: true })
      expect(parsed[2]).toEqual({ pokedexId: 150, collected: false })
    })

    it('serializes collection to standard CSV format via formatCsv', () => {
      const entries = [
        { pokedexId: 25, name: 'Pikachu', collected: true, cardId: 'base1-58', cardName: 'Pikachu', cardImageUrl: 'https://img' },
        { pokedexId: 26, name: 'Raichu', collected: false },
      ]

      const csv = sheetSeedService.formatCsv(entries)
      expect(csv).toContain('Pokedex,Name,Collected,CardId,CardName,CardImageUrl')
      expect(csv).toContain('#0025,"Pikachu",TRUE,"base1-58","Pikachu","https://img"')
      expect(csv).toContain('#0026,"Raichu",FALSE,,,')
    })
  })

  describe('Bidirectional Collection Persistence Endpoints', () => {
    const testUserId = 'test-persistence-user'

    beforeAll(async () => {
      await collectorRepository.upsertProfile({
        id: testUserId,
        email: 'test@persistence.local',
        name: 'Persistence Tester',
      })
    })

    it('synchronizes single slot updates via PATCH /api/collection/:pokemonId', async () => {
      const patchRes = await app.request('/api/collection/384', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          collected: true,
          cardId: 'dr-9',
          cardName: 'Rayquaza',
          cardImageUrl: 'https://assets.tcgdex.net/rayquaza.webp',
        }),
      })

      expect(patchRes.status).toBe(200)
      const patchBody = (await patchRes.json()) as any
      expect(patchBody.item.pokedexId).toBe(384)
      expect(patchBody.item.cardName).toBe('Rayquaza')

      // Verify slot update persisted in user collection
      const getRes = await app.request(`/api/collection?userId=${testUserId}`)
      const getData = (await getRes.json()) as any
      expect(getData.collection[384]).toBe(true)
      expect(getData.items[384].cardId).toBe('dr-9')
    })

    it('persists cardLanguage for international releases via PATCH /api/collection/:pokemonId', async () => {
      const patchRes = await app.request('/api/collection/25', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          collected: true,
          cardId: 'SV-P-001',
          cardName: 'Pikachu',
          cardImageUrl: 'https://assets.tcgdex.net/ja/svp/1/high.webp',
          cardLanguage: 'ja',
        }),
      })

      expect(patchRes.status).toBe(200)
      const patchBody = (await patchRes.json()) as any
      expect(patchBody.item.pokedexId).toBe(25)
      expect(patchBody.item.cardLanguage).toBe('ja')

      // Verify slot retrieval has cardLanguage
      const getRes = await app.request(`/api/collection?userId=${testUserId}`)
      const getData = (await getRes.json()) as any
      expect(getData.items[25].cardLanguage).toBe('ja')
    })

    it('supports batch synchronization via POST /api/collection/batch with JSON or CSV', async () => {
      // JSON batch sync
      const batchRes = await app.request('/api/collection/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          entries: [
            { pokedexId: 448, collected: true, cardName: 'Lucario' },
            { pokedexId: 658, collected: true, cardName: 'Greninja' },
          ],
        }),
      })

      expect(batchRes.status).toBe(200)
      const batchData = (await batchRes.json()) as any
      expect(batchData.success).toBe(true)
      expect(batchData.syncedCount).toBe(2)

      // CSV batch sync
      const csvBatchRes = await app.request('/api/collection/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          csv: '#0778,Mimikyu,TRUE\n#1007,Koraidon,TRUE',
        }),
      })

      expect(csvBatchRes.status).toBe(200)
      const csvBatchData = (await csvBatchRes.json()) as any
      expect(csvBatchData.success).toBe(true)
      expect(csvBatchData.collectedCount).toBe(2)
    })

    it('exports user collection in JSON and CSV formats via GET /api/collection/export', async () => {
      // JSON export
      const jsonRes = await app.request(`/api/collection/export?userId=${testUserId}&format=json`)
      expect(jsonRes.status).toBe(200)
      const jsonData = (await jsonRes.json()) as any
      expect(jsonData.userId).toBe(testUserId)
      expect(jsonData.count).toBeGreaterThanOrEqual(4)

      // CSV export
      const csvRes = await app.request(`/api/collection/export?userId=${testUserId}&format=csv`)
      expect(csvRes.status).toBe(200)
      expect(csvRes.headers.get('content-type')).toContain('text/csv')
      const csvText = await csvRes.text()
      expect(csvText).toContain('Pokedex,Name,Collected,CardId,CardName,CardImageUrl')
      expect(csvText).toContain('#0384')
    })
  })

  describe('Architectural Line Limit Guardrails (AGENTS.md)', () => {
    it('enforces line limits across all components, routes, services, and tests', () => {
      const rootDir = process.cwd()

      const filesToCheck = [
        { file: 'src/App.tsx', limit: 400 },
        { file: 'src/components/BinderPageView.tsx', limit: 400 },
        { file: 'src/components/ImportBackupModal.tsx', limit: 400 },
        { file: 'src/components/import/FileBackupTab.tsx', limit: 400 },
        { file: 'src/components/import/GoogleSheetsTab.tsx', limit: 400 },
        { file: 'server/routes/collectionRoutes.ts', limit: 400 },
        { file: 'server/repositories/collectorRepository.ts', limit: 400 },
        { file: 'server/services/sheetSeedService.ts', limit: 400 },
        { file: 'server/scripts/seedCollector.ts', limit: 400 },
      ]

      for (const { file, limit } of filesToCheck) {
        const fullPath = path.resolve(rootDir, file)
        const lines = fs.readFileSync(fullPath, 'utf-8').split(/\r?\n/).length
        expect(lines, `${file} has ${lines} lines, exceeding limit of ${limit}`).toBeLessThanOrEqual(limit)
      }
    })
  })
})
