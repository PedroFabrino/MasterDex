import app from '../server/app.js'

export const config = {
  runtime: 'nodejs',
}

export default async function handler(req: any, res: any) {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const host = req.headers.host || 'localhost'
    const url = new URL(req.url || '/', `${protocol}://${host}`)

    const headers = new Headers()
    for (const [key, val] of Object.entries(req.headers)) {
      if (val) {
        if (Array.isArray(val)) {
          val.forEach((v) => headers.append(key, v))
        } else {
          headers.set(key, val as string)
        }
      }
    }

    let body: any = undefined
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      body = Buffer.concat(chunks)
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    })

    const response = await app.fetch(request)
    res.statusCode = response.status
    response.headers.forEach((val, key) => res.setHeader(key, val))
    const resBuffer = await response.arrayBuffer()
    res.end(Buffer.from(resBuffer))
  } catch (err: any) {
    console.error('Serverless function error:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }))
  }
}
