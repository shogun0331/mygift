// 시청자 성장 로직 검증 — 방송 중 절대 감소 없음 + 상한 도달/초과 시 유기적 성장 + 무방송 이탈
const VIEWER_FLOOR = 150
const IDLE_VIEWER_DECAY = 0.04
const VIEWER_GROWTH_RATE = 0.18
const VIEWER_ORGANIC_GROWTH_RATE = 0.02
const VIEWER_GROWTH_RANDOM_MIN = 0.55
const VIEWER_GROWTH_RANDOM_MAX = 1.4

// growLeagueViewers 재현 (수정 후)
function growLeagueViewers(current, potential, didBroadcast, communication = 0) {
  const now = Math.max(VIEWER_FLOOR, Math.round(current))
  const cap = Math.max(VIEWER_FLOOR, Math.round(potential))
  const retain = 1 - Math.max(0, Math.min(100, communication)) / 200
  if (!didBroadcast) {
    return Math.max(VIEWER_FLOOR, Math.round(now * (1 - IDLE_VIEWER_DECAY * retain)))
  }
  const factor = VIEWER_GROWTH_RANDOM_MIN + Math.random() * (VIEWER_GROWTH_RANDOM_MAX - VIEWER_GROWTH_RANDOM_MIN)
  if (now >= cap) {
    // 유기적 성장: 활동 보상 (상한이 현재보다 낮아도 감소하지 않음)
    const gain = Math.max(1, Math.round(now * VIEWER_ORGANIC_GROWTH_RATE * factor))
    return now + gain
  }
  const gain = Math.max(1, Math.round((cap - now) * VIEWER_GROWTH_RATE * factor))
  return Math.min(cap, now + gain)
}

let failed = false
const check = (cond, label) => { if (!cond) failed = true; console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`) }

// 1) 방송 + 미달 포텐셜 → 성장 (never decrease)
const r1 = growLeagueViewers(3000, 5000, true, 60)
check(r1 > 3000 && r1 <= 5000, `방송+미달 → 성장 (3000→${r1})`)

// 2) 방송 + 포텐셜 도달(now == cap) → 유기적 성장 (감소 없음 + 증가)
const r2 = growLeagueViewers(5000, 5000, true, 60)
check(r2 > 5000, `방송+도달 → 유기적 성장 (5000→${r2})`)

// 3) 방송 + 초과(now > cap, 잉여) → 유기적 성장 (감소 없음 + 증가) ← 핵심 수정
const r3 = growLeagueViewers(5000, 3000, true, 60)
check(r3 > 5000, `방송+잉여 → 유기적 성장 (5000→${r3})`)

// 4) 무방송 → 이탈 (감소)
const r4 = growLeagueViewers(5000, 3000, false, 60)
check(r4 < 5000, `무방송 → 이탈 (5000→${r4})`)

// 5) floor 보다 아래로 안 내려감
const r5 = growLeagueViewers(120, 5000, false, 0)
check(r5 >= VIEWER_FLOOR, `무방송 floor 유지 (${r5})`)

// 6) 5개월 연속 방송 → 단조 증가
let viewers = 3000
const pot = 5000
let mono = true
for (let m = 0; m < 5; m++) {
  const next = growLeagueViewers(viewers, pot, true, 60)
  if (next < viewers) mono = false
  viewers = next
}
check(mono, `연속 방송 5개월 단조 증가 (최종 ${viewers})`)

process.exit(failed ? 1 : 0)
