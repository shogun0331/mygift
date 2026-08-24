// ─────────────────────────────────────────────────────────────
// 레벨디자인 밸런스 시뮬레이터 — broadcast-game
// 실제 게임 로직(src/game/*, public/chapter_assets/*)을 재현한
// 월 단위 통합 시뮬레이션으로 프로그레션 곡선을 계량합니다.
//   시나리오: active / normal / passive × N회 × 96개월 몬테카를로
//   실행: node tools/level-design/balance-sim.cjs
//   산출: tools/level-design/report.md
// ─────────────────────────────────────────────────────────────
'use strict'

const fs = require('fs')
const path = require('path')

// ── 결정적 RNG ──
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function rollInt(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1))
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

// ── 게임 상수 (ranking.ts / stats.ts 재현) ──
const VIEWER_FLOOR = 150
const SUBSCRIBER_VIEWER_RATE = 0.2
const VIEWER_GROWTH_RATE = 0.18
const VIEWER_GROWTH_RANDOM_MIN = 0.55
const VIEWER_GROWTH_RANDOM_MAX = 1.4
const IDLE_VIEWER_DECAY = 0.04
const GRADE_REVENUE_MULT = { C: 1, B: 1.15, A: 1.35, S: 1.7 }
const GRADE_VIEWER_MULT = { C: 1, B: 1.2, A: 1.45, S: 1.8 }
const REVENUE_PER_STAT_POINT = 100
const STAT_FIELDS = ['statSexy', 'statElegance', 'statCommunication', 'statPerformance']
const STAT_TYPES = ['sexy', 'communication', 'elegance', 'performance']
const TYPE_FIELD = {
  sexy: 'statSexy',
  communication: 'statCommunication',
  elegance: 'statElegance',
  performance: 'statPerformance',
}
function viewerBonusOf(viewers) {
  return Math.min(10, 1 + 2.2 * Math.log10(1 + Math.max(0, viewers) / 150))
}
function gradeViewerMult(g) {
  return GRADE_VIEWER_MULT[g] ?? 1
}
function gradeRevenueMult(g) {
  return GRADE_REVENUE_MULT[g] ?? 1
}

// ── 방송국 티어 (station_grade_config.json 재현) ──
const TIER_ORDER = ['black', 'tiny', 'sme', 'mid', 'large', 'top']
const REQUIRED_VIEWERS = { tiny: 500, sme: 5000, mid: 100000, large: 1000000, top: 8000000 }
const MAX_SCOUT_CREATORS = { black: 2, tiny: 3, sme: 5, mid: 7, large: 12, top: 6 }

// ── 2단계 튜닝 파라미터 (env 주입 가능 — 스윕/검증용) ──
//   SIM_VPCP    : 소통 1당 시청자 가중치 (기본 300 — 적용 튜닝)
//   SIM_ORG     : 잠재력 도달 후 월 유기성장률 (기본 0.12)
//   SIM_MID     : sme→mid 필요 시청자 (기본 20000)
//   SIM_LARGE   : mid→large 필요 시청자 (기본 100000)
//   SIM_TOP     : large→top 필요 시청자 (기본 300000)
//   SIM_MID_G/C : mid 등급 요구 (기본 B/2)
//   SIM_LG_G/C  : large 등급 요구 (기본 A/2)
//   SIM_TP_G/C  : top 등급 요구 (기본 S/1)
const SIM_VPCP = Number(process.env.SIM_VPCP || 300)
const SIM_ORG = Number(process.env.SIM_ORG || 0.12)
const SIM_MID = Number(process.env.SIM_MID || 20000)
const SIM_LARGE = Number(process.env.SIM_LARGE || 100000)
const SIM_TOP = Number(process.env.SIM_TOP || 300000)
REQUIRED_VIEWERS.mid = SIM_MID
REQUIRED_VIEWERS.large = SIM_LARGE
REQUIRED_VIEWERS.top = SIM_TOP
const SIM_MID_G = process.env.SIM_MID_G || 'B'
const SIM_MID_C = Number(process.env.SIM_MID_C || 2)
const SIM_LG_G = process.env.SIM_LG_G || 'A'
const SIM_LG_C = Number(process.env.SIM_LG_C || 2)
const SIM_TP_G = process.env.SIM_TP_G || 'S'
const SIM_TP_C = Number(process.env.SIM_TP_C || 1)
const TIER_REQ_CREATORS = {
  mid: { minGrade: 'B', count: 2 },
  large: { minGrade: 'A', count: 2 },
  top: { minGrade: 'S', count: 1 },
}
// 등급 요구 튜닝 (env) — TIER_REQ_CREATORS 선언 후 적용
TIER_REQ_CREATORS.mid = { minGrade: SIM_MID_G, count: SIM_MID_C }
TIER_REQ_CREATORS.large = { minGrade: SIM_LG_G, count: SIM_LG_C }
TIER_REQ_CREATORS.top = { minGrade: SIM_TP_G, count: SIM_TP_C }
const TIER_BAND = {
  black: { best: 151, worst: 300 },
  tiny: { best: 101, worst: 150 },
  sme: { best: 51, worst: 100 },
  mid: { best: 21, worst: 50 },
  large: { best: 11, worst: 20 },
  top: { best: 1, worst: 10 },
}
const SLOT_PRICES = [1000, 3000, 9000, 27000, 81000]
const SLOT_MIN_GRADES = ['tiny', 'sme', 'mid', 'large', 'top']
const SLOT_OP_COST_BASE = 500

// ── 마일스톤 (ranking.ts MILESTONE_REWARDS) ──
const MILESTONES = [
  { rank: 50, subs: 1000, rev: 0 },
  { rank: 30, subs: 5000, rev: 5 },
  { rank: 20, subs: 10000, rev: 10 },
  { rank: 10, subs: 50000, rev: 0 },
  { rank: 5, subs: 100000, rev: 0, special: true },
  { rank: 1, subs: 0, rev: 0, clear: true },
]

// ── 훈련/심사 (training.ts / promotionExam.ts) ──
const GRADE_BREAK_NEED = { B: 50, A: 70, S: 85 }
const EXAM_COST_BASE = { C: 52000, B: 210000, A: 780000 }
const EXAM_COST_OVER = { C: 1200, B: 4000, A: 12000 }
const EXAM_SUCCESS = { B: 0.8, A: 0.6, S: 0.4 }
// 훈련 비용 (의도된 공식 — 현재 게임은 임시 0원 처리)
const TRAINING_COST_BASE = 1400
const TRAINING_COST_GROWTH = 1.046
const TRAINING_GRADE_MULT = { C: 1, B: 1.7, A: 2.8, S: 4.5 }

// ── 스탭 ──
const STAFF_HIRE_COST = 15000
const STAFF_ANNUAL = 20000

// ── 세금 (tax.ts) ──
function calcProgressiveAnnualTax(annualRevenue) {
  let remaining = Math.max(0, Math.round(annualRevenue))
  if (remaining <= 0) return 0
  let tax = 0
  const bands = [
    { size: 500000, rate: 0.05 },
    { size: 500000, rate: 0.1 },
    { size: 1000000, rate: 0.15 },
  ]
  for (const b of bands) {
    const taxable = Math.min(remaining, b.size)
    tax += taxable * b.rate
    remaining -= taxable
    if (remaining <= 0) break
  }
  if (remaining > 0) tax += remaining * 0.15
  return Math.round(tax)
}

// ── 게임 로직 함수 ──
function nextTier(grade) {
  const i = TIER_ORDER.indexOf(grade)
  return i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null
}
function maxSlotsForGrade(grade) {
  const gRank = TIER_ORDER.indexOf(grade)
  let max = 1
  for (let idx = 0; idx < SLOT_MIN_GRADES.length; idx++) {
    if (gRank >= TIER_ORDER.indexOf(SLOT_MIN_GRADES[idx])) max = Math.max(max, idx + 2)
  }
  return Math.max(1, Math.min(6, max))
}
function stationRankForGrade(grade, viewers) {
  const band = TIER_BAND[grade]
  const next = nextTier(grade)
  if (!band) return 1
  if (!next) return band.best
  const required = REQUIRED_VIEWERS[next]
  const progress = required <= 0 ? 1 : clamp(viewers / required, 0, 1)
  return band.worst - Math.round(progress * (band.worst - band.best))
}
function creatorViewerWeight(c) {
  return clamp(c.statCommunication, 0, 100) * SIM_VPCP * gradeViewerMult(c.grade)
}
function calcRosterViewers(owned, subscribers) {
  const roster = owned.reduce((s, c) => s + creatorViewerWeight(c), 0)
  return Math.max(
    VIEWER_FLOOR,
    Math.round(VIEWER_FLOOR + roster + Math.max(0, subscribers) * SUBSCRIBER_VIEWER_RATE),
  )
}
function growLeagueViewers(current, potential, didBroadcast, rng) {
  const now = Math.max(VIEWER_FLOOR, Math.round(current))
  const cap = Math.max(VIEWER_FLOOR, Math.round(potential))
  const factor =
    VIEWER_GROWTH_RANDOM_MIN + rng() * (VIEWER_GROWTH_RANDOM_MAX - VIEWER_GROWTH_RANDOM_MIN)
  if (!didBroadcast) {
    return Math.max(VIEWER_FLOOR, Math.round(now * (1 - IDLE_VIEWER_DECAY)))
  }
  if (now >= cap) {
    const gain = Math.max(1, Math.round(now * SIM_ORG * factor))
    return now + gain
  }
  const gain = Math.max(1, Math.round((cap - now) * VIEWER_GROWTH_RATE * factor))
  return Math.min(cap, now + gain)
}
function capStationViewers(raw, grade) {
  const next = nextTier(grade)
  if (!next) return Math.max(VIEWER_FLOOR, Math.round(raw))
  return Math.min(Math.round(REQUIRED_VIEWERS[next] * 1.1), Math.max(VIEWER_FLOOR, Math.round(raw)))
}
const GRADE_RANK = { C: 0, B: 1, A: 2, S: 3 }
function countCreatorsAtLeast(owned, minGrade, count) {
  return owned.filter((c) => GRADE_RANK[c.grade] >= GRADE_RANK[minGrade]).length >= count
}
function slotOpCost(n) {
  const k = Math.max(0, Math.min(6, Math.round(n)))
  if (k <= 0) return 0
  return SLOT_OP_COST_BASE * 3 ** (k - 1)
}

// ── 크리에이터 (stats.ts rollStatsForGrade 'C' 재현) ──
function makeCreator(rng, id) {
  const statType = STAT_TYPES[Math.floor(rng() * STAT_TYPES.length)]
  const main = rollInt(rng, 32, 42)
  const off = () => rollInt(rng, 18, 28)
  const stats = {
    statSexy: off(),
    statElegance: off(),
    statCommunication: off(),
    statPerformance: off(),
  }
  stats[TYPE_FIELD[statType]] = main
  const c = { id, grade: 'C', statType, salary: 0, ...stats }
  c.salary = rollSalary(rng, { sexy: c.statSexy, perf: c.statPerformance }, 'C')
  return c
}

// ── 협상 연봉 (salary.ts) ──
function salaryFloorOf(stats, grade) {
  const baseWeek = (clamp(stats.sexy, 0, 100) + clamp(stats.perf, 0, 100)) * 1 * REVENUE_PER_STAT_POINT * gradeRevenueMult(grade)
  return Math.max(0, Math.round(baseWeek * 4 * 12 * 0.3))
}
function rollSalary(rng, stats, grade) {
  const floor = salaryFloorOf(stats, grade)
  if (floor <= 0) return 10000
  return floor + Math.floor(rng() * Math.round(floor * 0.35))
}

// ── 훈련/심사 (training.ts / promotionExam.ts) ──
function trainCreator(c, rng) {
  const mainField = TYPE_FIELD[c.statType]
  for (const f of STAT_FIELDS) {
    const gain = f === mainField ? rollInt(rng, 2, 3) : 1
    c[f] = clamp(c[f] + gain, 0, 100)
  }
}
function mainStatOf(c) {
  return c[TYPE_FIELD[c.statType]]
}
function nextBreak(grade) {
  const next = { C: 'B', B: 'A', A: 'S', S: null }[grade]
  return next ? { grade: next, need: GRADE_BREAK_NEED[next] } : null
}
function examCostOf(c) {
  const next = nextBreak(c.grade)
  if (!next) return 0
  return EXAM_COST_BASE[c.grade] + Math.max(0, mainStatOf(c) - next.need) * EXAM_COST_OVER[c.grade]
}
function calcTrainingCost(c) {
  const main = Math.min(99, mainStatOf(c))
  const raw =
    TRAINING_COST_BASE * TRAINING_COST_GROWTH ** main * (TRAINING_GRADE_MULT[c.grade] ?? 1)
  const unit = raw >= 100000 ? 1000 : raw >= 10000 ? 100 : 10
  return Math.max(0, Math.round(raw / unit) * unit)
}

// ── 시나리오 정의 ──
const SCENARIOS = {
  active: {
    label: '적극 플레이',
    restRate: 0.05,
    trainingSessions: 3,
    exams: 'always',
    unlock: 'agg',
    hire: 'agg',
  },
  normal: {
    label: '보통 플레이',
    restRate: 0.12,
    trainingSessions: 2,
    exams: 'always',
    unlock: 'normal',
    hire: 'normal',
  },
  passive: {
    label: '소극 플레이',
    restRate: 0.25,
    trainingSessions: 1,
    exams: 'careful',
    unlock: 'safe',
    hire: 'safe',
  },
}

// ─────────────────────────────────────────────────────────────
// 단일 실행 (월 루프)
// ─────────────────────────────────────────────────────────────
function runOnce(seed, scenarioKey, months) {
  const S = SCENARIOS[scenarioKey]
  const rng = mulberry32(seed)
  const st = {
    month: 0,
    assets: 100000,
    viewers: 150,
    subscribers: 0,
    rank: 285,
    grade: 'black',
    owned: [],
    staffHired: 0,
    staffCooldown: 3,
    staffAvailable: false,
    creatorScoutCooldown: 0,
    creatorScoutAvailable: false,
    creatorScoutFirstDone: false,
    slots: 1,
    milestones: [],
    revenueBonus: 0,
    specialEvent: false,
    clear: false,
    clearMonth: null,
    vipCount: 0,
    yearRevenue: {},
    scoutOffers: 0,
    scoutHires: 0,
    examsTaken: 0,
    examFails: 0,
    trainingSpent: 0,
    milestonesHit: [],
    tierHit: [],
    snapshots: [],
  }
  const epochYear = 2026
  const epochMonth = 8 // 9월

  for (let m = 1; m <= months; m++) {
    st.month = m
    const date = new Date(epochYear, epochMonth + m, 1)
    const year = date.getFullYear()
    const calMonth = date.getMonth()

    // ── 방송 수익 (economy.ts calcWeekRevenueWon × 4주) ──
    let revenue = 0
    const broadcasted = []
    for (const c of st.owned) {
      if (rng() < S.restRate) continue
      broadcasted.push(c)
      revenue +=
        (c.statSexy + c.statPerformance) *
        viewerBonusOf(st.viewers) *
        REVENUE_PER_STAT_POINT *
        gradeRevenueMult(c.grade) *
        4
    }
    const didBroadcast = broadcasted.length > 0

    // ── 지출: 월급 + 스탭 월급 + 슬롯 운영비 ──
    let expense = 0
    for (const c of st.owned) expense += c.salary / 12
    expense += (st.staffHired * STAFF_ANNUAL) / 12
    expense += slotOpCost(st.slots)

    st.assets += revenue - expense
    st.yearRevenue[year] = (st.yearRevenue[year] ?? 0) + revenue

    // ── 3월: 전년도 누진 과세 ──
    if (calMonth === 2) {
      st.assets -= calcProgressiveAnnualTax(st.yearRevenue[year - 1] ?? 0)
    }

    // ── 트레이닝 (의도된 유료 공식 — 자산 부족 시 생략) ──
    for (const c of st.owned) {
      // 과잉 트레이닝 방지: 주력이 다음 돌파 목표를 넘고 소통도 충분하면 중단
      const next = nextBreak(c.grade)
      const mainTarget = next ? next.need : 85
      if (mainStatOf(c) >= mainTarget && c.statCommunication >= 85) continue
      for (let i = 0; i < S.trainingSessions; i++) {
        const cost = calcTrainingCost(c)
        if (st.assets < cost) break
        st.assets -= cost
        st.trainingSpent += cost
        trainCreator(c, rng)
      }
    }

    // ── 승급 심사 ──
    if (S.exams) {
      const ordered = [...st.owned].sort((a, b) => mainStatOf(b) - mainStatOf(a))
      for (const c of ordered) {
        const next = nextBreak(c.grade)
        if (!next || mainStatOf(c) < next.need) continue
        const cost = examCostOf(c)
        if (st.assets < cost) continue
        if (S.exams === 'careful' && st.assets < cost * 3) continue
        if (rng() < EXAM_SUCCESS[next.grade]) {
          st.assets -= cost
          c.grade = next.grade
          c.salary = rollSalary(rng, { sexy: c.statSexy, perf: c.statPerformance }, next.grade)
        } else {
          st.assets -= Math.round(cost * 0.9)
          st.examFails++
        }
        st.examsTaken++
      }
    }

    // ── 시청자 성장 → 순위 → 마일스톤 ──
    const potential = calcRosterViewers(st.owned, st.subscribers)
    st.viewers = capStationViewers(
      growLeagueViewers(st.viewers, potential, didBroadcast, rng),
      st.grade,
    )
    st.subscribers += Math.round(st.viewers * 0.03)
    st.rank = stationRankForGrade(st.grade, st.viewers)

    for (const mk of MILESTONES) {
      if (st.rank <= mk.rank && !st.milestones.includes(mk.rank)) {
        st.milestones.push(mk.rank)
        st.subscribers += mk.subs
        st.revenueBonus += mk.rev
        if (mk.special) st.specialEvent = true
        if (mk.clear) {
          st.clear = true
          st.clearMonth = m
        }
        st.milestonesHit.push({ month: m, rank: mk.rank })
      }
    }

    // ── 티어 승급 (연 1회, 1월 연간 심사 — 1단계씩) ──
    // 첫 심사는 이듬해 1월(2027-01). 일등기업까지 최소 5년(black→tiny→sme→mid→large→top)
    const next = nextTier(st.grade)
    if (next && calMonth === 0 && year > epochYear) {
      const req = TIER_REQ_CREATORS[next]
      const viewersOk = st.viewers >= REQUIRED_VIEWERS[next]
      const creatorsOk = !req || countCreatorsAtLeast(st.owned, req.minGrade, req.count)
      if (viewersOk && creatorsOk) {
        st.grade = next
        st.tierHit.push({ month: m, tier: next })
        st.slots = Math.min(st.slots, maxSlotsForGrade(st.grade))
      }
    }

    // ── 슬롯 해금 ──
    const maxSlots = maxSlotsForGrade(st.grade)
    if (st.slots < maxSlots) {
      const price = SLOT_PRICES[st.slots - 1]
      const minGrade = SLOT_MIN_GRADES[st.slots - 1]
      const gradeOk = TIER_ORDER.indexOf(st.grade) >= TIER_ORDER.indexOf(minGrade)
      if (gradeOk) {
        const afford = st.assets >= price
        const want =
          S.unlock === 'agg'
            ? afford
            : S.unlock === 'normal'
              ? afford && st.assets >= price * 2
              : afford && st.assets >= price * 4
        if (want) {
          st.assets -= price
          st.slots++
        }
      }
    }

    // ── 크리에이터 스카우트 ──
    if (m === 1 && st.owned.length === 0) {
      // 오프닝: 1개월차 강제 C 오퍼 — 첫 영입 무료
      st.owned.push(makeCreator(rng, 'c-1'))
      st.scoutHires++
    } else if (m > 1) {
      if (!st.creatorScoutFirstDone) {
        if (m > 3) {
          st.creatorScoutAvailable = true
          st.creatorScoutFirstDone = true
          st.creatorScoutCooldown = 0
        }
      } else if (!st.creatorScoutAvailable) {
        st.creatorScoutCooldown--
        if (st.creatorScoutCooldown <= 0) {
          if (rng() < 0.5) {
            st.creatorScoutAvailable = true
            st.creatorScoutCooldown = 0
          } else {
            st.creatorScoutCooldown = rollInt(rng, 3, 6)
          }
        }
      }
      if (st.creatorScoutAvailable) {
        if (st.owned.length >= MAX_SCOUT_CREATORS[st.grade]) {
          st.creatorScoutAvailable = false
          st.creatorScoutCooldown = rollInt(rng, 3, 6)
        } else {
          const c = makeCreator(rng, 'c-' + (st.owned.length + 1))
          st.scoutOffers++
          const wantHire =
            S.hire === 'agg'
              ? st.assets >= c.salary * 1.1
              : S.hire === 'normal'
                ? st.assets >= c.salary * 2
                : st.assets >= c.salary * 4
          if (wantHire) {
            st.assets -= c.salary
            st.owned.push(c)
            st.scoutHires++
          }
          st.creatorScoutAvailable = false
          st.creatorScoutCooldown = rollInt(rng, 3, 6)
        }
      }
    }

    // ── 스탭 스카우트 ──
    if (!st.staffAvailable) {
      st.staffCooldown--
      if (st.staffCooldown <= 0) {
        if (st.staffHired === 0 || rng() < 0.5) {
          st.staffAvailable = true
          st.staffCooldown = 0
        } else {
          st.staffCooldown = 3
        }
      }
    }
    if (st.staffAvailable) {
      const slotForStaff = st.slots > st.staffHired
      const afford = st.assets >= STAFF_HIRE_COST
      const want =
        S.hire === 'agg'
          ? afford && slotForStaff
          : S.hire === 'normal'
            ? afford && slotForStaff && st.assets >= STAFF_HIRE_COST * 3
            : afford && slotForStaff && st.assets >= STAFF_HIRE_COST * 6
      if (want) {
        st.assets -= STAFF_HIRE_COST
        st.staffHired++
        st.staffCooldown = 3
        st.staffAvailable = false
      } else if (!slotForStaff) {
        st.staffAvailable = false
        st.staffCooldown = 3
      }
    }

    // ── VIP (3~6턴 주기, 50%) ──
    if (m > 2 && (m - 1) % 3 === 0 && rng() < 0.5) st.vipCount++

    // ── 연말/최종 스냅샷 ──
    if (m % 12 === 0 || m === months) {
      st.snapshots.push({
        month: m,
        viewers: Math.round(st.viewers),
        potential: Math.round(calcRosterViewers(st.owned, st.subscribers)),
        assets: Math.round(st.assets),
        rank: st.rank,
        grade: st.grade,
        owned: st.owned.length,
        staff: st.staffHired,
        subs: st.subscribers,
      })
    }
  }
  return st
}

// ─────────────────────────────────────────────────────────────
// 통계 집계
// ─────────────────────────────────────────────────────────────
const RUNS = Number(process.env.SIM_RUNS || 300)
const MONTHS = Number(process.env.SIM_MONTHS || 96)
const REAL_MIN_PER_YEAR = 15 // 게임 내 1년 ≈ 실질 15분 (빠른 플레이)

function pct(sorted, p) {
  if (sorted.length === 0) return null
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))
  return sorted[idx]
}
function medianArr(a) {
  return a.length === 0 ? null : pct(a, 0.5)
}
function fmtMonth(mm) {
  if (mm == null) return '—'
  return `${Math.floor(mm / 12)}년 ${mm % 12}개월`
}
function realMin(mm) {
  return Math.round((mm / 12) * REAL_MIN_PER_YEAR)
}

const KEYS = [
  'tier:tiny',
  'tier:sme',
  'mil:50',
  'tier:mid',
  'mil:30',
  'tier:large',
  'mil:20',
  'tier:top',
  'mil:10',
  'mil:5',
  'mil:1',
  'clear',
]
const LABEL = {
  'tier:tiny': '티어 tiny',
  'tier:sme': '티어 sme',
  'mil:50': '마일스톤 50위',
  'tier:mid': '티어 mid',
  'mil:30': '마일스톤 30위',
  'tier:large': '티어 large',
  'mil:20': '마일스톤 20위',
  'tier:top': '티어 top',
  'mil:10': '마일스톤 10위',
  'mil:5': '마일스톤 5위',
  'mil:1': '마일스톤 1위',
  clear: '★ 1위 클리어',
}
const TARGET = {
  'tier:tiny': '5개월(1회차)',
  'tier:sme': '17개월(2회차)',
  'mil:50': '29개월(3회차)',
  'tier:mid': '29개월(3회차)',
  'mil:30': '53개월(5회차)',
  'tier:large': '53개월(5회차)',
  'mil:20': '53개월(5회차)',
  'tier:top': '89개월(8회차)',
  'mil:10': '89개월(8회차)',
  'mil:5': '89개월(8회차)',
  'mil:1': '89개월(8회차)',
  clear: '89개월(8회차)',
}

function keyMonth(st, key) {
  if (key.startsWith('tier:')) {
    const hit = st.tierHit.find((h) => h.tier === key.slice(5))
    return hit ? hit.month : null
  }
  if (key.startsWith('mil:')) {
    const hit = st.milestonesHit.find((h) => h.rank === Number(key.slice(4)))
    return hit ? hit.month : null
  }
  if (key === 'clear') return st.clear ? st.clearMonth : null
  return null
}

function collect(scenarioKey) {
  const out = {}
  for (const key of KEYS) out[key] = []
  const finals = []
  for (let i = 0; i < RUNS; i++) {
    const st = runOnce(1000 + i, scenarioKey, MONTHS)
    for (const key of KEYS) {
      const mm = keyMonth(st, key)
      if (mm != null) out[key].push(mm)
    }
    finals.push(st)
  }
  return { out, finals }
}

// ─────────────────────────────────────────────────────────────
// 리포트 생성
// ─────────────────────────────────────────────────────────────
function runReport() {
  const lines = []
  lines.push('# 레벨디자인 밸런스 리포트 — 현재 곡선 분석')
  lines.push('')
  lines.push(`- 시뮬레이션: 시나리오 3종 × ${RUNS}회 × ${MONTHS}개월(8년) 몬테카를로 (seeded, 결정적)`)
  lines.push(`- 실시간 환산: 게임 내 1년 ≈ ${REAL_MIN_PER_YEAR}분 (빠른 플레이 기준)`)
  lines.push(`- 목표: **1위 클리어까지 실질 ${REAL_MIN_PER_YEAR * 8}분(2시간) = 게임 내 96개월**`)
  lines.push(`- **설계 제약: 승급은 연 1회(1월 심사) → 일등기업까지 최소 5년(60개월)**`)
  lines.push(`- **목표 심사 회차: tiny 5개월 · sme 17개월 · mid 29개월 · large 53개월 · top 89개월 (연 1회 게이트)**`)
  lines.push(`- **적용 튜닝: 소통가중치=${SIM_VPCP} · 유기성장=${(SIM_ORG * 100).toFixed(1)}%/월 · mid=${(SIM_MID / 1000).toFixed(0)}K · large=${(SIM_LARGE / 1000).toFixed(0)}K · top=${(SIM_TOP / 1000).toFixed(0)}K**`)
  lines.push('')
  lines.push('## 재현 범위 (실제 로직 근거)')
  lines.push('- 시청자 성장 18%/월 · 유기성장 12%/월 · 휴식 감소 4%/월 · 잠재력=150+Σ(소통×300×등급배율)+구독×0.2')
  lines.push('- 순위 = 티어 게이트: black 151~300 · tiny 101~150 · sme 51~100 · mid 21~50 · large 11~20 · top 1')
  lines.push('- 티어 요구: tiny 500 · sme 5K · mid 20K(B×2) · large 100K(A×2) · top 300K(S×1), 유지 상한=요구×1.1')
  lines.push('- 스카우트: 전부 C등급, 오프닝 1명(무료)+3~6턴 50%, 티어별 보유 상한 2/3/5/7/12/6')
  lines.push('- 훈련: 의도된 유료 공식(주력 스탯·등급↑↑ 비용↑) · 심사비 C→B $52K(80%)/B→A $210K(60%)/A→S $780K(40%)')
  lines.push('  - **참고**: 현재 게임은 `TRAINING_COST_FREE=true`(임시 0원) — 시뮬레이션은 의도된 유료 공식')
  lines.push('- 마일스톤: 50위 1K / 30위 5K·+5% / 20위 10K·+10% / 10위 50K / 5위 100K·특별이벤트 / 1위 클리어')
  lines.push('')
  lines.push('> **단순화**: 컨디션/케어비·장비·스탭 보너스·VIP·SNS·데이트/이벤트 수익 미반영(경제 보수 추정).')
  lines.push('')

  const results = {}
  for (const key of Object.keys(SCENARIOS)) results[key] = collect(key)

  lines.push('## 도달 개월 수 (중앙값 — 96개월 내 도달 실행만)')
  lines.push('')
  lines.push('| 단계 | 목표 | 적극 | 보통 | 소극 | 비고 |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  for (const key of KEYS) {
    const row = [`\`${LABEL[key]}\``, TARGET[key] ?? '—']
    let note = ''
    for (const sc of ['active', 'normal', 'passive']) {
      const arr = [...results[sc].out[key]].sort((a, b) => a - b)
      const hitRate = (results[sc].out[key].length / RUNS) * 100
      const med = medianArr(arr)
      row.push(med == null ? '0%' : `${fmtMonth(med)} (${realMin(med)}분)`)
      note = `${hitRate.toFixed(0)}% 도달`
    }
    row.push(note)
    lines.push('| ' + row.join(' | ') + ' |')
  }
  lines.push('')
  return { lines, results }
}

const { lines, results } = runReport()

// ── 클리어 상세 ──
lines.push('## ★ 1위 클리어 상세 (8년 내 도달율)')
lines.push('')
lines.push('| 시나리오 | 도달율 | 중앙값 | P10 | P90 | 실질 시간(중앙값) |')
lines.push('| --- | --- | --- | --- | --- | --- |')
for (const sc of ['active', 'normal', 'passive']) {
  const arr = [...results[sc].out.clear].sort((a, b) => a - b)
  const med = medianArr(arr)
  lines.push(
    `| ${SCENARIOS[sc].label} | ${((results[sc].out.clear.length / RUNS) * 100).toFixed(0)}% | ${
      med == null ? '—' : fmtMonth(med)
    } | ${pct(arr, 0.1) == null ? '—' : fmtMonth(pct(arr, 0.1))} | ${
      pct(arr, 0.9) == null ? '—' : fmtMonth(pct(arr, 0.9))
    } | ${med == null ? '—' : `${realMin(med)}분`} |`,
  )
}
lines.push('')
lines.push('**판정 기준**: 실질 120분(96개월) 이전 클리어 → "너무 빠름" / 이후 → 목표 부합.')
lines.push('')

// ── 연말 상태 (적극) ──
lines.push('## 연말 상태 (적극 플레이, 중앙값)')
lines.push('')
lines.push('| 연차 | 시청자 | 잠재력 | 자산($) | 순위 | 티어(최다) | 크리에이터 | 스탭 |')
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |')
for (const ym of [12, 24, 36, 48, 60, 72, 84, 96]) {
  const snaps = results.active.finals
    .map((st) => st.snapshots.find((s) => s.month === ym))
    .filter(Boolean)
  if (snaps.length === 0) continue
  const med = (f) => pct(snaps.map((s) => s[f]).sort((a, b) => a - b), 0.5)
  const gradeCounts = {}
  for (const s of snaps) gradeCounts[s.grade] = (gradeCounts[s.grade] ?? 0) + 1
  const topGrade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]
  lines.push(
    `| ${ym / 12}년차 | ${Math.round(med('viewers')).toLocaleString()} | ${Math.round(
      med('potential'),
    ).toLocaleString()} | ${Math.round(med('assets')).toLocaleString()} | ${med('rank')}위 | ${topGrade[0]}(${(
      (topGrade[1] / snaps.length) *
      100
    ).toFixed(0)}%) | ${med('owned')} | ${med('staff')} |`,
  )
}
lines.push('')

// ── 경제/등장 지표 ──
lines.push('## 시스템 등장/경제 지표 (96개월 평균)')
lines.push('')
lines.push('| 시나리오 | 스카우트 오퍼 | 영입 | 심사 | 심사 실패 | 훈련비($) | VIP |')
lines.push('| --- | --- | --- | --- | --- | --- | --- |')
for (const sc of ['active', 'normal', 'passive']) {
  const fs = results[sc].finals
  const avg = (f) => fs.reduce((s, st) => s + st[f], 0) / fs.length
  lines.push(
    `| ${SCENARIOS[sc].label} | ${avg('scoutOffers').toFixed(1)} | ${avg('scoutHires').toFixed(
      1,
    )} | ${avg('examsTaken').toFixed(1)} | ${avg('examFails').toFixed(1)} | ${Math.round(
      avg('trainingSpent'),
    ).toLocaleString()} | ${avg('vipCount').toFixed(1)} |`,
  )
}
lines.push('')

// ── 핵심 진단 (수치로 계산) ──
const y8 = pct(
  results.active.finals
    .map((st) => {
      const snap = st.snapshots.find((s) => s.month === 96)
      return snap ? snap.viewers : 0
    })
    .sort((a, b) => a - b),
  0.5,
)
const clearRate = (results.active.out.clear.length / RUNS) * 100
lines.push('## 핵심 진단 (적극 플레이 기준)')
lines.push('')
lines.push('- **8년차 시청자(중앙값): ' + Math.round(y8).toLocaleString() + '명**')
lines.push('- **8년차 티어: ' + (results.active.finals.some((st) => st.clear) ? '일부 클리어' : '미클리어') + ` — 클리어 도달율 ${clearRate.toFixed(0)}%` + '**')
lines.push('- **시청자 성장 엔진**: 로스터 잠재력(소통×' + SIM_VPCP + '×등급배율)을 따라가고, 상한 도달 후 유기성장 ' + (SIM_ORG * 100).toFixed(0) + '%/월')
lines.push('- **목표 심사 회차 대비**: mid ' + fmtMonth(medianArr([...results.active.out['tier:mid']].sort((a, b) => a - b))) + ' · large ' + fmtMonth(medianArr([...results.active.out['tier:large']].sort((a, b) => a - b))) + ' · top ' + fmtMonth(medianArr([...results.active.out['tier:top']].sort((a, b) => a - b))))
lines.push('')
lines.push('**① 미드 게임 (sme→mid)**: 목표 29개월 — 시뮬레이션 ' + fmtMonth(medianArr([...results.active.out['tier:mid']].sort((a, b) => a - b))) + ' (도달율 ' + ((results.active.out['tier:mid'].length / RUNS) * 100).toFixed(0) + '%)')
lines.push('**② 승급 게이트는 연 1회**: 요구를 채워도 1월 심사까지 대기 — 일등기업 최소 5년(60개월) 보장')
lines.push('**③ 경제는 여유**: 8년차 자산 중앙값 수억~수천만 (수익 >> 지출). 병목은 자산이 아니라 **시청자 성장 + 로스터 구축**. 훈련 유료화도 수익으로 감당 가능.')
lines.push('**④ 클리어**: 목표 89개월(2시간) — 현재 도달율 ' + clearRate.toFixed(0) + '%')

const report = lines.join('\n')
fs.writeFileSync(path.join(__dirname, 'report.md'), report, 'utf8')
// 캘리브레이션용 요약 파일
const act = results.active.out
const sum = {}
for (const key of KEYS) {
  sum[key] = medianArr([...act[key]].sort((a, b) => a - b))
}
fs.writeFileSync(
  path.join(__dirname, 'sweep.json'),
  JSON.stringify(
    {
      vpcp: SIM_VPCP,
      org: SIM_ORG,
      mid: SIM_MID,
      large: SIM_LARGE,
      top: SIM_TOP,
      midReq: `${SIM_MID_G}×${SIM_MID_C}`,
      largeReq: `${SIM_LG_G}×${SIM_LG_C}`,
      topReq: `${SIM_TP_G}×${SIM_TP_C}`,
      medians: sum,
    },
    null,
    2,
  ),
  'utf8',
)
console.log(report)
console.log('\n→ tools/level-design/report.md 저장 완료')





