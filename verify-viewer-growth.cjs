// 시청자 성장 로직 검증 — 방송 중 절대 감소 없음 + 무방송 이탈
const VIEWER_FLOOR = 150
const IDLE_VIEWER_DECAY = 0.04
const VIEWER_GROWTH_RATE = 0.18
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
  if (now >= cap) return now
  const factor = VIEWER_GROWTH_RANDOM_MIN + Math.random() * (VIEWER_GROWTH_RANDOM_MAX - VIEWER_GROWTH_RANDOM_MIN)
  const gain = Math.round((cap - now) * VIEWER_GROWTH_RATE * factor)
  return Math.min(cap, now + Math.max(0, gain))
}

let failed = false
const check = (cond, label) => { if (!cond) failed = true; console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`) }

// 1) 방송 + 미달 포텐셜 → 성장 (never decrease)
const r1 = growLeagueViewers(3000, 5000, true, 60)
check(r1 > 3000 && r1 <= 5000, `방송+미달 → 성장 (3000→${r1})`)

// 2) 방송 + 포텐셜 도달(now == cap) → 보유 (감소 없음)
const r2 = growLeagueViewers(5000, 5000, true, 60)
check(r2 === 5000, `방송+도달 → 보유 (5000→${r2})`)

// 3) 방송 + 초과(now > cap, 잉여) → 보유 (감소 없음) ← 핵심 수정
const r3 = growLeagueViewers(5000, 3000, true, 60)
check(r3 === 5000, `방송+잉여 → 감소 없음 (5000→${r3})`)

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
