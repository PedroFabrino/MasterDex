import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expansionsRepository } from '../repositories/expansionsRepository.js'
import { tcgdexService } from './tcgdexService.js'
import type { RawDetectedSlot, ScannedSlotResult, BinderScanResponse } from '../../shared/types.js'
export type { RawDetectedSlot, ScannedSlotResult, BinderScanResponse }

const LAYOUT_CONFIG: Record<string, { rows: number; cols: number; totalSlots: number }> = {
  '2x2': { rows: 2, cols: 2, totalSlots: 4 },
  '3x3': { rows: 3, cols: 3, totalSlots: 9 },
  '4x3': { rows: 4, cols: 3, totalSlots: 12 },
  '4x4': { rows: 4, cols: 4, totalSlots: 16 },
}

interface PokemonSpeciesEntry {
  id: number
  name: string
}

class BinderVisionService {
  private speciesMap: Map<string, PokemonSpeciesEntry> | null = null

  private getSpeciesMap(): Map<string, PokemonSpeciesEntry> {
    if (this.speciesMap) return this.speciesMap

    this.speciesMap = new Map()
    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url))
      const jsonPath = path.resolve(__dirname, '../../src/data/pokedex.json')
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8')
        const list = JSON.parse(raw) as Array<{ id: number; name: string }>
        for (const item of list) {
          const entry: PokemonSpeciesEntry = { id: item.id, name: item.name }
          this.speciesMap.set(item.name.toLowerCase(), entry)
          // Also set normalized alphanumeric string
          const norm = item.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (norm && !this.speciesMap.has(norm)) {
            this.speciesMap.set(norm, entry)
          }
        }
      }
    } catch (err) {
      console.warn('[binderVisionService] Could not load pokedex.json:', err)
    }

    return this.speciesMap
  }

  resolvePokemonSpecies(rawName?: string | null): { pokedexId: number; officialName: string } | null {
    if (!rawName) return null
    const map = this.getSpeciesMap()

    const trimmed = rawName.trim().toLowerCase()
    if (map.has(trimmed)) {
      const match = map.get(trimmed)!
      return { pokedexId: match.id, officialName: match.name }
    }

    const norm = trimmed.replace(/[^a-z0-9]/g, '')
    if (map.has(norm)) {
      const match = map.get(norm)!
      return { pokedexId: match.id, officialName: match.name }
    }

    // Strip card modifiers: "Charizard ex", "Pikachu VMAX", "Alolan Vulpix", "Radiant Greninja"
    const cleaned = trimmed
      .replace(/\b(vmax|vstar|v-union|ex|gx|v|radiant|shining|dark|light|rocket's|team magma's|team aqua's)\b/gi, '')
      .replace(/\b(mega|alolan|galarian|hisuian|paldean)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (cleaned && map.has(cleaned)) {
      const match = map.get(cleaned)!
      return { pokedexId: match.id, officialName: match.name }
    }

    const cleanedNorm = cleaned.replace(/[^a-z0-9]/g, '')
    if (cleanedNorm && map.has(cleanedNorm)) {
      const match = map.get(cleanedNorm)!
      return { pokedexId: match.id, officialName: match.name }
    }

    // Word search (e.g. "Charizard ex Secret" -> look for "Charizard")
    const words = trimmed.split(/[\s-]+/)
    for (const word of words) {
      if (word.length >= 3 && map.has(word)) {
        const match = map.get(word)!
        return { pokedexId: match.id, officialName: match.name }
      }
    }

    return null
  }

  parseLocalId(collectorNumber?: string | null): number | undefined {
    if (!collectorNumber) return undefined
    // Match "025/165" -> 25, "GG48/70" -> 48, "4/102" -> 4, "023" -> 23
    const match = collectorNumber.match(/(\d+)(?:\/\d+)?/)
    if (match) {
      const num = parseInt(match[1], 10)
      return isNaN(num) ? undefined : num
    }
    return undefined
  }

  sanitizeImage(imageBase64: string): { mimeType: string; data: string } {
    let mimeType = 'image/jpeg'
    let data = imageBase64.trim()

    const dataUrlMatch = data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/)
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1]
      data = dataUrlMatch[2]
    }

    return { mimeType, data }
  }

  buildVisionPrompt(layout: string, totalSlots: number): string {
    return `You are an expert Pokémon Trading Card Game recognition system analyzing a binder page photo.
The binder page has a grid of card pockets in ${layout} layout (${totalSlots} pockets total).
Pockets are ordered left-to-right, top-to-bottom starting at index 0 (Row 0: 0, 1, ...; Row 1: ..., up to index ${totalSlots - 1}).

Examine EACH pocket slot from index 0 to ${totalSlots - 1}.
For each pocket:
- If the pocket is empty, contains the binder background, or is not a Pokémon card, set "empty": true.
- If it contains a card:
  - "pokemonName": Species name of the Pokémon (e.g., "Pikachu", "Charizard", "Mewtwo").
  - "cardName": Full card title printed on the card header (e.g., "Charizard ex", "Radiant Greninja").
  - "collectorNumber": The card collector number printed at the bottom of the card, e.g. "025/165", "4/102", "GG48/70", "MEP-023", or null if not clearly legible.
  - "setName": Set name or expansion symbol if legible (e.g., "151", "Crown Zenith", "Paldea Evolved", "Base"), or null.
  - "confidence": Estimated detection confidence from 0.0 to 1.0.
  - "empty": false.

Respond ONLY with valid JSON adhering strictly to this schema:
{
  "slots": [
    {
      "slotIndex": 0,
      "pokemonName": "Pikachu",
      "cardName": "Pikachu",
      "collectorNumber": "025/165",
      "setName": "151",
      "confidence": 0.95,
      "empty": false
    }
  ]
}`
  }

  async scanBinderPage(params: {
    image: string
    layout?: string
    apiKey: string
  }): Promise<BinderScanResponse> {
    const layout = params.layout && LAYOUT_CONFIG[params.layout] ? params.layout : '3x3'
    const config = LAYOUT_CONFIG[layout]
    const apiKey = params.apiKey.trim()

    if (!apiKey) {
      throw new Error('Gemini API key is required')
    }

    const { mimeType, data: pureBase64 } = this.sanitizeImage(params.image)
    if (!pureBase64) {
      throw new Error('Invalid image base64 data')
    }

    const prompt = this.buildVisionPrompt(layout, config.totalSlots)
    const preferredModel = process.env.GEMINI_VISION_MODEL || 'gemini-3.8-flash'
    const candidateModels = Array.from(
      new Set([
        preferredModel,
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-3-flash-preview',
      ])
    )

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: pureBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    }

    let lastError: Error | null = null
    let jsonResponse: any = null

    for (const model of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as any
        const msg = errJson?.error?.message || `Google Gemini API returned HTTP ${res.status}`
        lastError = new Error(`Gemini Vision error: ${msg}`)

        if (
          res.status === 404 ||
          res.status === 429 ||
          res.status === 503 ||
          msg.includes('not found') ||
          msg.includes('not supported') ||
          msg.includes('high demand') ||
          msg.includes('overloaded') ||
          msg.includes('exhausted')
        ) {
          continue
        }

        throw lastError
      }

      jsonResponse = (await res.json()) as any
      break
    }

    if (!jsonResponse) {
      throw lastError || new Error('Gemini Vision failed to generate response')
    }

    const rawContent =
      jsonResponse?.candidates?.[0]?.content?.parts?.[0]?.text || '{"slots":[]}'

    return await this.processVisionSlots(rawContent, layout, config.totalSlots)
  }

  async processVisionSlots(
    rawText: string,
    layout: string,
    totalSlots: number
  ): Promise<BinderScanResponse> {
    let parsedData: { slots?: RawDetectedSlot[] } = { slots: [] }

    try {
      // Strip markdown code fences if present
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      parsedData = JSON.parse(cleaned)
    } catch (err: any) {
      console.warn('[binderVisionService] Failed to parse model JSON:', err.message)
      parsedData = { slots: [] }
    }

    const detectedMap = new Map<number, RawDetectedSlot>()
    if (Array.isArray(parsedData.slots)) {
      for (const slot of parsedData.slots) {
        if (typeof slot.slotIndex === 'number') {
          detectedMap.set(slot.slotIndex, slot)
        }
      }
    }

    const slots: ScannedSlotResult[] = []
    let detectedCardsCount = 0

    for (let i = 0; i < totalSlots; i++) {
      const rawSlot = detectedMap.get(i)
      const isEmpty = !rawSlot || rawSlot.empty === true || !rawSlot.pokemonName

      if (isEmpty) {
        slots.push({
          slotIndex: i,
          pokedexId: null,
          pokemonName: '',
          cardName: '',
          collectorNumber: null,
          setName: null,
          confidence: 0,
          empty: true,
          matchedCard: null,
        })
        continue
      }

      detectedCardsCount++
      const species = this.resolvePokemonSpecies(rawSlot.pokemonName || rawSlot.cardName)
      const pokedexId = species ? species.pokedexId : null
      const officialName = species ? species.officialName : (rawSlot.pokemonName || '')
      const localId = this.parseLocalId(rawSlot.collectorNumber)

      // Match card in catalog using tcgdexService first for full set coverage
      let matchedCard: ScannedSlotResult['matchedCard'] = null
      let matchedLocalId: string | null = null
      let matchedSetName: string | null = null

      try {
        let searchQuery = officialName
        if (rawSlot.collectorNumber) {
          searchQuery = `${officialName} ${rawSlot.collectorNumber}`
        }

        const tcgdexResults = await tcgdexService.searchCards(
          searchQuery,
          10,
          pokedexId || undefined
        )

        if (tcgdexResults.length > 0) {
          let bestMatch = tcgdexResults[0]
          if (rawSlot.setName) {
            const setLower = rawSlot.setName.toLowerCase()
            const setMatch = tcgdexResults.find(
              (c) =>
                c.set?.name?.toLowerCase().includes(setLower) ||
                c.set?.id?.toLowerCase().includes(setLower)
            )
            if (setMatch) {
              bestMatch = setMatch
            }
          }

          matchedCard = {
            id: bestMatch.id,
            name: bestMatch.name,
            imageUrl: bestMatch.imageUrl || bestMatch.thumbnailUrl || null,
            expansionId: bestMatch.set?.id || 'unknown',
            marketPrice: (bestMatch as any).marketPrice,
            rarity: bestMatch.rarity,
          }
          matchedLocalId = bestMatch.localId || null
          matchedSetName = bestMatch.set?.name || null
        } else {
          // Fallback to expansionsRepository baseline catalog
          const matches = await expansionsRepository.findMatchingCards({
            pokedexId: pokedexId || undefined,
            localId,
            name: rawSlot.cardName || rawSlot.pokemonName || undefined,
          })

          if (matches.length > 0) {
            const match = matches[0]
            matchedCard = {
              id: match.id,
              name: match.name,
              imageUrl: match.imageUrl,
              expansionId: match.expansionId,
              marketPrice: match.marketPrice,
              rarity: match.rarity,
            }
            matchedLocalId = String(match.localId)
            matchedSetName = match.expansionId
          }
        }
      } catch (err) {
        console.warn('[binderVisionService] Card match error:', err)
      }

      slots.push({
        slotIndex: i,
        pokedexId,
        pokemonName: officialName,
        cardName: matchedCard?.name || rawSlot.cardName || officialName,
        collectorNumber: rawSlot.collectorNumber || matchedLocalId || null,
        setName: rawSlot.setName || matchedSetName || null,
        confidence: typeof rawSlot.confidence === 'number' ? rawSlot.confidence : 0.9,
        empty: false,
        matchedCard,
      })
    }

    return {
      success: true,
      layout,
      totalSlots,
      detectedCardsCount,
      slots,
    }
  }
}

export const binderVisionService = new BinderVisionService()
