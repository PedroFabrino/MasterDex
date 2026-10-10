import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  normalizePokemonName,
  filterPokemonByName,
  getPokemonPageAndRegion,
  BinderSearchBar,
} from '../src/components/BinderSearchBar.js'
import { POKEMON } from '../src/data/pokemon.js'

describe('BinderSearchBar - Species Name Matching Logic (Ticket #24 / Issue #33)', () => {
  it('normalizes diacritics and casing accurately', () => {
    expect(normalizePokemonName('Flabébé')).toBe('flabebe')
    expect(normalizePokemonName('FLABÉBÉ')).toBe('flabebe')
    expect(normalizePokemonName('Pikachu')).toBe('pikachu')
    expect(normalizePokemonName('Farfetch’d')).toBe('farfetch’d')
  })

  it('matches species names case-insensitively and diacritic-insensitively via substring', () => {
    const charResults = filterPokemonByName(POKEMON, 'char')
    const charNames = charResults.map((p) => p.name)
    expect(charNames).toContain('Charmander')
    expect(charNames).toContain('Charmeleon')
    expect(charNames).toContain('Charizard')

    const flabeResults = filterPokemonByName(POKEMON, 'flabe')
    expect(flabeResults.map((p) => p.name)).toContain('Flabébé')

    const poryResults = filterPokemonByName(POKEMON, 'pory')
    expect(poryResults.map((p) => p.name)).toEqual(['Porygon', 'Porygon2', 'Porygon-Z'])
  })

  it('matches species by Pokédex number with or without hash prefix', () => {
    const pikachuResults = filterPokemonByName(POKEMON, '25')
    expect(pikachuResults.map((p) => p.name)).toContain('Pikachu')

    const bulbasaurResults = filterPokemonByName(POKEMON, '#1')
    expect(bulbasaurResults.map((p) => p.name)).toContain('Bulbasaur')
  })

  it('matches species by assigned card collector number when collected is provided', () => {
    const mockCollected = {
      6: {
        pokemonId: 6,
        tcgCard: {
          id: 'base1-4',
          name: 'Charizard',
          setName: 'Base Set',
          number: '4/102',
          imageUrl: 'https://example.com/card.png',
        },
      },
      173: {
        pokemonId: 173,
        tcgCard: {
          id: 'sv3-172',
          name: 'Cleffa',
          setName: 'Obsidian Flames',
          number: '172/132',
          imageUrl: 'https://example.com/cleffa.png',
        },
      },
    }

    const charResults = filterPokemonByName(POKEMON, '4/102', mockCollected)
    expect(charResults.map((p) => p.name)).toContain('Charizard')

    const cleffaResults = filterPokemonByName(POKEMON, '172/132', mockCollected)
    expect(cleffaResults.map((p) => p.name)).toContain('Cleffa')
  })

  it('computes correct page and region for any National Dex Pokémon', () => {
    const bulbasaur = POKEMON.find((p) => p.id === 1)!
    const pidgey = POKEMON.find((p) => p.id === 16)!
    const pidgeotto = POKEMON.find((p) => p.id === 17)!
    const pikachu = POKEMON.find((p) => p.id === 25)!
    const pecharunt = POKEMON.find((p) => p.id === 1025)!

    expect(getPokemonPageAndRegion(bulbasaur.id)).toEqual({ page: 1, regionId: 'kanto', regionName: 'Kanto' })
    expect(getPokemonPageAndRegion(pidgey.id)).toEqual({ page: 1, regionId: 'kanto', regionName: 'Kanto' })
    expect(getPokemonPageAndRegion(pidgeotto.id)).toEqual({ page: 2, regionId: 'kanto', regionName: 'Kanto' })
    expect(getPokemonPageAndRegion(pikachu.id)).toEqual({ page: 2, regionId: 'kanto', regionName: 'Kanto' })
    expect(getPokemonPageAndRegion(pecharunt.id)).toEqual({ page: 65, regionId: 'paldea', regionName: 'Paldea' })
  })

  it('returns empty array when query is empty or only whitespace', () => {
    expect(filterPokemonByName(POKEMON, '')).toEqual([])
    expect(filterPokemonByName(POKEMON, '   ')).toEqual([])
  })
})

describe('BinderSearchBar - Component UI & Static Markup (Ticket #24 / Issue #33)', () => {
  it('renders search input with shortcut badge and localized placeholder', () => {
    const html = renderToStaticMarkup(
      React.createElement(BinderSearchBar, {
        onSelectPokemon: vi.fn(),
        collected: {},
      })
    )

    expect(html).toContain('Ctrl+K')
    expect(html).toContain('input')
    expect(html).toContain('Buscar Pokémon')
  })

  it('renders autocomplete results with species name, sprite, and location pill when open', () => {
    const html = renderToStaticMarkup(
      React.createElement(BinderSearchBar, {
        onSelectPokemon: vi.fn(),
        collected: {
          25: { pokemonId: 25, tcgCard: null },
          6: {
            pokemonId: 6,
            tcgCard: {
              id: 'base1-4',
              name: 'Charizard',
              setName: 'Base Set',
              number: '4/102',
              imageUrl: 'https://example.com/card.png',
            },
          },
        },
        initialQuery: 'Pikachu',
        forceOpen: true,
      })
    )

    expect(html).toContain('Pikachu')
    expect(html).toContain('Pág. 2 · Kanto')
    expect(html).toContain('Capturado')
  })

  it('renders rich status badge with collector number when a card is linked (Issue #51/#52)', () => {
    const html = renderToStaticMarkup(
      React.createElement(BinderSearchBar, {
        onSelectPokemon: vi.fn(),
        collected: {
          6: {
            pokemonId: 6,
            tcgCard: {
              id: 'base1-4',
              name: 'Charizard',
              setName: 'Base Set',
              number: '4/102',
              imageUrl: 'https://example.com/card.png',
            },
          },
          173: {
            pokemonId: 173,
            tcgCard: {
              id: 'sv3-172',
              name: 'Cleffa',
              setName: 'Obsidian Flames',
              number: '172/132',
              imageUrl: 'https://example.com/cleffa.png',
            },
          },
        },
        initialQuery: 'Cleffa',
        forceOpen: true,
      })
    )

    expect(html).toContain('Cleffa')
    expect(html).toContain('Capturado · 172/132')
  })

  it('renders fallback card badge when assigned card has no number', () => {
    const html = renderToStaticMarkup(
      React.createElement(BinderSearchBar, {
        onSelectPokemon: vi.fn(),
        collected: {
          25: {
            pokemonId: 25,
            tcgCard: {
              id: 'custom-card',
              name: 'Pikachu Special',
              setName: 'Promo',
              number: '',
              imageUrl: 'https://example.com/pika.png',
            },
          },
        },
        initialQuery: 'Pikachu',
        forceOpen: true,
      })
    )

    expect(html).toContain('Capturado · Carta TCG')
  })

  it('does not render any collection status badge for uncollected species', () => {
    const html = renderToStaticMarkup(
      React.createElement(BinderSearchBar, {
        onSelectPokemon: vi.fn(),
        collected: {},
        initialQuery: 'Mew',
        forceOpen: true,
      })
    )

    expect(html).toContain('Mew')
    expect(html).not.toContain('Capturado')
    expect(html).not.toContain('Carta TCG')
  })

  it('renders no results message when query has no matches and open', () => {
    const html = renderToStaticMarkup(
      React.createElement(BinderSearchBar, {
        onSelectPokemon: vi.fn(),
        collected: {},
        initialQuery: 'xyznonexistentpokemon',
        forceOpen: true,
      })
    )

    expect(html).toContain('Nenhum Pokémon encontrado')
  })
})
