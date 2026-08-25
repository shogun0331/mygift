// 이벤트 loc 폴더 한국어 검수 + 중복 분석 — 용법: node analyze-event-loc.cjs
const fs = require('fs')
const path = require('path')

const BASE = path.join(__dirname, '..', '..', 'public', 'chapter_assets', 'events')

function main() {
  const counts = new Map() // string -> count
  const anomalies = []
  let total = 0
  let eventCount = 0

  for (const dir of fs.readdirSync(BASE)) {
    const loc = path.join(BASE, dir, 'loc')
    if (!fs.existsSync(loc)) continue
    eventCount++
    const ko = JSON.parse(fs.readFileSync(path.join(loc, 'ko.json'), 'utf8'))
    for (const [k, v] of Object.entries(ko)) {
      total++
      if (typeof v !== 'string' || !v.trim()) {
        anomalies.push({ dir, k, type: 'EMPTY' })
        continue
      }
      counts.set(v, (counts.get(v) || 0) + 1)
      const t = v.trim()
      if (/^[::]/.test(t)) anomalies.push({ dir, k, type: 'LEADING_COLON', sample: t.slice(0, 50) })
      if (/\?{2,}/.test(v)) anomalies.push({ dir, k, type: 'MOJIBAKE', sample: t.slice(0, 50) })
      // 한글이 전혀 없고 영어도 아닌 깨진 문자열
      if (!/[가-힣a-zA-Z]/.test(v)) anomalies.push({ dir, k, type: 'NO_TEXT', sample: t.slice(0, 50) })
      // 따옴표 불균형
      const dq = (v.match(/"/g) || []).length
      if (dq % 2 !== 0) anomalies.push({ dir, k, type: 'QUOTE_ODD', sample: t.slice(0, 50) })
      // 문장 끝 느낌표/물음표 연속 과다 등은 건너뜀 (의도적일 수 있음)
      // 닫는 괄호/여는 괄호 불균형
      const po = (v.match(/\(/g) || []).length
      const pc = (v.match(/\)/g) || []).length
      if (po !== pc) anomalies.push({ dir, k, type: 'PAREN_MISMATCH', sample: t.slice(0, 50) })
      // 중복 공백 3개 이상
      if (/ {3,}/.test(v)) anomalies.push({ dir, k, type: 'MULTI_SPACE', sample: t.slice(0, 50) })
    }
  }

  // 중복 통계
  let unique = 0
  let dupInstances = 0
  for (const [, c] of counts) {
    unique++
    if (c > 1) dupInstances += c - 1
  }

  console.log('=== 요약 ===')
  console.log('이벤트 수:', eventCount)
  console.log('전체 문자열:', total)
  console.log('고유 문자열:', unique)
  console.log('중복 제거 시 절감:', dupInstances, '(' + ((dupInstances / total) * 100).toFixed(1) + '%)')
  console.log('이상 항목:', anomalies.length)

  // 이상 유형별 집계
  const byType = {}
  for (const a of anomalies) byType[a.type] = (byType[a.type] || 0) + 1
  console.log('이상 유형별:', JSON.stringify(byType))

  // 상세 저장
  const outDir = path.join(__dirname, 'out')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'anomalies.json'), JSON.stringify(anomalies, null, 2), 'utf8')
  // 고유 문자열 목록 (빈도순)
  const uniqSorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s, c]) => ({ s, c }))
  fs.writeFileSync(path.join(outDir, 'unique-strings.json'), JSON.stringify(uniqSorted, null, 2), 'utf8')
  console.log('out/anomalies.json, out/unique-strings.json 저장 완료')

  // 상위 샘플 출력
  console.log('--- 이상 항목 샘플 (최대 20) ---')
  for (const a of anomalies.slice(0, 20)) console.log(JSON.stringify(a))
}

main()
