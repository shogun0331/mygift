// 랭킹 패널 승급 조건 i18n — 7개 언어 ranking.cond 추가
const fs = require('fs')

const TRANSLATIONS = {
  KO: {
    viewers: '시청자 {n}명',
    slots: '오픈 슬롯 {n}칸',
    assets: '자산 ${n}',
    creators: '{grade}+랭크 {n}명',
    none: '조건 없음',
  },
  EN: {
    viewers: 'Viewers {n}',
    slots: 'Open Slots {n}',
    assets: 'Assets ${n}',
    creators: 'Rank {grade}+ ×{n}',
    none: 'No conditions',
  },
  JA: {
    viewers: '視聴者 {n}人',
    slots: '開放スロット {n}枠',
    assets: '資産 ${n}',
    creators: '{grade}+ランク {n}人',
    none: '条件なし',
  },
  'ZH-CN': {
    viewers: '观众 {n}人',
    slots: '开放槽位 {n}个',
    assets: '资产 ${n}',
    creators: '{grade}+级 {n}人',
    none: '无条件',
  },
  RU: {
    viewers: 'Зрители {n}',
    slots: 'Слоты {n}',
    assets: 'Активы ${n}',
    creators: 'Ранг {grade}+ ×{n}',
    none: 'Нет условий',
  },
  ES: {
    viewers: 'Espectadores {n}',
    slots: 'Espacios {n}',
    assets: 'Activos ${n}',
    creators: 'Rango {grade}+ ×{n}',
    none: 'Sin condiciones',
  },
  DE: {
    viewers: 'Zuschauer {n}',
    slots: 'Slots {n}',
    assets: 'Vermögen ${n}',
    creators: 'Rang {grade}+ ×{n}',
    none: 'Keine Bedingungen',
  },
}

for (const [tag, cond] of Object.entries(TRANSLATIONS)) {
  const file = `src/locales/${tag}.json`
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  json.ranking = { ...json.ranking, cond }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log(tag, 'ranking.cond added:', Object.keys(cond).length, 'keys')
}
