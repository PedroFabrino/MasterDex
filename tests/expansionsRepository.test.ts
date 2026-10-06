import { describe, it, expect, beforeAll } from 'vitest'
import { ensureDatabaseTables } from '../server/db/index.js'
import { expansionsRepository } from '../server/repositories/expansionsRepository.js'
import { app } from '../server/app.js'

describe('ExpansionsRepository Seam & Database Integration', () => {
  beforeAll(async () => {
    await ensureDatabaseTables()
  })

  it('handles expansion insertion and retrieval', async () => {
    const testExpansion = {
      id: 'test-exp-1',
      name: 'Escuridão Absoluta',
      slug: 'escuridao-absoluta-test',
      series: 'Mega Evolução',
      url: 'https://www.cartasdepokemon.com.br/megaevolucao/escuridao-absoluta',
      baseCount: 84,
      secretCount: 36,
      investmentScore: 82.5,
      chaseCardName: 'Mega Darkrai ex',
      chaseCardPrice: 791.16,
      totalSecretPoolValue: 3450.0,
      avgSecretPrice: 95.83,
      lastScrapedAt: new Date(),
    }

    const saved = await expansionsRepository.upsertExpansion(testExpansion)
    expect(saved).toBeDefined()
    expect(saved.slug).toBe('escuridao-absoluta-test')
    expect(saved.baseCount).toBe(84)
    expect(saved.secretCount).toBe(36)

    const fetched = await expansionsRepository.getExpansionBySlug('escuridao-absoluta-test')
    expect(fetched).toBeDefined()
    expect(fetched?.name).toBe('Escuridão Absoluta')
    expect(fetched?.investmentScore).toBe(82.5)
  })

  it('updates existing expansion when upserting by slug', async () => {
    const updated = await expansionsRepository.upsertExpansion({
      id: 'test-exp-1-new-id',
      name: 'Escuridão Absoluta Updated',
      slug: 'escuridao-absoluta-test',
      series: 'Mega Evolução',
      url: 'https://www.cartasdepokemon.com.br/megaevolucao/escuridao-absoluta',
      baseCount: 84,
      secretCount: 36,
      investmentScore: 90.0,
      chaseCardName: 'Mega Darkrai ex',
      chaseCardPrice: 850.0,
      totalSecretPoolValue: 3800.0,
      avgSecretPrice: 105.5,
      lastScrapedAt: new Date(),
    })

    expect(updated.name).toBe('Escuridão Absoluta Updated')
    expect(updated.investmentScore).toBe(90.0)
  })

  it('saves cards and queries secret cards correctly', async () => {
    const cards = [
      {
        id: 'card-1',
        expansionId: 'test-exp-1',
        localId: 10,
        name: 'Basic Pikachu',
        rarity: 'common',
        imageUrl: 'https://example.com/10.png',
        marketPrice: 2.5,
        isSecret: false,
        types: 'lightning',
      },
      {
        id: 'card-116',
        expansionId: 'test-exp-1',
        localId: 116,
        name: 'Mega Darkrai ex (Special Art)',
        rarity: 'special-illustration-rare',
        imageUrl: 'https://example.com/116.png',
        marketPrice: 791.16,
        isSecret: true,
        types: 'darkness',
      },
      {
        id: 'card-120',
        expansionId: 'test-exp-1',
        localId: 120,
        name: 'Mega Darkrai ex (Gold)',
        rarity: 'hyper-rare',
        imageUrl: 'https://example.com/120.png',
        marketPrice: 450.0,
        isSecret: true,
        types: 'darkness',
      },
    ]

    await expansionsRepository.upsertCards(cards)

    const secrets = await expansionsRepository.getSecretCardsByExpansionId('test-exp-1')
    expect(secrets.length).toBe(2)
    // Ordered by price desc
    expect(secrets[0].localId).toBe(116)
    expect(secrets[0].marketPrice).toBe(791.16)
    expect(secrets[1].localId).toBe(120)
  })

  it('records and retrieves price history', async () => {
    const cardId = `card-hist-${Date.now()}`
    // insert card first so foreign key is valid
    await expansionsRepository.upsertCards([
      {
        id: cardId,
        expansionId: 'test-exp-1',
        localId: 999,
        name: 'Historical Card',
        rarity: 'rare',
        marketPrice: 750.0,
        isSecret: true,
      },
    ])

    await expansionsRepository.recordPriceHistory(cardId, 750.0, new Date('2026-10-01'))
    await expansionsRepository.recordPriceHistory(cardId, 791.16, new Date('2026-10-04'))

    const history = await expansionsRepository.getPriceHistory(cardId)
    expect(history.length).toBe(2)
    expect(history[0].marketPrice).toBe(791.16)
  })

  it('responds with health check status', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.status).toBe('ok')
    expect(body.db).toBe('connected')
  })
})
