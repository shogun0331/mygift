import { WEEKS_PER_MONTH } from './broadcast'
import type { Grade } from './characters'
import { roundMoney } from './money'
import {
  REVENUE_PER_STAT_POINT,
  gradeRevenueMult,
  rollInt,
  typicalStatForGrade,
  viewerBonusOf,
  type CharacterStats,
} from './stats'

/** 보통 컨디션 연간 예상 수익 대비 연봉 하한 비율 */
export const SALARY_NORMAL_ANNUAL_RATIO = 0.3

/** @deprecated 보통 기준 사용. 호환용 별칭 */
export const SALARY_WORST_ANNUAL_RATIO = SALARY_NORMAL_ANNUAL_RATIO

/** 제안 연봉 = 하한 × U(min~max) */
export const SALARY_OFFER_MULT = { min: 1.0, max: 1.35 } as const

const MONTHS_PER_YEAR = 12

export type SalaryStatInput = {
  statSexy?: number
  statPerformance?: number
}

/**
 * 주간 기본 수익 — (섹시 + 퍼포먼스) × 단가 × 등급배율. 시청자 0 기준.
 */
export function estimateBaseWeekRevenueWon(stats: SalaryStatInput, grade?: Grade): number {
  const sexy = Math.max(0, Math.min(100, Number(stats.statSexy) || 0))
  const performance = Math.max(0, Math.min(100, Number(stats.statPerformance) || 0))
  return Math.max(
    0,
    Math.round(
      (sexy + performance) * viewerBonusOf(0) * REVENUE_PER_STAT_POINT * gradeRevenueMult(grade),
    ),
  )
}

export function estimateNormalAnnualRevenueWon(stats: SalaryStatInput, grade?: Grade): number {
  return estimateBaseWeekRevenueWon(stats, grade) * WEEKS_PER_MONTH * MONTHS_PER_YEAR
}

/** @deprecated estimateNormalAnnualRevenueWon 사용 */
export function estimateWorstAnnualRevenueWon(stats: SalaryStatInput, grade?: Grade): number {
  return estimateNormalAnnualRevenueWon(stats, grade)
}

/** 연봉 하한 = 보통 연간 수익 × 30% */
export function calcSalaryFloorFromNormal(stats: SalaryStatInput, grade?: Grade): number {
  return Math.max(
    0,
    Math.round(estimateNormalAnnualRevenueWon(stats, grade) * SALARY_NORMAL_ANNUAL_RATIO),
  )
}

/** @deprecated calcSalaryFloorFromNormal 사용 */
export function calcSalaryFloorFromWorst(stats: SalaryStatInput, grade?: Grade): number {
  return calcSalaryFloorFromNormal(stats, grade)
}

/** 스카우트/협상 제안 연봉 (하한 ~ 하한×1.35) */
export function rollNegotiatedSalary(stats: CharacterStats, grade: Grade): number {
  const floor = calcSalaryFloorFromNormal(
    {
      statSexy: stats.statSexy,
      statPerformance: stats.statPerformance,
    },
    grade,
  )
  if (floor <= 0) return 10_000
  const lo = floor
  const hi = Math.max(lo, Math.round(floor * SALARY_OFFER_MULT.max))
  return roundMoney(rollInt(lo, hi))
}

/** 에디터 등록 등 스탯 없이 등급만 있을 때 — 해당 등급 중간 스탯으로 추정 */
export function estimateDefaultSalaryForGrade(grade: Grade): number {
  const typical = typicalStatForGrade(grade)
  const floor = calcSalaryFloorFromNormal(
    {
      statSexy: typical,
      statPerformance: typical,
    },
    grade,
  )
  return roundMoney(floor)
}
