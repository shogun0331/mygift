// 무료 번역 프로바이더 후보 탐색 — 용법: node probe-providers.cjs
const https = require('https')

const TEXT = '한낮의 공원. 햇살이 벤치 위로 쏟아진다. 미야자와 리나가 벤치 옆에 먼저 도착해 팔짱을 낀 채 서 있다.'
const TARGET = 'en'

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', ...headers } }, (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      })
      .on('error', reject)
  })
}

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const payload = typeof body === 'string' ? body : JSON.stringify(body)
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      }
    )
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

async function main() {
  // 1) Google dict-chrome-ex (clients5.google.com)
  try {
    const q = encodeURIComponent(TEXT)
    const r = await get(`https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=ko&tl=${TARGET}&q=${q}`)
    console.log('[google-clients5]', r.status, r.body.slice(0, 150))
  } catch (e) {
    console.log('[google-clients5] ERR', e.message)
  }

  // 2) Lingva 공개 인스턴스들
  for (const host of ['lingva.ml', 'translate.plausibility.cloud', 'lingva.lunar.icu']) {
    try {
      const path = `/api/v1/ko/${TARGET}/${encodeURIComponent(TEXT)}`
      const r = await get(`https://${host}${path}`)
      let out = r.body.slice(0, 150)
      try { out = JSON.parse(r.body).translation || out } catch {}
      console.log(`[lingva:${host}]`, r.status, String(out).slice(0, 150))
    } catch (e) {
      console.log(`[lingva:${host}] ERR`, e.message)
    }
  }

  // 3) MyMemory (무료, 소규모용)
  try {
    const q = encodeURIComponent(TEXT)
    const r = await get(`https://api.mymemory.translated.net/get?q=${q}&langpair=ko|${TARGET}`)
    let out = ''
    try { out = JSON.parse(r.body).responseData.translatedText } catch {}
    console.log('[mymemory]', r.status, String(out).slice(0, 150))
  } catch (e) {
    console.log('[mymemory] ERR', e.message)
  }

  // 4) LibreTranslate 미러
  for (const host of ['libretranslate.com', 'translate.disroot.org', 'lt.vern.cc']) {
    try {
      const r = await post(`https://${host}/translate`, { q: TEXT, source: 'ko', target: TARGET, format: 'text' })
      let out = ''
      try { out = JSON.parse(r.body).translatedText || r.body.slice(0, 100) } catch { out = r.body.slice(0, 100) }
      console.log(`[libre:${host}]`, r.status, String(out).slice(0, 150))
    } catch (e) {
      console.log(`[libre:${host}] ERR`, e.message)
    }
  }
}

main()
