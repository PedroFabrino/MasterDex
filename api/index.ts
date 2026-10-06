import { handle } from '@hono/node-server/vercel'
import app from '../server/app.js'

export const config = {
  runtime: 'nodejs',
}

export default handle(app)
