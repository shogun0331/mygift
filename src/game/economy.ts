import type { OwnedCreator } from './characters'
import {
  conditionFromScore,
  scoreOf,
  type CreatorCondition,
} from './condition'
import { formatMoney, roundMoney, REVENUE_RAW_TO_USD } from './money'
import {
  REVENUE_PER_STAT_POINT,
  gradeRevenueMult,
  rollInt,
  statRevenueBonusOf,
  viewerBonusOf,
} from './stats'

export { statRevenueBonusOf, viewerBonusOf }

/** @deprecated REVENUE_RAW_TO_USD 사용 */
export const REVENUE_RAW_TO_WON = REVENUE_RAW_TO_USD

export type DayEventType = 'donation' | 'viewers' | 'tax' | 'toxic' | 'gear'

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
  /** 주간 수익(USD) */
  weekRevenueWon: number
  events: DayEvent[]
}

export type StudioDayPlan = {
  dayKey: string
  dayMs: number
  plans: CreatorDayPlan[]
  totalRevenueWon: number
}

/**
 * 주간 총수익(USD) = (섹시 + 퍼포먼스) × 시청자보너스 × 단가 × 등급배율
 */
export function calcWeekRevenueWon(
  creator: {
    grade?: string
    statSexy?: number
    statPerformance?: number
  },
  _stationRevenueBonusPercent = 0,
  _equipmentRevenueMult = 1,
  companyViewers = 0,
): number {
  const sexy = Math.max(0, Math.min(100, Number(creator.statSexy) || 0))
  const performance = Math.max(0, Math.min(100, Number(creator.statPerformance) || 0))
  return Math.max(
    0,
    Math.round(
      (sexy + performance) *
        viewerBonusOf(companyViewers) *
        REVENUE_PER_STAT_POINT *
        gradeRevenueMult(creator.grade) *
        Math.max(0, Number(_equipmentRevenueMult) || 1),
    ),
  )
}

/**
 * 총액 T를 5~15개 금액으로 분할. 합 = T.
 * 큰(≥$1K) 1~2 / 중간($100~$999) 3~5 / 나머지 작음($10~$99).
 */
export function splitDayRevenueAmounts(totalWon: number): number[] {
  const T = Math.max(0, Math.round(totalWon))
  if (T <= 0) return []

  if (T < 50) {
    return [T]
  }

  let n = rollInt(5, 15)
  const maxPieces = Math.max(1, Math.floor(T / 10))
  n = Math.min(n, maxPieces)

  let bigCount = Math.min(rollInt(1, 2), n)
  let midCount = Math.min(rollInt(3, 5), Math.max(0, n - bigCount))
  let smallCount = Math.max(0, n - bigCount - midCount)

  // T가 작으면 큰/중간 버킷 축소
  if (T < 1_000) {
    bigCount = 0
    midCount = Math.min(midCount, Math.max(0, n - 1))
    smallCount = n - midCount
  } else if (T < 3_000) {
    bigCount = Math.min(1, bigCount)
    midCount = Math.min(midCount, n - bigCount)
    smallCount = n - bigCount - midCount
  }

  const amounts: number[] = []
  const pushBucket = (count: number, min: number, max: number) => {
    for (let i = 0; i < count; i += 1) {
      const hi = Math.min(max, T)
      const lo = Math.min(min, hi)
      amounts.push(roundMoney(rollInt(lo, hi)))
    }
  }

  pushBucket(bigCount, 1_000, Math.min(2_000, T))
  pushBucket(midCount, 100, Math.min(999, T))
  pushBucket(smallCount, 10, Math.min(99, T))

  if (amounts.length === 0) {
    amounts.push(T)
  }

  // 합을 T에 맞추기
  let sum = amounts.reduce((a, b) => a + b, 0)
  let diff = T - sum
  amounts[amounts.length - 1] = Math.max(10, amounts[amounts.length - 1]! + diff)

  // 여전히 어긋나면 비례 재분배
  sum = amounts.reduce((a, b) => a + b, 0)
  if (sum !== T && sum > 0) {
    const scaled = amounts.map((v) => roundMoney((v / sum) * T))
    const scaledSum = scaled.reduce((a, b) => a + b, 0)
    scaled[scaled.length - 1] = Math.max(10, scaled[scaled.length - 1]! + (T - scaledSum))
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
    const n = rollInt(10, 80)
    out.push({
      creatorId,
      creatorName,
      type: 'viewers',
      amount: 0,
      text: `📈 시청자 ${n}명 증가! (${creatorName})`,
      tone: 'bg-cyan-400',
    })
  }
  return out
}

export function buildCreatorDayPlan(
  creator: OwnedCreator,
  dayMs: number,
  dayKey: string,
  stationRevenueBonusPercent = 0,
  equipmentRevenueMult = 1,
  companyViewers = 0,
): CreatorDayPlan {
  const weekRevenueWon = calcWeekRevenueWon(
    creator,
    stationRevenueBonusPercent,
    equipmentRevenueMult,
    companyViewers,
  )
  const amounts = splitDayRevenueAmounts(weekRevenueWon)
  const flavorCount = Math.min(3, rollInt(0, 3))
  const donationEvents: Array<Omit<DayEvent, 'atMs' | 'id'>> = amounts.map((amount) => ({
    creatorId: creator.id,
    creatorName: creator.name,
    type: 'donation' as const,
    amount,
    text: `💰 ${formatMoney(amount)} 후원! (${creator.name})`,
    tone: amount >= 1_000 ? 'bg-amber-400' : 'bg-pink-400',
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
  stationRevenueBonusPercent = 0,
  revenueMultByCreatorId: Record<string, number> = {},
  companyViewers = 0,
): StudioDayPlan {
  const plans = creators.map((creator) =>
    buildCreatorDayPlan(
      creator,
      dayMs,
      dayKey,
      stationRevenueBonusPercent,
      revenueMultByCreatorId[creator.id] ?? 1,
      companyViewers,
    ),
  )
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

/** 방송 불가 시점 이후 후원은 정산·피드에서 제외 */
export function applyBroadcastBlockToCreatorPlan(
  plan: CreatorDayPlan,
  blockProgress: number,
  dayMs: number,
): CreatorDayPlan {
  const blockAtMs = Math.max(0, Math.min(dayMs, blockProgress * dayMs))
  const events = plan.events.filter(
    (event) => event.type !== 'donation' || event.atMs < blockAtMs,
  )
  const weekRevenueWon = events
    .filter((event) => event.type === 'donation')
    .reduce((sum, event) => sum + event.amount, 0)
  return { ...plan, events, weekRevenueWon }
}

export function conditionOf(creator: {
  condition?: string
  conditionScore?: number
}): CreatorCondition {
  return conditionFromScore(scoreOf(creator))
}
