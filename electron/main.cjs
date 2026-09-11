const { app, BrowserWindow, protocol, Menu, shell, ipcMain, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const { Readable } = require('stream')
const gamePak = require('./gamePak.cjs')
const deviceLock = require('./deviceLock.cjs')
const gameAnalytics = require('./gameAnalytics.cjs')

// 이벤트 대사 파일 키 (src/events/eventLocales.ts 와 동일)
const EVENT_LOCALES = ['ko', 'en', 'ja', 'zh-cn', 'zh-tw', 'ru', 'es', 'de']
const EVENT_DEFAULT_LOCALE = 'ko'

function canonicalEventLocale(lang) {
  const raw = String(lang || '').trim()
  if (!raw) return null
  const upper = raw.toUpperCase().replace(/_/g, '-')
  if (upper === 'KO') return 'ko'
  if (upper === 'EN') return 'en'
  if (upper === 'JA') return 'ja'
  if (upper === 'ZH-TW' || upper === 'ZHTW') return 'zh-tw'
  if (upper === 'ZH-CN' || upper === 'ZHCN' || upper === 'ZH') return 'zh-cn'
  if (upper === 'RU') return 'ru'
  if (upper === 'ES') return 'es'
  if (upper === 'DE') return 'de'
  const lower = raw.toLowerCase().replace(/_/g, '-')
  if (lower === 'zh-hant' || lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-mo') return 'zh-tw'
  if (lower === 'zh' || lower === 'zh-hans' || lower === 'zh-cn') return 'zh-cn'
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
if (isDev) {
  // 개발 실행과 패키징본이 같은 AppData 세이브(localStorage)를 쓰지 않게 분리
  app.setPath('userData', path.join(app.getPath('appData'), 'BroadcastGame-dev'))
}

// GPU 가속은 유지하되 GPU 샌드박스를 해제해 GPU 프로세스 access violation(0xC0000005) 크래시 방지
// (하이브리드 GPU 노트북에서 흔한 원인. 성능 영향 없음)
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('enable-accelerated-video-decode')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('limit-fps', '60')
app.commandLine.appendSwitch('max-fps', '60')

function splitPublicSegments(segments) {
  return segments.flatMap((seg) =>
    String(seg)
      .split(/[/\\]+/)
      .filter(Boolean),
  )
}

function getDevPublicRoot() {
  return path.join(__dirname, '..', 'public')
}

function getOverlayPublicRoot() {
  if (!app.isPackaged) return getDevPublicRoot()
  return path.join(app.getPath('userData'), 'public')
}

function joinPublicRoot(root, segments) {
  return path.join(root, ...splitPublicSegments(segments))
}

/** 패키징본: extraResources → asar.unpacked → asar. 개발본: 프로젝트 public */
function candidatePublicRoots() {
  if (!app.isPackaged) return [getDevPublicRoot()]
  return [
    path.join(process.resourcesPath, 'public'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'public'),
    path.join(app.getAppPath(), 'public'),
  ]
}

function packagedPublicPath(...segments) {
  const roots = candidatePublicRoots()
  for (const root of roots) {
    const full = joinPublicRoot(root, segments)
    if (fs.existsSync(full)) return full
  }
  return joinPublicRoot(roots[roots.length - 1], segments)
}

let pakState = null

function relKey(...segments) {
  return splitPublicSegments(segments).join('/')
}

function overlayFilePath(...segments) {
  return joinPublicRoot(getOverlayPublicRoot(), segments)
}

function resolvePackagedAsset(...segments) {
  const rel = relKey(...segments)
  if (pakState && pakState.index.has(rel)) {
    return { kind: 'pak', rel, ...pakState.index.get(rel) }
  }
  const loose = packagedPublicPath(...segments)
  try {
    if (fs.existsSync(loose) && fs.statSync(loose).isFile()) {
      return { kind: 'file', filePath: loose, rel }
    }
  } catch {
    // fall through
  }
  return null
}

function resolvePublicAsset(...segments) {
  const overlay = overlayFilePath(...segments)
  try {
    if (fs.existsSync(overlay) && fs.statSync(overlay).isFile()) {
      return { kind: 'file', filePath: overlay, rel: relKey(...segments) }
    }
  } catch {
    // fall through
  }
  return resolvePackagedAsset(...segments)
}

function readAssetSync(asset) {
  if (!asset) return null
  if (asset.kind === 'file') return fs.readFileSync(asset.filePath)
  return gamePak.readEntrySync(pakState, asset)
}

function readPublicJson(...segments) {
  const buf = readAssetSync(resolvePublicAsset(...segments))
  if (!buf) return null
  return parseJsonFile(buf)
}

function readPackagedJson(...segments) {
  const buf = readAssetSync(resolvePackagedAsset(...segments))
  if (!buf) return null
  return parseJsonFile(buf)
}

function openPackagedPak() {
  if (!app.isPackaged) return
  const dat = path.join(process.resourcesPath, 'game.dat')
  if (!fs.existsSync(dat)) {
    console.warn('[pak] game.dat missing, falling back to loose public/', dat)
    return
  }
  pakState = gamePak.open(dat)
  console.log('[pak] loaded', dat, 'entries', pakState.index.size)
}

/** 읽기: 패키징 후 수정본(userData) 파일이 있으면 그걸, 없으면 패키지 public.
 *  오버레이 디렉터리만 있다고 패키지 폴더 전체를 가리면 events.json 등이 사라진다. */
function publicPath(...segments) {
  const overlay = joinPublicRoot(getOverlayPublicRoot(), segments)
  if (app.isPackaged && fs.existsSync(overlay)) {
    try {
      if (fs.statSync(overlay).isFile()) return overlay
    } catch {
      // fall through
    }
  }
  const roots = candidatePublicRoots()
  for (const root of roots) {
    const full = joinPublicRoot(root, segments)
    if (fs.existsSync(full)) return full
  }
  return joinPublicRoot(roots[roots.length - 1], segments)
}

function readJsonIfExists(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null
    return parseJsonFile(fs.readFileSync(filePath))
  } catch (err) {
    console.error('Failed to read json:', filePath, err)
    return null
  }
}

function mediaUrlExists(url) {
  if (!url || typeof url !== 'string') return false
  if (url.startsWith('blob:') || url.startsWith('data:')) return false
  let rel = url.split('?')[0]
  if (rel.startsWith('media://')) rel = rel.slice('media://'.length)
  rel = rel.replace(/^\/+/, '')
  if (!rel) return false
  return Boolean(resolvePublicAsset(...rel.split(/[/\\]+/).filter(Boolean)))
}

function mediaRefUsable(url) {
  if (!url || typeof url !== 'string') return false
  if (url.startsWith('data:')) return true
  if (url.startsWith('blob:')) return false
  return mediaUrlExists(url)
}

function pickMediaUrl(overlayUrl, packedUrl) {
  if (mediaRefUsable(overlayUrl)) return overlayUrl
  if (mediaRefUsable(packedUrl)) return packedUrl
  return overlayUrl || packedUrl || ''
}

function mergeMediaSlot(overlaySlot, packedSlot) {
  const asSlot = (raw) => {
    if (!raw) return { url: null, blurRegions: [] }
    if (typeof raw === 'string') return { url: raw, blurRegions: [] }
    if (typeof raw === 'object') {
      return {
        ...raw,
        url: typeof raw.url === 'string' ? raw.url : null,
        blurRegions: Array.isArray(raw.blurRegions) ? raw.blurRegions : [],
      }
    }
    return { url: null, blurRegions: [] }
  }
  const overlay = asSlot(overlaySlot)
  const packed = asSlot(packedSlot)
  const url = pickMediaUrl(overlay.url, packed.url) || null
  const blurRegions =
    overlay.blurRegions.length > 0 ? overlay.blurRegions : packed.blurRegions
  return { ...packed, ...overlay, url, blurRegions }
}

function mergeAuditMedia(overlayMedia, packedMedia) {
  if (!overlayMedia && !packedMedia) return overlayMedia
  const next = {}
  for (const key of ['A', 'B', 'C']) {
    next[key] = mergeMediaSlot(overlayMedia?.[key], packedMedia?.[key])
  }
  return next
}

function mergeShortsVn(overlayVn, packedVn) {
  if (!packedVn) return overlayVn
  if (!overlayVn) return packedVn
  const pickList = (overlayList, packedList) => {
    if (
      Array.isArray(overlayList) &&
      overlayList.some((beat) => mediaRefUsable(beat?.mediaUrl || beat?.url))
    ) {
      return overlayList
    }
    return Array.isArray(packedList) && packedList.length ? packedList : overlayList
  }
  return {
    ...packedVn,
    ...overlayVn,
    vip: pickList(overlayVn.vip, packedVn.vip),
    h: pickList(overlayVn.h, packedVn.h),
  }
}

function mergeCatalogItem(overlayItem, packagedItem) {
  if (!packagedItem) return overlayItem
  if (!overlayItem) return packagedItem
  const overlayImagesUsable =
    Array.isArray(overlayItem.images) && overlayItem.images.some((m) => m && mediaRefUsable(m.url))
  const overlayVideosUsable =
    Array.isArray(overlayItem.videos) && overlayItem.videos.some((m) => m && mediaRefUsable(m.url))
  const overlayVoicesUsable =
    Array.isArray(overlayItem.voices) && overlayItem.voices.some((m) => m && mediaRefUsable(m.url))
  const overlaySnsUsable =
    Array.isArray(overlayItem.snsPosts) && overlayItem.snsPosts.length > 0
  return {
    ...packagedItem,
    ...overlayItem,
    profileImageUrl: pickMediaUrl(overlayItem.profileImageUrl, packagedItem.profileImageUrl),
    images: overlayImagesUsable ? overlayItem.images : packagedItem.images,
    videos: overlayVideosUsable ? overlayItem.videos : packagedItem.videos,
    voices: overlayVoicesUsable ? overlayItem.voices : packagedItem.voices,
    snsPosts: overlaySnsUsable ? overlayItem.snsPosts : packagedItem.snsPosts,
    auditMedia: mergeAuditMedia(overlayItem.auditMedia, packagedItem.auditMedia),
    shortsVn: mergeShortsVn(overlayItem.shortsVn, packagedItem.shortsVn),
    mediaRevision: overlayImagesUsable
      ? overlayItem.mediaRevision ?? packagedItem.mediaRevision
      : packagedItem.mediaRevision ?? overlayItem.mediaRevision,
    characterIconId: packagedItem.characterIconId ?? overlayItem.characterIconId,
    characterIllustrationId: packagedItem.characterIllustrationId ?? overlayItem.characterIllustrationId,
    profileImageId: packagedItem.profileImageId ?? overlayItem.profileImageId,
    profileVideoId: packagedItem.profileVideoId ?? overlayItem.profileVideoId,
    iconImageId: packagedItem.iconImageId ?? overlayItem.iconImageId,
    cardImageId: packagedItem.cardImageId ?? overlayItem.cardImageId,
  }
}

function mergeCatalogLists(overlayList, packagedList) {
  const packaged = Array.isArray(packagedList) ? packagedList : []
  const overlay = Array.isArray(overlayList) ? overlayList : []
  if (!app.isPackaged) return overlay.length ? overlay : packaged
  const overlayById = new Map()
  for (const item of overlay) {
    if (item && item.id != null) overlayById.set(String(item.id), item)
  }
  const seen = new Set()
  const result = []
  for (const packed of packaged) {
    if (!packed || packed.id == null) continue
    const id = String(packed.id)
    seen.add(id)
    const over = overlayById.get(id)
    result.push(over ? mergeCatalogItem(over, packed) : packed)
  }
  for (const over of overlay) {
    if (!over || over.id == null) continue
    const id = String(over.id)
    if (seen.has(id)) continue
    result.push(over)
  }
  return result
}

function mergeJudgeConfig(overlayJudge, packedJudge) {
  if (!packedJudge) return overlayJudge
  if (!overlayJudge) return packedJudge
  return {
    ...packedJudge,
    ...overlayJudge,
    avatarUrl: pickMediaUrl(overlayJudge.avatarUrl, packedJudge.avatarUrl),
    successMediaUrl: pickMediaUrl(overlayJudge.successMediaUrl, packedJudge.successMediaUrl),
    failMediaUrl: pickMediaUrl(overlayJudge.failMediaUrl, packedJudge.failMediaUrl),
    auditMedia: mergeAuditMedia(overlayJudge.auditMedia, packedJudge.auditMedia),
  }
}

function mergeStationGradeConfig(overlayConfig, packedConfig) {
  if (!packedConfig) return overlayConfig
  if (!overlayConfig) return packedConfig
  const overlayJudges = overlayConfig.auditConfig?.judges
  const packedJudges = packedConfig.auditConfig?.judges
  const packedById = new Map((Array.isArray(packedJudges) ? packedJudges : []).map((j) => [String(j.id), j]))
  const overlayList = Array.isArray(overlayJudges) && overlayJudges.length ? overlayJudges : packedJudges || []
  const seen = new Set()
  const judges = []
  for (const judge of overlayList) {
    if (!judge || judge.id == null) continue
    const id = String(judge.id)
    seen.add(id)
    judges.push(mergeJudgeConfig(judge, packedById.get(id)))
  }
  for (const packed of packedJudges || []) {
    if (!packed || packed.id == null) continue
    const id = String(packed.id)
    if (seen.has(id)) continue
    judges.push(packed)
  }
  return {
    ...packedConfig,
    ...overlayConfig,
    auditConfig: {
      ...(packedConfig.auditConfig || {}),
      ...(overlayConfig.auditConfig || {}),
      judges,
    },
  }
}

const HIGH_LOW_ROOM_IDS = ['local', 'star', 'legend']

function mergeDealerMediaSlot(overlaySlot, packedSlot) {
  const overlayUrl = overlaySlot && typeof overlaySlot === 'object' ? overlaySlot.url : ''
  const packedUrl = packedSlot && typeof packedSlot === 'object' ? packedSlot.url : ''
  const url = pickMediaUrl(overlayUrl, packedUrl)
  const overlayType = overlaySlot && typeof overlaySlot === 'object' ? overlaySlot.type : ''
  const packedType = packedSlot && typeof packedSlot === 'object' ? packedSlot.type : ''
  const type =
    mediaRefUsable(overlayUrl) && overlayType
      ? overlayType
      : packedType || overlayType || 'image'
  return { url: url || '', type: type === 'video' ? 'video' : 'image' }
}

function mergeHighLowRoom(overlayRoom, packedRoom) {
  if (!packedRoom) return overlayRoom
  if (!overlayRoom) return packedRoom
  const overlayStages = overlayRoom.dealerMediaStages && typeof overlayRoom.dealerMediaStages === 'object'
    ? overlayRoom.dealerMediaStages
    : {}
  const packedStages = packedRoom.dealerMediaStages && typeof packedRoom.dealerMediaStages === 'object'
    ? packedRoom.dealerMediaStages
    : {}
  return {
    ...packedRoom,
    ...overlayRoom,
    dealerMediaUrl: pickMediaUrl(overlayRoom.dealerMediaUrl, packedRoom.dealerMediaUrl),
    dealerMediaType: mediaRefUsable(overlayRoom.dealerMediaUrl)
      ? overlayRoom.dealerMediaType || packedRoom.dealerMediaType
      : packedRoom.dealerMediaType || overlayRoom.dealerMediaType || 'image',
    dealerMediaStages: {
      tier1: mergeDealerMediaSlot(overlayStages.tier1, packedStages.tier1),
      tier2: mergeDealerMediaSlot(overlayStages.tier2, packedStages.tier2),
      tier3: mergeDealerMediaSlot(overlayStages.tier3, packedStages.tier3),
    },
  }
}

function mergeHighLowConfig(overlayConfig, packedConfig) {
  if (!packedConfig) return overlayConfig
  if (!overlayConfig) return packedConfig
  const next = { ...packedConfig, ...overlayConfig }
  for (const roomId of HIGH_LOW_ROOM_IDS) {
    next[roomId] = mergeHighLowRoom(overlayConfig[roomId], packedConfig[roomId])
  }
  return next
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

function mediaResponseFromRange(total, mime, request, openStream) {
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
    return new Response(Readable.toWeb(openStream(start, end)), {
      status: 206,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
      },
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

  return new Response(Readable.toWeb(openStream(0, total - 1)), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(total),
      'Accept-Ranges': 'bytes',
    },
  })
}

async function mediaResponseFromFile(filePath, request) {
  let stat
  try {
    stat = fs.statSync(filePath)
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return new Response('Not Found', { status: 404 })
    }
    console.error('media stat error:', filePath, err)
    return new Response('Internal Error', { status: 500 })
  }
  if (!stat.isFile()) {
    return new Response('Not Found', { status: 404 })
  }
  return mediaResponseFromRange(stat.size, contentTypeFor(filePath), request, (start, end) =>
    fs.createReadStream(filePath, { start, end }),
  )
}

async function mediaResponseFromAsset(asset, request) {
  if (!asset) return new Response('Not Found', { status: 404 })
  if (asset.kind === 'file') return mediaResponseFromFile(asset.filePath, request)
  const mime = contentTypeFor(asset.rel || '')
  return mediaResponseFromRange(asset.size, mime, request, (start, end) =>
    gamePak.createEntryStream(pakState, asset, start, end),
  )
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

function getDeviceLangHints() {
  const systemLocale =
    typeof app.getSystemLocale === 'function' ? app.getSystemLocale() : app.getLocale()
  const preferredLanguages =
    typeof app.getPreferredSystemLanguages === 'function' ? app.getPreferredSystemLanguages() : []
  return {
    systemLocale: String(systemLocale || ''),
    preferredLanguages: Array.isArray(preferredLanguages)
      ? preferredLanguages.map((lang) => String(lang || '')).filter(Boolean)
      : [],
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const displayWorkArea = primaryDisplay ? primaryDisplay.workAreaSize : { width: 1280, height: 800 }
  const deviceLangHints = getDeviceLangHints()

  const mainWindow = new BrowserWindow({
    width: displayWorkArea.width,
    height: displayWorkArea.height,
    icon: path.join(
      __dirname,
      '..',
      app.isPackaged ? 'dist/icon.png' : 'build/icon.ico',
    ),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [
        `--broadcast-system-locale=${deviceLangHints.systemLocale}`,
        `--broadcast-preferred-langs=${encodeURIComponent(JSON.stringify(deviceLangHints.preferredLanguages))}`,
      ],
    },
  })

  mainWindow.maximize()
  mainWindow.setResizable(false)

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
  openPackagedPak()
  console.log('[main] isPackaged:', app.isPackaged)
  console.log('[main] appPath:', app.getAppPath())
  console.log('[main] publicRoots:', candidatePublicRoots())
  console.log('[main] overlayPublicRoot:', getOverlayPublicRoot())
  protocol.handle('media', async (request) => {
    try {
      const parsed = new URL(request.url)
      const asset = resolvePublicAsset(parsed.hostname, decodeURIComponent(parsed.pathname))
      console.log(
        '[media]',
        request.url,
        '=>',
        asset ? `${asset.kind}:${asset.rel || asset.filePath}` : 'miss',
      )
      return await mediaResponseFromAsset(asset, request)
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        return new Response('Not Found', { status: 404 })
      }
      console.error('media protocol error:', err)
      return new Response('Internal Error', { status: 500 })
    }
  })

  createWindow()
  void gameAnalytics.startSession(app)

  app.on('activate', () => {
    if (isDev) return
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}).catch((err) => {
  console.error('[main] startup failed:', err)
})

ipcMain.handle('set-display-mode', async (event, { mode }) => {
  try {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!win) return { success: false }
    win.setResizable(true)
    if (mode === 'fullscreen') {
      win.setFullScreen(true)
    } else {
      win.setFullScreen(false)
      win.maximize()
      const primaryDisplay = screen.getPrimaryDisplay()
      if (primaryDisplay && primaryDisplay.workArea) {
        const { x, y, width, height } = primaryDisplay.workArea
        win.setBounds({ x, y, width, height })
      }
    }
    win.setResizable(false)
    return { success: true }
  } catch (err) {
    console.error('set-display-mode error:', err)
    return { success: false, error: err.message }
  }
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
      sound: 'sounds',
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
        
        char.auditMedia.A = persistAuditMediaSlot(char.auditMedia.A, charAuditsDir, 'video_A', urlPrefix)
        char.auditMedia.B = persistAuditMediaSlot(char.auditMedia.B, charAuditsDir, 'video_B', urlPrefix)
        char.auditMedia.C = persistAuditMediaSlot(char.auditMedia.C, charAuditsDir, 'video_C', urlPrefix)
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
    const packagedChars = readPackagedJson('characters', 'characters.json')
    const overlayChars = app.isPackaged
      ? readJsonIfExists(overlayFilePath('characters', 'characters.json'))
      : null
    const fallbackChars = readPublicJson('characters', 'characters.json')
    const characters = mergeCatalogLists(
      overlayChars || (app.isPackaged ? [] : fallbackChars) || [],
      packagedChars || fallbackChars || [],
    )
    console.log(
      '[load-characters-json]',
      'packaged',
      Array.isArray(packagedChars) ? packagedChars.length : 0,
      'overlay',
      Array.isArray(overlayChars) ? overlayChars.length : 0,
      'merged',
      Array.isArray(characters) ? characters.length : typeof characters,
    )
    return { success: true, characters: Array.isArray(characters) ? characters : [] }
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
    const links = readPublicJson('chapter_assets', 'common_event_links.json') || {}
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
    const sounds = readPublicJson('chapter_assets', 'common_sounds.json') || []
    return { success: true, sounds: Array.isArray(sounds) ? sounds : [] }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-highlow-assets', async (event, { assets }) => {
  try {
    const targetDir = publicWritePath('chapter_assets', 'highlow')
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    for (const asset of assets || []) {
      const safeName = path.basename(String(asset?.fileName || ''))
      if (!safeName || !asset.buffer) continue
      const filePath = path.join(targetDir, safeName)
      const rawBuffer = Buffer.isBuffer(asset.buffer) ? asset.buffer : Buffer.from(asset.buffer)
      fs.writeFileSync(filePath, rawBuffer)
    }
    return { success: true, path: targetDir }
  } catch (err) {
    console.error('save-highlow-assets error:', err)
    return { success: false, error: err.message }
  }
})

function persistHighLowDealerSlot(slot, targetDir, filePrefix) {
  if (!slot || typeof slot !== 'object') {
    return { url: '', type: 'image' }
  }
  const url = saveBase64MediaFile(
    slot.url,
    targetDir,
    filePrefix,
    'media://chapter_assets/highlow',
  )
  const type = slot.type === 'video' || (typeof url === 'string' && /\.(mp4|webm|ogv)$/i.test(url))
    ? 'video'
    : 'image'
  return { url: url || '', type }
}

ipcMain.handle('save-highlow-config-json', async (event, { config }) => {
  try {
    const dir = publicWritePath('chapter_assets')
    const mediaDir = path.join(dir, 'highlow')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true })

    const packed = app.isPackaged ? readPackagedJson('chapter_assets', 'highlow.json') : null
    const nextConfig = JSON.parse(JSON.stringify(mergeHighLowConfig(config ?? {}, packed) ?? {}))
    for (const roomId of HIGH_LOW_ROOM_IDS) {
      const room = nextConfig[roomId]
      if (!room || typeof room !== 'object') continue
      const stages = room.dealerMediaStages && typeof room.dealerMediaStages === 'object' ? room.dealerMediaStages : {}
      nextConfig[roomId] = {
        ...room,
        dealerMediaUrl: saveBase64MediaFile(
          room.dealerMediaUrl,
          mediaDir,
          `${roomId}_dealer`,
          'media://chapter_assets/highlow',
        ) || '',
        dealerMediaStages: {
          tier1: persistHighLowDealerSlot(stages.tier1, mediaDir, `${roomId}_tier1`),
          tier2: persistHighLowDealerSlot(stages.tier2, mediaDir, `${roomId}_tier2`),
          tier3: persistHighLowDealerSlot(stages.tier3, mediaDir, `${roomId}_tier3`),
        },
      }
    }

    writeJson(path.join(dir, 'highlow.json'), nextConfig)
    return { success: true, config: nextConfig }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-highlow-config-json', async () => {
  try {
    if (!app.isPackaged) {
      return { success: true, config: readPublicJson('chapter_assets', 'highlow.json') }
    }
    const packed = readPackagedJson('chapter_assets', 'highlow.json')
    const overlay = readJsonIfExists(overlayFilePath('chapter_assets', 'highlow.json'))
    return { success: true, config: mergeHighLowConfig(overlay, packed) }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-bgm-assets', async (event, { assets }) => {
  try {
    const targetDir = publicWritePath('chapter_assets', 'bgm')
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    for (const asset of assets || []) {
      const safeName = path.basename(String(asset?.fileName || ''))
      if (!safeName || !asset.buffer) continue
      fs.writeFileSync(path.join(targetDir, safeName), Buffer.from(asset.buffer))
    }
    return { success: true, path: targetDir }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-bgm-config-json', async (event, { config }) => {
  try {
    const dir = publicWritePath('chapter_assets')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    writeJson(path.join(dir, 'bgm.json'), config ?? {})
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-bgm-config-json', async (event) => {
  try {
    const config = readPublicJson('chapter_assets', 'bgm.json') || {}
    return { success: true, config }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-bgm-file', async (event, { fileName }) => {
  try {
    const safeName = path.basename(String(fileName || ''))
    if (!safeName) {
      return { success: false, error: 'invalid path' }
    }
    const filePath = publicWritePath('chapter_assets', 'bgm', safeName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('prune-bgm-files', async (event, { keep }) => {
  try {
    const dirPath = publicWritePath('chapter_assets', 'bgm')
    if (!fs.existsSync(dirPath)) {
      return { success: true }
    }
    const keepSet = new Set(
      (Array.isArray(keep) ? keep : []).map((name) => path.basename(String(name || ''))).filter(Boolean),
    )
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      if (keepSet.has(entry.name)) continue
      fs.unlinkSync(path.join(dirPath, entry.name))
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('open-bgm-folder', async (event, { fileName } = {}) => {
  try {
    const dirPath = publicWritePath('chapter_assets', 'bgm')
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    const safeName = path.basename(String(fileName || ''))
    const filePath = safeName ? path.join(dirPath, safeName) : ''
    if (filePath && fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath)
    } else {
      await shell.openPath(dirPath)
    }
    return { success: true }
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

function persistAuditMediaSlot(slot, targetDir, filePrefix, urlPrefix) {
  if (slot == null || slot === '') {
    return { url: null, blurRegions: [] }
  }
  if (typeof slot === 'string') {
    return {
      url: saveBase64MediaFile(slot, targetDir, filePrefix, urlPrefix),
      blurRegions: [],
    }
  }
  return {
    url: saveBase64MediaFile(slot.url, targetDir, filePrefix, urlPrefix),
    blurRegions: Array.isArray(slot.blurRegions) ? slot.blurRegions : [],
  }
}

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

    const packed = app.isPackaged ? readPackagedJson('chapter_assets', 'station_grade_config.json') : null
    const nextConfig = JSON.parse(JSON.stringify(mergeStationGradeConfig(config ?? {}, packed) ?? {}))
    const urlPrefix = 'media://chapter_assets/audits'
    if (nextConfig.auditConfig && Array.isArray(nextConfig.auditConfig.judges)) {
      nextConfig.auditConfig.judges = nextConfig.auditConfig.judges.map((judge, idx) => {
        const idKey = judge.id || `judge_${idx + 1}`
        return {
          ...judge,
          avatarUrl: saveBase64MediaFile(judge.avatarUrl, auditsDir, `${idKey}_avatar`, urlPrefix),
          successMediaUrl: saveBase64MediaFile(judge.successMediaUrl, auditsDir, `${idKey}_success`, urlPrefix),
          failMediaUrl: saveBase64MediaFile(judge.failMediaUrl, auditsDir, `${idKey}_fail`, urlPrefix),
          auditMedia: {
            A: persistAuditMediaSlot(judge.auditMedia?.A, auditsDir, `${idKey}_sat_A`, urlPrefix),
            B: persistAuditMediaSlot(judge.auditMedia?.B, auditsDir, `${idKey}_sat_B`, urlPrefix),
            C: persistAuditMediaSlot(judge.auditMedia?.C, auditsDir, `${idKey}_sat_C`, urlPrefix),
          },
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
    if (!app.isPackaged) {
      return { success: true, config: readPublicJson('chapter_assets', 'station_grade_config.json') }
    }
    const packed = readPackagedJson('chapter_assets', 'station_grade_config.json')
    const overlay = readJsonIfExists(overlayFilePath('chapter_assets', 'station_grade_config.json'))
    return { success: true, config: mergeStationGradeConfig(overlay, packed) }
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

function assembleEventLocalizationFromGet(embedded, getLangJson) {
  const loc = mergeEventLocalization(embedded)
  for (const lang of EVENT_LOCALES) {
    const parsed = getLangJson(lang)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      loc[lang] = { ...loc[lang], ...parsed }
    }
  }
  return loc
}

function loadEventsFromJsonReader(readJson) {
  const metadataList = readJson('chapter_assets', 'events.json')
  if (!Array.isArray(metadataList) || metadataList.length === 0) return []
  const fullEvents = []

  for (const meta of metadataList) {
    if (!meta || !meta.id) continue
    const singleData = readJson('chapter_assets', 'events', `${meta.id}.json`)
    if (singleData && typeof singleData === 'object') {
      try {
        const localization = assembleEventLocalizationFromGet(singleData.localization, (lang) =>
          readJson('chapter_assets', 'events', String(meta.id), 'loc', `${lang}.json`),
        )
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
          media: [],
        })
      }
    } else {
      fullEvents.push({
        ...meta,
        nodes: [],
        localization: emptyEventLocalization(),
        characters: [],
        points: [],
        media: [],
      })
    }
  }

  return fullEvents
}

function loadEventsFromAssetsDir(assetsDir) {
  return loadEventsFromJsonReader((...segments) => {
    const filePath = path.join(assetsDir, ...splitPublicSegments(segments).slice(1))
    return readJsonIfExists(filePath)
  })
}

function mergeEventsById(packagedEvents, overlayEvents) {
  const byId = new Map()
  for (const ev of packagedEvents || []) {
    if (ev && ev.id) byId.set(String(ev.id), ev)
  }
  for (const ev of overlayEvents || []) {
    if (ev && ev.id) byId.set(String(ev.id), ev)
  }
  return [...byId.values()]
}

ipcMain.handle('load-events-json', async (event) => {
  try {
    if (!app.isPackaged) {
      return { success: true, events: loadEventsFromJsonReader(readPublicJson) }
    }
    const packaged = loadEventsFromJsonReader(readPackagedJson)
    const overlay = loadEventsFromAssetsDir(joinPublicRoot(getOverlayPublicRoot(), ['chapter_assets']))
    return { success: true, events: mergeEventsById(packaged, overlay) }
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
      sound: 'sounds',
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
      { kind: 'sound', dirName: 'sounds', keep: keep?.sound ?? [] },
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
      sound: 'sounds',
    }
    const folderName = folderMap[kind] || 'assets'
    const dir = publicWritePath('characters', String(characterId), folderName)
    const targetPath = path.join(dir, targetFileName)
    const sourceAsset = resolvePublicAsset('characters', String(characterId), folderName, sourceFileName)
    const sourceBuf = readAssetSync(sourceAsset)
    if (!sourceBuf) {
      return { success: false, error: 'source missing' }
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(targetPath, sourceBuf)
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
    const packagedStaff = readPackagedJson('staff', 'staff.json')
    const overlayStaff = app.isPackaged
      ? readJsonIfExists(overlayFilePath('staff', 'staff.json'))
      : null
    const fallbackStaff = readPublicJson('staff', 'staff.json')
    const staff = mergeCatalogLists(
      overlayStaff || (app.isPackaged ? [] : fallbackStaff) || [],
      packagedStaff || fallbackStaff || [],
    )
    return { success: true, staff: Array.isArray(staff) ? staff : [] }
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

ipcMain.handle('device-lock-status', () => deviceLock.verifyDeviceLock(app))

ipcMain.handle('track-achievement-unlock', (_event, payload) => {
  const id = payload && payload.id
  const name = payload && payload.name
  void gameAnalytics.trackAchievementUnlock(id, name)
  return { success: true }
})

let gaQuitStarted = false
app.on('before-quit', (event) => {
  if (gaQuitStarted) return
  event.preventDefault()
  gaQuitStarted = true
  Promise.race([
    gameAnalytics.endSession(),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]).finally(() => {
    app.quit()
  })
})

ipcMain.handle('quit-app', () => {
  app.quit()
})

app.on('window-all-closed', () => {
  app.quit()
})
