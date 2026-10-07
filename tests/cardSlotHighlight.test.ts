import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CardSlot } from '../src/components/CardSlot.js'

describe('CardSlot Highlight Animation & Styling (Ticket #25 / Issue #34)', () => {
  const mockPokemon = {
    id: 25,
    name: 'Pikachu',
    spriteUrl: 'https://example.com/pikachu.png',
  }

  it('renders normal slot styling when isHighlighted is false or undefined', () => {
    const html = renderToStaticMarkup(
      React.createElement(CardSlot, {
        pokemon: mockPokemon,
        slot: undefined,
        onClick: vi.fn(),
        isHighlighted: false,
      })
    )

    expect(html).not.toContain('ring-amber-400')
    expect(html).not.toContain('data-highlighted="true"')
  })

  it('renders amber pulsing glow ring and data-highlighted attribute when isHighlighted is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(CardSlot, {
        pokemon: mockPokemon,
        slot: undefined,
        onClick: vi.fn(),
        isHighlighted: true,
      })
    )

    expect(html).toContain('ring-amber-400')
    expect(html).toContain('animate-pulse')
    expect(html).toContain('data-highlighted="true"')
  })

  it('renders highlight ring even on collected and assigned TCG card slots', () => {
    const htmlCollected = renderToStaticMarkup(
      React.createElement(CardSlot, {
        pokemon: mockPokemon,
        slot: { pokemonId: 25, tcgCard: null },
        onClick: vi.fn(),
        isHighlighted: true,
      })
    )
    expect(htmlCollected).toContain('ring-amber-400')
    expect(htmlCollected).toContain('animate-pulse')

    const htmlTcg = renderToStaticMarkup(
      React.createElement(CardSlot, {
        pokemon: mockPokemon,
        slot: {
          pokemonId: 25,
          tcgCard: {
            id: 'base1-58',
            name: 'Pikachu',
            setName: 'Base Set',
            number: '58/102',
            imageUrl: 'https://example.com/card.png',
          },
        },
        onClick: vi.fn(),
        isHighlighted: true,
      })
    )
    expect(htmlTcg).toContain('ring-amber-400')
    expect(htmlTcg).toContain('animate-pulse')
  })
})
