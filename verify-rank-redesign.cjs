// 랭킹 재설계 검증: 등급별 순위 구간 + 시청자 진행도 공식 + 110% 보유 상한
const REQUIRED = { tiny: 1500, sme: 5000, mid: 100000, large: 1000000, top: 8000000 }
const BANDS = {
  black: { best: 151, worst: 300 },
  tiny: { best: 101, worst: 150 },
  sme: { best: 51, worst: 100 },
  mid: { best: 21, worst: 50 },
  large: { best: 11, worst: 20 },
  top: { best: 1, worst: 10 },
}
const ORDER = ['black', 'tiny', 'sme', 'mid', 'large', 'top']
function nextOf(grade) {
  const i = ORDER.indexOf(grade)
  return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null
}
function tierViewerCap(grade) {
  const next = nextOf(grade)
  return next ? REQUIRED[next] : null
}
function tierViewerHoldCap(grade) {
  const base = tierViewerCap(grade)
  return base == null ? null : Math.round(base * 1.1)
}
function stationRankForGrade(grade, viewers) {
  const band = BANDS[grade]
  const next = nextOf(grade)
  if (!band) return 1
  if (!next) return band.best
  const required = REQUIRED[next]
  const progress = required <= 0 ? 1 : Math.max(0, Math.min(1, viewers / required))
  const rank = Math.round(band.worst - progress * (band.worst - band.best))
  return Math.max(band.best, Math.min(band.worst, rank))
}
function capStationViewers(raw, grade) {
  const holdCap = tierViewerHoldCap(grade)
  if (holdCap == null) return Math.max(150, Math.round(raw))
  return Math.min(holdCap, Math.max(150, Math.round(raw)))
}

let failed = false
const check = (cond, label) => {
  if (!cond) failed = true
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`)
}

// black 구간: 300위 시작, 시청자 진행도에 따라 151위까지
check(stationRankForGrade('black', 0) === 300, `black 0명 → ${stationRankForGrade('black', 0)}위`)
check(
  stationRankForGrade('black', 750) === 226,
  `black 750명(50%) → ${stationRankForGrade('black', 750)}위 (기대 226)`,
)
check(
  stationRankForGrade('black', 1500) === 151,
  `black 1500명(100%) → ${stationRankForGrade('black', 1500)}위 (기대 151)`,
)
check(
  stationRankForGrade('black', 1650) === 151,
  `black 1650명(초과) → ${stationRankForGrade('black', 1650)}위 (기대 151, 캡)`,
)

// 등급별 구간 확인
check(stationRankForGrade('tiny', 0) === 150, `tiny 0명 → ${stationRankForGrade('tiny', 0)}위`)
check(
  stationRankForGrade('tiny', 5000) === 101,
  `tiny 5000명 → ${stationRankForGrade('tiny', 5000)}위 (기대 101)`,
)
check(
  stationRankForGrade('sme', 100000) === 51,
  `sme 100000명 → ${stationRankForGrade('sme', 100000)}위 (기대 51)`,
)
check(stationRankForGrade('top', 0) === 1, `top → ${stationRankForGrade('top', 0)}위`)

// 시청자 상한: 필수 100% = 심사 목표, 보유 상한 = 110%
check(tierViewerCap('black') === 1500, `black 심사 목표 시청자 = ${tierViewerCap('black')}`)
check(tierViewerHoldCap('black') === 1650, `black 보유 상한 = ${tierViewerHoldCap('black')}`)
check(capStationViewers(2000, 'black') === 1650, `capStationViewers(2000,'black') = ${capStationViewers(2000, 'black')}`)
check(capStationViewers(100, 'black') === 150, `capStationViewers(100,'black') = ${capStationViewers(100, 'black')} (VIEWER_FLOOR)`)

process.exit(failed ? 1 : 0)
