// 이벤트 loc 일괄 번역 파이프라인 (Google clients5 dict-chrome-ex)
// 용법:
//   node translate-event-loc.cjs collect            → 고유 문자열 추출(out/unique-strings.json)
//   node translate-event-loc.cjs translate en ...   → 캐시 채우기(out/cache/<lang>.json, 이어하기 지원)
//   node translate-event-loc.cjs apply              → 이벤트 loc 파일에 적용 + 검증 리포트
const https = require('https')
const fs = require('fs')
const path = require('path')

const BASE = path.join(__dirname, '..', '..', 'public', 'chapter_assets', 'events')
const OUT_DIR = path.join(__dirname, 'out')
const CACHE_DIR = path.join(OUT_DIR, 'cache')
const LANGS = ['en', 'ja', 'zh-cn', 'ru', 'es', 'de']

const CONCURRENCY = 10
const RETRIES = 4

fs.mkdirSync(CACHE_DIR, { recursive: true })

// ---------- 공통 ----------
function loadEvents() {
  const events = []
  for (const dir of fs.readdirSync(BASE)) {
    const loc = path.join(BASE, dir, 'loc')
    const koPath = path.join(loc, 'ko.json')
    if (!fs.existsSync(koPath)) continue
    const ko = JSON.parse(fs.readFileSync(koPath, 'utf8'))
    events.push({ dir, loc, keys: Object.keys(ko), values: Object.values(ko) })
  }
  return events
}

function uniqueStrings(events) {
  const set = new Set()
  for (const ev of events) for (const v of ev.values) set.add(v)
  return [...set]
}

// ---------- 번역 ----------
function translateOnce(text, target) {
  return new Promise((resolve, reject) => {
    // 긴 문장은 문장 경계로 분할
    let parts = [text]
    if (encodeURIComponent(text).length > 1600) {
      parts = []
      let cur = ''
      for (const seg of text.split(/(?<=[.!?。…])\s+/)) {
        if (encodeURIComponent((cur + ' ' + seg).trim()).length > 1400) {
          if (cur) parts.push(cur.trim())
          cur = seg
        } else cur = (cur + ' ' + seg).trim()
      }
      if (cur.trim()) parts.push(cur.trim())
    }
    ;(async () => {
      try {
        const outs = []
        for (const p of parts) {
          const q = encodeURIComponent(p)
          const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=ko&tl=${target}&q=${q}`
          const body = await new Promise((res, rej) => {
            const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (x) => {
              let d = ''
              x.on('data', (c) => (d += c))
              x.on('end', () => {
                if (x.statusCode !== 200) return rej(new Error(`HTTP ${x.statusCode}`))
                try {
                  const j = JSON.parse(d)
                  if (Array.isArray(j) && typeof j[0] === 'string') res(j.join(''))
                  else if (Array.isArray(j) && Array.isArray(j[0])) res(j[0].map((s) => s[0]).join(''))
                  else rej(new Error('UNEXPECTED_SHAPE'))
                } catch { rej(new Error('PARSE')) }
              })
            })
            req.setTimeout(20000, () => { req.destroy(); rej(new Error('timeout')) })
            req.on('error', rej)
          })
          outs.push(body)
        }
        resolve(outs.join(' '))
      } catch (e) { reject(e) }
    })()
  })
}


async function translateWithRetry(text, target) {
  let lastErr
  for (let i = 0; i <= RETRIES; i++) {
    try {
      const out = await translateOnce(text, target)
      await sleep(60 + Math.random() * 120) // 지터
      return out
    } catch (e) {
      lastErr = e
      await sleep(800 * Math.pow(2, i) + Math.random() * 500) // 백오프
    }
  }
  throw lastErr
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function pool(items, worker, size, onProgress) {
  let idx = 0, done = 0
  const errors = []
  async function run() {
    while (idx < items.length) {
      const my = idx++
      try {
        await worker(items[my], my)
      } catch (e) {
        errors.push({ item: String(items[my]).slice(0, 60), err: String((e && e.message) || e) })
      }
      done++
      if (onProgress && done % 100 === 0) onProgress(done, items.length, errors.length)
    }
  }
  await Promise.all(Array.from({ length: size }, run))
  return errors
}

// ---------- 커맨드 ----------
function cmdCollect() {
  const events = loadEvents()
  const uniq = uniqueStrings(events)
  fs.writeFileSync(path.join(OUT_DIR, 'unique-strings.json'), JSON.stringify(uniq, null, 2), 'utf8')
  console.log(`events=${events.length} totalStrings=${events.reduce((a, e) => a + e.keys.length, 0)} unique=${uniq.length}`)
}

async function cmdTranslate(langs) {
  const uniq = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'unique-strings.json'), 'utf8'))
  for (const lang of langs) {
    const cachePath = path.join(CACHE_DIR, `${lang}.json`)
    const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {}
    const todoAll = uniq.filter((s) => !(s in cache))
    const limit = process.env.LOC_LIMIT ? Number(process.env.LOC_LIMIT) : 0
    const todo = limit > 0 ? todoAll.slice(0, limit) : todoAll
    console.log(`[${lang}] alreadyCached=${todoAll.length === 0 ? uniq.length : uniq.length - todoAll.length} todo=${todo.length}`)
    if (todo.length === 0) continue
    let lastSave = Date.now()
    const errors = await pool(
      todo,
      async (text) => {
        cache[text] = await translateWithRetry(text, lang)
        if (Date.now() - lastSave > 5000) {
          fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf8')
          lastSave = Date.now()
        }
      },
      CONCURRENCY,
      (done, total, errN) => console.log(`[${lang}] ${done}/${total} errors=${errN}`)
    )
    fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf8')
    console.log(`[${lang}] 완료. errors=${errors.length}`)
    if (errors.length) {
      fs.writeFileSync(path.join(OUT_DIR, `errors-${lang}.json`), JSON.stringify(errors, null, 2), 'utf8')
    }
  }
}

// ---------- 용어 보정 (apply 단계에서 적용, 원문 MT는 캐시에 보존) ----------
const GLOSSARY = {
  en: [
    [/\brepresentative\b/gi, 'CEO'],
  ],
  de: [
    [/Vertreter(in)?\b/g, 'Chef'],
    [/Repräsentant(in)?\b/g, 'Chef'],
  ],
  ja: [
    [/代表者/g, '社長'],
    [/宮沢玲奈/g, '宮沢りな'],
  ],
  es: [
    [/\brepresentante\b/gi, 'jefe'],
  ],
  ru: [],
  'zh-cn': [
    [/代表者|代表人/g, '社长'],
    [/宫泽莉娜|宫泽莉奈/g, '宫泽里奈'],
  ],
}

function polish(text, lang) {
  let t = text
  for (const [re, rep] of GLOSSARY[lang] || []) t = t.replace(re, rep)
  return t
}

function cmdApply() {
  const events = loadEvents()
  const report = []
  for (const lang of LANGS) {
    const cachePath = path.join(CACHE_DIR, `${lang}.json`)
    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
    let missing = 0
    for (const ev of events) {
      const out = {}
      for (let i = 0; i < ev.keys.length; i++) {
        const src = ev.values[i]
        const tr = cache[src]
        if (typeof tr !== 'string') { missing++; out[ev.keys[i]] = ''; continue }
        out[ev.keys[i]] = polish(tr, lang)
      }
      fs.writeFileSync(path.join(ev.loc, `${lang}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8')
    }
    report.push(`${lang}: missing=${missing}`)
  }
  console.log(report.join('\n'))
  // 검증: 키 일치 + 빈 값 확인
  let bad = 0
  for (const ev of events) {
    const koKeys = ev.keys
    for (const lang of LANGS) {
      const j = JSON.parse(fs.readFileSync(path.join(ev.loc, `${lang}.json`), 'utf8'))
      const ks = Object.keys(j)
      if (ks.length !== koKeys.length || ks.some((k, i) => k !== koKeys[i])) { bad++; console.log('KEY MISMATCH', ev.dir, lang) }
      else if (Object.values(j).some((v) => !v || !v.trim())) { bad++; console.log('EMPTY VALUE', ev.dir, lang) }
    }
  }
  console.log(bad === 0 ? '검증 통과: 모든 파일 키 일치 + 빈 값 없음' : `검증 실패 항목: ${bad}`)
}

async function main() {
  const cmd = process.argv[2]
  if (cmd === 'collect') return cmdCollect()
  if (cmd === 'translate') return cmdTranslate(process.argv.slice(3).length ? process.argv.slice(3) : LANGS)
  if (cmd === 'apply') return cmdApply()
  console.log('usage: collect | translate [lang...] | apply')
}

main()
