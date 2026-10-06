import { collectorRepository } from '../repositories/collectorRepository.js'

export interface SheetRow {
  pokedex: string
  name: string
  collected: string
}

export class SheetSeedService {
  parsePokedexNumber(raw: string): number {
    const cleaned = raw.replace(/[#\s]/g, '')
    const num = parseInt(cleaned, 10)
    return isNaN(num) ? 0 : num
  }

  parseSheetRows(rows: string[][]): Array<{ pokedexId: number; collected: boolean }> {
    const results: Array<{ pokedexId: number; collected: boolean }> = []

    for (const row of rows) {
      if (!row || row.length < 3) continue
      const rawPokedex = row[0]
      const rawCollected = String(row[2]).trim().toUpperCase()

      const pokedexId = this.parsePokedexNumber(rawPokedex)
      if (pokedexId > 0) {
        results.push({
          pokedexId,
          collected: rawCollected === 'TRUE',
        })
      }
    }

    return results
  }

  async findSpreadsheet(accessToken: string): Promise<string | null> {
    const query = encodeURIComponent(
      "name='Pokemon Collection Tracker' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    )
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) return null
    const data = await res.json()
    const files = data.files || []
    return files.length > 0 ? files[0].id : null
  }

  async fetchGenerationRows(
    spreadsheetId: string,
    sheetName: string,
    accessToken: string
  ): Promise<string[][]> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:C`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) return []
    const data = await res.json()
    return data.values || []
  }

  async autoSeedFromGoogleDrive(userId: string, accessToken: string): Promise<{ seeded: boolean; count: number }> {
    try {
      const spreadsheetId = await this.findSpreadsheet(accessToken)
      if (!spreadsheetId) {
        return { seeded: false, count: 0 }
      }

      const allEntries: Array<{ pokedexId: number; collected: boolean }> = []
      const genNames = ['GEN 1', 'GEN 2', 'GEN 3', 'GEN 4', 'GEN 5', 'GEN 6', 'GEN 7', 'GEN 8', 'GEN 9']

      for (const gen of genNames) {
        const rows = await this.fetchGenerationRows(spreadsheetId, gen, accessToken)
        const parsed = this.parseSheetRows(rows)
        allEntries.push(...parsed)
      }

      const collectedOnly = allEntries.filter((e) => e.collected)
      await collectorRepository.batchUpsertUserPokemon(userId, allEntries)
      await collectorRepository.markProfileSeeded(userId)

      return { seeded: true, count: collectedOnly.length }
    } catch (error) {
      console.error('Error auto-seeding from Google Sheet:', error)
      return { seeded: false, count: 0 }
    }
  }
}

export const sheetSeedService = new SheetSeedService()
