// 선물요구 콘텐츠 제거 — 7개 언어 gift 섹션 삭제
const fs = require('fs')

for (const f of ['KO.json', 'EN.json', 'JA.json', 'ZH-CN.json', 'RU.json', 'ES.json', 'DE.json']) {
  const file = `src/locales/${f}`
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (json.gift) {
    delete json.gift
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8')
    console.log(f, 'gift removed')
  } else {
    console.log(f, 'no gift section')
  }
}
