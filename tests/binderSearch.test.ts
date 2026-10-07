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
