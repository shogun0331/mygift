import fs from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function openFolderPlugin(): Plugin {
  return {
    name: 'open-folder-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api/open-event-folder')) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = body ? JSON.parse(body) : {}
              const eventId = data.eventId
              let dirPath = path.resolve(process.cwd(), 'public', 'chapter_assets', 'events')
              if (eventId) {
                const targetPath = path.resolve(dirPath, String(eventId))
                if (fs.existsSync(targetPath)) {
                  dirPath = targetPath
                }
              }
              if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true })
              }
              const command =
                process.platform === 'win32' ? `explorer.exe "${dirPath}"` : `open "${dirPath}"`
              exec(command)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }
        next()
      })
    },
  }
}

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
const EVENT_LOCALES = ['ko', 'en', 'ja', 'zh-cn', 'ru', 'es', 'de']

function canonicalEventLocale(lang: string) {
  const raw = String(lang || '').trim()
  if (!raw) return null
  const upper = raw.toUpperCase()
  if (upper === 'KO') return 'ko'
  if (upper === 'EN') return 'en'
  if (upper === 'JA') return 'ja'
  if (upper === 'ZH-CN' || upper === 'ZH' || upper === 'ZH_CN') return 'zh-cn'
  if (upper === 'RU') return 'ru'
  if (upper === 'ES') return 'es'
  if (upper === 'DE') return 'de'
  const lower = raw.toLowerCase().replace(/_/g, '-')
  if (lower === 'zh' || lower === 'zh-hans') return 'zh-cn'
  if (EVENT_LOCALES.includes(lower)) return lower
  return null
}

function emptyEventLocalization() {
  const next: Record<string, Record<string, string>> = {}
  for (const lang of EVENT_LOCALES) next[lang] = {}
  return next
}

function mergeEventLocalization(raw: any) {
  const next = emptyEventLocalization()
  if (!raw || typeof raw !== 'object') return next
  for (const [key, map] of Object.entries(raw)) {
    const lang = canonicalEventLocale(key)
    if (!lang || !map || typeof map !== 'object' || Array.isArray(map)) continue
    const copy = { ...next[lang] }
    for (const [textKey, value] of Object.entries(map as Record<string, any>)) {
      if (typeof value === 'string') copy[textKey] = value
    }
    next[lang] = copy
  }
  return next
}

function writeJsonFile(filePath: string, data: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function saveEventsDevPlugin(): Plugin {
  return {
    name: 'save-events-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) {
          next()
          return
        }

        if (req.url.startsWith('/api/save-events-json')) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = body ? JSON.parse(body) : {}
              const events = Array.isArray(data.events) ? data.events : []

              const assetsDir = path.resolve(process.cwd(), 'public', 'chapter_assets')
              const eventsDir = path.join(assetsDir, 'events')

              if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true })
              if (!fs.existsSync(eventsDir)) fs.mkdirSync(eventsDir, { recursive: true })

              const activeIds = new Set<string>()
              for (const ev of events) {
                if (!ev || !ev.id) continue
                activeIds.add(String(ev.id))

                const media = (ev.media || []).map((m: any) => {
                  const { blob, ...rest } = m
                  return rest
                })
                const { localization, ...eventWithoutLoc } = ev
                const fullEventData = { ...eventWithoutLoc, media }
                const singleFilePath = path.join(eventsDir, `${ev.id}.json`)
                writeJsonFile(singleFilePath, fullEventData)

                const locDir = path.join(eventsDir, String(ev.id), 'loc')
                const locMaps = mergeEventLocalization(localization)
                for (const lang of EVENT_LOCALES) {
                  writeJsonFile(path.join(locDir, `${lang}.json`), locMaps[lang] || {})
                }
              }

              if (fs.existsSync(eventsDir)) {
                const files = fs.readdirSync(eventsDir)
                for (const file of files) {
                  const fullPath = path.join(eventsDir, file)
                  if (file.endsWith('.json')) {
                    const id = path.basename(file, '.json')
                    if (!activeIds.has(id)) {
                      try {
                        fs.unlinkSync(fullPath)
                      } catch (err) {
                        console.error(`Failed to clean deleted event file: ${file}`, err)
                      }
                    }
                  } else {
                    try {
                      const stat = fs.statSync(fullPath)
                      if (stat.isDirectory() && !activeIds.has(file)) {
                        fs.rmSync(fullPath, { recursive: true, force: true })
                      }
                    } catch (err) {
                      console.error(`Failed to clean deleted event assets folder: ${file}`, err)
                    }
                  }
                }
              }

              const metadataList = events.map((ev: any) => {
                const { nodes, localization, characters, points, media, ...meta } = ev
                return meta
              })

              const listFilePath = path.join(assetsDir, 'events.json')
              writeJsonFile(listFilePath, metadataList)

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (err: any) {
              console.error('[save-events-dev-api]', err)
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        if (req.url.startsWith('/api/save-event-assets')) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = body ? JSON.parse(body) : {}
              const { eventId, assets } = data
              if (!eventId || !Array.isArray(assets)) {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: 'Invalid eventId or assets' }))
                return
              }

              const baseDir = path.resolve(process.cwd(), 'public', 'chapter_assets', 'events', String(eventId))
              const folderMap: Record<string, string> = { image: 'images', video: 'videos', sound: 'sounds' }

              for (const item of assets) {
                if (!item.fileName || !item.kind || !item.buffer) continue
                const folderName = folderMap[item.kind] || 'assets'
                const safeName = path.basename(String(item.fileName))
                const filePath = path.join(baseDir, folderName, safeName)
                fs.mkdirSync(path.dirname(filePath), { recursive: true })
                const buf = Buffer.from(item.buffer)
                fs.writeFileSync(filePath, buf)
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, path: baseDir }))
            } catch (err: any) {
              console.error('[save-event-assets-dev-api]', err)
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        if (req.url.startsWith('/api/delete-event-file')) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = body ? JSON.parse(body) : {}
              const { eventId, kind, fileName } = data
              if (!eventId || !fileName) {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: 'Invalid eventId or fileName' }))
                return
              }
              const safeId = path.basename(String(eventId))
              const safeName = path.basename(String(fileName))
              const folderMap: Record<string, string> = { image: 'images', video: 'videos', sound: 'sounds' }
              const folderName = folderMap[kind] || 'assets'
              const filePath = path.resolve(process.cwd(), 'public', 'chapter_assets', 'events', safeId, folderName, safeName)
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (err: any) {
              console.error('[delete-event-file-dev-api]', err)
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        if (req.url.startsWith('/api/save-common-sound-assets')) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = body ? JSON.parse(body) : {}
              const assets = Array.isArray(data.assets) ? data.assets : []
              const targetDir = path.resolve(process.cwd(), 'public', 'chapter_assets', 'common_sounds')
              fs.mkdirSync(targetDir, { recursive: true })
              for (const item of assets) {
                if (!item.fileName || !item.buffer) continue
                const safeName = path.basename(String(item.fileName))
                const filePath = path.join(targetDir, safeName)
                fs.writeFileSync(filePath, Buffer.from(item.buffer))
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, path: targetDir }))
            } catch (err: any) {
              console.error('[save-common-sound-assets-dev-api]', err)
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        if (req.url.startsWith('/api/save-common-sounds-json')) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = body ? JSON.parse(body) : {}
              const sounds = Array.isArray(data.sounds) ? data.sounds : []
              const filePath = path.resolve(process.cwd(), 'public', 'chapter_assets', 'common_sounds.json')
              writeJsonFile(filePath, sounds)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (err: any) {
              console.error('[save-common-sounds-json-dev-api]', err)
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        if (req.url.startsWith('/api/delete-common-sound-file')) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = body ? JSON.parse(body) : {}
              const safeName = path.basename(String(data.fileName || ''))
              if (!safeName) {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: 'Invalid fileName' }))
                return
              }
              const filePath = path.resolve(process.cwd(), 'public', 'chapter_assets', 'common_sounds', safeName)
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (err: any) {
              console.error('[delete-common-sound-file-dev-api]', err)
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [openFolderPlugin(), saveEventsDevPlugin(), charactersMediaPlugin(), react(), tailwindcss()],
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
      ignored: ['**/public/characters/**', '**/public/chapter_assets/**'],
    },
  },
  build: {
    outDir: 'dist',
  },
})

