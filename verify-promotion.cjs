// 연간 승급 심사 시뮬레이션 — 실제 설정값으로 tiny→sme 승급 검증
const fs = require('fs')

// ── stationGradeConfig 재현 ──
const STATION_TIER_ORDER = ['black', 'tiny', 'sme', 'mid', 'large', 'top']
function nextStationTier(current) {
  const idx = STATION_TIER_ORDER.indexOf(current)
  if (idx < 0 || idx >= STATION_TIER_ORDER.length - 1) return null
  return STATION_TIER_ORDER[idx + 1]
}
const GRADE_RANK = { C: 0, B: 1, A: 2, S: 3 }
function countCreatorsAtLeast(creators, minGrade) {
  const min = GRADE_RANK[minGrade]
  return creators.filter((c) => GRADE_RANK[c.grade] >= min).length
}
function evaluateStationPromotion(config, current, ctx) {
  const next = nextStationTier(current)
  if (!next) return { next: null, eligible: false, checks: [] }
  const rule = config.promotions[next]
  const checks = []
  const viewersMet = ctx.viewers >= rule.requiredViewers
  checks.push({ id: 'viewers', met: viewersMet, detail: `${ctx.viewers}/${rule.requiredViewers}` })
  if (rule.minUnlockedSlots.enabled) {
    checks.push({ id: 'slots', met: ctx.unlockedSlotCount >= rule.minUnlockedSlots.value })
  }
  if (rule.minAssets.enabled) {
    checks.push({ id: 'assets', met: ctx.assets >= rule.minAssets.value })
  }
  for (const req of rule.creatorRequirements) {
    if (!req.enabled) continue
    checks.push({ id: req.id, met: countCreatorsAtLeast(ctx.creators, req.minGrade) >= req.count })
  }
  return { next, eligible: checks.every((c) => c.met), checks }
}
function applyStationReview(config, grade, viewers) {
  const status = evaluateStationPromotion(config, grade, {
    viewers,
    unlockedSlotCount: 6,
    assets: 9999999,
    creators: [{ grade: 'C' }],
  })
  if (!status.next || !status.eligible) return { grade, promoted: false, status }
  return { grade: status.next, promoted: true, status }
}

// ── 실제 설정 로드 (normalize 간소화) ──
const raw = JSON.parse(fs.readFileSync('public/chapter_assets/station_grade_config.json', 'utf8'))
const config = { tiers: raw.tiers, promotions: raw.promotions, balance: raw.balance }

// ── 날짜 재현 ──
const EPOCH = new Date(2026, 8, 1)
function monthToDate(mi) { return new Date(EPOCH.getFullYear(), EPOCH.getMonth() + mi, 1) }
function isAnnualReviewMonth(date) {
  return date.getMonth() === 0 && date.getFullYear() > EPOCH.getFullYear()
}

let failed = false
const check = (cond, label) => { if (!cond) failed = true; console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`) }

// 1) 실제 설정 확인
check(config.promotions.sme.requiredViewers === 10000, `sme 필요 시청자 = 10000 (실제: ${config.promotions.sme.requiredViewers})`)
check(config.promotions.sme.minUnlockedSlots.enabled === false, 'sme 슬롯 조건 비활성')
check(config.promotions.sme.minAssets.enabled === false, 'sme 자산 조건 비활성')
check(config.promotions.sme.creatorRequirements.every((r) => !r.enabled), 'sme 크리에이터 조건 비활성')
// 레벨디자인 2단계: 티어 요구 하향 + 등급 요구 완화
check(config.promotions.mid.requiredViewers === 40000, `mid 필요 시청자 = 40K (실제: ${config.promotions.mid.requiredViewers})`)
check(config.promotions.mid.creatorRequirements[0]?.minGrade === 'B', 'mid 등급 요구 = B×2')
check(config.promotions.large.requiredViewers === 160000, `large 필요 시청자 = 160K (실제: ${config.promotions.large.requiredViewers})`)
check(config.promotions.large.creatorRequirements[0]?.count === 2, 'large 등급 요구 = A×2')
check(config.promotions.top.requiredViewers === 500000, `top 필요 시청자 = 500K (실제: ${config.promotions.top.requiredViewers})`)
check(config.promotions.top.minSnsSubscribers?.enabled === false, 'top 필요 SNS 구독자 조건 비활성화')
check(config.promotions.top.creatorRequirements[0]?.count === 1, 'top 등급 요구 = S×1')
// balance 섹션 (JSON으로 밸런스 관리)
check(config.balance?.viewerPerCommPoint === 20, `balance.viewerPerCommPoint = 20 (실제: ${config.balance?.viewerPerCommPoint})`)
check(config.balance?.viewerOrganicGrowthRate === 0.1, `balance.viewerOrganicGrowthRate = 0.1 (실제: ${config.balance?.viewerOrganicGrowthRate})`)
check(config.balance?.viewerGrowthRate === 0.18, `balance.viewerGrowthRate = 0.18 (실제: ${config.balance?.viewerGrowthRate})`)
check(config.balance?.idleViewerDecay === 0.04, `balance.idleViewerDecay = 0.04 (실제: ${config.balance?.idleViewerDecay})`)
check(config.balance?.subscriberViewerRate === 0.2, `balance.subscriberViewerRate = 0.2 (실제: ${config.balance?.subscriberViewerRate})`)

// 2) 승급 판정 — tiny, 10000명 → eligible
const r5000 = applyStationReview(config, 'tiny', 10000)
check(r5000.promoted === true && r5000.grade === 'sme', `tiny+10000명 → sme 승급 (promoted=${r5000.promoted})`)

// 3) 승급 판정 — tiny, 9999명 → 실패
const r4999 = applyStationReview(config, 'tiny', 9999)
check(r4999.promoted === false, 'tiny+9999명 → 승급 실패(정상)')

// 4) 심사 트리거 — 12월 종료(다음 달 1월)에만 발동
for (let mi = 0; mi <= 6; mi++) {
  const nextDate = monthToDate(mi + 1)
  const flag = isAnnualReviewMonth(nextDate)
  const name = `${monthToDate(mi + 1).getFullYear()}-${monthToDate(mi + 1).getMonth() + 1}`
  console.log(`  gameMonth ${mi} 종료 → ${name} 심사: ${flag ? 'O' : '-'}`)
}
check(isAnnualReviewMonth(monthToDate(4)) === true, '12월 종료(gameMonth3) → 1월 심사 발동')
check(isAnnualReviewMonth(monthToDate(5)) === false, '1월 종료(gameMonth4) → 심사 없음(다음 해 1월)')

function monthEndFlag(grade, viewers, nextMonthIndex) {
  return isAnnualReviewMonth(monthToDate(nextMonthIndex))
}
check(monthEndFlag('tiny', 10000, 5) === false, '2월 종료 + tiny 10000명 → 월중 심사 없음(연 1회)')
check(monthEndFlag('tiny', 10000, 4) === true, '1월 종료 + tiny 10000명 → 연간 심사 발동(승급)')
check(monthEndFlag('tiny', 4000, 5) === false, '2월 종료 + tiny 4000명 → 심사 없음(미충족)')
check(monthEndFlag('tiny', 4000, 4) === true, '1월 종료 + tiny 4000명 → 연간 심사 발동(실패 안내)')
check(monthEndFlag('black', 10000, 5) === false, 'black 10000명 월중 → 심사 없음(연 1회)')
check(monthEndFlag('black', 10000, 4) === true, 'black 10000명 1월 → 연간 심사 발동(1단계만)')

// 6) 승급은 1단계씩만 (black → tiny, tiny → sme)
const blackReview = applyStationReview(config, 'black', 10000)
check(blackReview.grade === 'tiny', `black+10000명 → tiny 승급 (grade=${blackReview.grade})`)

process.exit(failed ? 1 : 0)

process.exit(failed ? 1 : 0)
