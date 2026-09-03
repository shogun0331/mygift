const { app, BrowserWindow, protocol, Menu, shell, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { Readable } = require('stream')

// 이벤트 대사 파일 키 (src/events/eventLocales.ts 와 동일)
const EVENT_LOCALES = ['ko', 'en', 'ja', 'zh-cn', 'ru', 'es', 'de']
const EVENT_DEFAULT_LOCALE = 'ko'

function canonicalEventLocale(lang) {
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
  const next = {}
  for (const lang of EVENT_LOCALES) next[lang] = {}
  return next
}

function mergeEventLocalization(raw) {
  const next = emptyEventLocalization()
  if (!raw || typeof raw !== 'object') return next
  for (const [key, map] of Object.entries(raw)) {
    const lang = canonicalEventLocale(key)
    if (!lang || !map || typeof map !== 'object' || Array.isArray(map)) continue
    const copy = { ...next[lang] }
    for (const [textKey, value] of Object.entries(map)) {
      if (typeof value === 'string') copy[textKey] = value
    }
    next[lang] = copy
  }
  return next
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function assembleEventLocalization(embedded, locDir) {
  const loc = mergeEventLocalization(embedded)
  if (!fs.existsSync(locDir)) return loc
  for (const lang of EVENT_LOCALES) {
    const filePath = path.join(locDir, `${lang}.json`)
    if (!fs.existsSync(filePath)) continue
    try {
      const parsed = parseJsonFile(fs.readFileSync(filePath))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        loc[lang] = { ...loc[lang], ...parsed }
      }
    } catch (err) {
      console.error(`Failed to parse loc file ${filePath}:`, err)
    }
  }
  return loc
}

function parseJsonFile(buffer) {
  if (!buffer || buffer.length === 0) return null
  return JSON.parse(buffer.toString('utf-8'))
}

const isDev = process.env.ELECTRON_DEV === '1'

// GPU 가속은 유지하되 GPU 샌드박스를 해제해 GPU 프로세스 access violation(0xC0000005) 크래시 방지
// (하이브리드 GPU 노트북에서 흔한 원인. 성능 영향 없음)
app.commandLine.appendSwitch('disable-gpu-sandbox')

function splitPublicSegments(segments) {
  return segments.flatMap((seg) =>
    String(seg)
      .split(/[/\\]+/)
      .filter(Boolean),
  )
}

function getAsarPublicRoot() {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), 'public')
  }
  return path.join(__dirname, '..', 'public')
}

function getOverlayPublicRoot() {
  if (!app.isPackaged) return getAsarPublicRoot()
  return path.join(app.getPath('userData'), 'public')
}

function joinPublicRoot(root, segments) {
  return path.join(root, ...splitPublicSegments(segments))
}

/** 읽기: 패키징 후 수정본(userData)이 있으면 그걸, 없으면 asar 안의 public */
function publicPath(...segments) {
  const overlay = joinPublicRoot(getOverlayPublicRoot(), segments)
  if (app.isPackaged && fs.existsSync(overlay)) return overlay
  return joinPublicRoot(getAsarPublicRoot(), segments)
}

/** 쓰기: asar는 읽기 전용이라 패키징본은 userData/public 에 저장 */
function publicWritePath(...segments) {
  return joinPublicRoot(getOverlayPublicRoot(), segments)
}

function contentTypeFor(filePath) {
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
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    case '.ogg':
      return 'audio/ogg'
    case '.m4a':
      return 'audio/mp4'
    case '.aac':
      return 'audio/aac'
    default:
      return 'application/octet-stream'
  }
}

function parseByteRange(rangeHeader, total) {
  if (!rangeHeader) return null
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
  if (!match) return null
  const start = match[1] ? Number(match[1]) : 0
  let end = match[2] ? Number(match[2]) : total - 1
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  if (end >= total) end = total - 1
  if (start > end || start >= total || end < 0) return 'unsatisfiable'
  return { start, end }
}

function streamFileResponse(filePath, start, end, status, headers) {
  const stream = fs.createReadStream(filePath, { start, end })
  return new Response(Readable.toWeb(stream), { status, headers })
}

async function mediaResponseFromFile(filePath, request) {
  const stat = await fs.promises.stat(filePath)
  if (!stat.isFile()) {
    return new Response('Not Found', { status: 404 })
  }
  const total = stat.size
  const mime = contentTypeFor(filePath)
  const rangeHeader = request.headers.get('Range') || request.headers.get('range')
  const parsed = parseByteRange(rangeHeader, total)

  if (parsed === 'unsatisfiable') {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${total}`,
        'Accept-Ranges': 'bytes',
      },
    })
  }

  if (parsed) {
    const { start, end } = parsed
    return streamFileResponse(filePath, start, end, 206, {
      'Content-Type': mime,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
    })
  }

  if (total === 0) {
    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': '0',
        'Accept-Ranges': 'bytes',
      },
    })
  }

  return streamFileResponse(filePath, 0, total - 1, 200, {
    'Content-Type': mime,
    'Content-Length': String(total),
    'Accept-Ranges': 'bytes',
  })
}

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
      sandbox: false,
    },
  })

  if (isDev) {
    // Pipe renderer console messages to main process terminal for easier debugging
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer] (${level}) ${message} @ ${sourceId}:${line}`)
    })

    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()

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
  protocol.handle('media', async (request) => {
    try {
      const parsed = new URL(request.url)
      const filePath = path.normalize(publicPath(parsed.hostname, decodeURIComponent(parsed.pathname)))

      // asar 안 파일은 Chromium file:// 로 못 재생함. Node fs로 읽어 프로토콜로 공급.
      return await mediaResponseFromFile(filePath, request)
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        return new Response('Not Found', { status: 404 })
      }
      console.error('media protocol error:', err)
      return new Response('Internal Error', { status: 500 })
    }
  })

  createWindow()

  app.on('activate', () => {
    if (isDev) return
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

ipcMain.handle('save-event-assets', async (event, { eventId, assets }) => {
  try {
    const baseDir = publicWritePath('chapter_assets', 'events', String(eventId))
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
      fs.writeFileSync(filePath, Buffer.from(asset.buffer))
    }

    return { success: true, path: baseDir }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-event-file', async (event, { eventId, kind, fileName }) => {
  try {
    const safeId = path.basename(String(eventId || ''))
    const safeName = path.basename(String(fileName || ''))
    if (!safeId || !safeName) {
      return { success: false, error: 'invalid path' }
    }
    const folderMap = {
      image: 'images',
      video: 'videos',
      sound: 'sounds',
    }
    const folderName = folderMap[kind] || 'assets'
    const filePath = publicWritePath('chapter_assets', 'events', safeId, folderName, safeName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-event-folder', async (event, { eventId }) => {
  try {
    const safeId = path.basename(String(eventId || ''))
    if (!safeId) {
      return { success: false, error: 'invalid path' }
    }
    const dirPath = publicWritePath('chapter_assets', 'events', safeId)
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true })
    }
    const jsonPath = publicWritePath('chapter_assets', 'events', `${safeId}.json`)
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-character-assets', async (event, { characterId, assets }) => {
  try {
    const baseDir = publicWritePath('characters', String(characterId))
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

      fs.writeFileSync(filePath, rawBuffer)
    }

    return { success: true, path: baseDir }
  } catch (err) {
    console.error('save-character-assets error:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-characters-json', async (event, { characters }) => {
  try {
    const dir = publicWritePath('characters')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const filePath = path.join(dir, 'characters.json')
    if ((!characters || characters.length === 0) && fs.existsSync(filePath)) {
      const existing = parseJsonFile(fs.readFileSync(filePath)) || []
      if (existing.length > 0) {
        console.warn('Refusing to overwrite characters.json with an empty list')
        return { success: true, skippedEmptyOverwrite: true }
      }
    }

    const nextCharacters = JSON.parse(JSON.stringify(characters ?? []))
    for (const char of nextCharacters) {
      if (char && char.auditMedia) {
        const charAuditsDir = publicWritePath('characters', String(char.id), 'audits')
        const urlPrefix = `media://characters/${char.id}/audits`
        
        char.auditMedia.A = saveBase64MediaFile(char.auditMedia.A, charAuditsDir, 'video_A', urlPrefix)
        char.auditMedia.B = saveBase64MediaFile(char.auditMedia.B, charAuditsDir, 'video_B', urlPrefix)
        char.auditMedia.C = saveBase64MediaFile(char.auditMedia.C, charAuditsDir, 'video_C', urlPrefix)
      }
    }

    writeJson(filePath, nextCharacters)
    return { success: true, characters: nextCharacters }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-characters-json', async (event) => {
  try {
    const filePath = publicPath('characters', 'characters.json')
    if (!fs.existsSync(filePath)) {
      return { success: true, characters: [] }
    }
    const characters = parseJsonFile(fs.readFileSync(filePath)) || []
    console.log('[load-characters-json]', filePath, Array.isArray(characters) ? characters.length : typeof characters)
    return { success: true, characters }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-common-event-links-json', async (event, { links }) => {
  try {
    const dir = publicWritePath('chapter_assets')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    writeJson(path.join(dir, 'common_event_links.json'), links ?? {})
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-common-event-links-json', async (event) => {
  try {
    const filePath = publicPath('chapter_assets', 'common_event_links.json')
    if (!fs.existsSync(filePath)) {
      return { success: true, links: {} }
    }
    const links = parseJsonFile(fs.readFileSync(filePath)) || {}
    return { success: true, links }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-common-sound-assets', async (event, { assets }) => {
  try {
    const targetDir = publicWritePath('chapter_assets', 'common_sounds')
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    for (const asset of assets || []) {
      const safeName = path.basename(String(asset?.fileName || ''))
      if (!safeName || !asset.buffer) continue
      const filePath = path.join(targetDir, safeName)
      fs.writeFileSync(filePath, Buffer.from(asset.buffer))
    }

    return { success: true, path: targetDir }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-common-sounds-json', async (event, { sounds }) => {
  try {
    const dir = publicWritePath('chapter_assets')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    writeJson(path.join(dir, 'common_sounds.json'), Array.isArray(sounds) ? sounds : [])
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-common-sounds-json', async (event) => {
  try {
    const filePath = publicPath('chapter_assets', 'common_sounds.json')
    if (!fs.existsSync(filePath)) {
      return { success: true, sounds: [] }
    }
    const sounds = parseJsonFile(fs.readFileSync(filePath)) || []
    return { success: true, sounds: Array.isArray(sounds) ? sounds : [] }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-common-sound-file', async (event, { fileName }) => {
  try {
    const safeName = path.basename(String(fileName || ''))
    if (!safeName) {
      return { success: false, error: 'invalid path' }
    }
    const filePath = publicWritePath('chapter_assets', 'common_sounds', safeName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

function saveBase64MediaFile(dataUrl, targetDir, filePrefix, urlPrefix = 'media://chapter_assets/audits') {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return dataUrl
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return dataUrl

  const mimeType = match[1]
  const base64Data = match[2]
  const buffer = Buffer.from(base64Data, 'base64')

  const extMap = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
  }
  const ext = extMap[mimeType] || (mimeType.startsWith('video/') ? 'mp4' : 'png')
  const fileName = `${filePrefix}.${ext}`

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const filePath = path.join(targetDir, fileName)
  fs.writeFileSync(filePath, buffer)

  return `${urlPrefix}/${fileName}`
}

ipcMain.handle('save-station-grade-config-json', async (event, { config }) => {
  try {
    const dir = publicWritePath('chapter_assets')
    const auditsDir = path.join(dir, 'audits')

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const nextConfig = JSON.parse(JSON.stringify(config ?? {}))
    if (nextConfig.auditConfig && Array.isArray(nextConfig.auditConfig.judges)) {
      nextConfig.auditConfig.judges = nextConfig.auditConfig.judges.map((judge, idx) => {
        const idKey = judge.id || `judge_${idx}`
        const avatarUrl = saveBase64MediaFile(judge.avatarUrl, auditsDir, `${idKey}_avatar`)
        const successMediaUrl = saveBase64MediaFile(judge.successMediaUrl, auditsDir, `${idKey}_success`)
        const failMediaUrl = saveBase64MediaFile(judge.failMediaUrl, auditsDir, `${idKey}_fail`)

        return {
          ...judge,
          avatarUrl,
          successMediaUrl,
          failMediaUrl,
        }
      })
    }

    writeJson(path.join(dir, 'station_grade_config.json'), nextConfig)
    return { success: true, config: nextConfig }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-station-grade-config-json', async (event) => {
  try {
    const filePath = publicPath('chapter_assets', 'station_grade_config.json')
    if (!fs.existsSync(filePath)) {
      return { success: true, config: null }
    }
    const config = parseJsonFile(fs.readFileSync(filePath)) || null
    return { success: true, config }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-events-json', async (event, { events }) => {
  try {
    const assetsDir = publicWritePath('chapter_assets')
    const eventsDir = path.join(assetsDir, 'events')

    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true })
    }
    if (!fs.existsSync(eventsDir)) {
      fs.mkdirSync(eventsDir, { recursive: true })
    }

    const list = Array.isArray(events) ? events : []
    const activeIds = new Set()
    for (const ev of list) {
      if (!ev || typeof ev !== 'object') continue
      const safeId = path.basename(String(ev.id || '')).replace(/[<>:"|?*]/g, '')
      if (!safeId) continue
      activeIds.add(safeId)
      const media = (Array.isArray(ev.media) ? ev.media : [])
        .filter((m) => m && typeof m === 'object')
        .map((m) => {
          const { blob, ...rest } = m
          return rest
        })
      const { localization, ...eventWithoutLoc } = ev
      const fullEventData = { ...eventWithoutLoc, id: safeId, media }
      try {
        const singleFilePath = path.join(eventsDir, `${safeId}.json`)
        writeJson(singleFilePath, fullEventData)

        const locDir = path.join(eventsDir, safeId, 'loc')
        fs.mkdirSync(locDir, { recursive: true })
        const locMaps = mergeEventLocalization(localization)
        for (const lang of EVENT_LOCALES) {
          writeJson(path.join(locDir, `${lang}.json`), locMaps[lang] || {})
        }
      } catch (writeErr) {
        throw new Error(`이벤트 '${safeId}' 저장 실패: ${writeErr.message}`)
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

    const metadataList = list
      .filter((ev) => ev && typeof ev === 'object' && ev.id)
      .map((ev) => {
        const { nodes, localization, characters, points, media, ...meta } = ev
        return { ...meta, id: path.basename(String(ev.id)) }
      })

    const listFilePath = path.join(assetsDir, 'events.json')
    writeJson(listFilePath, metadataList)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-events-json', async (event) => {
  try {
    const assetsDir = publicPath('chapter_assets')
    const listFilePath = path.join(assetsDir, 'events.json')
    const eventsDir = path.join(assetsDir, 'events')

    if (!fs.existsSync(listFilePath)) {
      return { success: true, events: [] }
    }

    const metadataList = parseJsonFile(fs.readFileSync(listFilePath)) || []
    const fullEvents = []

    for (const meta of metadataList) {
      const singleFilePath = path.join(eventsDir, `${meta.id}.json`)
      if (fs.existsSync(singleFilePath)) {
        try {
          const singleData = parseJsonFile(fs.readFileSync(singleFilePath)) || {}
          const locDir = path.join(eventsDir, String(meta.id), 'loc')
          const localization = assembleEventLocalization(singleData.localization, locDir)
          const { localization: _embedded, ...rest } = singleData
          fullEvents.push({
            ...rest,
            localization,
            defaultLanguage: rest.defaultLanguage || EVENT_DEFAULT_LOCALE,
          })
        } catch (err) {
          console.error(`Failed to parse event file for ${meta.id}:`, err)
          fullEvents.push({
            ...meta,
            nodes: [],
            localization: emptyEventLocalization(),
            characters: [],
            points: [],
            media: []
          })
        }
      } else {
        fullEvents.push({
          ...meta,
          nodes: [],
          localization: emptyEventLocalization(),
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

function safeCharacterFileName(fileName) {
  const base = path.basename(String(fileName || ''))
  if (!base || base === '.' || base === '..') return null
  return base
}

ipcMain.handle('delete-character-file', async (event, { characterId, kind, fileName }) => {
  try {
    const folderMap = {
      image: 'images',
      video: 'videos',
    }
    const safeName = safeCharacterFileName(fileName)
    if (!safeName) return { success: true }
    const folderName = folderMap[kind] || 'assets'
    const filePath = publicWritePath('characters', String(characterId), folderName, safeName)

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('prune-character-files', async (event, { characterId, keep }) => {
  try {
    const folders = [
      { kind: 'image', dirName: 'images', keep: keep?.image ?? [] },
      { kind: 'video', dirName: 'videos', keep: keep?.video ?? [] },
    ]
    for (const folder of folders) {
      const dir = publicWritePath('characters', String(characterId), folder.dirName)
      if (!fs.existsSync(dir)) continue
      const keepSet = new Set(
        (Array.isArray(folder.keep) ? folder.keep : [])
          .map((name) => safeCharacterFileName(name))
          .filter(Boolean),
      )
      for (const name of fs.readdirSync(dir)) {
        const safeName = safeCharacterFileName(name)
        if (!safeName || keepSet.has(safeName)) continue
        const filePath = path.join(dir, safeName)
        if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath)
      }
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
    const dir = publicWritePath('characters', String(characterId), folderName)
    const sourcePath = publicPath('characters', String(characterId), folderName, sourceFileName)
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
    const dirPath = publicWritePath('characters', String(characterId))
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true })
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-staff-assets', async (event, { staffId, assets }) => {
  try {
    const baseDir = publicWritePath('staff', String(staffId))
    for (const asset of assets) {
      const targetDir = path.join(baseDir, 'images')
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

      fs.writeFileSync(filePath, rawBuffer)
    }
    return { success: true, path: baseDir }
  } catch (err) {
    console.error('save-staff-assets error:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-staff-json', async (event, { staff }) => {
  try {
    const dir = publicWritePath('staff')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const filePath = path.join(dir, 'staff.json')
    writeJson(filePath, Array.isArray(staff) ? staff : [])
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-staff-json', async () => {
  try {
    const filePath = publicPath('staff', 'staff.json')
    if (!fs.existsSync(filePath)) {
      return { success: true, staff: [] }
    }
    const staff = parseJsonFile(fs.readFileSync(filePath)) || []
    return { success: true, staff }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-staff-file', async (event, { staffId, fileName }) => {
  try {
    const safeName = safeCharacterFileName(fileName)
    if (!safeName) return { success: true }
    const filePath = publicWritePath('staff', String(staffId), 'images', safeName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-staff-folder', async (event, { staffId }) => {
  try {
    const dirPath = publicWritePath('staff', String(staffId))
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true })
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('open-event-folder', async (event, { eventId }) => {
  try {
    let dirPath
    if (eventId) {
      dirPath = publicWritePath('chapter_assets', 'events', String(eventId))
      if (!fs.existsSync(dirPath)) {
        dirPath = publicPath('chapter_assets', 'events', String(eventId))
      }
      if (!fs.existsSync(dirPath)) {
        dirPath = publicWritePath('chapter_assets', 'events')
      }
    } else {
      dirPath = publicWritePath('chapter_assets', 'events')
    }

    if (!fs.existsSync(dirPath)) {
      dirPath = publicPath('chapter_assets', 'events')
    }

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    await shell.openPath(dirPath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

app.on('window-all-closed', () => {
  app.quit()
})
