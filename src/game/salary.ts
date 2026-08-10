import { WEEKS_PER_MONTH } from './broadcast'
import type { Grade } from './characters'
import { REVENUE_RAW_TO_USD, roundMoney } from './money'
import {
  GRADE_CAPS,
  GRADE_REVENUE_BONUS,
  SCOUT_STAT_RANGES,
  rollInt,
  type CharacterStats,
} from './stats'

/** economy.HEAT_COEF 와 동기화 */
const HEAT_COEF: Record<1 | 2 | 3 | 4, number> = {
  1: 1.0,
  2: 1.3,
  3: 1.7,
  4: 3.0,
}

/** 보통 컨디션 연간 예상 수익 대비 연봉 하한 비율 */
export const SALARY_NORMAL_ANNUAL_RATIO = 0.3

/** @deprecated 보통 기준 사용. 호환용 별칭 */
export const SALARY_WORST_ANNUAL_RATIO = SALARY_NORMAL_ANNUAL_RATIO

/** 제안 연봉 = 하한 × U(min~max) */
export const SALARY_OFFER_MULT = { min: 1.0, max: 1.35 } as const

const MONTHS_PER_YEAR = 12
/** S급 주간 기본 수익 하한 (USD, 구 2억 원) */
const S_BASE_FLOOR_USD = 200_000

function heatCoefOf(heat: number) {
  const h = Math.max(1, Math.min(2, Math.round(heat || 1))) as 1 | 2 | 3 | 4
  return HEAT_COEF[h]
}

export type SalaryStatInput = {
  popularity: number
  skill: number
  heat: number
  revenueMult?: number
  grade: Grade
}

/**
 * 주간 기본 수익(보통 컨디션×1.0 · 랜덤 없음) — 협상용 확정 산출 (USD)
 */
export function estimateBaseWeekRevenueWon(stats: SalaryStatInput): number {
  const popularity = Number(stats.popularity) || 0
  const skill = Number(stats.skill) || 0
  const heat = Number(stats.heat) || 1
  const revenueMult = Number(stats.revenueMult ?? GRADE_CAPS[stats.grade].revenueMult) || 1
  const gradeBonus = GRADE_REVENUE_BONUS[stats.grade]
  const baseRaw = popularity * skill * heatCoefOf(heat) * revenueMult * gradeBonus
  let baseUsd = Math.max(0, Math.round(baseRaw) * REVENUE_RAW_TO_USD)
  if (stats.grade === 'S') {
    baseUsd = Math.max(baseUsd, S_BASE_FLOOR_USD)
  }
  return baseUsd
}

export function estimateNormalAnnualRevenueWon(stats: SalaryStatInput): number {
  return estimateBaseWeekRevenueWon(stats) * WEEKS_PER_MONTH * MONTHS_PER_YEAR
}

/** @deprecated estimateNormalAnnualRevenueWon 사용 */
export function estimateWorstAnnualRevenueWon(stats: SalaryStatInput): number {
  return estimateNormalAnnualRevenueWon(stats)
}

/** 연봉 하한 = 보통 연간 수익 × 30% */
export function calcSalaryFloorFromNormal(stats: SalaryStatInput): number {
  return Math.max(0, Math.round(estimateNormalAnnualRevenueWon(stats) * SALARY_NORMAL_ANNUAL_RATIO))
}

/** @deprecated calcSalaryFloorFromNormal 사용 */
export function calcSalaryFloorFromWorst(stats: SalaryStatInput): number {
  return calcSalaryFloorFromNormal(stats)
}

/** 스카우트/협상 제안 연봉 (하한 ~ 하한×1.35) */
export function rollNegotiatedSalary(stats: CharacterStats, grade: Grade): number {
  const floor = calcSalaryFloorFromNormal({
    popularity: stats.popularity,
    skill: stats.skill,
    heat: stats.heat,
    revenueMult: stats.revenueMult,
    grade,
  })
  if (floor <= 0) return 10_000
  const lo = floor
  const hi = Math.max(lo, Math.round(floor * SALARY_OFFER_MULT.max))
  return roundMoney(rollInt(lo, hi))
}

/** 에디터 등록 등 스탯 없이 등급만 있을 때 — 해당 등급 중간 스탯으로 추정 */
export function estimateDefaultSalaryForGrade(grade: Grade): number {
  const ranges = SCOUT_STAT_RANGES[grade]
  const caps = GRADE_CAPS[grade]
  const mid = (a: number, b: number) => Math.round((a + b) / 2)
  const floor = calcSalaryFloorFromNormal({
    popularity: mid(ranges.popularity.min, ranges.popularity.max),
    skill: mid(ranges.skill.min, ranges.skill.max),
    heat: mid(ranges.heat.min, ranges.heat.max),
    revenueMult: caps.revenueMult,
    grade,
  })
  return roundMoney(floor)
}
