import { Hono } from 'hono'
import { rawClient } from '../db/index.js'

export const healthRoutes = new Hono()

healthRoutes.get('/health', async (c) => {
  try {
    await rawClient.execute('SELECT 1;')
    return c.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return c.json(
      {
        status: 'error',
        db: 'disconnected',
        message: error?.message || 'Database check failed',
      },
      500
    )
  }
})
