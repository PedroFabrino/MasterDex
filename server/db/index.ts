import { createClient, type Client } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema.js'

const databaseUrl = process.env.DATABASE_URL || 'file:local.db'
const authToken = process.env.DATABASE_AUTH_TOKEN

export const rawClient: Client = createClient({
  url: databaseUrl,
  authToken: authToken,
})

export const db: LibSQLDatabase<typeof schema> = drizzle(rawClient, { schema })

export async function ensureDatabaseTables(client: Client = rawClient): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS collector_profiles (
      id TEXT PRIMARY KEY,
      google_id TEXT UNIQUE,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      seeded_from_sheet INTEGER NOT NULL DEFAULT 0,
      target_rarity TEXT NOT NULL DEFAULT 'any',
      hidden_expansions TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_pokemon (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES collector_profiles(id) ON DELETE CASCADE,
      pokedex_id INTEGER NOT NULL,
      collected INTEGER NOT NULL DEFAULT 0,
      card_id TEXT,
      card_name TEXT,
      card_image_url TEXT,
      card_language TEXT DEFAULT 'en',
      updated_at INTEGER NOT NULL
    );
  `)

  // Defensive migrations for existing databases
  for (const col of ["target_rarity TEXT NOT NULL DEFAULT 'any'", "hidden_expansions TEXT NOT NULL DEFAULT '[]'"]) {
    try {
      await client.execute(`ALTER TABLE collector_profiles ADD COLUMN ${col};`)
    } catch {
      // Column already exists, safe to ignore
    }
  }

  for (const col of ['card_id TEXT', 'card_name TEXT', 'card_image_url TEXT', "card_language TEXT DEFAULT 'en'"]) {
    try {
      await client.execute(`ALTER TABLE user_pokemon ADD COLUMN ${col};`)
    } catch {
      // Column already exists, safe to ignore
    }
  }

  for (const col of ['logo_url TEXT', 'symbol_url TEXT']) {
    try {
      await client.execute(`ALTER TABLE expansions ADD COLUMN ${col};`)
    } catch {
      // Column already exists, safe to ignore
    }
  }

  try {
    await client.execute(`ALTER TABLE cards ADD COLUMN pokedex_id INTEGER;`)
  } catch {
    // Column already exists, safe to ignore
  }

  try {
    await client.execute(`
      UPDATE expansions
      SET logo_url = logo_url || '.png'
      WHERE logo_url IS NOT NULL
        AND logo_url LIKE 'https://assets.tcgdex.net%'
        AND logo_url NOT LIKE '%.png'
        AND logo_url NOT LIKE '%.webp'
        AND logo_url NOT LIKE '%.jpg';
    `)
    await client.execute(`
      UPDATE expansions
      SET symbol_url = symbol_url || '.png'
      WHERE symbol_url IS NOT NULL
        AND symbol_url LIKE 'https://assets.tcgdex.net%'
        AND symbol_url NOT LIKE '%.png'
        AND symbol_url NOT LIKE '%.webp'
        AND symbol_url NOT LIKE '%.jpg';
    `)
  } catch {
    // Ignore migration error if expansions table does not exist yet
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS expansions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      series TEXT,
      url TEXT NOT NULL,
      base_count INTEGER NOT NULL,
      secret_count INTEGER NOT NULL,
      investment_score REAL NOT NULL,
      chase_card_name TEXT,
      chase_card_price REAL,
      total_secret_pool_value REAL,
      avg_secret_price REAL,
      last_scraped_at INTEGER NOT NULL
    );
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      expansion_id TEXT NOT NULL REFERENCES expansions(id) ON DELETE CASCADE,
      local_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      rarity TEXT NOT NULL,
      image_url TEXT,
      market_price REAL NOT NULL,
      is_secret INTEGER NOT NULL,
      types TEXT
    );
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      market_price REAL NOT NULL,
      recorded_at INTEGER NOT NULL
    );
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tracked_expansions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES collector_profiles(id) ON DELETE CASCADE,
      expansion_id TEXT NOT NULL REFERENCES expansions(id) ON DELETE CASCADE,
      added_at INTEGER NOT NULL
    );
  `)
}
