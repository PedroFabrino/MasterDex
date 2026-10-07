import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ensureDbReady } from './db/index.js'
import { healthRoutes } from './routes/healthRoutes.js'
import { tcgRoutes } from './routes/tcgRoutes.js'
import { authRoutes } from './routes/authRoutes.js'
import { collectionRoutes } from './routes/collectionRoutes.js'
import { pokedexRoutes } from './routes/pokedexRoutes.js'
import { collectorRoutes } from './routes/collectorRoutes.js'
import { binderRoutes } from './routes/binderRoutes.js'

export const app = new Hono()

app.use('*', cors())

// Lazy initialize tables on API requests (excluding /api/health)
app.use('/api/*', async (c, next) => {
  if (c.req.path !== '/api/health') {
    await ensureDbReady()
  }
  await next()
})

// Mount API routes
app.route('/api', healthRoutes)
app.route('/api/tcg', tcgRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/collection', collectionRoutes)
app.route('/api/collector', collectorRoutes)
app.route('/api/pokedex', pokedexRoutes)
app.route('/api/binder', binderRoutes)

app.get('/', (c) => c.text('MasterDex API is running'))

export default app
