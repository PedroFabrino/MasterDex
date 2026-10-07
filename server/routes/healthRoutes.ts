import { Hono } from 'hono'
import { collectorRepository } from '../repositories/collectorRepository.js'

export const healthRoutes = new Hono()

healthRoutes.get('/health', async (c) => {
  try {
    await collectorRepository.pingDatabase()
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
