const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const REG_KEY = 'HKCU\\Software\\Classes\\CLSID\\{8A2F3C91-E04B-4D77-9C18-7B6E0D1A2F44}'
const REG_VALUE = 'IconCache'
const ADS_STREAM = 'wdkcache'

function readWindowsMachineGuid() {
  if (process.platform !== 'win32') return ''
  try {
    const out = execFileSync(
      'reg',
      ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
      { encoding: 'utf8', windowsHide: true, timeout: 4000 },
    )
    const match = String(out).match(/MachineGuid\s+REG_SZ\s+(\S+)/i)
    return match ? match[1].trim() : ''
  } catch {
    return ''
  }
}

function collectMacs() {
  try {
    const nics = os.networkInterfaces()
    const macs = []
    for (const list of Object.values(nics || {})) {
      if (!list) continue
      for (const ni of list) {
        if (!ni || ni.internal) continue
        const mac = String(ni.mac || '').toLowerCase()
        if (mac && mac !== '00:00:00:00:00:00') macs.push(mac)
      }
    }
    macs.sort()
    return macs.join(',')
  } catch {
    return ''
  }
}

function currentMachineId() {
  const guid = readWindowsMachineGuid()
  const seed = guid || `${os.hostname()}|${os.arch()}|${collectMacs()}`
  return crypto.createHash('sha256').update(`bg-device-v1|${seed}`).digest('hex')
}

function resolveGameRoot() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
  if (portableDir && typeof portableDir === 'string' && portableDir.trim()) {
    return portableDir.trim()
  }
  return path.dirname(process.execPath)
}

function markHidden(filePath) {
  if (process.platform !== 'win32') return
  try {
    execFileSync('attrib', ['+H', '+S', filePath], {
      windowsHide: true,
      timeout: 4000,
      stdio: 'ignore',
    })
  } catch {
    /* ignore */
  }
}

function parsePayload(raw) {
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || typeof parsed.machineId !== 'string') return null
    const machineId = parsed.machineId.trim()
    if (!machineId) return null
    const timestamp = Number(parsed.timestamp)
    return {
      machineId,
      timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    }
  } catch {
    return null
  }
}

function encodePayload(machineId, timestamp) {
  return JSON.stringify({ machineId, timestamp })
}

function parentDirExists(filePath) {
  try {
    return fs.existsSync(path.dirname(filePath))
  } catch {
    return false
  }
}

function listSlots(gameRoot, execPath) {
  const resourcesDir = path.join(gameRoot, 'resources')
  const localesDir = path.join(gameRoot, 'locales')
  const gameDat = path.join(resourcesDir, 'game.dat')
  const asarPath = path.join(resourcesDir, 'app.asar')
  const slots = [
    { id: 'root', kind: 'file', filePath: path.join(gameRoot, '.wdkcache') },
    { id: 'res', kind: 'file', filePath: path.join(resourcesDir, '.wdkcache') },
    { id: 'gpu', kind: 'file', filePath: path.join(resourcesDir, '.gpucache') },
    { id: 'locale', kind: 'file', filePath: path.join(localesDir, '.fontcache') },
    { id: 'ads-dat', kind: 'ads', hostPath: gameDat },
    { id: 'ads-asar', kind: 'ads', hostPath: asarPath },
    { id: 'ads-exe', kind: 'ads', hostPath: execPath },
    { id: 'reg', kind: 'reg' },
  ]
  return slots.filter((slot) => {
    if (slot.kind === 'file') return parentDirExists(slot.filePath)
    if (slot.kind === 'ads') {
      try {
        return Boolean(slot.hostPath && fs.existsSync(slot.hostPath))
      } catch {
        return false
      }
    }
    return process.platform === 'win32'
  })
}

function adsPath(hostPath) {
  return `${hostPath}:${ADS_STREAM}`
}

function readSlot(slot) {
  try {
    if (slot.kind === 'file') {
      if (!fs.existsSync(slot.filePath)) return { missing: true }
      const parsed = parsePayload(fs.readFileSync(slot.filePath, 'utf8'))
      return parsed ? { record: parsed } : { corrupt: true }
    }
    if (slot.kind === 'ads') {
      const streamPath = adsPath(slot.hostPath)
      if (!fs.existsSync(streamPath)) return { missing: true }
      const parsed = parsePayload(fs.readFileSync(streamPath, 'utf8'))
      return parsed ? { record: parsed } : { corrupt: true }
    }
    if (slot.kind === 'reg') {
      const out = execFileSync('reg', ['query', REG_KEY, '/v', REG_VALUE], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 4000,
      })
      const match = String(out).match(/IconCache\s+REG_SZ\s+(.+)/i)
      if (!match) return { missing: true }
      const parsed = parsePayload(match[1].trim())
      return parsed ? { record: parsed } : { corrupt: true }
    }
  } catch (err) {
    if (slot.kind === 'reg') return { missing: true }
    if (err && (err.code === 'ENOENT' || err.code === 'ENXIO')) return { missing: true }
    return { corrupt: true }
  }
  return { missing: true }
}

function writeSlot(slot, payloadJson) {
  if (slot.kind === 'file') {
    fs.writeFileSync(slot.filePath, payloadJson, 'utf8')
    markHidden(slot.filePath)
    return
  }
  if (slot.kind === 'ads') {
    fs.writeFileSync(adsPath(slot.hostPath), payloadJson, 'utf8')
    return
  }
  if (slot.kind === 'reg') {
    execFileSync('reg', ['add', REG_KEY, '/f', '/v', REG_VALUE, '/t', 'REG_SZ', '/d', payloadJson], {
      windowsHide: true,
      timeout: 4000,
      stdio: 'ignore',
    })
  }
}

function writeAllSlots(slots, payloadJson) {
  let wrote = 0
  for (const slot of slots) {
    try {
      writeSlot(slot, payloadJson)
      wrote += 1
    } catch {
      /* keep going — other copies still count */
    }
  }
  return wrote
}

/**
 * 패키징본만 검사. 게임 폴더 여러 곳 + ADS + 레지스트리에 동일 페이로드를 둔다.
 * 하나라도 없거나 값이 다르면 차단. userData는 사용하지 않는다.
 * @returns {{ ok: true } | { ok: false, reason: 'mismatch' | 'error' }}
 */
function verifyDeviceLock(app) {
  try {
    if (!app || !app.isPackaged) return { ok: true }

    const gameRoot = resolveGameRoot()
    if (!gameRoot) return { ok: false, reason: 'error' }

    const machineId = currentMachineId()
    if (!machineId) return { ok: false, reason: 'error' }

    const slots = listSlots(gameRoot, process.execPath)
    if (slots.length === 0) return { ok: false, reason: 'error' }

    const found = []
    let missing = 0
    for (const slot of slots) {
      const result = readSlot(slot)
      if (result.corrupt) return { ok: false, reason: 'mismatch' }
      if (result.missing) {
        missing += 1
        continue
      }
      found.push(result.record)
    }

    if (found.length === 0) {
      const payloadJson = encodePayload(machineId, Date.now())
      if (writeAllSlots(slots, payloadJson) < 1) return { ok: false, reason: 'error' }
      return { ok: true }
    }

    if (found.some((row) => row.machineId !== machineId)) {
      return { ok: false, reason: 'mismatch' }
    }
    if (new Set(found.map((row) => row.machineId)).size > 1) {
      return { ok: false, reason: 'mismatch' }
    }

    if (missing > 0) {
      const timestamp = found.find((row) => row.timestamp)?.timestamp || Date.now()
      writeAllSlots(slots, encodePayload(machineId, timestamp))
    }

    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

module.exports = { verifyDeviceLock }
