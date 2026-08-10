import { rollInt } from './stats'

export type CreatorCondition = 'best' | 'good' | 'normal' | 'bad' | 'worst'

export const CONDITION_ORDER: CreatorCondition[] = [
  'best',
  'good',
  'normal',
  'bad',
  'worst',
]

export const CONDITION_MULT: Record<CreatorCondition, number> = {
  best: 2.0,
  good: 1.5,
  normal: 1.0,
  bad: 0.5,
  worst: 0.2,
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

/** 수위별 한 주 방송 후 컨디션 하락량 */
export const BROADCAST_CONDITION_DECAY: Record<
  1 | 2 | 3 | 4,
  { min: number; max: number }
> = {
  1: { min: 2, max: 4 },
  2: { min: 4, max: 7 },
  3: { min: 7, max: 12 },
  4: { min: 12, max: 18 },
}

export const REST_RECOVERY = { min: 10, max: 15 } as const
export const REST_STREAK_RECOVERY = { min: 20, max: 30 } as const
export const SPA_RECOVERY = { min: 30, max: 50 } as const

export const CONDITION_LABEL_KEY: Record<CreatorCondition, string> = {
  best: 'condition.best',
  good: 'condition.good',
  normal: 'condition.normal',
  bad: 'condition.bad',
  worst: 'condition.worst',
}

/** UI용 이모지 아이콘 */
export const CONDITION_ICON: Record<CreatorCondition, string> = {
  best: '🤩',
  good: '😊',
  normal: '😐',
  bad: '😣',
  worst: '😵',
}

/** StreamCard 컨디션 한 줄 — 나쁨/최악은 색만 강조 (박스 과다 사용 금지) */
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
  if (value === 'normal' || value === 'best' || value === 'good' || value === 'bad' || value === 'worst') {
    return value
  }
  if (value === 'n' || value === 'ok') return 'normal'
  return 'normal'
}

/** 영입 시 시작 컨디션: 보통(50~69) */
export function rollStartingConditionScore() {
  return rollInt(CONDITION_SCORE_RANGE.normal.min, CONDITION_SCORE_RANGE.normal.max)
}

function heatLevelOf(heat: number): 1 | 2 | 3 | 4 {
  return Math.max(1, Math.min(4, Math.round(heat || 1))) as 1 | 2 | 3 | 4
}

/** 방송 한 주 후 하락량 (음수) */
export function rollBroadcastConditionDelta(heat: number) {
  const range = BROADCAST_CONDITION_DECAY[heatLevelOf(heat)]
  return -rollInt(range.min, range.max)
}

/** 휴식 한 주 회복량 (양수). streak는 이번 휴식 포함 연속 주수 */
export function rollRestConditionDelta(restStreak: number) {
  if (restStreak >= 2) {
    return rollInt(REST_STREAK_RECOVERY.min, REST_STREAK_RECOVERY.max)
  }
  return rollInt(REST_RECOVERY.min, REST_RECOVERY.max)
}

export function rollSpaConditionDelta() {
  return rollInt(SPA_RECOVERY.min, SPA_RECOVERY.max)
}

type ConditionState = {
  condition: string
  conditionScore?: number
  restStreak?: number
  heat?: number
}

function withScore<T extends ConditionState>(
  creator: T,
  nextScore: number,
  restStreak: number,
): T {
  const conditionScore = clampConditionScore(nextScore)
  return {
    ...creator,
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

/**
 * 주 종료 시 컨디션 반영.
 * - 방송한 크리에이터: 수위에 따라 하락, restStreak 리셋
 * - 휴식(미방송): 회복, restStreak 증가
 */
export function applyEndOfDayConditions<T extends ConditionState & { id: string }>(
  creators: T[],
  broadcastedIds: ReadonlySet<string>,
): T[] {
  return creators.map((creator) => {
    const current = scoreOf(creator)
    if (broadcastedIds.has(creator.id)) {
      const delta = rollBroadcastConditionDelta(creator.heat ?? 1)
      return withScore(creator, current + delta, 0)
    }
    const restStreak = (creator.restStreak ?? 0) + 1
    const delta = rollRestConditionDelta(restStreak)
    return withScore(creator, current + delta, restStreak)
  })
}

/** 스파/휴가 등 유료 회복 */
export function applySpaRecovery<T extends ConditionState>(creator: T): T {
  const current = scoreOf(creator)
  return withScore(creator, current + rollSpaConditionDelta(), creator.restStreak ?? 0)
}
