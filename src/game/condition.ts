import { WEEKS_PER_MONTH } from './broadcast'
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
/** 방송 턴(월) 기본 스테미나 소모. 기품으로 감소. 주 정산 때는 1/4만 깎음 */
export const STAMINA_BROADCAST_COST = 40
/** 기품 감쇠 후에도 이 값 미만으로 내려가지 않음 (월간) */
export const STAMINA_BROADCAST_COST_MIN = 8
/** 기품 1당 방송 스테미나 소모 감소. 0.2는 C급 구간이 주당 반올림에 묻힘 */
export const ELEGANCE_STAMINA_REDUCTION = 0.5
export const STAMINA_REST_GAIN = 20
/** @deprecated 특별휴가는 스테미나 풀 충전 */
export const STAMINA_VACATION_GAIN = 30
/** 이 값 미만(0)이면 방송 불가 */
export const STAMINA_BROADCAST_MIN = 1
/** 소모 후 스테미나가 이 미만이면 컨디션 급속 소모 */
export const STAMINA_LOW_THRESHOLD = 30

export const CONDITION_BROADCAST_LIGHT = { min: 2, max: 4 } as const
export const CONDITION_BROADCAST_FAST = { min: 8, max: 12 } as const
export const REST_RECOVERY = { min: 10, max: 15 } as const
export const VACATION_CONDITION_GAIN = 20

/** 진상 사태 발생 확률 (슬롯당 30% 고정) */
export const CONDITION_CRASH_CHANCE_FIXED = 0.08
/** @deprecated calcConditionCrashChance 사용 */
export const CONDITION_CRASH_CHANCE = CONDITION_CRASH_CHANCE_FIXED
/** 급락 시 추가 컨디션 하락량 */
export const CONDITION_CRASH_DROP = { min: 28, max: 42 } as const
/** 진상 사태 시 추가 스테미나 하락량 (QTE 실패 시) */
export const CONDITION_CRASH_STAMINA_DROP = { min: 10, max: 30 } as const
/** 진상 두더지 QTE 제한 시간 (ms) */
export const CONDITION_CRASH_QTE_MS = 2000

export function calcConditionCrashChance(_ownedCount?: number): number {
  return CONDITION_CRASH_CHANCE_FIXED
}

/** 방송 중 개별 검사. 실패하면 진상 수치, 아니면 null */
export function rollToxicIncident(ownedCount: number, chanceMul = 1): {
  drop: number
  staminaDrop: number
} | null {
  const chance = calcConditionCrashChance(ownedCount) * Math.max(0, chanceMul)
  if (Math.random() >= chance) return null
  return {
    drop: rollInt(CONDITION_CRASH_DROP.min, CONDITION_CRASH_DROP.max),
    staminaDrop: rollInt(CONDITION_CRASH_STAMINA_DROP.min, CONDITION_CRASH_STAMINA_DROP.max),
  }
}

/**
 * 등급별 컨디션 풀케어(최상 100) 비용
 * C 저렴 · S 고가 — 특별휴가보다 낮게, 반복 사용 가능 수준
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

/**
 * 특별휴가비 = max(등급 하한, 연봉 × 비율)
 * 풀 스테미나 회복 + 월(턴) 1회라서 의도적으로 부담스럽게
 */
export const VACATION_SALARY_RATE: Record<Grade, number> = {
  C: 0.04,
  B: 0.055,
  A: 0.075,
  S: 0.1,
}

export const VACATION_COST_FLOOR: Record<Grade, number> = {
  C: 1_800,
  B: 4_500,
  A: 12_000,
  S: 28_000,
}

export const CONDITION_LABEL_KEY: Record<CreatorCondition, string> = {
  best: 'condition.best',
  good: 'condition.good',
  normal: 'condition.normal',
  bad: 'condition.bad',
  worst: 'condition.worst',
}

/** 컨디션 등급별 방송 수익률 배율 (Best 1.2x, Good 1.1x, Normal 1.0x, Bad 0.8x, Worst 0.6x) */
export const CONDITION_REVENUE_MULT: Record<CreatorCondition, number> = {
  best: 1.2,
  good: 1.1,
  normal: 1.0,
  bad: 0.8,
  worst: 0.6,
}

export function conditionRevenueMultOf(creator: { condition?: string; conditionScore?: number }): number {
  const score = scoreOf(creator)
  const tier = conditionFromScore(score)
  return CONDITION_REVENUE_MULT[tier] ?? 1.0
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

/** VIP 수락 등 — 최대 스테미나 감소. 방송 가능 하한 미만으로 내려가지 않음 */
export function applyStaminaMaxPenalty<T extends { stamina: number; staminaMax: number }>(
  creator: T,
  loss: number,
): T {
  const cut = Math.max(0, Math.round(loss))
  const nextMax = Math.max(
    STAMINA_BROADCAST_MIN,
    Math.min(STAMINA_MAX, Math.round(creator.staminaMax) - cut),
  )
  return {
    ...creator,
    staminaMax: nextMax,
    stamina: clampStamina(creator.stamina, nextMax),
  }
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

/** CCTV 주간 진행률에 따른 스테미나 미리보기 */
export function previewLiveStamina(
  stamina: number,
  staminaMax: number,
  weeklyDrain: number,
  progress: number,
) {
  const p = Math.max(0, Math.min(1, progress))
  const next = stamina - Math.max(0, weeklyDrain) * p
  return Math.max(0, Math.min(staminaMax, next))
}

export function isCreatorBroadcastBlockedLive(
  creator: { stamina: number; staminaMax?: number },
  weeklyDrain: number,
  weekProgress: number,
) {
  const staminaMax = Math.min(STAMINA_MAX, Math.max(1, Math.round(creator.staminaMax ?? STAMINA_MAX)))
  const baseStamina = Math.min(staminaMax, creator.stamina)
  const preview = previewLiveStamina(baseStamina, staminaMax, weeklyDrain, weekProgress)
  return !canBroadcastByStamina(preview)
}

/** 방송 턴(월) 스테미나 소모. 40 − 기품×0.5, 최소 8 */
export function calcBroadcastStaminaCost(elegance = 0): number {
  const stat = Math.max(0, Math.min(100, Number(elegance) || 0))
  return Math.max(
    STAMINA_BROADCAST_COST_MIN,
    STAMINA_BROADCAST_COST - stat * ELEGANCE_STAMINA_REDUCTION,
  )
}

/** 주 종료 차감. 한 턴=4주이므로 월간 소모의 1/4 */
export function calcWeeklyBroadcastStaminaCost(elegance = 0): number {
  return Math.max(1, Math.round(calcBroadcastStaminaCost(elegance) / WEEKS_PER_MONTH))
}

export function calcVacationCost(annualSalary: number, grade: Grade) {
  const rate = VACATION_SALARY_RATE[grade] ?? VACATION_SALARY_RATE.C
  const floor = VACATION_COST_FLOOR[grade] ?? VACATION_COST_FLOOR.C
  return Math.max(floor, Math.round(Math.max(0, annualSalary) * rate))
}

type StaminaConditionState = {
  id: string
  condition: string
  conditionScore?: number
  restStreak?: number
  stamina?: number
  staminaMax?: number
  statElegance?: number
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
  cared: Array<{
    creatorId: string
    creatorName: string
    scoreBefore: number
    scoreAfter: number
  }>
}

export type SlotDrainMults = {
  staminaMult: number
  conditionMult: number
}

/**
 * 주 종료: 실제 방송자 스테미나 −월간(40 − 기품×0.5, 최소 8)/4 + 컨디션 소모
 * 슬롯 배정만 하고 못 나간 사람(스테미나 부족 등)도 스테미나는 0까지 소모, 컨디션은 유지
 * 슬롯에서 빠진 사람만 스테미나 +20 + 컨디션 회복
 * 방송자는 보유 인원×2% 확률로 진상 사태(캐릭터당 주 1회, 이미 고장난 칸은 제외)
 */
export function applyWeeklyStaminaAndCondition<T extends StaminaConditionState & { name?: string }>(
  creators: T[],
  broadcastedIds: ReadonlySet<string>,
  drainMultByCreatorId: Record<string, SlotDrainMults> = {},
  skipCrashCreatorIds: ReadonlySet<string> = new Set(),
  assignedSlotIds: ReadonlySet<string> = broadcastedIds,
  careRecoverCreatorIds: ReadonlySet<string> = new Set(),
): ConditionCrashResult<T> {
  const crashes: ConditionCrashResult<T>['crashes'] = []
  const cared: ConditionCrashResult<T>['cared'] = []
  const crashChance = calcConditionCrashChance(creators.length)

  const nextCreators = creators.map((creator) => {
    const currentScore = scoreOf(creator)
    const staminaMax = Math.min(STAMINA_MAX, Math.max(1, Math.round(creator.staminaMax ?? STAMINA_MAX)))
    const staminaNow = clampStamina(creator.stamina ?? staminaMax, staminaMax)

    if (broadcastedIds.has(creator.id)) {
      const drain = drainMultByCreatorId[creator.id]
      const staminaMult = Math.max(0.5, Math.min(1, drain?.staminaMult ?? 1))
      const conditionMult = Math.max(0.5, Math.min(1, drain?.conditionMult ?? 1))
      const staminaCost = Math.max(
        1,
        Math.round(calcWeeklyBroadcastStaminaCost(creator.statElegance) * staminaMult),
      )
      const staminaAfter = clampStamina(staminaNow - staminaCost, staminaMax)
      const rawCond =
        staminaAfter < STAMINA_LOW_THRESHOLD
          ? -rollInt(CONDITION_BROADCAST_FAST.min, CONDITION_BROADCAST_FAST.max)
          : -rollInt(CONDITION_BROADCAST_LIGHT.min, CONDITION_BROADCAST_LIGHT.max)
      let condDelta = Math.min(-1, Math.round(rawCond * conditionMult))

      let scoreAfterDrain = currentScore + condDelta
      if (
        crashChance > 0 &&
        !skipCrashCreatorIds.has(creator.id) &&
        Math.random() < crashChance
      ) {
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

      if (
        careRecoverCreatorIds.has(creator.id) &&
        scoreAfterDrain < CONDITION_SCORE_RANGE.best.min
      ) {
        const scoreBeforeCare = clampConditionScore(scoreAfterDrain)
        scoreAfterDrain = CONDITION_SCORE_RANGE.best.min
        if (scoreBeforeCare < scoreAfterDrain) {
          cared.push({
            creatorId: creator.id,
            creatorName: creator.name ?? creator.id,
            scoreBefore: scoreBeforeCare,
            scoreAfter: scoreAfterDrain,
          })
        }
      }

      return withVitals(creator, scoreAfterDrain, staminaAfter, 0)
    }

    if (assignedSlotIds.has(creator.id)) {
      const drain = drainMultByCreatorId[creator.id]
      const staminaMult = Math.max(0.5, Math.min(1, drain?.staminaMult ?? 1))
      const staminaCost = Math.max(
        1,
        Math.round(calcWeeklyBroadcastStaminaCost(creator.statElegance) * staminaMult),
      )
      return withVitals(creator, currentScore, staminaNow - staminaCost, 0)
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

  return { creators: nextCreators, crashes, cared }
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

/** 특별휴가 — 스테미나 풀 충전 + 컨디션 소폭 회복 */
export function applyVacationRecovery<T extends StaminaConditionState>(creator: T): T {
  const staminaMax = Math.min(STAMINA_MAX, Math.max(1, Math.round(creator.staminaMax ?? STAMINA_MAX)))
  return withVitals(
    creator,
    scoreOf(creator) + VACATION_CONDITION_GAIN,
    staminaMax,
    creator.restStreak ?? 0,
  )
}

/** 컨디션·스테미나 증감 (선물/H재요청 등) */
export function applyVitalsDelta<T extends StaminaConditionState>(
  creator: T,
  delta: { condition?: number; stamina?: number },
): T {
  const staminaMax = Math.min(STAMINA_MAX, Math.max(1, Math.round(creator.staminaMax ?? STAMINA_MAX)))
  const staminaNow = clampStamina(creator.stamina ?? staminaMax, staminaMax)
  return withVitals(
    creator,
    scoreOf(creator) + (delta.condition ?? 0),
    staminaNow + (delta.stamina ?? 0),
    creator.restStreak ?? 0,
  )
}

/** H 씬 보상 — 체력과 컨디션을 100(최대)으로 풀 회복 */
export function applyFullVitalsRecovery<T extends StaminaConditionState>(creator: T): T {
  const staminaMax = Math.min(STAMINA_MAX, Math.max(1, Math.round(creator.staminaMax ?? STAMINA_MAX)))
  return withVitals(
    creator,
    100,
    staminaMax,
    0,
  )
}

/** @deprecated applyVacationRecovery / applyConditionCare */
export function applySpaRecovery<T extends StaminaConditionState>(creator: T): T {
  return applyVacationRecovery(creator)
}
