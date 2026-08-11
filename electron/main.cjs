const { app, BrowserWindow, protocol, net, Menu } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')
const fs = require('fs')
const { Transform, Readable } = require('stream')

// XOR 암호화용 8바이트 대칭키
const XOR_KEY = Buffer.from([0x7E, 0x3F, 0x1A, 0x9B, 0x5C, 0xD2, 0x48, 0xFE])

// 메모리 바이너리 즉시 XOR 변환
function xorBuffer(buffer) {
  const result = Buffer.alloc(buffer.length)
  for (let i = 0; i < buffer.length; i++) {
    result[i] = buffer[i] ^ XOR_KEY[i % XOR_KEY.length]
  }
  return result
}

// 암호화되었을 수도 있고 평문일 수도 있는 JSON 버퍼 안전 파싱 헬퍼
function parseMaybeEncryptedJson(buffer) {
  if (buffer.length === 0) return null;
  // 첫 바이트가 '{' (0x7B) 또는 '[' (0x5B) 이면 평문 JSON 가능성이 높음
  const firstByte = buffer[0]
  if (firstByte === 0x7B || firstByte === 0x5B) {
    try {
      return JSON.parse(buffer.toString('utf-8'))
    } catch (e) {
      // 평문 파싱 에러 발생 시 복호화 시도로 이동
    }
  }
  
  try {
    const decrypted = xorBuffer(buffer)
    return JSON.parse(decrypted.toString('utf-8'))
  } catch (e) {
    // 만약 복호화해서도 파싱 실패하면 최후의 수단으로 다시 평문 시도
    return JSON.parse(buffer.toString('utf-8'))
  }
}

// 평문 파일 시그니처 체크 헬퍼
function isPlaintext(buffer, ext) {
  if (buffer.length === 0) return false;
  
  if (ext === '.json') {
    return buffer[0] === 0x7B || buffer[0] === 0x5B; // '{' or '['
  }
  
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true; // PNG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true; // JPEG
  
  if (buffer.length > 12) {
    const riff = buffer.slice(0, 4).toString('ascii')
    const webp = buffer.slice(8, 12).toString('ascii')
    if (riff === 'RIFF' && webp === 'WEBP') return true
  }
  
  if (buffer.length > 3 && buffer.slice(0, 3).toString('ascii') === 'GIF') return true
  if (buffer.length > 8 && buffer.slice(4, 8).toString('ascii') === 'ftyp') return true // MP4
  if (buffer.length > 3 && buffer.slice(0, 3).toString('ascii') === 'ID3') return true // MP3
  
  if (buffer.length > 12) {
    const riff = buffer.slice(0, 4).toString('ascii')
    const wave = buffer.slice(8, 12).toString('ascii')
    if (riff === 'RIFF' && wave === 'WAVE') return true
  }
  
  if (buffer.length > 4 && buffer.slice(0, 4).toString('ascii') === 'OggS') return true

  return false
}


// 오프셋 기반 비동기 복호화 Transform Stream 생성기
function createXorStream(startOffset = 0) {
  let offset = startOffset
  return new Transform({
    transform(chunk, encoding, callback) {
      const decrypted = Buffer.alloc(chunk.length)
      for (let i = 0; i < chunk.length; i++) {
        decrypted[i] = chunk[i] ^ XOR_KEY[(offset + i) % XOR_KEY.length]
      }
      offset += chunk.length
      callback(null, decrypted)
    }
  })
}

// 파일 확장자 기반 MIME 타입 헬퍼
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.mp4': return 'video/mp4'
    case '.webm': return 'video/webm'
    case '.mov': return 'video/quicktime'
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.webp': return 'image/webp'
    case '.gif': return 'image/gif'
    case '.json': return 'application/json'
    case '.mp3': return 'audio/mpeg'
    case '.wav': return 'audio/wav'
    case '.ogg': return 'audio/ogg'
    default: return 'application/octet-stream'
  }
}


const isDev = process.env.ELECTRON_DEV === '1'

// video range/stream 지원을 위해 ready 이전에 등록해야 함
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
])

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    // Avoid stale cache while iterating on UI
    mainWindow.webContents.session.clearCache()
    mainWindow.loadURL('http://localhost:5173')

    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'F5') {
        mainWindow.reload()
      }
      if (input.type === 'keyDown' && input.key === 'r' && input.control) {
        mainWindow.reload()
      }
    })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  protocol.handle('media', (request) => {
    try {
      const parsed = new URL(request.url)
      const rel = path.join(parsed.hostname, decodeURIComponent(parsed.pathname))
      const filePath = path.normalize(path.join(app.getAppPath(), 'public', rel))

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return new Response('Not Found', { status: 404 })
      }

      const raw = fs.readFileSync(filePath)
      const ext = path.extname(filePath).toLowerCase()
      const decrypted = isPlaintext(raw, ext) ? raw : xorBuffer(raw)
      const mimeType = getMimeType(filePath)

      return new Response(decrypted, {
        status: 200,
        headers: {
          'Content-Length': String(decrypted.length),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
        }
      })
    } catch (err) {
      console.error('media protocol error:', err)
      return new Response('Internal Error', { status: 500 })
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

const { ipcMain } = require('electron')

ipcMain.handle('save-event-assets', async (event, { eventId, assets }) => {
  try {
    const baseDir = path.join(app.getAppPath(), 'public/chapter_assets/events', String(eventId))
    const folderMap = {
      image: 'images',
      video: 'videos',
      sound: 'sounds',
    }

    for (const asset of assets) {
      const folderName = folderMap[asset.kind] || 'assets'
      const targetDir = path.join(baseDir, folderName)

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      const filePath = path.join(targetDir, asset.fileName)
      const rawBuffer = Buffer.from(asset.buffer)
      const encryptedBuffer = xorBuffer(rawBuffer)
      fs.writeFileSync(filePath, encryptedBuffer)
    }

    return { success: true, path: baseDir }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-character-assets', async (event, { characterId, assets }) => {
  try {
    const baseDir = path.join(app.getAppPath(), 'public/characters', String(characterId))
    const folderMap = {
      image: 'images',
      video: 'videos',
    }

    for (const asset of assets) {
      const folderName = folderMap[asset.kind] || 'assets'
      const targetDir = path.join(baseDir, folderName)

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      const filePath = path.join(targetDir, asset.fileName)
      
      let rawBuffer
      if (Buffer.isBuffer(asset.buffer)) {
        rawBuffer = asset.buffer
      } else if (asset.buffer instanceof ArrayBuffer) {
        rawBuffer = Buffer.from(asset.buffer)
      } else if (ArrayBuffer.isView(asset.buffer)) {
        rawBuffer = Buffer.from(asset.buffer.buffer, asset.buffer.byteOffset, asset.buffer.byteLength)
      } else if (asset.buffer && typeof asset.buffer === 'object' && asset.buffer.type === 'Buffer') {
        rawBuffer = Buffer.from(asset.buffer.data)
      } else {
        throw new Error(`Invalid buffer for asset ${asset.fileName}`)
      }

      if (!rawBuffer.length) {
        throw new Error(`Empty buffer for asset ${asset.fileName}`)
      }

      const encryptedBuffer = xorBuffer(rawBuffer)
      fs.writeFileSync(filePath, encryptedBuffer)
    }

    return { success: true, path: baseDir }
  } catch (err) {
    console.error('save-character-assets error:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-characters-json', async (event, { characters }) => {
  try {
    const dir = path.join(app.getAppPath(), 'public/characters')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const filePath = path.join(dir, 'characters.json')
    const rawBuffer = Buffer.from(JSON.stringify(characters, null, 2), 'utf-8')
    const encryptedBuffer = xorBuffer(rawBuffer)
    fs.writeFileSync(filePath, encryptedBuffer)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-characters-json', async (event) => {
  try {
    const filePath = path.join(app.getAppPath(), 'public/characters/characters.json')
    if (!fs.existsSync(filePath)) {
      return { success: true, characters: [] }
    }
    const encryptedBuffer = fs.readFileSync(filePath)
    const characters = parseMaybeEncryptedJson(encryptedBuffer) || []
    return { success: true, characters }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-events-json', async (event, { events }) => {
  try {
    const assetsDir = path.join(app.getAppPath(), 'public/chapter_assets')
    const eventsDir = path.join(assetsDir, 'events')

    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true })
    }
    if (!fs.existsSync(eventsDir)) {
      fs.mkdirSync(eventsDir, { recursive: true })
    }

    const activeIds = new Set()
    for (const ev of events) {
      activeIds.add(ev.id)
      const media = (ev.media || []).map(m => {
        const { blob, ...rest } = m
        return rest
      })
      const fullEventData = { ...ev, media }
      const singleFilePath = path.join(eventsDir, `${ev.id}.json`)
      const rawSingleBuffer = Buffer.from(JSON.stringify(fullEventData, null, 2), 'utf-8')
      const encryptedSingleBuffer = xorBuffer(rawSingleBuffer)
      fs.writeFileSync(singleFilePath, encryptedSingleBuffer)
    }

    if (fs.existsSync(eventsDir)) {
      const files = fs.readdirSync(eventsDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const id = path.basename(file, '.json')
          if (!activeIds.has(id)) {
            try {
              fs.unlinkSync(path.join(eventsDir, file))
            } catch (err) {
              console.error(`Failed to clean deleted event file: ${file}`, err)
            }
          }
        }
      }
    }

    const metadataList = events.map(ev => {
      const { nodes, localization, characters, points, media, ...meta } = ev
      return meta
    })

    const listFilePath = path.join(assetsDir, 'events.json')
    const rawListBuffer = Buffer.from(JSON.stringify(metadataList, null, 2), 'utf-8')
    const encryptedListBuffer = xorBuffer(rawListBuffer)
    fs.writeFileSync(listFilePath, encryptedListBuffer)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-events-json', async (event) => {
  try {
    const assetsDir = path.join(app.getAppPath(), 'public/chapter_assets')
    const listFilePath = path.join(assetsDir, 'events.json')
    const eventsDir = path.join(assetsDir, 'events')

    if (!fs.existsSync(listFilePath)) {
      return { success: true, events: [] }
    }

    const encryptedList = fs.readFileSync(listFilePath)
    const metadataList = parseMaybeEncryptedJson(encryptedList) || []
    const fullEvents = []

    for (const meta of metadataList) {
      const singleFilePath = path.join(eventsDir, `${meta.id}.json`)
      if (fs.existsSync(singleFilePath)) {
        try {
          const encryptedSingle = fs.readFileSync(singleFilePath)
          const singleData = parseMaybeEncryptedJson(encryptedSingle)
          fullEvents.push(singleData)
        } catch (err) {
          console.error(`Failed to parse event file for ${meta.id}:`, err)
          fullEvents.push({
            ...meta,
            nodes: [],
            localization: { ko: {} },
            characters: [],
            points: [],
            media: []
          })
        }
      } else {
        fullEvents.push({
          ...meta,
          nodes: [],
          localization: { ko: {} },
          characters: [],
          points: [],
          media: []
        })
      }
    }

    return { success: true, events: fullEvents }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-character-file', async (event, { characterId, kind, fileName }) => {
  try {
    const folderMap = {
      image: 'images',
      video: 'videos',
    }
    const folderName = folderMap[kind] || 'assets'
    const filePath = path.join(app.getAppPath(), 'public/characters', String(characterId), folderName, fileName)

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('clone-character-file', async (event, { characterId, kind, sourceFileName, targetFileName }) => {
  try {
    const folderMap = {
      image: 'images',
      video: 'videos',
    }
    const folderName = folderMap[kind] || 'assets'
    const dir = path.join(app.getAppPath(), 'public/characters', String(characterId), folderName)
    const sourcePath = path.join(dir, sourceFileName)
    const targetPath = path.join(dir, targetFileName)

    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'source missing' }
    }
    if (sourcePath !== targetPath) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.copyFileSync(sourcePath, targetPath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-character-folder', async (event, { characterId }) => {
  try {
    const dirPath = path.join(app.getAppPath(), 'public/characters', String(characterId))
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true })
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
