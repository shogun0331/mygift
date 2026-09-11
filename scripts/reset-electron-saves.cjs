/**
 * 패키징본 Electron이 쓰는 Chromium 프로필(세이브 localStorage / IndexedDB / 오버레이)을 지운다.
 * 개발용 프로필(BroadcastGame-dev)은 건드리지 않는다.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PACKAGED_PROFILE_NAMES = ['BroadcastGame', 'broadcast-game', 'com.broadcast.game']
const CHROMIUM_DIR_NAMES = new Set([
  'Local Storage',
  'IndexedDB',
  'Session Storage',
  'Service Worker',
  'GPUCache',
  'Code Cache',
  'Cache',
  'Cache_Data',
  'blob_storage',
  'databases',
  'File System',
  'Network',
  'Cookies',
  'Cookies-journal',
])

function exists(target) {
  try {
    fs.accessSync(target)
    return true
  } catch {
    return false
  }
}

function removePath(target) {
  if (!exists(target)) return false
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 80 })
  console.log(`[reset-saves] removed ${target}`)
  return true
}

function walkDirs(root, depth, visit) {
  if (depth < 0 || !exists(root)) return
  let entries = []
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const full = path.join(root, entry.name)
    visit(full, entry.name)
    walkDirs(full, depth - 1, visit)
  }
}

function wipeChromiumProfileBits(root) {
  if (!exists(root)) return
  walkDirs(root, 4, (full, name) => {
    if (CHROMIUM_DIR_NAMES.has(name) || name.endsWith('.ldb') || name.includes('Local Storage')) {
      removePath(full)
    }
  })
}

const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
const outputs = [
  path.join(localAppData, 'Temp', 'broadcast-game-dist'),
  path.join(ROOT, 'dist-electron'),
]

let count = 0
for (const name of PACKAGED_PROFILE_NAMES) {
  if (removePath(path.join(appData, name))) count += 1
  if (removePath(path.join(localAppData, name))) count += 1
}

for (const outDir of outputs) {
  if (!exists(outDir)) continue
  wipeChromiumProfileBits(outDir)
  for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
    const full = path.join(outDir, entry.name)
    if (/data|profile|userData/i.test(entry.name)) {
      if (removePath(full)) count += 1
    }
  }
}

console.log(`[reset-saves] packaged Electron save/profile reset done (${count} roots)`)
