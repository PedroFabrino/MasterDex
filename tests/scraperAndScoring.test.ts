import { describe, it, expect, beforeAll } from 'vitest'
import { investmentService } from '../server/services/investmentService.js'
import { scraperService } from '../server/services/scraperService.js'
import { ensureDatabaseTables } from '../server/db/index.js'
import { app } from '../server/app.js'

const sampleHtmlFixture = `
<!DOCTYPE html>
<html>
<head>
  <title>Escuridão Absoluta: 84 cartas | Expansão Pokémon TCG</title>
</head>
<body>
  <h1>Escuridão Absoluta</h1>
  <script>
    (function () {
      var _officialCards = 84;
    })();
  </script>
  <div class="catalog-grid">
    <!-- Base Card -->
    <div data-card-preview-item
         data-card-local-id="001"
         data-card-name="Tropius"
         data-card-price="1.50"
         data-card-rarity="common"
         data-card-image="https://assets.tcgdex.net/pt/me/me05/001/high.webp"
         data-card-types="grass">
    </div>

    <!-- Another Base Card -->
    <div data-card-preview-item
         data-card-local-id="84"
         data-card-name="Last Regular Card"
         data-card-price="15.00"
         data-card-rarity="holo-rare"
         data-card-image="https://assets.tcgdex.net/pt/me/me05/084/high.webp">
    </div>

    <!-- Secret Rare 1: Illustration Rare -->
    <div data-card-preview-item
         data-card-local-id="96"
         data-card-name="Lurantis ex"
         data-card-price="45.00"
         data-card-rarity="ultra-rare"
         data-card-image="https://assets.tcgdex.net/pt/me/me05/096/high.webp">
    </div>

    <!-- Secret Rare 2: Special Illustration Rare (Chase Card) -->
    <div data-card-preview-item
         data-card-local-id="116"
         data-card-name="Mega Darkrai ex"
         data-card-price="791.16"
         data-card-rarity="special-illustration-rare"
         data-card-image="https://assets.tcgdex.net/pt/me/me05/116/high.webp"
         data-card-types="darkness">
    </div>

    <!-- Secret Rare 3: Hyper Rare Gold -->
    <div data-card-preview-item
         data-card-local-id="120"
         data-card-name="Mega Darkrai ex (Gold)"
         data-card-price="350.00"
         data-card-rarity="hyper-rare"
         data-card-image="https://assets.tcgdex.net/pt/me/me05/120/high.webp">
    </div>
  </div>
</body>
</html>
`

describe('InvestmentService', () => {
  it('calculates expected metrics and composite investment score', () => {
    const cards = [
      { localId: 96, marketPrice: 45.0, isSecret: true },
      { localId: 116, marketPrice: 791.16, isSecret: true },
      { localId: 120, marketPrice: 350.0, isSecret: true },
    ]

    const metrics = investmentService.calculateMetrics(84, cards)
    expect(metrics.chaseCardCeiling).toBe(791.16)
    expect(metrics.secretPoolValue).toBe(1186.16)
    expect(metrics.avgSecretPrice).toBe(395.39)
    expect(metrics.secretDensity).toBe(0.036) // 3 / 84
    expect(metrics.investmentScore).toBeGreaterThan(0)
    expect(metrics.investmentScore).toBeLessThanOrEqual(100)
  })

  it('handles empty cards cleanly', () => {
    const metrics = investmentService.calculateMetrics(84, [])
    expect(metrics.investmentScore).toBe(0)
    expect(metrics.chaseCardCeiling).toBe(0)
  })
})

describe('ScraperService', () => {
  it('parses base count and segregates SA+ secret rares', () => {
    const url = 'https://www.cartasdepokemon.com.br/megaevolucao/escuridao-absoluta'
    const result = scraperService.parseExpansionHtml(sampleHtmlFixture, url)

    expect(result.expansion.baseCount).toBe(84)
    expect(result.expansion.slug).toBe('escuridao-absoluta')
    expect(result.expansion.series).toBe('Megaevolucao')
    expect(result.expansion.chaseCardName).toBe('Mega Darkrai ex')
    expect(result.expansion.chaseCardPrice).toBe(791.16)
    expect(result.expansion.secretCount).toBe(3)

    // Check cards
    const secretCards = result.cards.filter((c) => c.isSecret)
    const baseCards = result.cards.filter((c) => !c.isSecret)

    expect(baseCards.length).toBe(2)
    expect(secretCards.length).toBe(3)
    expect(secretCards[0].localId).toBe(96)
    expect(secretCards[1].localId).toBe(116)
    expect(secretCards[2].localId).toBe(120)
  })
})

describe('TCG API Endpoints', () => {
  beforeAll(async () => {
    await ensureDatabaseTables()
  })

  it('parses HTML and persists expansion and cards via /api/tcg/expansions/parse-html', async () => {
    const res = await app.request('/api/tcg/expansions/parse-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: sampleHtmlFixture,
        url: 'https://www.cartasdepokemon.com.br/megaevolucao/escuridao-absoluta',
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expansion).toBeDefined()
    expect(body.expansion.baseCount).toBe(84)
    expect(body.secretCount).toBe(3)
    expect(body.metrics.chaseCardCeiling).toBe(791.16)
  })

  it('lists expansions via GET /api/tcg/expansions', async () => {
    const res = await app.request('/api/tcg/expansions')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(Array.isArray(body.expansions)).toBe(true)
    expect(body.expansions.length).toBeGreaterThan(0)
    expect(body.expansions[0].slug).toBe('escuridao-absoluta')
  })

  it('retrieves expansion details and secret cards via GET /api/tcg/expansions/:slug', async () => {
    const res = await app.request('/api/tcg/expansions/escuridao-absoluta')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expansion.name).toBe('Escuridão Absoluta')
    expect(body.secretCards.length).toBe(3)
    expect(body.cards.length).toBe(5)
  })
})
