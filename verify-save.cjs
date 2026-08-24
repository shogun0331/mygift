// 세이브 시스템 핵심 로직 검증 (save.ts 순수 함수 재현)
function formatPlaytime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}
function gameDateString(monthIndex) {
  const d = new Date(2026, 8 + monthIndex, 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${dd}`
}
// WeekAccum Map 왕복
function serializeWeekAccum(w) {
  return { ...w, byCreator: [...w.byCreator.entries()] }
}
function deserializeWeekAccum(raw) {
  return { ...raw, byCreator: new Map(raw.byCreator) }
}

let failed = false
const check = (cond, label) => {
  if (!cond) failed = true
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`)
}

check(formatPlaytime(3 * 3600 * 1000 + 12 * 60 * 1000) === '3h 12m', `formatPlaytime 3h12m → ${formatPlaytime(3 * 3600 * 1000 + 12 * 60 * 1000)}`)
check(formatPlaytime(12 * 60 * 1000) === '12m', `formatPlaytime 12m → ${formatPlaytime(12 * 60 * 1000)}`)
check(formatPlaytime(45000) === '45s', `formatPlaytime 45s → ${formatPlaytime(45000)}`)

check(gameDateString(0) === '2026.09.01', `게임 시작(0) 날짜 → ${gameDateString(0)}`)
check(gameDateString(4) === '2027.01.01', `1월 진입(4) 날짜 → ${gameDateString(4)}`)
check(gameDateString(16) === '2028.01.01', `2년차 1월(16) 날짜 → ${gameDateString(16)}`)

const week = { monthNumber: 2, byCreator: new Map([['c1', { name: 'Rina', revenueWon: 5000, weeksBroadcast: 2 }]]), highlights: ['ok'], totalRevenueWon: 5000, careExpenses: [] }
const serialized = serializeWeekAccum(week)
const restored = deserializeWeekAccum(serialized)
check(restored.byCreator instanceof Map, 'WeekAccum byCreator가 Map으로 복원')
check(restored.byCreator.get('c1').revenueWon === 5000, 'WeekAccum 크리에이터 데이터 복원')
check(JSON.stringify(serialized.byCreator) === '[["c1",{"name":"Rina","revenueWon":5000,"weeksBroadcast":2}]]', '직렬화 JSON 형태')

process.exit(failed ? 1 : 0)
