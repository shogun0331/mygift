const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')

const GAME_KEY = '1365f839e0c42777f2f5a111dd68bd08'
const SECRET_KEY = '321eb55d03819ab3a9b17f09339462dbe11bdc30'
const COLLECTOR = `https://api.gameanalytics.com/v2/${GAME_KEY}`

let appRef = null
let enabled = false
let started = false
let ended = false
let sessionId = ''
let sessionNum = 1
let userId = ''
let tsOffset = 0
let sessionStartedAt = 0
let buildVersion = '0.0.0'

function statePath() {
  return path.join(appRef.getPath('userData'), 'ga-state.json')
}

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath(), 'utf8'))
    if (parsed && typeof parsed.userId === 'string' && parsed.userId) {
      userId = parsed.userId
    }
    const num = Number(parsed && parsed.sessionNum)
    sessionNum = Number.isFinite(num) && num >= 0 ? num : 0
  } catch {
    userId = ''
    sessionNum = 0
  }
  if (!userId) userId = crypto.randomUUID()
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(statePath()), { recursive: true })
    fs.writeFileSync(
      statePath(),
      JSON.stringify({ userId, sessionNum }),
      'utf8',
    )
  } catch {
    /* ignore */
  }
}

function osVersion() {
  const release = String(os.release() || '10.0.0')
    .split('.')
    .slice(0, 3)
    .map((part) => part.replace(/\D/g, '').slice(0, 5) || '0')
    .join('.')
  return `windows ${release}`
}

function nowTs() {
  return Math.floor(Date.now() / 1000) + tsOffset
}

function defaultAnnotations() {
  return {
    v: 2,
    user_id: userId,
    client_ts: nowTs(),
    sdk_version: 'rest api v2',
    os_version: osVersion(),
    manufacturer: 'microsoft',
    device: String(os.hostname() || 'pc').slice(0, 64),
    platform: 'windows',
    session_id: sessionId,
    session_num: sessionNum,
    build: String(buildVersion).slice(0, 32),
  }
}

function gaPart(value) {
  const cleaned = String(value || 'unknown')
    .replace(/[^A-Za-z0-9\s\-_.()!?]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64)
  return cleaned || 'unknown'
}

function hmacAuth(body) {
  return crypto.createHmac('sha256', SECRET_KEY).update(body).digest('base64')
}

async function postJson(url, payload) {
  const json = JSON.stringify(payload)
  const gzipped = zlib.gzipSync(Buffer.from(json, 'utf8'))
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: hmacAuth(gzipped),
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
    },
    body: gzipped,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`GA ${res.status} ${text.slice(0, 200)}`)
  }
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function sendEvents(events) {
  if (!enabled || events.length === 0) return
  await postJson(`${COLLECTOR}/events`, events)
}

async function initCollector() {
  const payload = [
    {
      platform: 'windows',
      os_version: osVersion(),
      sdk_version: 'rest api v2',
    },
  ]
  const result = await postJson(`${COLLECTOR}/init`, payload)
  if (!result || result.enabled === false) {
    enabled = false
    return
  }
  enabled = true
  const serverTs = Number(result.server_ts)
  if (Number.isFinite(serverTs) && serverTs > 0) {
    tsOffset = serverTs - Math.floor(Date.now() / 1000)
  }
}

async function startSession(app) {
  if (started || process.env.ELECTRON_DEV === '1') return
  appRef = app
  started = true
  ended = false
  buildVersion = String(app.getVersion() || '0.0.0')
  loadState()
  sessionNum += 1
  saveState()
  sessionId = crypto.randomUUID()
  sessionStartedAt = Date.now()

  try {
    await initCollector()
    if (!enabled) return
    const date = new Date().toISOString().slice(0, 10)
    await sendEvents([
      {
        ...defaultAnnotations(),
        category: 'user',
      },
      {
        ...defaultAnnotations(),
        category: 'design',
        event_id: `session_start:${gaPart(buildVersion)}:${gaPart(date)}`,
      },
    ])
  } catch (err) {
    console.warn('[ga] session_start failed:', err && err.message)
  }
}

async function endSession() {
  if (!started || ended || process.env.ELECTRON_DEV === '1') return
  ended = true
  if (!enabled) return
  const length = Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000))
  try {
    await sendEvents([
      {
        ...defaultAnnotations(),
        category: 'session_end',
        length,
      },
    ])
  } catch (err) {
    console.warn('[ga] session_end failed:', err && err.message)
  }
}

async function trackAchievementUnlock(id, name) {
  if (!started || ended || !enabled || process.env.ELECTRON_DEV === '1') return
  try {
    await sendEvents([
      {
        ...defaultAnnotations(),
        category: 'design',
        event_id: `achievement_unlock:${gaPart(id)}:${gaPart(name)}`,
      },
    ])
  } catch (err) {
    console.warn('[ga] achievement_unlock failed:', err && err.message)
  }
}

module.exports = {
  startSession,
  endSession,
  trackAchievementUnlock,
}
