import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ensureDatabaseTables } from './db/index.js'
import { healthRoutes } from './routes/healthRoutes.js'
import { tcgRoutes } from './routes/tcgRoutes.js'
import { authRoutes } from './routes/authRoutes.js'
import { collectionRoutes } from './routes/collectionRoutes.js'

export const app = new Hono()

app.use('*', cors())

// Initialize tables on startup
await ensureDatabaseTables().catch((err) => {
  console.error('Failed to initialize database tables:', err)
})

// Mount API routes
app.route('/api', healthRoutes)
app.route('/api/tcg', tcgRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/collection', collectionRoutes)

app.get('/', (c) => c.text('MasterDex API is running'))

export default app
