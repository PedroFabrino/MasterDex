import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import app from "./server/app.js"

function honoDevServer(): Plugin {
  return {
    name: "hono-dev-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith("/api")) {
          try {
            const protocol = req.headers["x-forwarded-proto"] || "http"
            const host = req.headers.host || "localhost:5173"
            const url = new URL(req.url, `${protocol}://${host}`)

            const headers = new Headers()
            for (const [key, val] of Object.entries(req.headers)) {
              if (val) {
                if (Array.isArray(val)) {
                  val.forEach((v) => headers.append(key, v))
                } else {
                  headers.set(key, val)
                }
              }
            }

            let body: any = undefined
            if (req.method !== "GET" && req.method !== "HEAD") {
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
            return
          } catch (err) {
            console.error("Hono dev server error:", err)
            res.statusCode = 500
            res.end("Internal Server Error")
            return
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), honoDevServer()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
