import {
  normalizeCreatorStatType,
  type CreatorStatType,
  type Grade,
  type OwnedCreator,
} from './characters'
import { roundMoney } from './money'
import { CREATOR_STAT_TYPE_FIELD, GRADE_CAPS, rollInt } from './stats'

export const TRAINING_MAIN_GAIN = { min: 2, max: 3 } as const
export const TRAINING_OFF_GAIN = { min: 1, max: 1 } as const

/** 해당 구간 주간 매출의 0.4~1.2배. C~$12K / B~$34K / A~$95K / S~$245K */
const TRAINING_COST_BASE = 1_400
const TRAINING_COST_GROWTH = 1.046
const TRAINING_GRADE_MULT: Record<Grade, number> = {
  C: 1,
  B: 1.7,
  A: 2.8,
  S: 4.5,
}

/** 임시: 밸런스 확인용 무료 트레이닝/심사 */
const TRAINING_COST_FREE = true

/** 다음 트레이닝 비용. 주력 스탯·등급이 높을수록 급격히 비싸진다 */
export function calcTrainingCost(
  creator: Pick<OwnedCreator, CreatorStatField | 'statType' | 'grade'>,
): number {
  if (TRAINING_COST_FREE) return 0
  const main = Math.min(99, mainStatValueOf(creator))
  const raw = TRAINING_COST_BASE * TRAINING_COST_GROWTH ** main * TRAINING_GRADE_MULT[creator.grade]
  const unit = raw >= 100_000 ? 1_000 : raw >= 10_000 ? 100 : 10
  return roundMoney(raw, unit)
}

/** 승급 심사비. 해당 구간 주간 매출의 4~8배. 실패 환급 10%라 재도전 부담이 큼 */
const EXAM_COST_BASE: Record<Grade, number> = {
  C: 52_000,
  B: 210_000,
  A: 780_000,
  S: 780_000,
}
const EXAM_COST_OVER_NEED: Record<Grade, number> = {
  C: 1_200,
  B: 4_000,
  A: 12_000,
  S: 12_000,
}

export function calcPromotionExamCost(
  creator: Pick<OwnedCreator, CreatorStatField | 'statType' | 'grade'>,
): number {
  const next = nextGradeBreak(creator.grade)
  if (!next) return 0
  const extra = Math.max(0, mainStatValueOf(creator) - next.need)
  const raw = EXAM_COST_BASE[creator.grade] + extra * EXAM_COST_OVER_NEED[creator.grade]
  const unit = raw >= 100_000 ? 1_000 : 100
  return roundMoney(raw, unit)
}

type CreatorStatField = (typeof CREATOR_STAT_TYPE_FIELD)[CreatorStatType]

const STAT_FIELDS = [
  'statSexy',
  'statElegance',
  'statCommunication',
  'statPerformance',
] as const satisfies readonly CreatorStatField[]

const GRADE_ORDER: Grade[] = ['C', 'B', 'A', 'S']

/** 다음 등급 돌파에 필요한 주력 스탯 */
export const GRADE_BREAK_NEED: Record<Exclude<Grade, 'C'>, number> = {
  B: 50,
  A: 70,
  S: 85,
}

export function mainStatFieldOf(type?: CreatorStatType | string) {
  return CREATOR_STAT_TYPE_FIELD[normalizeCreatorStatType(type)]
}

export function mainStatValueOf(
  creator: Pick<OwnedCreator, CreatorStatField | 'statType'>,
): number {
  const field = mainStatFieldOf(creator.statType)
  return clampStat(creator[field])
}

export function nextGradeBreak(grade: Grade): { grade: Exclude<Grade, 'C'>; need: number } | null {
  const idx = GRADE_ORDER.indexOf(grade)
  if (idx < 0 || idx >= GRADE_ORDER.length - 1) return null
  const next = GRADE_ORDER[idx + 1]
  if (next === 'C' || next == null) return null
  return { grade: next, need: GRADE_BREAK_NEED[next] }
}

export function wouldPromote(
  creator: Pick<OwnedCreator, CreatorStatField | 'statType' | 'grade'>,
): boolean {
  const next = nextGradeBreak(creator.grade)
  return Boolean(next && mainStatValueOf(creator) >= next.need)
}

export function canTrainCreator(
  creator: Pick<OwnedCreator, CreatorStatField | 'statType' | 'grade'>,
): boolean {
  if (wouldPromote(creator)) return true
  return mainStatValueOf(creator) < 100
}

export function applyGradePromotion(creator: OwnedCreator, nextGrade: Grade): OwnedCreator {
  return {
    ...creator,
    grade: nextGrade,
    revenueMult: GRADE_CAPS[nextGrade].revenueMult,
  }
}

function clampStat(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function applyProductionTraining(creator: OwnedCreator): {
  creator: OwnedCreator
  gains: Record<CreatorStatField, number>
  previousGrade: Grade
  promotedTo: Grade | null
} {
  const mainField = mainStatFieldOf(creator.statType)
  if (wouldPromote(creator) || clampStat(creator[mainField]) >= 100) {
    return {
      creator,
      gains: {
        statSexy: 0,
        statElegance: 0,
        statCommunication: 0,
        statPerformance: 0,
      },
      previousGrade: creator.grade,
      promotedTo: null,
    }
  }
  const gains = {
    statSexy: 0,
    statElegance: 0,
    statCommunication: 0,
    statPerformance: 0,
  } satisfies Record<CreatorStatField, number>
  const nextStats = { ...creator }

  for (const field of STAT_FIELDS) {
    const current = clampStat(creator[field])
    const room = 100 - current
    const raw =
      field === mainField
        ? rollInt(TRAINING_MAIN_GAIN.min, TRAINING_MAIN_GAIN.max)
        : rollInt(TRAINING_OFF_GAIN.min, TRAINING_OFF_GAIN.max)
    const gain = Math.min(room, raw)
    gains[field] = gain
    nextStats[field] = current + gain
  }

  return {
    creator: nextStats,
    gains,
    previousGrade: creator.grade,
    promotedTo: null,
  }
}
