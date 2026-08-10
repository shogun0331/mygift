import type { Grade } from './characters'
import { rollInt } from './stats'

export type CreatorCondition = 'best' | 'good' | 'normal' | 'bad' | 'worst'

export const CONDITION_ORDER: CreatorCondition[] = [
  'best',
  'good',
  'normal',
  'bad',
  'worst',
]

/** 컨디션별 수익 보정 — 가변 수익 배율은 컨디션만 (스테미나 무관) */
export const CONDITION_MULT: Record<CreatorCondition, number> = {
  best: 1.5,
  good: 1.2,
  normal: 1.0,
  bad: 0.7,
  worst: 0.4,
}

/** 컨디션 점수 구간 (0~100) */
export const CONDITION_SCORE_RANGE: Record<
  CreatorCondition,
  { min: number; max: number }
> = {
  best: { min: 90, max: 100 },
  good: { min: 70, max: 89 },
  normal: { min: 50, max: 69 },
  bad: { min: 30, max: 49 },
  worst: { min: 0, max: 29 },
}

export const STAMINA_MAX = 100
export const STAMINA_BROADCAST_COST = 5
export const STAMINA_REST_GAIN = 20
export const STAMINA_VACATION_GAIN = 30
/** 이 값 이하면 방송 불가 */
export const STAMINA_BROADCAST_MIN = 10
/** 소모 후 스테미나가 이 미만이면 컨디션 급속 소모 */
export const STAMINA_LOW_THRESHOLD = 30

export const CONDITION_BROADCAST_LIGHT = { min: 2, max: 4 } as const
export const CONDITION_BROADCAST_FAST = { min: 8, max: 12 } as const
export const REST_RECOVERY = { min: 10, max: 15 } as const
export const VACATION_CONDITION_GAIN = 20

/** 보유 크리에이터 1명당 진상 사태 확률 (+2%p) */
export const CONDITION_CRASH_CHANCE_PER_OWNED = 0.02
/** @deprecated calcConditionCrashChance 사용 */
export const CONDITION_CRASH_CHANCE = CONDITION_CRASH_CHANCE_PER_OWNED
/** 급락 시 추가 컨디션 하락량 */
export const CONDITION_CRASH_DROP = { min: 28, max: 42 } as const
/** 진상 사태 시 추가 스테미나 하락량 (QTE 실패 시) */
export const CONDITION_CRASH_STAMINA_DROP = { min: 10, max: 30 } as const
/** 진상 두더지 QTE 제한 시간 (ms) */
export const CONDITION_CRASH_QTE_MS = 2000

export function calcConditionCrashChance(ownedCount: number): number {
  const n = Math.max(0, Math.round(ownedCount))
  return n * CONDITION_CRASH_CHANCE_PER_OWNED
}

/**
 * 등급별 컨디션 풀케어(최상 100) 비용
 * C 저렴 · S 고가 — 휴가비보다 낮게, 반복 사용 가능 수준
 */
export const CONDITION_FULL_CARE_COST: Record<Grade, number> = {
  C: 200,
  B: 450,
  A: 800,
  S: 1_500,
}

/** @deprecated 등급별 풀케어로 교체 */
export const CONDITION_CARE_OPTIONS = [
  { id: 'care10', cost: 100, conditionGain: 10 },
  { id: 'care15', cost: 300, conditionGain: 15 },
  { id: 'care20', cost: 500, conditionGain: 20 },
] as const

export function calcConditionFullCareCost(grade: Grade) {
  return CONDITION_FULL_CARE_COST[grade] ?? CONDITION_FULL_CARE_COST.C
}

/** 휴가비 = 연봉 × 비율 (5,000만 기준 표와 동일 비율) */
export const VACATION_SALARY_RATE: Record<Grade, number> = {
  C: 0.006,
  B: 0.0096,
  A: 0.012,
  S: 0.018,
}

export const CONDITION_LABEL_KEY: Record<CreatorCondition, string> = {
  best: 'condition.best',
  good: 'condition.good',
  normal: 'condition.normal',
  bad: 'condition.bad',
  worst: 'condition.worst',
}

export const CONDITION_ICON: Record<CreatorCondition, string> = {
  best: '🤩',
  good: '😊',
  normal: '😐',
  bad: '😣',
  worst: '😵',
}

export const CONDITION_ROW_CLASS: Record<CreatorCondition, string> = {
  best: 'text-emerald-300/90',
  good: 'text-cyan-300/85',
  normal: 'text-slate-400',
  bad: 'text-amber-300',
  worst: 'text-rose-300 condition-alert-worst',
}

export const CONDITION_SCORE_CLASS: Record<CreatorCondition, string> = {
  best: 'text-emerald-400/80',
  good: 'text-cyan-400/75',
  normal: 'text-slate-500',
  bad: 'text-amber-400',
  worst: 'text-rose-400',
}

export const CONDITION_DOT_CLASS: Record<CreatorCondition, string> = {
  best: 'bg-emerald-400',
  good: 'bg-cyan-400',
  normal: 'bg-slate-500',
  bad: 'bg-amber-400',
  worst: 'bg-rose-400',
}

export function clampConditionScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function clampStamina(stamina: number, staminaMax = STAMINA_MAX) {
  const max = Math.max(1, Math.min(STAMINA_MAX, Math.round(staminaMax)))
  return Math.max(0, Math.min(max, Math.round(stamina)))
}

export function conditionFromScore(score: number): CreatorCondition {
  const s = clampConditionScore(score)
  if (s >= 90) return 'best'
  if (s >= 70) return 'good'
  if (s >= 50) return 'normal'
  if (s >= 30) return 'bad'
  return 'worst'
}

export function normalizeCondition(raw: string | null | undefined): CreatorCondition {
  const value = (raw ?? 'normal').toLowerCase()
  if (
    value === 'normal' ||
    value === 'best' ||
    value === 'good' ||
    value === 'bad' ||
    value === 'worst'
  ) {
    return value
  }
  if (value === 'n' || value === 'ok') return 'normal'
  return 'normal'
}

export function rollStartingConditionScore() {
  return rollInt(CONDITION_SCORE_RANGE.normal.min, CONDITION_SCORE_RANGE.normal.max)
}

export function canBroadcastByStamina(stamina: number) {
  return Math.round(stamina) >= STAMINA_BROADCAST_MIN
}

export function calcVacationCost(annualSalary: number, grade: Grade) {
  const rate = VACATION_SALARY_RATE[grade] ?? VACATION_SALARY_RATE.C
  return Math.max(0, Math.round(annualSalary * rate))
}

type StaminaConditionState = {
  id: string
  condition: string
  conditionScore?: number
  restStreak?: number
  stamina?: number
  staminaMax?: number
}

function withVitals<T extends StaminaConditionState>(
  creator: T,
  nextScore: number,
  nextStamina: number,
  restStreak: number,
): T {
  const staminaMax = Math.min(STAMINA_MAX, Math.max(1, Math.round(creator.staminaMax ?? STAMINA_MAX)))
  const conditionScore = clampConditionScore(nextScore)
  return {
    ...creator,
    staminaMax,
    stamina: clampStamina(nextStamina, staminaMax),
    conditionScore,
    condition: conditionFromScore(conditionScore),
    restStreak,
  }
}

export function scoreOf(creator: { condition?: string; conditionScore?: number }) {
  if (typeof creator.conditionScore === 'number' && Number.isFinite(creator.conditionScore)) {
    return clampConditionScore(creator.conditionScore)
  }
  const tier = normalizeCondition(creator.condition)
  const range = CONDITION_SCORE_RANGE[tier]
  return Math.round((range.min + range.max) / 2)
}

export type ConditionCrashResult<T extends StaminaConditionState> = {
  creators: T[]
  crashes: Array<{
    creatorId: string
    creatorName: string
    drop: number
    staminaDrop: number
    scoreBefore: number
    scoreAfter: number
  }>
}

/**
 * 주 종료: 방송자 스테미나 -5 + 컨디션 소모 / 휴식자 스테미나 +20 + 컨디션 회복
 * 방송자는 보유 인원×2% 확률로 진상 사태(컨디션 즉시 급락, 스테미나는 QTE 실패 시 차감)
 */
export function applyWeeklyStaminaAndCondition<T extends StaminaConditionState & { name?: string }>(
  creators: T[],
  broadcastedIds: ReadonlySet<string>,
): ConditionCrashResult<T> {
  const crashes: ConditionCrashResult<T>['crashes'] = []
  const crashChance = calcConditionCrashChance(creators.length)

  const nextCreators = creators.map((creator) => {
    const currentScore = scoreOf(creator)
    const staminaMax = Math.min(STAMINA_MAX, Math.max(1, Math.round(creator.staminaMax ?? STAMINA_MAX)))
    const staminaNow = clampStamina(creator.stamina ?? staminaMax, staminaMax)

    if (broadcastedIds.has(creator.id)) {
      const staminaAfter = clampStamina(staminaNow - STAMINA_BROADCAST_COST, staminaMax)
      let condDelta =
        staminaAfter < STAMINA_LOW_THRESHOLD
          ? -rollInt(CONDITION_BROADCAST_FAST.min, CONDITION_BROADCAST_FAST.max)
          : -rollInt(CONDITION_BROADCAST_LIGHT.min, CONDITION_BROADCAST_LIGHT.max)

      let scoreAfterDrain = currentScore + condDelta
      if (crashChance > 0 && Math.random() < crashChance) {
        const drop = rollInt(CONDITION_CRASH_DROP.min, CONDITION_CRASH_DROP.max)
        const staminaDrop = rollInt(
          CONDITION_CRASH_STAMINA_DROP.min,
          CONDITION_CRASH_STAMINA_DROP.max,
        )
        const scoreBeforeCrash = clampConditionScore(scoreAfterDrain)
        scoreAfterDrain -= drop
        const scoreAfter = clampConditionScore(scoreAfterDrain)
        crashes.push({
          creatorId: creator.id,
          creatorName: creator.name ?? creator.id,
          drop,
          staminaDrop,
          scoreBefore: scoreBeforeCrash,
          scoreAfter,
        })
      }

      return withVitals(creator, scoreAfterDrain, staminaAfter, 0)
    }

    const restStreak = (creator.restStreak ?? 0) + 1
    const condDelta = rollInt(REST_RECOVERY.min, REST_RECOVERY.max)
    return withVitals(
      creator,
      currentScore + condDelta,
      staminaNow + STAMINA_REST_GAIN,
      restStreak,
    )
  })

  return { creators: nextCreators, crashes }
}

/** 진상 QTE 실패 — 보류된 스테미나 패널티 적용 */
export function applyToxicStaminaPenalty<T extends StaminaConditionState>(
  creator: T,
  staminaDrop: number,
): T {
  const staminaMax = Math.min(STAMINA_MAX, Math.max(1, Math.round(creator.staminaMax ?? STAMINA_MAX)))
  const staminaNow = clampStamina(creator.stamina ?? staminaMax, staminaMax)
  return withVitals(
    creator,
    scoreOf(creator),
    staminaNow - Math.max(0, Math.round(staminaDrop)),
    creator.restStreak ?? 0,
  )
}

/** @deprecated applyWeeklyStaminaAndCondition 사용 */
export function applyEndOfDayConditions<T extends StaminaConditionState & { name?: string }>(
  creators: T[],
  broadcastedIds: ReadonlySet<string>,
): T[] {
  return applyWeeklyStaminaAndCondition(creators, broadcastedIds).creators
}

export function applyConditionCare<T extends StaminaConditionState>(
  creator: T,
  conditionGain: number,
): T {
  return withVitals(
    creator,
    scoreOf(creator) + conditionGain,
    creator.stamina ?? STAMINA_MAX,
    creator.restStreak ?? 0,
  )
}

/** 컨디션을 최상(100)으로 즉시 회복 */
export function applyConditionFullCare<T extends StaminaConditionState>(creator: T): T {
  return withVitals(
    creator,
    100,
    creator.stamina ?? STAMINA_MAX,
    creator.restStreak ?? 0,
  )
}

export function applyVacationRecovery<T extends StaminaConditionState>(creator: T): T {
  return withVitals(
    creator,
    scoreOf(creator) + VACATION_CONDITION_GAIN,
    (creator.stamina ?? 0) + STAMINA_VACATION_GAIN,
    creator.restStreak ?? 0,
  )
}

/** @deprecated applyVacationRecovery / applyConditionCare */
export function applySpaRecovery<T extends StaminaConditionState>(creator: T): T {
  return applyVacationRecovery(creator)
}
