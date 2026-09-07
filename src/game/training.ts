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

/** 훈련 비용 — 트레이닝 가격 전반 상향 조정 */
const TRAINING_COST_BASE = 3_500
const TRAINING_COST_GROWTH = 1.048
const TRAINING_GRADE_MULT: Record<Grade, number> = {
  C: 1.5,
  B: 2.8,
  A: 5.0,
  S: 9.0,
}

/** 다음 트레이닝 비용. 주력 스탯·등급이 높을수록 급격히 비싸진다 */
export function calcTrainingCost(
  creator: Pick<OwnedCreator, CreatorStatField | 'statType' | 'grade'>,
): number {
  const main = Math.min(99, mainStatValueOf(creator))
  const raw = TRAINING_COST_BASE * TRAINING_COST_GROWTH ** main * TRAINING_GRADE_MULT[creator.grade]
  const unit = raw >= 100_000 ? 1_000 : raw >= 10_000 ? 100 : 10
  return roundMoney(raw, unit)
}

/** 승급 심사비. S 등급 심사(A->S)를 100만 달러대($1,650,000)로 상향 */
const EXAM_COST_BASE: Record<Grade, number> = {
  C: 85_000,
  B: 380_000,
  A: 1_650_000,
  S: 2_500_000,
}
const EXAM_COST_OVER_NEED: Record<Grade, number> = {
  C: 2_000,
  B: 8_000,
  A: 25_000,
  S: 35_000,
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

export const GRADE_TRAINING_TURNS: Record<Grade, number> = {
  C: 2,
  B: 3,
  A: 4,
  S: 5,
}

export function getRequiredTrainingTurns(grade: Grade): number {
  return GRADE_TRAINING_TURNS[grade] ?? 2
}

/** 방송 1턴 누적. 필요 턴에 도달하면 주력 +2~3 / 그 외 +1을 조용히 적용하고 카운터를 리셋한다 */
export function applyBroadcastTrainingTick(creator: OwnedCreator): OwnedCreator {
  if (wouldPromote(creator) || mainStatValueOf(creator) >= 100) {
    return creator
  }
  const req = getRequiredTrainingTurns(creator.grade)
  const nextTurns = (creator.trainingTurns ?? 0) + 1
  if (nextTurns < req) {
    return { ...creator, trainingTurns: nextTurns }
  }
  const trained = applyProductionTraining(creator)
  return { ...trained.creator, trainingTurns: 0 }
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
