import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CardSelectorGrid } from '../src/components/CardSelectorGrid.js'
import type { Pokemon, TcgCard, CollectedSlot } from '../src/data/pokemon.js'

describe('CardSelectorGrid Priority Slot & Deduplication (Issue #54)', () => {
  const mockPokemon: Pokemon = {
    id: 6,
    name: 'Charizard',
    spriteUrl: 'https://example.com/charizard-sprite.png',
  }

  const assignedCard: TcgCard = {
    id: 'base1-4',
    name: 'Charizard',
    setName: 'Base Set',
    number: '4/102',
    imageUrl: 'https://example.com/charizard-base1.png',
    thumbnailUrl: 'https://example.com/charizard-base1-thumb.png',
    isHolo: true,
    language: 'en',
  }

  const otherCard1: TcgCard = {
    id: 'base4-3',
    name: 'Charizard',
    setName: 'Base Set 2',
    number: '3/130',
    imageUrl: 'https://example.com/charizard-base4.png',
    language: 'en',
  }

  const otherCard2: TcgCard = {
    id: 'swsh45-18',
    name: 'Charizard V',
    setName: 'Shining Fates',
    number: '18/30',
    imageUrl: 'https://example.com/charizard-swsh.png',
    language: 'en',
  }

  it('renders default sprite as Slot #1 and previously selected card as Slot #2 when card is assigned', () => {
    const slot: CollectedSlot = {
      pokemonId: 6,
      tcgCard: assignedCard,
      cardLanguage: 'en',
      cardCondition: 'DMG',
    }

    const html = renderToStaticMarkup(
      React.createElement(CardSelectorGrid, {
        pokemon: mockPokemon,
        slot,
        liveCards: [otherCard1, otherCard2],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        debouncedQuery: 'Charizard',
        onSelectCard: vi.fn(),
        onLoadMore: vi.fn(),
        sentinelRef: { current: null },
      })
    )

    // Slot #1: sprite anchor
    expect(html).toContain('data-testid="default-sprite-anchor"')
    // Slot #2: previously selected card
    expect(html).toContain('data-testid="previously-selected-card"')
    expect(html).toContain('Base Set')
    expect(html).toContain('4/102')
    // Highlights the selected card
    expect(html).toContain('border-violet-500')
    // Shows the condition badge on the previously selected card
    expect(html).toContain('DMG')

    // Remaining cards are also present
    expect(html).toContain('Base Set 2')
    expect(html).toContain('Shining Fates')
  })

  it('preserves previously selected card in Slot #2 even when filtered out of liveCards', () => {
    const slot: CollectedSlot = {
      pokemonId: 6,
      tcgCard: assignedCard,
      cardLanguage: 'en',
      cardCondition: 'NM',
    }

    // Suppose an active filter (e.g. Japanese or Secret Rare) returned 0 cards or only a different card
    const html = renderToStaticMarkup(
      React.createElement(CardSelectorGrid, {
        pokemon: mockPokemon,
        slot,
        liveCards: [otherCard2], // assignedCard is NOT in liveCards
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        debouncedQuery: 'Charizard',
        onSelectCard: vi.fn(),
        onLoadMore: vi.fn(),
        sentinelRef: { current: null },
      })
    )

    // Slot #2 still displays the assigned card so user does not need to re-search
    expect(html).toContain('data-testid="previously-selected-card"')
    expect(html).toContain('Base Set')
    expect(html).toContain('4/102')
    expect(html).toContain('Shining Fates')
  })

  it('deduplicates previously selected card if it is also returned in liveCards', () => {
    const slot: CollectedSlot = {
      pokemonId: 6,
      tcgCard: assignedCard,
      cardLanguage: 'en',
    }

    // liveCards contains assignedCard plus others
    const html = renderToStaticMarkup(
      React.createElement(CardSelectorGrid, {
        pokemon: mockPokemon,
        slot,
        liveCards: [assignedCard, otherCard1],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        debouncedQuery: 'Charizard',
        onSelectCard: vi.fn(),
        onLoadMore: vi.fn(),
        sentinelRef: { current: null },
      })
    )

    // Should contain data-testid="previously-selected-card" exactly once
    const prevMatches = html.match(/data-testid="previously-selected-card"/g)
    expect(prevMatches).toHaveLength(1)

    // And Base Set should only appear once in card set names
    const baseSetMatches = html.match(/Base Set<\/span>/g)
    expect(baseSetMatches).toHaveLength(1)
  })

  it('does not render Slot #2 previously selected card when slot has no assigned card', () => {
    const slot: CollectedSlot = {
      pokemonId: 6,
      tcgCard: null,
    }

    const html = renderToStaticMarkup(
      React.createElement(CardSelectorGrid, {
        pokemon: mockPokemon,
        slot,
        liveCards: [otherCard1, otherCard2],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        debouncedQuery: 'Charizard',
        onSelectCard: vi.fn(),
        onLoadMore: vi.fn(),
        sentinelRef: { current: null },
      })
    )

    expect(html).toContain('data-testid="default-sprite-anchor"')
    expect(html).not.toContain('data-testid="previously-selected-card"')
    expect(html).toContain('Base Set 2')
    expect(html).toContain('Shining Fates')
  })
})
