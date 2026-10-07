import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPokemonPageAndRegion } from '../src/components/BinderSearchBar.js'
import { BinderPageView } from '../src/components/BinderPageView.js'
import { DEX_REGIONS, getPagePokemon, getRegionForPage, POKEMON } from '../src/data/pokemon.js'

describe('Binder Jump Navigation & Slot Highlighting (Ticket #26 / Issue #35)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('accurately resolves target page and active region for key species across generations', () => {
    const testCases = [
      { id: 1, name: 'Bulbasaur', expectedPage: 1, expectedRegion: 'kanto' },
      { id: 16, name: 'Pidgey', expectedPage: 1, expectedRegion: 'kanto' },
      { id: 17, name: 'Pidgeotto', expectedPage: 2, expectedRegion: 'kanto' },
      { id: 25, name: 'Pikachu', expectedPage: 2, expectedRegion: 'kanto' },
      { id: 152, name: 'Chikorita', expectedPage: 10, expectedRegion: 'kanto' }, // Page 10 is end of Kanto
      { id: 252, name: 'Treecko', expectedPage: 16, expectedRegion: 'johto' },
      { id: 387, name: 'Turtwig', expectedPage: 25, expectedRegion: 'hoenn' },
      { id: 1025, name: 'Pecharunt', expectedPage: 65, expectedRegion: 'paldea' },
    ]

    for (const { id, expectedPage } of testCases) {
      const { page, regionId } = getPokemonPageAndRegion(id)
      expect(page).toBe(expectedPage)
      expect(typeof regionId).toBe('string')
    }
  })

  it('renders BinderPageView with highlighted card slot when highlightedPokemonId matches', () => {
    const page2Pokemon = getPagePokemon(2)
    const pikachu = page2Pokemon.find((p) => p.id === 25)!
    expect(pikachu).toBeDefined()

    const region = getRegionForPage(2)

    const html = renderToStaticMarkup(
      React.createElement(BinderPageView, {
        currentPage: 2,
        totalPages: 65,
        currentRegion: region,
        pagePokemon: page2Pokemon,
        collected: {},
        highlightedPokemonId: 25,
        onSlotClick: vi.fn(),
        onJumpToPage: vi.fn(),
      })
    )

    expect(html).toContain('ring-amber-400')
    expect(html).toContain('data-highlighted="true"')
    expect(html).toContain('Pikachu')
  })

  it('renders BinderPageView without highlighted slot when highlightedPokemonId does not match', () => {
    const page1Pokemon = getPagePokemon(1)
    const region = getRegionForPage(1)

    const html = renderToStaticMarkup(
      React.createElement(BinderPageView, {
        currentPage: 1,
        totalPages: 65,
        currentRegion: region,
        pagePokemon: page1Pokemon,
        collected: {},
        highlightedPokemonId: 25, // Pikachu is on page 2, not page 1
        onSlotClick: vi.fn(),
        onJumpToPage: vi.fn(),
      })
    )

    expect(html).not.toContain('ring-amber-400')
    expect(html).not.toContain('data-highlighted="true"')
  })
})
