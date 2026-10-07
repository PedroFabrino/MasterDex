export interface Pokemon {
  id: number
  name: string
  generation: number
  types: string[]
  sprites: {
    front_default: string
    front_shiny?: string
    artwork?: string
  }
}

export type ExpansionCategory = 'booster' | 'promo'

export interface Expansion {
  id: string
  name: string
  slug: string
  series?: string | null
  url: string
  baseCount: number
  secretCount: number
  investmentScore: number
  chaseCardName?: string | null
  chaseCardPrice?: number | null
  totalSecretPoolValue?: number | null
  avgSecretPrice?: number | null
  lastScrapedAt: number
  logoUrl?: string | null
  symbolUrl?: string | null
  collectionGapYield?: number
  category?: ExpansionCategory
}

export interface Card {
  id: string
  expansionId: string
  localId: number
  name: string
  rarity: string
  imageUrl?: string | null
  marketPrice: number
  isSecret: boolean
  types?: string | null
  pokedexId?: number | null
}

export interface PriceHistory {
  id: string
  cardId: string
  marketPrice: number
  recordedAt: number
}

export interface InvestmentMetrics {
  chaseCardCeiling: number
  avgSecretPrice: number
  secretPoolValue: number
  secretDensity: number
  investmentScore: number
}

export interface CollectorProfile {
  id: string
  googleId?: string | null
  email: string
  name: string
  avatarUrl?: string | null
  seededFromSheet: boolean
  createdAt: number
}

export interface UserPokemon {
  id: string
  userId: string
  pokedexId: number
  collected: boolean
  cardId?: string | null
  cardName?: string | null
  cardImageUrl?: string | null
  cardLanguage?: string | null
  updatedAt: number
}

export interface TcgCardSearchResult {
  id: string
  localId: string
  name: string
  set: {
    id: string
    name: string
    total?: number
  }
  imageUrl: string
  thumbnailUrl?: string
  rarity?: string
  language?: string
}

export interface CollectorPreferences {
  targetRarity: string
  hiddenExpansions: string[]
}

