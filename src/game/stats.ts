import type { Grade } from './characters'

export type CharacterStats = {
  popularity: number
  skill: number
  heat: number
  trust: number
  stamina: number
  staminaMax: number
  revenueMult: number
}

export type GradeCaps = {
  popMax: number
  skillMax: number
  stamMax: number
  revenueMult: number
  growthWeight: number
}

export const GRADE_CAPS: Record<Grade, GradeCaps> = {
  S: { popMax: 100, skillMax: 100, stamMax: 100, revenueMult: 3.0, growthWeight: 5 },
  A: { popMax: 85, skillMax: 85, stamMax: 100, revenueMult: 1.5, growthWeight: 4 },
  B: { popMax: 70, skillMax: 70, stamMax: 100, revenueMult: 1.2, growthWeight: 3 },
  C: { popMax: 50, skillMax: 50, stamMax: 100, revenueMult: 1.0, growthWeight: 2 },
}

/** 등급 수익 보너스 — S는 1억+ 구간 맞추기용 */
export const GRADE_REVENUE_BONUS: Record<Grade, number> = {
  C: 1,
  B: 1,
  A: 1,
  S: 3,
}

/** 스카우트 등급 가중치: C40 / B30 / A20 / S10 */
export const GRADE_WEIGHTS: Array<{ grade: Grade; weight: number }> = [
  { grade: 'C', weight: 40 },
  { grade: 'B', weight: 30 },
  { grade: 'A', weight: 20 },
  { grade: 'S', weight: 10 },
]

type StatRange = { min: number; max: number }

export type ScoutStatRanges = {
  popularity: StatRange
  skill: StatRange
  heat: StatRange
  trust: StatRange
  stamina: StatRange
}

/** 스카우트 시 능력치 범위 */
export const SCOUT_STAT_RANGES: Record<Grade, ScoutStatRanges> = {
  S: {
    popularity: { min: 80, max: 100 },
    skill: { min: 80, max: 100 },
    heat: { min: 2, max: 2 },
    trust: { min: 70, max: 100 },
    stamina: { min: 80, max: 100 },
  },
  A: {
    popularity: { min: 60, max: 79 },
    skill: { min: 60, max: 79 },
    heat: { min: 2, max: 2 },
    trust: { min: 60, max: 89 },
    stamina: { min: 60, max: 79 },
  },
  B: {
    popularity: { min: 40, max: 59 },
    skill: { min: 40, max: 59 },
    heat: { min: 1, max: 2 },
    trust: { min: 50, max: 79 },
    stamina: { min: 40, max: 59 },
  },
  C: {
    popularity: { min: 20, max: 39 },
    skill: { min: 20, max: 39 },
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

export function rollGrade(): Grade {
  const total = GRADE_WEIGHTS.reduce((sum, row) => sum + row.weight, 0)
  let ticket = Math.random() * total
  for (const row of GRADE_WEIGHTS) {
    ticket -= row.weight
    if (ticket < 0) return row.grade
  }
  return 'C'
}

export function rollStatsForGrade(grade: Grade): CharacterStats {
  const ranges = SCOUT_STAT_RANGES[grade]
  const caps = GRADE_CAPS[grade]
  const stamina = rollInt(ranges.stamina.min, ranges.stamina.max)
  const raw: CharacterStats = {
    popularity: rollInt(ranges.popularity.min, ranges.popularity.max),
    skill: rollInt(ranges.skill.min, ranges.skill.max),
    heat: rollInt(ranges.heat.min, ranges.heat.max),
    trust: rollInt(ranges.trust.min, ranges.trust.max),
    stamina,
    staminaMax: 100,
    revenueMult: caps.revenueMult,
  }
  return clampStats(raw, grade)
}

export function clampStats(stats: CharacterStats, grade: Grade): CharacterStats {
  const caps = GRADE_CAPS[grade]
  // 인기·스킬은 성장 승급을 위해 0~100 (등급별 하드캡 없음)
  const popularity = clamp(Math.round(stats.popularity), 0, 100)
  const skill = clamp(Math.round(stats.skill), 0, 100)
  const heat = clamp(Math.round(stats.heat), 1, HEAT_MAX)
  const trust = clamp(Math.round(stats.trust), 0, TRUST_MAX)
  // 스테미나 상한은 등급과 무관하게 100으로 통일
  const staminaMax = clamp(Math.round(stats.staminaMax), 1, 100)
  const stamina = clamp(Math.round(stats.stamina), 0, staminaMax)
  return {
    popularity,
    skill,
    heat,
    trust,
    stamina,
    staminaMax,
    revenueMult: caps.revenueMult,
  }
}
