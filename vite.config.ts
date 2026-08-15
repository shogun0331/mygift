import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { Transform } from 'node:stream'

// XOR 암호화용 8바이트 대칭키 (main.cjs 와 동일)
const XOR_KEY = Buffer.from([0x7E, 0x3F, 0x1A, 0x9B, 0x5C, 0xD2, 0x48, 0xFE])

class XorTransformStream extends Transform {
  private offset: number
  constructor(startOffset = 0) {
    super()
    this.offset = startOffset
  }
  _transform(chunk: any, _encoding: string, callback: any) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    const decrypted = Buffer.alloc(buf.length)
    for (let i = 0; i < buf.length; i++) {
      decrypted[i] = buf[i] ^ XOR_KEY[(this.offset + i) % XOR_KEY.length]
    }
    this.offset += buf.length
    callback(null, decrypted)
  }
}

function checkIsPlaintext(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r')
    const buffer = Buffer.alloc(16)
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0)
    fs.closeSync(fd)
    
    const ext = path.extname(filePath).toLowerCase()
    
    if (bytesRead === 0) return false
    
    if (ext === '.json') {
      return buffer[0] === 0x7B || buffer[0] === 0x5B // '{' or '['
    }
    
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true // PNG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true // JPEG
    
    if (bytesRead >= 12) {
      const riff = buffer.subarray(0, 4).toString('ascii')
      const webp = buffer.subarray(8, 12).toString('ascii')
      if (riff === 'RIFF' && webp === 'WEBP') return true
    }
    
    if (bytesRead >= 3 && buffer.subarray(0, 3).toString('ascii') === 'GIF') return true
    if (bytesRead >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return true // MP4
    if (bytesRead >= 3 && buffer.subarray(0, 3).toString('ascii') === 'ID3') return true // MP3
    
    if (bytesRead >= 12) {
      const riff = buffer.subarray(0, 4).toString('ascii')
      const wave = buffer.subarray(8, 12).toString('ascii')
      if (riff === 'RIFF' && wave === 'WAVE') return true
    }
    
    if (bytesRead >= 4 && buffer.subarray(0, 4).toString('ascii') === 'OggS') return true
    
    return false
  } catch (err) {
    return false
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

          const isPlain = checkIsPlaintext(filePath)
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
            
            const fileStream = fs.createReadStream(filePath, { start, end })
            if (isPlain) {
              fileStream.pipe(res)
            } else {
              fileStream.pipe(new XorTransformStream(start)).pipe(res)
            }
            return
          }

          res.statusCode = 200
          res.setHeader('Content-Length', String(total))
          const fileStream = fs.createReadStream(filePath)
          if (isPlain) {
            fileStream.pipe(res)
          } else {
            fileStream.pipe(new XorTransformStream(0)).pipe(res)
          }
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
