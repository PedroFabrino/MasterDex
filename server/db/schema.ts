import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const collectorProfiles = sqliteTable('collector_profiles', {
  id: text('id').primaryKey(),
  googleId: text('google_id').unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  seededFromSheet: integer('seeded_from_sheet', { mode: 'boolean' }).notNull().default(false),
  targetRarity: text('target_rarity').notNull().default('any'),
  hiddenExpansions: text('hidden_expansions').notNull().default('[]'),
  geminiApiKey: text('gemini_api_key'),
  favoredLanguages: text('favored_languages').notNull().default('["pt", "en", "ja"]'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const userPokemon = sqliteTable('user_pokemon', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => collectorProfiles.id, { onDelete: 'cascade' }),
  pokedexId: integer('pokedex_id').notNull(),
  collected: integer('collected', { mode: 'boolean' }).notNull().default(false),
  cardId: text('card_id'),
  cardName: text('card_name'),
  cardImageUrl: text('card_image_url'),
  cardLanguage: text('card_language').default('en'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const expansions = sqliteTable('expansions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  series: text('series'),
  url: text('url').notNull(),
  baseCount: integer('base_count').notNull(),
  secretCount: integer('secret_count').notNull(),
  investmentScore: real('investment_score').notNull(),
  chaseCardName: text('chase_card_name'),
  chaseCardPrice: real('chase_card_price'),
  totalSecretPoolValue: real('total_secret_pool_value'),
  avgSecretPrice: real('avg_secret_price'),
  lastScrapedAt: integer('last_scraped_at', { mode: 'timestamp' }).notNull(),
  logoUrl: text('logo_url'),
  symbolUrl: text('symbol_url'),
})

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  expansionId: text('expansion_id').notNull().references(() => expansions.id, { onDelete: 'cascade' }),
  localId: integer('local_id').notNull(),
  name: text('name').notNull(),
  rarity: text('rarity').notNull(),
  imageUrl: text('image_url'),
  marketPrice: real('market_price').notNull(),
  isSecret: integer('is_secret', { mode: 'boolean' }).notNull(),
  types: text('types'),
  pokedexId: integer('pokedex_id'),
})

export const priceHistory = sqliteTable('price_history', {
  id: text('id').primaryKey(),
  cardId: text('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  marketPrice: real('market_price').notNull(),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull(),
})

export const trackedExpansions = sqliteTable('tracked_expansions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => collectorProfiles.id, { onDelete: 'cascade' }),
  expansionId: text('expansion_id').notNull().references(() => expansions.id, { onDelete: 'cascade' }),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
})

export const cardPrices = sqliteTable('card_prices', {
  id: text('id').primaryKey(),
  cardId: text('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  nativePrice: real('native_price').notNull(),
  currency: text('currency').notNull(),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull(),
})

export const exchangeRates = sqliteTable('exchange_rates', {
  pair: text('pair').primaryKey(),
  rate: real('rate').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
})

export type ExpansionRecord = typeof expansions.$inferSelect
export type InsertExpansion = typeof expansions.$inferInsert
export type CardRecord = typeof cards.$inferSelect
export type InsertCard = typeof cards.$inferInsert
export type CardPriceRecord = typeof cardPrices.$inferSelect
export type InsertCardPrice = typeof cardPrices.$inferInsert
export type ExchangeRateRecord = typeof exchangeRates.$inferSelect
export type InsertExchangeRate = typeof exchangeRates.$inferInsert
export type CollectorProfileRecord = typeof collectorProfiles.$inferSelect
export type UserPokemonRecord = typeof userPokemon.$inferSelect
