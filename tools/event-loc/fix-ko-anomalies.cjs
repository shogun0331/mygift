// ko.json 검수 오류 3건 수정 — 용법: node fix-ko-anomalies.cjs
const fs = require('fs')

const FILE = 'F:/Broadcast/broadcast-game/public/chapter_assets/events/a/loc/ko.json'

const FIXES = [
  // [이전 원문(JSON 이스케이프 적용 전 문자열), 새 원문]
  [
    ': 정지 이미지 — 미야자와 리나 상반신, 어깨끈 흘러내려 브라 윗라인 노출.',
    '정지 이미지 — 미야자와 리나 상반신, 어깨끈 흘러내려 브라 윗라인 노출.',
  ],
  ['"…난 네 대표야. 크리에이터를 그런 눈으로 보지 않아요.', '"…난 네 대표야. 크리에이터를 그런 눈으로 보지 않아요."'],
  ['"사장님, 가까이 와 보세요.', '"사장님, 가까이 와 보세요."'],
]

function main() {
  let raw = fs.readFileSync(FILE, 'utf8')
  const j = JSON.parse(raw) // 유효성 사전 확인

  for (const [from, to] of FIXES) {
    const esc = (s) => s.replace(/"/g, '\\"')
    const fromRaw = esc(from)
    const toRaw = esc(to)
    if (!raw.includes(fromRaw)) {
      console.error('NOT FOUND:', JSON.stringify(from))
      process.exit(1)
    }
    raw = raw.replace(fromRaw, toRaw)
    console.log('fixed:', JSON.stringify(to))
  }

  JSON.parse(raw) // 수정 후 유효성 확인
  fs.writeFileSync(FILE, raw, 'utf8')
  console.log('저장 완료. 키 수:', Object.keys(JSON.parse(fs.readFileSync(FILE, 'utf8'))).length)
}

main()
