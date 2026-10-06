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
  isHolo?: boolean
}

export interface CollectedSlot {
  pokemonId: number
  tcgCard: TcgCard | null // null = default sprite
}

const spriteBase = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon"

const KANTO_MOCK_POKEMON: Pokemon[] = [
  { id: 1,  name: "Bulbasaur",  spriteUrl: `${spriteBase}/1.png`  },
  { id: 2,  name: "Ivysaur",    spriteUrl: `${spriteBase}/2.png`  },
  { id: 3,  name: "Venusaur",   spriteUrl: `${spriteBase}/3.png`  },
  { id: 4,  name: "Charmander", spriteUrl: `${spriteBase}/4.png`  },
  { id: 5,  name: "Charmeleon", spriteUrl: `${spriteBase}/5.png`  },
  { id: 6,  name: "Charizard",  spriteUrl: `${spriteBase}/6.png`  },
  { id: 7,  name: "Squirtle",   spriteUrl: `${spriteBase}/7.png`  },
  { id: 8,  name: "Wartortle",  spriteUrl: `${spriteBase}/8.png`  },
  { id: 9,  name: "Blastoise",  spriteUrl: `${spriteBase}/9.png`  },
  { id: 10, name: "Caterpie",   spriteUrl: `${spriteBase}/10.png` },
  { id: 11, name: "Metapod",    spriteUrl: `${spriteBase}/11.png` },
  { id: 12, name: "Butterfree", spriteUrl: `${spriteBase}/12.png` },
  { id: 13, name: "Weedle",     spriteUrl: `${spriteBase}/13.png` },
  { id: 14, name: "Kakuna",     spriteUrl: `${spriteBase}/14.png` },
  { id: 15, name: "Beedrill",   spriteUrl: `${spriteBase}/15.png` },
  { id: 16, name: "Pidgey",     spriteUrl: `${spriteBase}/16.png` },
  { id: 17, name: "Pidgeotto",  spriteUrl: `${spriteBase}/17.png` },
  { id: 18, name: "Pidgeot",    spriteUrl: `${spriteBase}/18.png` },
  { id: 19, name: "Rattata",    spriteUrl: `${spriteBase}/19.png` },
  { id: 20, name: "Raticate",   spriteUrl: `${spriteBase}/20.png` },
  { id: 21, name: "Spearow",    spriteUrl: `${spriteBase}/21.png` },
  { id: 22, name: "Fearow",     spriteUrl: `${spriteBase}/22.png` },
  { id: 23, name: "Ekans",      spriteUrl: `${spriteBase}/23.png` },
  { id: 24, name: "Arbok",      spriteUrl: `${spriteBase}/24.png` },
  { id: 25, name: "Pikachu",    spriteUrl: `${spriteBase}/25.png` },
  { id: 26, name: "Raichu",     spriteUrl: `${spriteBase}/26.png` },
  { id: 27, name: "Sandshrew",  spriteUrl: `${spriteBase}/27.png` },
  { id: 28, name: "Sandslash",  spriteUrl: `${spriteBase}/28.png` },
  { id: 29, name: "Nidoran♀",  spriteUrl: `${spriteBase}/29.png` },
  { id: 30, name: "Nidorina",   spriteUrl: `${spriteBase}/30.png` },
  { id: 31, name: "Nidoqueen",  spriteUrl: `${spriteBase}/31.png` },
  { id: 32, name: "Nidoran♂",  spriteUrl: `${spriteBase}/32.png` },
  { id: 33, name: "Nidorino",   spriteUrl: `${spriteBase}/33.png` },
  { id: 34, name: "Nidoking",   spriteUrl: `${spriteBase}/34.png` },
  { id: 35, name: "Clefairy",   spriteUrl: `${spriteBase}/35.png` },
  { id: 36, name: "Clefable",   spriteUrl: `${spriteBase}/36.png` },
  { id: 37, name: "Vulpix",     spriteUrl: `${spriteBase}/37.png` },
  { id: 38, name: "Ninetales",  spriteUrl: `${spriteBase}/38.png` },
  { id: 39, name: "Jigglypuff", spriteUrl: `${spriteBase}/39.png` },
  { id: 40, name: "Wigglytuff", spriteUrl: `${spriteBase}/40.png` },
  { id: 41, name: "Zubat",      spriteUrl: `${spriteBase}/41.png` },
  { id: 42, name: "Golbat",     spriteUrl: `${spriteBase}/42.png` },
  { id: 43, name: "Oddish",     spriteUrl: `${spriteBase}/43.png` },
  { id: 44, name: "Gloom",      spriteUrl: `${spriteBase}/44.png` },
  { id: 45, name: "Vileplume",  spriteUrl: `${spriteBase}/45.png` },
  { id: 46, name: "Paras",      spriteUrl: `${spriteBase}/46.png` },
  { id: 47, name: "Parasect",   spriteUrl: `${spriteBase}/47.png` },
  { id: 48, name: "Venonat",    spriteUrl: `${spriteBase}/48.png` },
]

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

const GENERATED_POKEMON: Pokemon[] = Array.from({ length: 386 - KANTO_MOCK_POKEMON.length }, (_, index) => {
  const id = KANTO_MOCK_POKEMON.length + index + 1
  return {
    id,
    name: `Dex #${String(id).padStart(3, "0")}`,
    spriteUrl: `${spriteBase}/${id}.png`,
  }
})

export const POKEMON: Pokemon[] = [...KANTO_MOCK_POKEMON, ...GENERATED_POKEMON]

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
  { id: "kanto", name: "Kanto", subtitle: "Original 151", dexStart: 1, dexEnd: 151, pageStart: 1, pageEnd: 10, accent: "text-red-300" },
  { id: "johto", name: "Johto", subtitle: "New adventures", dexStart: 152, dexEnd: 251, pageStart: 11, pageEnd: 16, accent: "text-amber-300" },
  { id: "hoenn", name: "Hoenn", subtitle: "#252 onward", dexStart: 252, dexEnd: 386, pageStart: 16, pageEnd: 25, accent: "text-cyan-300" },
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
