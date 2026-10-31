/**
 * 팬미팅 카드전 밸런스 스냅샷 (fanMeetingCombat.ts 미러).
 * 실행: node scripts/check-fan-meeting-combat.mjs
 */

const FAN_MEETING_COMBAT = {
  ironWallK: 100,
  rollMin: 0.9,
  rollMax: 1.0,
  satisfiedDamageFactor: 0.5,
  pressureFloorBase: 0.35,
  pressureFloorMin: 0.1,
  mentalFloorScale: 0.003,
  mentalDefenseRate: 0.35,
}

function clampStat(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function ironWallFactor(ironWall, ignoreWall = false) {
  if (ignoreWall) return 1
  const wall = Math.max(0, Math.round(Number(ironWall) || 0))
  const k = FAN_MEETING_COMBAT.ironWallK
  return k / (wall + k)
}

function mentalDefenseOf(mental) {
  return Math.round(clampStat(mental) * FAN_MEETING_COMBAT.mentalDefenseRate)
}

function pressureFloorRate(mental) {
  const m = clampStat(mental)
  return Math.max(
    FAN_MEETING_COMBAT.pressureFloorMin,
    FAN_MEETING_COMBAT.pressureFloorBase - m * FAN_MEETING_COMBAT.mentalFloorScale,
  )
}

function fanPressureDamage(pressure, mental) {
  const press = Math.max(0, Math.round(Number(pressure) || 0))
  if (press <= 0) return 0
  const kept = Math.max(1, Math.round(press * pressureFloorRate(mental)))
  return Math.max(kept, press - mentalDefenseOf(mental))
}

function previewScore(perf, ironWall, typeMatched, roll) {
  const factor = ironWallFactor(ironWall, typeMatched)
  return Math.max(0, Math.round(clampStat(perf) * roll * factor))
}

function expectedHits(target, avgScore) {
  if (avgScore <= 0) return Infinity
  return Math.ceil(target / avgScore)
}

const failures = []

function assert(cond, message) {
  if (!cond) failures.push(message)
}

function assertNear(actual, expected, tol, message) {
  if (Math.abs(actual - expected) > tol) {
    failures.push(`${message}: got ${actual}, expected ~${expected}`)
  }
}

// A. 비례 철벽 체감 (roll 0.95)
assertNear(previewScore(50, 19, false, 0.95), 40, 1, 'sme mismatch perf50 wall19')
assertNear(previewScore(70, 36, false, 0.95), 49, 1, 'large mismatch perf70 wall36')
assertNear(previewScore(70, 45, false, 0.95), 46, 1, 'top mismatch perf70 wall45')
assertNear(previewScore(70, 45, true, 0.95), 67, 0, 'type match ignores wall')

// 불일치가 등급과 함께 스케일 (절대감산 시절엔 ~21~31로 정체)
const smeMis = previewScore(50, 19, false, 0.95)
const topMis = previewScore(70, 45, false, 0.95)
assert(topMis > smeMis, `top mismatch (${topMis}) should exceed sme (${smeMis})`)

// D. 멘탈 floor
assertNear(pressureFloorRate(0), 0.35, 1e-9, 'floor mental0')
assertNear(pressureFloorRate(50), 0.2, 1e-9, 'floor mental50')
assertNear(pressureFloorRate(100), 0.1, 1e-9, 'floor mental100')

// B. 만족 시 절반
const raw = fanPressureDamage(57, 60)
assert(raw > 0, 'raw pressure > 0')
assert(Math.round(raw * 0.5) === Math.round(raw * FAN_MEETING_COMBAT.satisfiedDamageFactor), 'half factor')

// E. 티어 기대 타수 (평균 roll, VIP 목표 중앙·상한)
const cases = [
  { name: 'sme match', target: 30, perf: 50, wall: 19, match: true, maxHits: 1 },
  { name: 'sme mismatch', target: 30, perf: 50, wall: 19, match: false, maxHits: 2 },
  { name: 'large match', target: 59, perf: 70, wall: 36, match: true, maxHits: 1 },
  { name: 'large mismatch', target: 59, perf: 70, wall: 36, match: false, maxHits: 2 },
  { name: 'top match', target: 72, perf: 70, wall: 45, match: true, maxHits: 2 },
  { name: 'top mismatch', target: 72, perf: 70, wall: 45, match: false, maxHits: 2 },
  { name: 'top mismatch max', target: 80, perf: 70, wall: 52, match: false, maxHits: 3 },
]

for (const row of cases) {
  const lo = previewScore(row.perf, row.wall, row.match, 0.9)
  const hi = previewScore(row.perf, row.wall, row.match, 1.0)
  const hits = expectedHits(row.target, (lo + hi) / 2)
  assert(
    hits <= row.maxHits,
    `${row.name}: expected ≤${row.maxHits} hits, got ${hits} (avg ${(lo + hi) / 2})`,
  )
}

if (failures.length > 0) {
  console.error('fan-meeting combat snapshot FAILED:')
  for (const line of failures) console.error(' -', line)
  process.exit(1)
}

console.log('fan-meeting combat snapshot OK (' + cases.length + ' tempo cases)')
