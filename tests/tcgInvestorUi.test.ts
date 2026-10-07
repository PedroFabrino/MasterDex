import { describe, it, expect, beforeAll } from 'vitest'
import { ensureDatabaseTables } from '../server/db/index.js'
import { expansionsRepository } from '../server/repositories/expansionsRepository.js'
import { app } from '../server/app.js'
import fs from 'node:fs'
import path from 'node:path'

describe('TCG Investor Dashboard Backend & View Integration', () => {
  const testExpSlug = `investor-test-${Date.now()}`
  const testExpId = `exp-${testExpSlug}`

  beforeAll(async () => {
    await ensureDatabaseTables()

    await expansionsRepository.upsertExpansion({
      id: testExpId,
      name: 'Paradox Rift Test',
      slug: testExpSlug,
      series: 'Scarlet & Violet',
      url: `https://example.com/${testExpSlug}`,
      baseCount: 182,
      secretCount: 84,
      investmentScore: 88.5,
      chaseCardName: 'Roaring Moon ex SAR',
      chaseCardPrice: 650.0,
      totalSecretPoolValue: 4200.0,
      avgSecretPrice: 50.0,
      lastScrapedAt: new Date(),
    })

    await expansionsRepository.upsertCards([
      {
        id: `${testExpId}-c1`,
        expansionId: testExpId,
        localId: 1,
        name: 'Snorunt',
        rarity: 'Common',
        marketPrice: 0.5,
        isSecret: false,
      },
      {
        id: `${testExpId}-c251`,
        expansionId: testExpId,
        localId: 251,
        name: 'Roaring Moon ex',
        rarity: 'Special Illustration Rare',
        marketPrice: 650.0,
        isSecret: true,
      },
    ])
  })

  it('supports all 5 Target Rarity filters: any, holo, ultra, illustration, secret', async () => {
    const rarities = ['any', 'holo', 'ultra', 'illustration', 'secret']

    for (const r of rarities) {
      const res = await app.request(`/api/tcg/expansions?rarity=${r}`)
      expect(res.status).toBe(200)

      const body = (await res.json()) as any
      expect(body.filters.rarity).toBe(r)
      expect(Array.isArray(body.expansions)).toBe(true)
      expect(body.expansions.length).toBeGreaterThan(0)

      const target = body.expansions.find((e: any) => e.id === testExpId)
      expect(target).toBeDefined()
      expect(target).toHaveProperty('collectionGapYield')
    }
  })

  it('supports all 4 leaderboard sort criteria: gap_yield, score, chase, pool', async () => {
    const sorts = ['gap_yield', 'score', 'chase', 'pool']

    for (const s of sorts) {
      const res = await app.request(`/api/tcg/expansions?sort=${s}`)
      expect(res.status).toBe(200)

      const body = (await res.json()) as any
      expect(body.filters.sort).toBe(s)
      expect(Array.isArray(body.expansions)).toBe(true)
      expect(body.expansions.length).toBeGreaterThan(0)
    }
  })

  it('returns expansion detail and secret cards with BRL prices via GET /api/tcg/expansions/:slug', async () => {
    const res = await app.request(`/api/tcg/expansions/${testExpSlug}`)
    expect(res.status).toBe(200)

    const body = (await res.json()) as any
    expect(body.expansion).toBeDefined()
    expect(body.expansion.name).toBe('Paradox Rift Test')
    expect(body.expansion.investmentScore).toBe(88.5)
    expect(body.expansion.chaseCardPrice).toBe(650.0)

    expect(Array.isArray(body.secretCards)).toBe(true)
    expect(body.secretCards.length).toBe(1)
    expect(body.secretCards[0].name).toBe('Roaring Moon ex')
    expect(body.secretCards[0].marketPrice).toBe(650.0)
    expect(body.secretCards[0].isSecret).toBe(true)
  })

  it('handles HTML parse endpoint for scraper integration', async () => {
    const mockHtml = `
      <html>
        <head><title>Fenda Temporal : Cartas de Pokemon</title></head>
        <body>
          <h1>Fenda Temporal</h1>
          <script>var _officialCards = 182;</script>
          <div data-card-local-id="251" data-card-name="Roaring Moon ex" data-card-price="650.00" data-card-rarity="Special Illustration Rare"></div>
        </body>
      </html>
    `

    const res = await app.request('/api/tcg/expansions/parse-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: mockHtml,
        url: 'https://www.cartasdepokemon.com.br/sv/fenda-temporal',
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expansion).toBeDefined()
    expect(body.expansion.name).toBe('Fenda Temporal')
    expect(body.metrics.chaseCardCeiling).toBe(650.0)
  })

  it('verifies all investor frontend components obey the 400-line limit', () => {
    const files = [
      'src/App.tsx',
      'src/components/investor/TcgInvestorDashboard.tsx',
      'src/components/investor/ExpansionCard.tsx',
      'src/components/investor/ExpansionDetailModal.tsx',
      'src/components/investor/HiddenExpansionsTray.tsx',
      'src/components/investor/InvestorFilterBar.tsx',
      'src/components/investor/ScrapeExpansionModal.tsx',
    ]

    for (const file of files) {
      const fullPath = path.resolve(process.cwd(), file)
      expect(fs.existsSync(fullPath)).toBe(true)
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n').length
      expect(lines).toBeLessThanOrEqual(400)
    }
  })
})
