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

  parseSheetRows(
    rows: string[][]
  ): Array<{
    pokedexId: number
    collected: boolean
    cardId?: string | null
    cardName?: string | null
    cardImageUrl?: string | null
  }> {
    const results: Array<{
      pokedexId: number
      collected: boolean
      cardId?: string | null
      cardName?: string | null
      cardImageUrl?: string | null
    }> = []

    for (const row of rows) {
      if (!row || row.length < 3) continue
      const rawPokedex = row[0]
      const rawCollected = String(row[2]).trim().toUpperCase()

      const pokedexId = this.parsePokedexNumber(rawPokedex)
        const entry: {
          pokedexId: number
          collected: boolean
          cardId?: string | null
          cardName?: string | null
          cardImageUrl?: string | null
        } = {
          pokedexId,
          collected: rawCollected === 'TRUE' || rawCollected === '1' || rawCollected === 'YES',
        }

        if (row[3] !== undefined) entry.cardId = String(row[3]).trim() || null
        if (row[4] !== undefined) entry.cardName = String(row[4]).trim() || null
        if (row[5] !== undefined) entry.cardImageUrl = String(row[5]).trim() || null

        results.push(entry)
    }

    return results
  }

  parseCsv(
    csvContent: string
  ): Array<{
    pokedexId: number
    collected: boolean
    cardId?: string | null
    cardName?: string | null
    cardImageUrl?: string | null
  }> {
    const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
    if (lines.length === 0) return []

    const rows: string[][] = []
    for (const line of lines) {
      // Basic CSV split supporting quoted cells
      const cells: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          cells.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      cells.push(current.trim())

      // Skip header if line begins with non-numeric / Pokedex / Dex / #
      const firstCellClean = cells[0]?.toLowerCase()
      if (firstCellClean === 'pokedex' || firstCellClean === 'dex' || firstCellClean === 'id' || firstCellClean === '#') {
        continue
      }
      rows.push(cells)
    }

    return this.parseSheetRows(rows)
  }

  formatCsv(
    entries: Array<{
      pokedexId: number
      name?: string
      collected: boolean
      cardId?: string | null
      cardName?: string | null
      cardImageUrl?: string | null
    }>
  ): string {
    const header = 'Pokedex,Name,Collected,CardId,CardName,CardImageUrl\n'
    const rows = entries.map((e) => {
      const pid = `#${String(e.pokedexId).padStart(4, '0')}`
      const name = e.name ? `"${e.name.replace(/"/g, '""')}"` : ''
      const collected = e.collected ? 'TRUE' : 'FALSE'
      const cardId = e.cardId ? `"${e.cardId.replace(/"/g, '""')}"` : ''
      const cardName = e.cardName ? `"${e.cardName.replace(/"/g, '""')}"` : ''
      const cardImageUrl = e.cardImageUrl ? `"${e.cardImageUrl.replace(/"/g, '""')}"` : ''
      return `${pid},${name},${collected},${cardId},${cardName},${cardImageUrl}`
    })
    return header + rows.join('\n')
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
    const data = (await res.json()) as any
    const files = data.files || []
    return files.length > 0 ? files[0].id : null
  }

  async fetchGenerationRows(
    spreadsheetId: string,
    sheetName: string,
    accessToken?: string
  ): Promise<string[][]> {
    if (accessToken) {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:F`
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
        if (res.ok) {
          const data = (await res.json()) as any
          return data.values || []
        }
      } catch {
        // Fallback to public gviz endpoint
      }
    }

    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
      const res = await fetch(gvizUrl)
      if (res.ok) {
        const text = await res.text()
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
        return lines.slice(1).map((l) => {
          const cells: string[] = []
          let cur = ''
          let inQuotes = false
          for (let i = 0; i < l.length; i++) {
            const c = l[i]
            if (c === '"') {
              inQuotes = !inQuotes
            } else if (c === ',' && !inQuotes) {
              cells.push(cur.trim())
              cur = ''
            } else {
              cur += c
            }
          }
          cells.push(cur.trim())
          return cells.map((c) => c.replace(/^"|"$/g, ''))
        })
      }
    } catch {
      return []
    }

    return []
  }

  async seedFromSpreadsheetId(
    userId: string,
    spreadsheetId: string,
    accessToken?: string
  ): Promise<{ seeded: boolean; count: number; totalProcessed: number }> {
    try {
      const allEntries: Array<{
        pokedexId: number
        collected: boolean
        cardId?: string | null
        cardName?: string | null
        cardImageUrl?: string | null
      }> = []
      const genNames = ['GEN 1', 'GEN 2', 'GEN 3', 'GEN 4', 'GEN 5', 'GEN 6', 'GEN 7', 'GEN 8', 'GEN 9']

      for (const gen of genNames) {
        const rows = await this.fetchGenerationRows(spreadsheetId, gen, accessToken)
        if (rows && rows.length > 0) {
          const parsed = this.parseSheetRows(rows)
          allEntries.push(...parsed)
        }
      }

      if (allEntries.length === 0) {
        return { seeded: false, count: 0, totalProcessed: 0 }
      }

      const collectedOnly = allEntries.filter((e) => e.collected)
      await collectorRepository.batchUpsertUserPokemon(userId, allEntries)
      await collectorRepository.markProfileSeeded(userId)

      return { seeded: true, count: collectedOnly.length, totalProcessed: allEntries.length }
    } catch (error) {
      console.error('Error seeding from spreadsheet ID:', error)
      return { seeded: false, count: 0, totalProcessed: 0 }
    }
  }

  async autoSeedFromGoogleDrive(userId: string, accessToken: string): Promise<{ seeded: boolean; count: number }> {
    try {
      const spreadsheetId = await this.findSpreadsheet(accessToken)
      if (!spreadsheetId) {
        return { seeded: false, count: 0 }
      }

      const result = await this.seedFromSpreadsheetId(userId, spreadsheetId, accessToken)
      return { seeded: result.seeded, count: result.count }
    } catch (error) {
      console.error('Error auto-seeding from Google Sheet:', error)
      return { seeded: false, count: 0 }
    }
  }
}

export const sheetSeedService = new SheetSeedService()
