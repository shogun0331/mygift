import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.mp4':
      return 'video/mp4'
    case '.webm':
      return 'video/webm'
    case '.mov':
      return 'video/quicktime'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.json':
      return 'application/json'
    default:
      return 'application/octet-stream'
  }
}

/** public/characters 파일을 디스크에서 즉시 읽고, 캐시 없이 제공 (저장 직후 교체 반영) */
function charactersMediaPlugin(): Plugin {
  return {
    name: 'characters-media-live',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (
          !req.url ||
          (!req.url.startsWith('/characters/') && !req.url.startsWith('/chapter_assets/'))
        ) {
          next()
          return
        }

        try {
          const pathname = decodeURIComponent(req.url.split('?')[0] ?? '')
          const publicRoot = path.resolve(process.cwd(), 'public')
          const filePath = path.resolve(publicRoot, `.${pathname}`)
          if (!filePath.startsWith(publicRoot + path.sep) && filePath !== publicRoot) {
            res.statusCode = 403
            res.end('Forbidden')
            return
          }
          if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            res.statusCode = 404
            res.end('Not Found')
            return
          }

          const stat = fs.statSync(filePath)
          const total = stat.size
          const contentType = contentTypeFor(filePath)
          res.setHeader('Content-Type', contentType)
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
          res.setHeader('Pragma', 'no-cache')
          res.setHeader('Accept-Ranges', 'bytes')

          const range = req.headers.range
          if (range) {
            const match = /bytes=(\d*)-(\d*)/.exec(range)
            if (!match) {
              res.statusCode = 416
              res.end()
              return
            }
            const start = match[1] ? Number(match[1]) : 0
            const end = match[2] ? Number(match[2]) : total - 1
            if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= total) {
              res.statusCode = 416
              res.setHeader('Content-Range', `bytes */${total}`)
              res.end()
              return
            }
            res.statusCode = 206
            res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`)
            res.setHeader('Content-Length', String(end - start + 1))
            fs.createReadStream(filePath, { start, end }).pipe(res)
            return
          }

          res.statusCode = 200
          res.setHeader('Content-Length', String(total))
          fs.createReadStream(filePath).pipe(res)
        } catch (err) {
          console.error('[characters-media-live]', err)
          res.statusCode = 500
          res.end('Error')
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [charactersMediaPlugin(), react(), tailwindcss()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    watch: {
      // HMR 루프만 막고, 위 미들웨어로 최신 파일은 항상 디스크에서 읽음
      ignored: ['**/public/characters/**'],
    },
  },
  build: {
    outDir: 'dist',
  },
})
