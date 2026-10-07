import { Hono } from 'hono'
import { rawClient } from '../db/index.js'

export const healthRoutes = new Hono()

healthRoutes.get('/health', async (c) => {
  try {
    const pingTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database ping timed out (3s)')), 3000)
    )
    await Promise.race([rawClient.execute('SELECT 1;'), pingTimeout])
    return c.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return c.json(
      {
        status: 'degraded',
        db: 'disconnected',
        message: error?.message || 'Database check failed',
      },
      503
    )
  }
})
