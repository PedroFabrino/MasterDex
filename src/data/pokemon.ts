import pokedexData from "./pokedex.json"

export interface Pokemon {
  id: number
  name: string
  spriteUrl: string
}

export interface TcgCard {
  id: string
  name: string
  setName: string
  number: string
  imageUrl: string
  thumbnailUrl?: string
  isHolo?: boolean
  language?: string
}


export interface CollectedSlot {
  pokemonId: number
  tcgCard: TcgCard | null // null = default sprite
  cardLanguage?: string
}

// Pre-built TCG card mock data per Pokémon
export const TCG_CARDS: Record<number, TcgCard[]> = {
  6: [
    {
      id: "base1-4",
      name: "Charizard",
      setName: "Base Set",
      number: "4/102",
      imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
      isHolo: true,
    },
    {
      id: "base4-3",
      name: "Charizard",
      setName: "Base Set 2",
      number: "3/130",
      imageUrl: "https://images.pokemontcg.io/base4/3_hires.png",
      isHolo: true,
    },
    {
      id: "swsh45-18",
      name: "Charizard V",
      setName: "Shining Fates",
      number: "18/30",
      imageUrl: "https://images.pokemontcg.io/swsh45/18_hires.png",
      isHolo: true,
    },
  ],
  9: [
    {
      id: "base1-2",
      name: "Blastoise",
      setName: "Base Set",
      number: "2/102",
      imageUrl: "https://images.pokemontcg.io/base1/2_hires.png",
      isHolo: true,
    },
    {
      id: "swshp-88",
      name: "Blastoise",
      setName: "SWSH Promos",
      number: "SWSH088",
      imageUrl: "https://images.pokemontcg.io/swshp/SWSH088_hires.png",
    },
  ],
  25: [
    {
      id: "base1-58",
      name: "Pikachu",
      setName: "Base Set",
      number: "58/102",
      imageUrl: "https://images.pokemontcg.io/base1/58_hires.png",
    },
    {
      id: "swsh9tg-tg30",
      name: "Pikachu",
      setName: "Brilliant Stars",
      number: "TG30/TG30",
      imageUrl: "https://images.pokemontcg.io/swsh9tg/TG30_hires.png",
      isHolo: true,
    },
  ],
  1: [
    {
      id: "base1-44",
      name: "Bulbasaur",
      setName: "Base Set",
      number: "44/102",
      imageUrl: "https://images.pokemontcg.io/base1/44_hires.png",
    },
  ],
}

export const POKEMON: Pokemon[] = pokedexData

export interface DexRegion {
  id: string
  name: string
  subtitle: string
  dexStart: number
  dexEnd: number
  pageStart: number
  pageEnd: number
  accent: string
}

export const DEX_REGIONS: DexRegion[] = [
  { id: "kanto", name: "Kanto", subtitle: "Original 151", dexStart: 1, dexEnd: 151, pageStart: 1, pageEnd: 10, accent: "text-red-400" },
  { id: "johto", name: "Johto", subtitle: "New adventures", dexStart: 152, dexEnd: 251, pageStart: 11, pageEnd: 16, accent: "text-amber-400" },
  { id: "hoenn", name: "Hoenn", subtitle: "Land & sea", dexStart: 252, dexEnd: 386, pageStart: 16, pageEnd: 25, accent: "text-emerald-400" },
  { id: "sinnoh", name: "Sinnoh", subtitle: "Myths & legends", dexStart: 387, dexEnd: 493, pageStart: 25, pageEnd: 31, accent: "text-blue-400" },
  { id: "unova", name: "Unova", subtitle: "Black & White", dexStart: 494, dexEnd: 649, pageStart: 31, pageEnd: 41, accent: "text-zinc-300" },
  { id: "kalos", name: "Kalos", subtitle: "Mega evolution", dexStart: 650, dexEnd: 721, pageStart: 41, pageEnd: 46, accent: "text-pink-400" },
  { id: "alola", name: "Alola", subtitle: "Sun & Moon", dexStart: 722, dexEnd: 809, pageStart: 46, pageEnd: 51, accent: "text-orange-400" },
  { id: "galar", name: "Galar", subtitle: "Sword & Shield", dexStart: 810, dexEnd: 905, pageStart: 51, pageEnd: 57, accent: "text-cyan-400" },
  { id: "paldea", name: "Paldea", subtitle: "Scarlet & Violet", dexStart: 906, dexEnd: 1025, pageStart: 57, pageEnd: 65, accent: "text-violet-400" },
]

export function getPagePokemon(page: number): Pokemon[] {
  const start = Math.max(0, (page - 1) * 16)
  return POKEMON.slice(start, start + 16)
}

export function getTotalPages(): number {
  return Math.ceil(POKEMON.length / 16)
}

export function getRegionForPage(page: number): DexRegion {
  return DEX_REGIONS.find((region) => page >= region.pageStart && page <= region.pageEnd) ?? DEX_REGIONS[0]
}
