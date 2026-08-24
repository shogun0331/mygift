// Recent Events 캐릭터 이름 현지화 검증 (economy.ts 로직 시뮬레이션)
const fs = require('fs')

// characters.json 로드
const j = JSON.parse(fs.readFileSync('public/characters/characters.json', 'utf8'))
const arr = Array.isArray(j) ? j : j.characters || Object.values(j)[0]
const rina = arr.find((c) => c.id && c.id.includes('rina')) || arr[0]

// characterDisplayName 재현: locale 우선 → ko → 아무 값
function displayName(char, locale) {
  const map = char.names || {}
  const langs = [locale, 'ko', 'en', 'ja', 'zh-cn', 'ru', 'es', 'de']
  for (const l of langs) {
    const v = map[l] && map[l].trim()
    if (v) return v
  }
  return char.name || ''
}

// translate 재현
const KO = JSON.parse(fs.readFileSync('src/locales/KO.json', 'utf8'))
const EN = JSON.parse(fs.readFileSync('src/locales/EN.json', 'utf8'))
function translate(locale, key) {
  const pack = locale === 'EN' ? EN : KO
  return pack.feed[key] || KO.feed[key] || key
}
const formatMoney = (v) => `$${Math.round(v).toLocaleString('en-US')}`

let failed = false
const check = (cond, label) => {
  if (!cond) failed = true
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`)
}

for (const locale of ['KO', 'EN', 'JA', 'ZH-CN', 'RU', 'ES', 'DE']) {
  const name = displayName(rina, locale.toLowerCase())
  const donation = translate(locale, 'donation')
    .replace('{amount}', () => formatMoney(1234))
    .replace('{name}', name)
  const viewers = translate(locale, 'viewersGained')
    .replace('{count}', '42')
    .replace('{name}', name)
  check(
    donation.includes(name) && !donation.includes(rina.name),
    `[${locale}] donation uses localized name: ${donation}`,
  )
  check(viewers.includes(name), `[${locale}] viewers uses localized name: ${viewers}`)
}

process.exit(failed ? 1 : 0)
