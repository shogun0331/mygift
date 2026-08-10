import type { Grade, OwnedCreator } from './characters'
import {
  CONDITION_MULT,
  conditionFromScore,
  scoreOf,
  type CreatorCondition,
} from './condition'
import { GRADE_CAPS, GRADE_REVENUE_BONUS, rollInt } from './stats'

export const HEAT_COEF: Record<1 | 2 | 3 | 4, number> = {
  1: 1.0,
  2: 1.3,
  3: 1.7,
  4: 3.0,
}

/** raw 스칼라 → 원 환산 (기획 예시: 900 → 90만 원). 월간 체계에 맞춰 ×2 */
export const REVENUE_RAW_TO_WON = 2_000

export type DayEventType = 'donation' | 'viewers' | 'popularity' | 'tax'

export type DayEvent = {
  id: string
  creatorId: string
  creatorName: string
  type: DayEventType
  amount: number
  text: string
  atMs: number
  tone: string
}

export type CreatorDayPlan = {
  creatorId: string
  creatorName: string
  /** 주간 수익(원) — 수치 체계는 기존과 동일 */
  weekRevenueWon: number
  events: DayEvent[]
}

export type StudioDayPlan = {
  dayKey: string
  dayMs: number
  plans: CreatorDayPlan[]
  totalRevenueWon: number
}

function heatCoefOf(heat: number) {
  const h = Math.max(1, Math.min(4, Math.round(heat || 1))) as 1 | 2 | 3 | 4
  return HEAT_COEF[h]
}

function randomFactor() {
  return 0.9 + Math.random() * 0.2
}

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR')
}

function gradeOf(creator: { grade?: string }): Grade | null {
  const g = creator.grade
  if (g === 'S' || g === 'A' || g === 'B' || g === 'C') return g
  return null
}

/**
 * 주간 총수익(원) — 기존 일일 공식과 동일 수치
 * 기본 = pop × skill × heatCoef × revenueMult × gradeBonus × random
 * 최종 = round(기본 × REVENUE_RAW_TO_WON) × conditionMult
 */
export function calcWeekRevenueWon(creator: {
  popularity: number
  skill?: number
  heat?: number
  revenueMult?: number
  condition?: string
  conditionScore?: number
  grade?: string
}): number {
  const popularity = Number(creator.popularity) || 0
  const skill = Number(creator.skill ?? 25) || 25
  const heat = Number(creator.heat ?? 1) || 1
  const grade = gradeOf(creator)
  const revenueMult = grade
    ? GRADE_CAPS[grade].revenueMult
    : Number(creator.revenueMult ?? 1) || 1
  const gradeBonus = grade ? GRADE_REVENUE_BONUS[grade] : 1
  const conditionMult = CONDITION_MULT[conditionFromScore(scoreOf(creator))]

  const baseRaw =
    popularity * skill * heatCoefOf(heat) * revenueMult * gradeBonus * randomFactor()
  let baseWon = Math.max(0, Math.round(baseRaw) * REVENUE_RAW_TO_WON)
  // S급 목표 구간: 기본 수익 2억 원 이상 (월간 ×2 반영)
  if (grade === 'S') {
    baseWon = Math.max(baseWon, 200_000_000)
  }
  return Math.max(0, Math.round(baseWon * conditionMult))
}

function roundToManwon(value: number) {
  return Math.max(10_000, Math.round(value / 10_000) * 10_000)
}

/**
 * 총액 T를 5~15개 금액으로 분할. 합 = T.
 * 큰(≥100만) 1~2 / 중간(10만~100만) 3~5 / 나머지 작음(1만~10만).
 */
export function splitDayRevenueAmounts(totalWon: number): number[] {
  const T = Math.max(0, Math.round(totalWon))
  if (T <= 0) return []

  if (T < 50_000) {
    return [T]
  }

  let n = rollInt(5, 15)
  const maxPieces = Math.max(1, Math.floor(T / 10_000))
  n = Math.min(n, maxPieces)

  let bigCount = Math.min(rollInt(1, 2), n)
  let midCount = Math.min(rollInt(3, 5), Math.max(0, n - bigCount))
  let smallCount = Math.max(0, n - bigCount - midCount)

  // T가 작으면 큰/중간 버킷 축소
  if (T < 1_000_000) {
    bigCount = 0
    midCount = Math.min(midCount, Math.max(0, n - 1))
    smallCount = n - midCount
  } else if (T < 3_000_000) {
    bigCount = Math.min(1, bigCount)
    midCount = Math.min(midCount, n - bigCount)
    smallCount = n - bigCount - midCount
  }

  const amounts: number[] = []
  const pushBucket = (count: number, min: number, max: number) => {
    for (let i = 0; i < count; i += 1) {
      const hi = Math.min(max, T)
      const lo = Math.min(min, hi)
      amounts.push(roundToManwon(rollInt(lo, hi)))
    }
  }

  pushBucket(bigCount, 1_000_000, Math.min(2_000_000, T))
  pushBucket(midCount, 100_000, Math.min(999_999, T))
  pushBucket(smallCount, 10_000, Math.min(99_999, T))

  if (amounts.length === 0) {
    amounts.push(T)
  }

  // 합을 T에 맞추기
  let sum = amounts.reduce((a, b) => a + b, 0)
  let diff = T - sum
  amounts[amounts.length - 1] = Math.max(10_000, amounts[amounts.length - 1]! + diff)

  // 여전히 어긋나면 비례 재분배
  sum = amounts.reduce((a, b) => a + b, 0)
  if (sum !== T && sum > 0) {
    const scaled = amounts.map((v) => roundToManwon((v / sum) * T))
    const scaledSum = scaled.reduce((a, b) => a + b, 0)
    scaled[scaled.length - 1] = Math.max(10_000, scaled[scaled.length - 1]! + (T - scaledSum))
    return scaled
  }

  return amounts
}

function scheduleAtMs(count: number, dayMs: number): number[] {
  if (count <= 0) return []
  const slot = dayMs / (count + 1)
  const minGap = dayMs / (count * 2)
  const times: number[] = []
  for (let i = 0; i < count; i += 1) {
    const base = slot * (i + 1)
    const jitter = (Math.random() - 0.5) * slot * 0.35
    let t = Math.max(40, Math.min(dayMs - 40, base + jitter))
    if (times.length > 0) {
      t = Math.max(t, times[times.length - 1]! + minGap * 0.5)
    }
    times.push(Math.min(dayMs - 20, t))
  }
  return times
}

function buildFlavorEvents(
  creatorName: string,
  creatorId: string,
  count: number,
): Array<Omit<DayEvent, 'atMs' | 'id'>> {
  const out: Array<Omit<DayEvent, 'atMs' | 'id'>> = []
  for (let i = 0; i < count; i += 1) {
    if (Math.random() < 0.5) {
      const n = rollInt(10, 80)
      out.push({
        creatorId,
        creatorName,
        type: 'viewers',
        amount: 0,
        text: `📈 시청자 ${n}명 증가! (${creatorName})`,
        tone: 'bg-cyan-400',
      })
    } else {
      const n = rollInt(1, 3)
      out.push({
        creatorId,
        creatorName,
        type: 'popularity',
        amount: 0,
        text: `🔥 인기 +${n} 상승! (${creatorName})`,
        tone: 'bg-orange-400',
      })
    }
  }
  return out
}

export function buildCreatorDayPlan(
  creator: OwnedCreator,
  dayMs: number,
  dayKey: string,
): CreatorDayPlan {
  const weekRevenueWon = calcWeekRevenueWon(creator)
  const amounts = splitDayRevenueAmounts(weekRevenueWon)
  const flavorCount = Math.min(3, rollInt(0, 3))
  const donationEvents: Array<Omit<DayEvent, 'atMs' | 'id'>> = amounts.map((amount) => ({
    creatorId: creator.id,
    creatorName: creator.name,
    type: 'donation' as const,
    amount,
    text: `💰 ${formatWon(amount)}원 후원! (${creator.name})`,
    tone: amount >= 1_000_000 ? 'bg-amber-400' : 'bg-pink-400',
  }))
  const flavor = buildFlavorEvents(creator.name, creator.id, flavorCount)
  const merged = [...donationEvents, ...flavor]
  // 시간 배치를 위해 섞기
  for (let i = merged.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[merged[i], merged[j]] = [merged[j]!, merged[i]!]
  }
  const times = scheduleAtMs(merged.length, dayMs)
  const events: DayEvent[] = merged.map((event, index) => ({
    ...event,
    id: `${dayKey}-${creator.id}-${index}`,
    atMs: times[index] ?? dayMs * 0.5,
  }))
  events.sort((a, b) => a.atMs - b.atMs)

  return {
    creatorId: creator.id,
    creatorName: creator.name,
    weekRevenueWon,
    events,
  }
}

export function buildStudioDayPlan(
  creators: OwnedCreator[],
  dayMs: number,
  dayKey: string,
): StudioDayPlan {
  const plans = creators.map((creator) => buildCreatorDayPlan(creator, dayMs, dayKey))
  const totalRevenueWon = plans.reduce((sum, plan) => sum + plan.weekRevenueWon, 0)
  return { dayKey, dayMs, plans, totalRevenueWon }
}

export function scaleDayPlanTimes(plan: StudioDayPlan, nextDayMs: number): StudioDayPlan {
  if (plan.dayMs <= 0 || nextDayMs === plan.dayMs) return { ...plan, dayMs: nextDayMs }
  const ratio = nextDayMs / plan.dayMs
  return {
    ...plan,
    dayMs: nextDayMs,
    plans: plan.plans.map((p) => ({
      ...p,
      events: p.events.map((event) => ({
        ...event,
        atMs: Math.min(nextDayMs - 10, Math.max(20, event.atMs * ratio)),
      })),
    })),
  }
}

export function conditionOf(creator: {
  condition?: string
  conditionScore?: number
}): CreatorCondition {
  return conditionFromScore(scoreOf(creator))
}
