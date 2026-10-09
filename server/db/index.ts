import { createClient, type Client } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema.js'

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return 'file:/tmp/local.db'
  }
  return 'file:local.db'
}

const databaseUrl = resolveDatabaseUrl()
const authToken = process.env.DATABASE_AUTH_TOKEN

export const rawClient: Client = createClient({
  url: databaseUrl,
  authToken: authToken,
})

export const db: LibSQLDatabase<typeof schema> = drizzle(rawClient, { schema })

let dbInitPromise: Promise<void> | null = null

export function ensureDbReady(): Promise<void> {
  if (!dbInitPromise) {
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Database init timed out after 5s')), 5000)
    )
    dbInitPromise = Promise.race([ensureDatabaseTables(rawClient), timeout]).catch((err) => {
      console.error('[DB] ensureDatabaseTables error:', err?.message || err)
      dbInitPromise = null
    })
  }
  return dbInitPromise
}

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
      gemini_api_key TEXT,
      favored_languages TEXT NOT NULL DEFAULT '["pt", "en", "ja"]',
      valuation_preference TEXT NOT NULL DEFAULT 'ligapokemon',
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
      card_condition TEXT NOT NULL DEFAULT 'NM',
      updated_at INTEGER NOT NULL
    );
  `)

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
      logo_url TEXT,
      symbol_url TEXT,
      ligapokemon_code TEXT,
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
      types TEXT,
      pokedex_id INTEGER
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

  await client.execute(`
    CREATE TABLE IF NOT EXISTS card_prices (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      condition TEXT NOT NULL DEFAULT 'NM',
      native_price REAL NOT NULL,
      currency TEXT NOT NULL,
      recorded_at INTEGER NOT NULL
    );
  `)

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_card_prices_card_provider ON card_prices (card_id, provider);
  `)

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_card_prices_card_provider_cond ON card_prices (card_id, provider, condition);
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      pair TEXT PRIMARY KEY,
      rate REAL NOT NULL,
      fetched_at INTEGER NOT NULL
    );
  `)

  // Defensive migrations for pre-existing databases
  for (const col of [
    "target_rarity TEXT NOT NULL DEFAULT 'any'",
    "hidden_expansions TEXT NOT NULL DEFAULT '[]'",
    "gemini_api_key TEXT",
    "favored_languages TEXT NOT NULL DEFAULT '[\"pt\", \"en\", \"ja\"]'",
    "valuation_preference TEXT NOT NULL DEFAULT 'ligapokemon'",
  ]) {
    try {
      await client.execute(`ALTER TABLE collector_profiles ADD COLUMN ${col};`)
    } catch {
      // Column already exists, safe to ignore
    }
  }

  for (const col of [
    'card_id TEXT',
    'card_name TEXT',
    'card_image_url TEXT',
    "card_language TEXT DEFAULT 'en'",
    "card_condition TEXT NOT NULL DEFAULT 'NM'",
  ]) {
    try {
      await client.execute(`ALTER TABLE user_pokemon ADD COLUMN ${col};`)
    } catch {
      // Column already exists, safe to ignore
    }
  }

  try {
    await client.execute(`ALTER TABLE card_prices ADD COLUMN condition TEXT NOT NULL DEFAULT 'NM';`)
  } catch {
    // Column already exists, safe to ignore
  }

  for (const col of ['logo_url TEXT', 'symbol_url TEXT', 'ligapokemon_code TEXT']) {
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

  try {
    const fks = await client.execute('PRAGMA foreign_key_list(card_prices);')
    if (fks.rows.some((row: any) => row.table === 'cards')) {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS card_prices_clean (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          native_price REAL NOT NULL,
          currency TEXT NOT NULL,
          recorded_at INTEGER NOT NULL
        );
      `)
      await client.execute(`INSERT OR IGNORE INTO card_prices_clean SELECT * FROM card_prices;`)
      await client.execute(`DROP TABLE card_prices;`)
      await client.execute(`ALTER TABLE card_prices_clean RENAME TO card_prices;`)
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_card_prices_card_provider ON card_prices (card_id, provider);`)
    }
  } catch {
    // Ignore migration error if table does not exist yet
  }
}
