import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest'
import app from '../server/app.js'
import { collectorRepository, maskApiKey } from '../server/repositories/collectorRepository.js'
import { ensureDatabaseTables } from '../server/db/index.js'

describe('Collector Settings & BYOK Gemini Key (Ticket #28 / Spec #27)', () => {
  beforeAll(async () => {
    await ensureDatabaseTables()
  })

  const testUserId = `test-settings-${Date.now()}`

  beforeEach(async () => {
    await collectorRepository.upsertProfile({
      id: testUserId,
      email: `${testUserId}@example.com`,
      name: 'Settings Tester',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('maskApiKey helper', () => {
    it('handles null, undefined, short and standard keys properly', () => {
      expect(maskApiKey(null)).toBeNull()
      expect(maskApiKey(undefined)).toBeNull()
      expect(maskApiKey('')).toBeNull()
      expect(maskApiKey('12345')).toBe('****')
      expect(maskApiKey('12345678')).toBe('****')
      expect(maskApiKey('AIzaSyAbCdEfGhIjKlMnOp1234')).toBe('AIzaSy...1234')
    })
  })

  describe('Settings API endpoints', () => {
    it('GET /api/collector/settings returns default values for new user', async () => {
      const res = await app.request(`/api/collector/settings?userId=${encodeURIComponent(testUserId)}`)
      expect(res.status).toBe(200)

      const body = (await res.json()) as any
      expect(body.userId).toBe(testUserId)
      expect(body.settings).toBeDefined()
      expect(body.settings.hasGeminiApiKey).toBe(false)
      expect(body.settings.maskedGeminiApiKey).toBeNull()
      expect(body.settings.favoredLanguages).toEqual(['pt', 'en', 'ja'])
    })

    it('PATCH /api/collector/settings updates Gemini API key and favoredLanguages', async () => {
      const patchRes = await app.request('/api/collector/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          geminiApiKey: 'AIzaSyTestApiKeySecret1234',
          favoredLanguages: ['ja', 'pt', 'en'],
        }),
      })
      expect(patchRes.status).toBe(200)

      const patchBody = (await patchRes.json()) as any
      expect(patchBody.success).toBe(true)
      expect(patchBody.settings.hasGeminiApiKey).toBe(true)
      expect(patchBody.settings.maskedGeminiApiKey).toBe('AIzaSy...1234')
      expect(patchBody.settings.favoredLanguages).toEqual(['ja', 'pt', 'en'])

      // Verify GET returns the masked settings
      const getRes = await app.request(`/api/collector/settings?userId=${encodeURIComponent(testUserId)}`)
      const getBody = (await getRes.json()) as any
      expect(getBody.settings.hasGeminiApiKey).toBe(true)
      expect(getBody.settings.maskedGeminiApiKey).toBe('AIzaSy...1234')
      expect(getBody.settings.favoredLanguages).toEqual(['ja', 'pt', 'en'])
    })

    it('PATCH /api/collector/settings allows clearing the Gemini API key', async () => {
      // First set key
      await app.request('/api/collector/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          geminiApiKey: 'AIzaSyTestApiKeySecret1234',
        }),
      })

      // Now clear it
      const clearRes = await app.request('/api/collector/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          geminiApiKey: null,
        }),
      })
      expect(clearRes.status).toBe(200)

      const clearBody = (await clearRes.json()) as any
      expect(clearBody.settings.hasGeminiApiKey).toBe(false)
      expect(clearBody.settings.maskedGeminiApiKey).toBeNull()
    })

    it('POST /api/collector/settings/test-key validates API key against Google Gemini probe', async () => {
      const globalFetch = globalThis.fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'models/gemini-1.5-flash' }, { name: 'models/gemini-1.5-pro' }],
        }),
      })
      globalThis.fetch = mockFetch

      try {
        const testRes = await app.request('/api/collector/settings/test-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: 'AIzaSyValidKey',
          }),
        })
        expect(testRes.status).toBe(200)

        const testBody = (await testRes.json()) as any
        expect(testBody.valid).toBe(true)
        expect(testBody.modelCount).toBe(2)
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyValidKey'),
          expect.any(Object)
        )
      } finally {
        globalThis.fetch = globalFetch
      }
    })

    it('POST /api/collector/settings/test-key handles invalid API key error response', async () => {
      const globalFetch = globalThis.fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'API key not valid. Please pass a valid API key.' },
        }),
      })
      globalThis.fetch = mockFetch

      try {
        const testRes = await app.request('/api/collector/settings/test-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: 'invalid_key',
          }),
        })
        expect(testRes.status).toBe(400)

        const testBody = (await testRes.json()) as any
        expect(testBody.valid).toBe(false)
        expect(testBody.error).toContain('API key not valid')
      } finally {
        globalThis.fetch = globalFetch
      }
    })

    it('POST /api/collector/settings/test-key rejects missing apiKey', async () => {
      const testRes = await app.request('/api/collector/settings/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(testRes.status).toBe(400)
    })
  })
})
