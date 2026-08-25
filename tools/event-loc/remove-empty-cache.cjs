// 빈 번역 결과 캐시에서 제거 — 용법: node remove-empty-cache.cjs
const fs = require('fs')
const path = require('path')

const CACHE_DIR = path.join(__dirname, 'out', 'cache')
const LANGS = ['en', 'ja', 'zh-cn', 'ru', 'es', 'de']

for (const lang of LANGS) {
  const p = path.join(CACHE_DIR, `${lang}.json`)
  const c = JSON.parse(fs.readFileSync(p, 'utf8'))
  let removed = 0
  for (const [k, v] of Object.entries(c)) {
    if (!String(v).trim()) {
      delete c[k]
      removed++
    }
  }
  if (removed) fs.writeFileSync(p, JSON.stringify(c), 'utf8')
  console.log(`${lang}: removed ${removed}`)
}
