import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest'
import app from '../server/app.js'
import { binderVisionService } from '../server/services/binderVisionService.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'
import { ensureDatabaseTables } from '../server/db/index.js'

describe('Backend Binder Vision API & Grid Recognition (Ticket #29 / Spec #27)', () => {
  beforeAll(async () => {
    await ensureDatabaseTables()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Species & Collector ID Normalization', () => {
    it('maps Pokémon names to National Pokédex IDs accurately', () => {
      expect(binderVisionService.resolvePokemonSpecies('Pikachu')?.pokedexId).toBe(25)
      expect(binderVisionService.resolvePokemonSpecies('Bulbasaur')?.pokedexId).toBe(1)
      expect(binderVisionService.resolvePokemonSpecies('Charizard')?.pokedexId).toBe(6)

      // Strips TCG card modifiers like ex, VMAX, Radiant
      expect(binderVisionService.resolvePokemonSpecies('Charizard ex')?.pokedexId).toBe(6)
      expect(binderVisionService.resolvePokemonSpecies('Pikachu VMAX')?.pokedexId).toBe(25)
      expect(binderVisionService.resolvePokemonSpecies('Radiant Greninja')?.pokedexId).toBe(658)

      // Handles regional forms and special punctuation
      expect(binderVisionService.resolvePokemonSpecies('Alolan Vulpix')?.pokedexId).toBe(37)
      expect(binderVisionService.resolvePokemonSpecies("Farfetch'd")?.pokedexId).toBe(83)

      // Returns null for non-Pokémon
      expect(binderVisionService.resolvePokemonSpecies('UnknownDigimon')).toBeNull()
      expect(binderVisionService.resolvePokemonSpecies(null)).toBeNull()
    })

    it('parses collector numbers into numeric local IDs', () => {
      expect(binderVisionService.parseLocalId('025/165')).toBe(25)
      expect(binderVisionService.parseLocalId('GG48/70')).toBe(48)
      expect(binderVisionService.parseLocalId('4/102')).toBe(4)
      expect(binderVisionService.parseLocalId('MEP-023')).toBe(23)
      expect(binderVisionService.parseLocalId(null)).toBeUndefined()
      expect(binderVisionService.parseLocalId('invalid')).toBeUndefined()
    })

    it('sanitizes base64 images and extracts mime types', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
      const sanitized = binderVisionService.sanitizeImage(dataUrl)
      expect(sanitized.mimeType).toBe('image/png')
      expect(sanitized.data).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ')

      const rawBase64 = 'aGVsbG8gd29ybGQ='
      const sanitizedRaw = binderVisionService.sanitizeImage(rawBase64)
      expect(sanitizedRaw.mimeType).toBe('image/jpeg')
      expect(sanitizedRaw.data).toBe('aGVsbG8gd29ybGQ=')
    })
  })

  describe('Vision JSON processing', () => {
    it('processes structured vision slots and flags empty pockets', async () => {
      const mockVisionOutput = JSON.stringify({
        slots: [
          {
            slotIndex: 0,
            pokemonName: 'Bulbasaur',
            cardName: 'Bulbasaur',
            collectorNumber: '001/165',
            setName: '151',
            confidence: 0.98,
            empty: false,
          },
          {
            slotIndex: 1,
            empty: true,
          },
          {
            slotIndex: 2,
            pokemonName: 'Charizard ex',
            cardName: 'Charizard ex',
            collectorNumber: '006/165',
            setName: '151',
            confidence: 0.94,
            empty: false,
          },
        ],
      })

      const res = await binderVisionService.processVisionSlots(mockVisionOutput, '3x3', 9)
      expect(res.success).toBe(true)
      expect(res.layout).toBe('3x3')
      expect(res.totalSlots).toBe(9)
      expect(res.detectedCardsCount).toBe(2)
      expect(res.slots.length).toBe(9)

      // Slot 0: Bulbasaur
      expect(res.slots[0].empty).toBe(false)
      expect(res.slots[0].pokedexId).toBe(1)
      expect(res.slots[0].pokemonName).toBe('Bulbasaur')

      // Slot 1: Empty
      expect(res.slots[1].empty).toBe(true)
      expect(res.slots[1].pokedexId).toBeNull()

      // Slot 2: Charizard
      expect(res.slots[2].empty).toBe(false)
      expect(res.slots[2].pokedexId).toBe(6)
      expect(res.slots[2].cardName).toBe('Charizard ex')

      // Slots 3-8: Defaults to empty
      expect(res.slots[8].empty).toBe(true)
    })

    it('handles markdown code fences in model output', async () => {
      const fenced = '```json\n{\n  "slots": [\n    {\n      "slotIndex": 0,\n      "pokemonName": "Pikachu",\n      "empty": false\n    }\n  ]\n}\n```'
      const res = await binderVisionService.processVisionSlots(fenced, '2x2', 4)
      expect(res.slots[0].pokedexId).toBe(25)
      expect(res.detectedCardsCount).toBe(1)
    })

    it('processes 4x4 layout with 16 total pockets', async () => {
      const output = JSON.stringify({
        slots: [
          { slotIndex: 0, pokemonName: 'Mew', empty: false },
          { slotIndex: 15, pokemonName: 'Mewtwo', empty: false },
        ],
      })
      const res = await binderVisionService.processVisionSlots(output, '4x4', 16)
      expect(res.layout).toBe('4x4')
      expect(res.totalSlots).toBe(16)
      expect(res.slots.length).toBe(16)
      expect(res.slots[0].pokemonName).toBe('Mew')
      expect(res.slots[15].pokemonName).toBe('Mewtwo')
      expect(res.slots[7].empty).toBe(true)
    })

    it('accurately matches numbered card (e.g. Nidoking 174/165 in 151) via tcgdexService', async () => {
      const output = JSON.stringify({
        slots: [
          {
            slotIndex: 0,
            pokemonName: 'Nidoking',
            cardName: 'Nidoking',
            collectorNumber: '174/165',
            setName: '151',
            confidence: 0.96,
            empty: false,
          },
        ],
      })
      const res = await binderVisionService.processVisionSlots(output, '3x3', 9)
      expect(res.slots[0].pokemonName).toBe('Nidoking')
      expect(res.slots[0].pokedexId).toBe(34)
      expect(res.slots[0].matchedCard).toBeDefined()
      expect(res.slots[0].matchedCard?.id).toBe('sv03.5-174')
      expect(res.slots[0].matchedCard?.imageUrl).toContain('174')
    })
  })

  describe('POST /api/binder/scan-page route', () => {
    const dummyImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'

    it('rejects scan request when image is missing', async () => {
      const res = await app.request('/api/binder/scan-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
    })

    it('rejects scan request when no API key is available', async () => {
      const savedEnv = process.env.GEMINI_API_KEY
      delete process.env.GEMINI_API_KEY

      try {
        const res = await app.request('/api/binder/scan-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dummyImage,
            layout: '3x3',
          }),
        })
        expect(res.status).toBe(400)
        const body = (await res.json()) as any
        expect(body.code).toBe('MISSING_API_KEY')
      } finally {
        if (savedEnv) process.env.GEMINI_API_KEY = savedEnv
      }
    })

    it('executes scan successfully with explicit apiKey and mock Gemini response', async () => {
      const globalFetch = globalThis.fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      slots: [
                        {
                          slotIndex: 0,
                          pokemonName: 'Pikachu',
                          cardName: 'Pikachu',
                          collectorNumber: '025/165',
                          setName: '151',
                          confidence: 0.99,
                          empty: false,
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      })
      globalThis.fetch = mockFetch

      try {
        const res = await app.request('/api/binder/scan-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dummyImage,
            layout: '3x3',
            apiKey: 'AIzaSyExplicitTestKey',
          }),
        })
        expect(res.status).toBe(200)

        const body = (await res.json()) as any
        expect(body.success).toBe(true)
        expect(body.layout).toBe('3x3')
        expect(body.totalSlots).toBe(9)
        expect(body.slots[0].pokemonName).toBe('Pikachu')
        expect(body.slots[0].pokedexId).toBe(25)

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('gemini-3.8-flash:generateContent?key=AIzaSyExplicitTestKey'),
          expect.any(Object)
        )
      } finally {
        globalThis.fetch = globalFetch
      }
    })

    it('falls back to next model candidate when primary model is not found/supported', async () => {
      const globalFetch = globalThis.fetch
      let callCount = 0
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        callCount++
        if (url.includes('gemini-3.8-flash')) {
          return {
            ok: false,
            status: 404,
            json: async () => ({
              error: { message: 'models/gemini-3.8-flash is not found for API version v1beta' },
            }),
          }
        }
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify({ slots: [] }) }],
                },
              },
            ],
          }),
        }
      })
      globalThis.fetch = mockFetch

      try {
        const res = await app.request('/api/binder/scan-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dummyImage,
            apiKey: 'AIzaSyFallbackKey',
          }),
        })
        expect(res.status).toBe(200)
        expect(callCount).toBe(2)
        expect(mockFetch).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('gemini-3.8-flash:generateContent?key=AIzaSyFallbackKey'),
          expect.any(Object)
        )
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('gemini-3.5-flash:generateContent?key=AIzaSyFallbackKey'),
          expect.any(Object)
        )
      } finally {
        globalThis.fetch = globalFetch
      }
    })

    it('falls back to next model candidate when primary model experiences high demand spikes (503)', async () => {
      const globalFetch = globalThis.fetch
      let callCount = 0
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        callCount++
        if (url.includes('gemini-3.8-flash')) {
          return {
            ok: false,
            status: 503,
            json: async () => ({
              error: { message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.' },
            }),
          }
        }
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify({ slots: [] }) }],
                },
              },
            ],
          }),
        }
      })
      globalThis.fetch = mockFetch

      try {
        const res = await app.request('/api/binder/scan-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dummyImage,
            apiKey: 'AIzaSyHighDemandFallbackKey',
          }),
        })
        expect(res.status).toBe(200)
        expect(callCount).toBe(2)
        expect(mockFetch).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('gemini-3.8-flash:generateContent?key=AIzaSyHighDemandFallbackKey'),
          expect.any(Object)
        )
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('gemini-3.5-flash:generateContent?key=AIzaSyHighDemandFallbackKey'),
          expect.any(Object)
        )
      } finally {
        globalThis.fetch = globalFetch
      }
    })

    it('retrieves BYOK key from user profile when not provided in body', async () => {
      const testUser = `test-user-${Date.now()}`
      await collectorRepository.upsertProfile({
        id: testUser,
        email: `${testUser}@example.com`,
        name: 'BYOK User',
      })
      await collectorRepository.updateSettings(testUser, {
        geminiApiKey: 'AIzaSyProfileStoredKey123',
      })

      const globalFetch = globalThis.fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ slots: [] }) }],
              },
            },
          ],
        }),
      })
      globalThis.fetch = mockFetch

      try {
        const res = await app.request('/api/binder/scan-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dummyImage,
            userId: testUser,
          }),
        })
        expect(res.status).toBe(200)
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('key=AIzaSyProfileStoredKey123'),
          expect.any(Object)
        )
      } finally {
        globalThis.fetch = globalFetch
      }
    })
  })
})
