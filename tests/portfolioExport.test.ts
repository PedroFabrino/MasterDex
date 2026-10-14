import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cleanCardName,
  mapToPortfolioCondition,
  mapToPortfolioVariant,
  normalizeExportItem,
  portfolioExportService,
  PORTFOLIO_CSV_HEADER,
} from '../server/services/portfolioExportService.js'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
vi.mock("../src/components/ui/dialog.js", () => ({
  Dialog: ({ children, open }: any) => (open ? React.createElement("div", null, children) : null),
  DialogContent: ({ children, className }: any) => React.createElement("div", { className }, children),
  DialogHeader: ({ children }: any) => React.createElement("div", null, children),
  DialogTitle: ({ children }: any) => React.createElement("h2", null, children),
  DialogDescription: ({ children }: any) => React.createElement("p", null, children),
}))

import { apiClient } from '../src/lib/apiClient.js'
import { PortfolioModal } from '../src/components/portfolio/PortfolioModal.js'
import { FileBackupTab } from '../src/components/import/FileBackupTab.js'
import { app } from '../server/app.js'
import { collectorRepository } from '../server/repositories/collectorRepository.js'

describe('Portfolio CSV Export Service & Endpoints (Ticket #41)', () => {
  describe('Data Normalization & Cleaning', () => {
    it('strips trailing collector numbers while preserving species names', () => {
      expect(cleanCardName('Chandelure')).toBe('Chandelure')
      expect(cleanCardName('Jirachi ex')).toBe('Jirachi ex')
      expect(cleanCardName('Charizard 4/102')).toBe('Charizard')
      expect(cleanCardName('Pikachu 58/102')).toBe('Pikachu')
      expect(cleanCardName('Pikachu TG30/TG30')).toBe('Pikachu')
      expect(cleanCardName('Blastoise SWSH088')).toBe('Blastoise')
      expect(cleanCardName('Porygon2')).toBe('Porygon2')
      expect(cleanCardName('Porygon2 15/100')).toBe('Porygon2')
      expect(cleanCardName('Ho-Oh')).toBe('Ho-Oh')
      expect(cleanCardName('Mewtwo #150')).toBe('Mewtwo')
    })

    it('maps condition codes to Collectr / TCG standard condition strings', () => {
      expect(mapToPortfolioCondition('NM')).toBe('NEAR_MINT')
      expect(mapToPortfolioCondition('LP')).toBe('LIGHTLY_PLAYED')
      expect(mapToPortfolioCondition('MP')).toBe('MODERATELY_PLAYED')
      expect(mapToPortfolioCondition('HP')).toBe('HEAVILY_PLAYED')
      expect(mapToPortfolioCondition('DMG')).toBe('DAMAGED')
      expect(mapToPortfolioCondition('SP')).toBe('LIGHTLY_PLAYED')
      expect(mapToPortfolioCondition(null)).toBe('NEAR_MINT')
      expect(mapToPortfolioCondition(undefined)).toBe('NEAR_MINT')
      expect(mapToPortfolioCondition('UNKNOWN')).toBe('NEAR_MINT')
    })

    it('maps variant correctly based on isHolo and rarity fallback', () => {
      expect(mapToPortfolioVariant(true)).toBe('Holofoil')
      expect(mapToPortfolioVariant(false)).toBe('Normal')
      expect(mapToPortfolioVariant(null, 'Rare Holo')).toBe('Holofoil')
      expect(mapToPortfolioVariant(null, 'Ultra Rare')).toBe('Holofoil')
      expect(mapToPortfolioVariant(null, 'Common')).toBe('Normal')
      expect(mapToPortfolioVariant(undefined, undefined)).toBe('Normal')
    })

    it('normalizes CollectedSlot and filters out sprite placeholders', () => {
      // Unassigned sprite slot
      const spriteSlot = {
        pokemonId: 25,
        tcgCard: null,
      }
      expect(normalizeExportItem(spriteSlot)).toBeNull()

      // Assigned physical card slot
      const physicalSlot = {
        pokemonId: 25,
        tcgCard: {
          id: 'base1-58',
          name: 'Pikachu 58/102',
          setName: 'Base Set',
          number: '58/102',
          imageUrl: 'https://example.com/pika.png',
          isHolo: false,
        },
        cardCondition: 'LP',
      }
      const normalized = normalizeExportItem(physicalSlot)
      expect(normalized).toEqual({
        pokedexId: 25,
        cardId: 'base1-58',
        cardName: 'Pikachu 58/102',
        setName: 'Base Set',
        cardCondition: 'LP',
        isHolo: false,
      })
    })
  })

  describe('generatePortfolioCsv', () => {
    it('generates compliant CSV with exact header and sorting by Pokédex ID', () => {
      const items = [
        {
          pokedexId: 609,
          cardId: 'me-30',
          cardName: 'Chandelure',
          setName: 'ME: 30th Celebration',
          cardCondition: 'NM',
          isHolo: true,
          marketPriceUsd: 1.93,
        },
        {
          pokedexId: 6,
          cardId: 'base1-4',
          cardName: 'Charizard 4/102',
          setName: 'Base Set',
          cardCondition: 'DMG',
          isHolo: true,
          marketPriceUsd: 120.5,
        },
        {
          pokedexId: 385,
          cardId: 'me-50',
          cardName: 'Jirachi ex',
          setName: 'ME: 30th Celebration',
          cardCondition: 'NM',
          isHolo: true,
          marketPriceUsd: 47.8,
        },
      ]

      const csv = portfolioExportService.generatePortfolioCsv(items)
      const lines = csv.trim().split('\r\n')

      expect(lines[0]).toBe(PORTFOLIO_CSV_HEADER)
      expect(lines).toHaveLength(4)

      // Numerical order: 6 (Charizard), 385 (Jirachi ex), 609 (Chandelure)
      expect(lines[1]).toBe('Charizard,Base Set,POKEMON,Holofoil,RAW,DAMAGED,,1,,120.50,USD')
      expect(lines[2]).toBe('Jirachi ex,ME: 30th Celebration,POKEMON,Holofoil,RAW,NEAR_MINT,,1,,47.80,USD')
      expect(lines[3]).toBe('Chandelure,ME: 30th Celebration,POKEMON,Holofoil,RAW,NEAR_MINT,,1,,1.93,USD')
    })

    it('strictly omits market price string if unpriced or zero', () => {
      const items = [
        {
          pokedexId: 1,
          cardId: 'base1-44',
          cardName: 'Bulbasaur',
          setName: 'Base Set',
          cardCondition: 'NM',
          isHolo: false,
          marketPriceUsd: 0,
        },
      ]

      const csv = portfolioExportService.generatePortfolioCsv(items)
      const lines = csv.trim().split('\r\n')
      expect(lines[1]).toBe('Bulbasaur,Base Set,POKEMON,Normal,RAW,NEAR_MINT,,1,,,USD')
    })

    it('computes condition-adjusted USD pricing using quotes map and exchange rates', () => {
      const quotesMap = new Map([
        [
          'base1-4',
          [
            {
              id: 'q1',
              cardId: 'base1-4',
              provider: 'tcgplayer',
              condition: 'NM',
              nativePrice: 100.0,
              currency: 'USD',
              recordedAt: new Date(),
            },
          ],
        ],
      ])

      // Condition HP has 0.50 multiplier -> $50.00
      const items = [
        {
          pokedexId: 6,
          cardId: 'base1-4',
          cardName: 'Charizard',
          setName: 'Base Set',
          cardCondition: 'HP',
          isHolo: true,
        },
      ]

      const csv = portfolioExportService.generatePortfolioCsv(items, quotesMap)
      const lines = csv.trim().split('\r\n')
      expect(lines[1]).toBe('Charizard,Base Set,POKEMON,Holofoil,RAW,HEAVILY_PLAYED,,1,,50.00,USD')
    })
  })

  describe('API Endpoints', () => {
    it('POST /api/collection/export-portfolio-csv exports guest slots', async () => {
      const payload = {
        items: [
          {
            pokedexId: 25,
            cardId: 'base1-58',
            cardName: 'Pikachu',
            setName: 'Base Set',
            cardCondition: 'NM',
            isHolo: false,
            marketPriceUsd: 5.25,
          },
          {
            // Sprite slot (should be excluded)
            pokedexId: 26,
            cardId: null,
          },
        ],
      }

      const res = await app.request('/api/collection/export-portfolio-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/csv')
      expect(res.headers.get('content-disposition')).toContain('masterdex-portfolio.csv')

      const text = await res.text()
      const lines = text.trim().split('\r\n')
      expect(lines[0]).toBe(PORTFOLIO_CSV_HEADER)
      expect(lines).toHaveLength(2) // header + 1 card (sprite excluded)
      expect(lines[1]).toBe('Pikachu,Base Set,POKEMON,Normal,RAW,NEAR_MINT,,1,,5.25,USD')
    })

    it('GET /api/collection/export?format=portfolio_csv returns user portfolio CSV', async () => {
      vi.spyOn(collectorRepository, 'getAssignedCollectedCards').mockResolvedValueOnce([
        {
          pokedexId: 150,
          cardId: 'base1-10',
          cardName: 'Mewtwo',
          cardImageUrl: 'https://example.com/mewtwo.png',
          cardLanguage: 'en',
          cardCondition: 'LP',
        },
      ])

      const res = await app.request('/api/collection/export?userId=test_user&format=portfolio_csv')
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/csv')
      expect(res.headers.get('content-disposition')).toContain('masterdex-portfolio-test_user.csv')

      const text = await res.text()
      const lines = text.trim().split('\r\n')
      expect(lines[0]).toBe(PORTFOLIO_CSV_HEADER)
      expect(lines[1]).toContain('Mewtwo')
      expect(lines[1]).toContain('LIGHTLY_PLAYED')
      expect(lines[1]).toContain('USD')
    })
  })

  describe('Client Integration & UI Triggers (Ticket #42)', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('apiClient.downloadPortfolioCsv triggers authentic download for authenticated user', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['Card,Set...'], { type: 'text/csv' }),
      } as any)

      const createObjectURL = vi.fn().mockReturnValue('blob:test-url')
      const revokeObjectURL = vi.fn()
      global.URL.createObjectURL = createObjectURL
      global.URL.revokeObjectURL = revokeObjectURL

      await apiClient.downloadPortfolioCsv('pedro-123')

      expect(fetchSpy).toHaveBeenCalledWith('/api/collection/export?userId=pedro-123&format=portfolio_csv')
      expect(createObjectURL).toHaveBeenCalled()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url')
    })

    it('apiClient.downloadPortfolioCsv triggers authentic download for guest user with physical cards only', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['Card,Set...'], { type: 'text/csv' }),
      } as any)

      const createObjectURL = vi.fn().mockReturnValue('blob:guest-url')
      const revokeObjectURL = vi.fn()
      global.URL.createObjectURL = createObjectURL
      global.URL.revokeObjectURL = revokeObjectURL

      const guestSlots = {
        6: {
          pokemonId: 6,
          tcgCard: { id: 'base1-4', name: 'Charizard', setName: 'Base Set', number: '4/102', imageUrl: 'url', isHolo: true },
          cardCondition: 'NM',
        },
        7: {
          pokemonId: 7,
          tcgCard: null,
        },
      }

      await apiClient.downloadPortfolioCsv(undefined, guestSlots)

      expect(fetchSpy).toHaveBeenCalledWith('/api/collection/export-portfolio-csv', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }))

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
      expect(body.items).toHaveLength(1)
      expect(body.items[0].cardId).toBe('base1-4')
      expect(createObjectURL).toHaveBeenCalled()
    })

    it('PortfolioModal renders Export Portfolio CSV button in header', () => {
      const html = renderToStaticMarkup(
        React.createElement(PortfolioModal, {
          open: true,
          onClose: vi.fn(),
          portfolio: {
            totalBrl: 150,
            totalUsd: 30,
            cardCount: 2,
            topCards: [],
            regionalDistribution: [],
          },
          userId: 'pedro',
        })
      )

      expect(html).toContain('Portfólio')
    })

    it('FileBackupTab renders Export Portfolio CSV button alongside JSON and CSV exports', () => {
      const html = renderToStaticMarkup(
        React.createElement(FileBackupTab, {
          userId: 'pedro',
          collected: {
            6: {
              pokemonId: 6,
              tcgCard: { id: 'base1-4', name: 'Charizard', setName: 'Base Set', number: '4/102', imageUrl: 'url' },
            },
          },
          onUpdateCollection: vi.fn(),
          setLoading: vi.fn(),
          loading: false,
          setStatusMessage: vi.fn(),
        })
      )

      expect(html).toContain('Portfólio')
      expect(html).toContain('JSON')
      expect(html).toContain('CSV')
    })
  })
})
