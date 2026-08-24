import { normalizeCreatorStatType, type CreatorStatType, type Grade } from './characters'

export type CharacterStats = {
  heat: number
  trust: number
  stamina: number
  staminaMax: number
  revenueMult: number
  statSexy: number
  statElegance: number
  statCommunication: number
  statPerformance: number
}

export type GradeCaps = {
  stamMax: number
  revenueMult: number
}

export const GRADE_CAPS: Record<Grade, GradeCaps> = {
  S: { stamMax: 100, revenueMult: 1.7 },
  A: { stamMax: 100, revenueMult: 1.35 },
  B: { stamMax: 100, revenueMult: 1.15 },
  C: { stamMax: 100, revenueMult: 1.0 },
}

/** 방송 수익 등급 배율. C 기준, S는 약 1.7배 */
export const GRADE_REVENUE_MULT: Record<Grade, number> = {
  C: 1,
  B: 1.15,
  A: 1.35,
  S: 1.7,
}

/** 유입 시청자 가중 등급 배율. 수익보다 한 단계 더 줌 */
export const GRADE_VIEWER_MULT: Record<Grade, number> = {
  C: 1,
  B: 1.2,
  A: 1.45,
  S: 1.8,
}

export function gradeRevenueMult(grade?: Grade | string): number {
  if (grade === 'B' || grade === 'A' || grade === 'S') return GRADE_REVENUE_MULT[grade]
  return GRADE_REVENUE_MULT.C
}

export function gradeViewerMult(grade?: Grade | string): number {
  if (grade === 'B' || grade === 'A' || grade === 'S') return GRADE_VIEWER_MULT[grade]
  return GRADE_VIEWER_MULT.C
}

/** 섹시+퍼포먼스 1당 주간 수익(USD). 등급 배율은 별도 */
export const REVENUE_PER_STAT_POINT = 20

/** 스카우트 등급 가중치: C40 / B30 / A20 / S10 */
export const GRADE_WEIGHTS: Array<{ grade: Grade; weight: number }> = [
  { grade: 'C', weight: 40 },
  { grade: 'B', weight: 30 },
  { grade: 'A', weight: 20 },
  { grade: 'S', weight: 10 },
]

/** 10위 진입 후 고급 스카우트 가중치 */
export const PREMIUM_GRADE_WEIGHTS: Array<{ grade: Grade; weight: number }> = [
  { grade: 'C', weight: 15 },
  { grade: 'B', weight: 25 },
  { grade: 'A', weight: 35 },
  { grade: 'S', weight: 25 },
]

type StatRange = { min: number; max: number }

export type ScoutStatRanges = {
  heat: StatRange
  trust: StatRange
  stamina: StatRange
}

/** 스카우트 시 능력치 범위 */
export const SCOUT_STAT_RANGES: Record<Grade, ScoutStatRanges> = {
  S: {
    heat: { min: 2, max: 2 },
    trust: { min: 70, max: 100 },
    stamina: { min: 80, max: 100 },
  },
  A: {
    heat: { min: 2, max: 2 },
    trust: { min: 60, max: 89 },
    stamina: { min: 60, max: 79 },
  },
  B: {
    heat: { min: 1, max: 2 },
    trust: { min: 50, max: 79 },
    stamina: { min: 40, max: 59 },
  },
  C: {
    heat: { min: 1, max: 1 },
    trust: { min: 40, max: 69 },
    stamina: { min: 20, max: 39 },
  },
}

/** @deprecated 스탯 기반 협상 연봉 사용. 레거시 등급 구간 참고용 (USD) */
export const SCOUT_SALARY_RANGES: Record<Grade, StatRange> = {
  S: { min: 150_000, max: 300_000 },
  A: { min: 80_000, max: 150_000 },
  B: { min: 50_000, max: 80_000 },
  C: { min: 30_000, max: 50_000 },
}

const HEAT_MAX = 2
const TRUST_MAX = 100
/** 시청자 로그 보너스. 시작 150명≈1.7배, 1만≈5배, 10만≈7배, 상한 10배 */
const VIEWER_BONUS_K = 2.2
const VIEWER_BONUS_REF = 150
const VIEWER_BONUS_CAP = 10

/** 섹시+퍼포먼스로 RAW 수익 배율. (합/50), 하한 0.3 */
export function statRevenueBonusOf(creator: {
  statSexy?: number
  statPerformance?: number
}): number {
  const sexy = Math.max(0, Math.min(100, Number(creator.statSexy) || 0))
  const performance = Math.max(0, Math.min(100, Number(creator.statPerformance) || 0))
  return Math.max(0.3, (sexy + performance) / 50)
}

/** 회사 통합 시청자 로그 보너스. 0명이어도 1.0, 상한 10. 시청자가 수익의 가장 큰 배율 */
export function viewerBonusOf(companyViewers = 0): number {
  const viewers = Math.max(0, Number(companyViewers) || 0)
  return Math.min(
    VIEWER_BONUS_CAP,
    1 + VIEWER_BONUS_K * Math.log10(1 + viewers / VIEWER_BONUS_REF),
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/** inclusive integer roll */
export function rollInt(min: number, max: number) {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  if (hi <= lo) return lo
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

export function rollGrade(premium = false): Grade {
  const table = premium ? PREMIUM_GRADE_WEIGHTS : GRADE_WEIGHTS
  const total = table.reduce((sum, row) => sum + row.weight, 0)
  let ticket = Math.random() * total
  for (const row of table) {
    ticket -= row.weight
    if (ticket < 0) return row.grade
  }
  return 'C'
}

export const CREATOR_STAT_TYPE_FIELD = {
  sexy: 'statSexy',
  communication: 'statCommunication',
  elegance: 'statElegance',
  performance: 'statPerformance',
} as const satisfies Record<CreatorStatType, keyof CharacterStats>

/**
 * 타입 특화 시작값. 주력만 높게, 100까지 강화 여유를 남긴다.
 * C 주력 32~42 / S 주력 56~68
 */
const TYPE_STAT_RANGES: Record<Grade, { off: StatRange; main: StatRange }> = {
  C: { off: { min: 18, max: 28 }, main: { min: 32, max: 42 } },
  B: { off: { min: 24, max: 34 }, main: { min: 40, max: 50 } },
  A: { off: { min: 30, max: 40 }, main: { min: 48, max: 58 } },
  S: { off: { min: 36, max: 46 }, main: { min: 56, max: 68 } },
}

export function rollStatsForGrade(grade: Grade, statType?: CreatorStatType | string): CharacterStats {
  const ranges = SCOUT_STAT_RANGES[grade]
  const caps = GRADE_CAPS[grade]
  const stamina = rollInt(ranges.stamina.min, ranges.stamina.max)
  const type = statType ? normalizeCreatorStatType(statType) : null
  const bands = TYPE_STAT_RANGES[grade]
  const rollTyped = (field: (typeof CREATOR_STAT_TYPE_FIELD)[CreatorStatType]) => {
    const range = type && CREATOR_STAT_TYPE_FIELD[type] === field ? bands.main : bands.off
    return rollInt(range.min, range.max)
  }
  const raw: CharacterStats = {
    heat: rollInt(ranges.heat.min, ranges.heat.max),
    trust: rollInt(ranges.trust.min, ranges.trust.max),
    stamina,
    staminaMax: 100,
    revenueMult: caps.revenueMult,
    statSexy: rollTyped('statSexy'),
    statElegance: rollTyped('statElegance'),
    statCommunication: rollTyped('statCommunication'),
    statPerformance: rollTyped('statPerformance'),
  }
  return clampStats(raw, grade)
}

const PERSONALITY_FALLBACK = 25

/** 등급만 있을 때 4스탯 중간값 (연봉 추정 등) */
export function typicalStatForGrade(grade: Grade): number {
  const bands = TYPE_STAT_RANGES[grade]
  return Math.round((bands.off.min + bands.off.max + bands.main.min + bands.main.max) / 4)
}

export function clampStats(stats: CharacterStats, grade: Grade): CharacterStats {
  const caps = GRADE_CAPS[grade]
  const heat = clamp(Math.round(stats.heat), 1, HEAT_MAX)
  const trust = clamp(Math.round(stats.trust), 0, TRUST_MAX)
  const staminaMax = clamp(Math.round(stats.staminaMax), 1, 100)
  const stamina = clamp(Math.round(stats.stamina), 0, staminaMax)
  const personality = (value: number | undefined) => {
    const n = Number(value)
    if (Number.isFinite(n)) return clamp(Math.round(n), 0, 100)
    return PERSONALITY_FALLBACK
  }
  return {
    heat,
    trust,
    stamina,
    staminaMax,
    revenueMult: caps.revenueMult,
    statSexy: personality(stats.statSexy),
    statElegance: personality(stats.statElegance),
    statCommunication: personality(stats.statCommunication),
    statPerformance: personality(stats.statPerformance),
  }
}
