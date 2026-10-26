import {
  normalizeCreatorStatType,
  type CreatorStatType,
  type Grade,
  type OwnedCreator,
} from './characters'
import { roundMoney } from './money'
import { CREATOR_STAT_TYPE_FIELD, GRADE_CAPS, rollInt } from './stats'

/** 한 번에 굴리는 원래 상승. 실제 반영은 이 값의 1/3이다. */
const TRAINING_ROLL_MAIN = { min: 2, max: 3 } as const
const TRAINING_ROLL_OFF = { min: 1, max: 1 } as const
/** 화면에 보이는 한 회 상승 범위 */
export const TRAINING_MAIN_GAIN = { min: 0, max: 1 } as const
export const TRAINING_OFF_GAIN = { min: 0, max: 1 } as const

/** 훈련 비용. 기존 가격의 1/3 */
const TRAINING_COST_BASE = 3_500 / 3
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
  'statMental',
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

/** 방송 1턴 누적. 필요 턴에 도달하면 유료 훈련과 같은 1/3 상승을 적용하고 카운터를 리셋한다 */
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

function emptyGains(): Record<CreatorStatField, number> {
  return {
    statSexy: 0,
    statMental: 0,
    statCommunication: 0,
    statPerformance: 0,
  }
}

/** 굴린 상승의 1/3만 능력치에 더하고, 나머지는 다음 훈련으로 넘긴다. */
function takeThird(current: number, raw: number, bank: number) {
  const room = 100 - current
  const pooled = Math.max(0, bank) + raw
  const gain = Math.min(room, Math.floor(pooled / 3))
  return { value: current + gain, gain, bank: pooled - gain * 3 }
}

export function applyProductionTraining(creator: OwnedCreator): {
  creator: OwnedCreator
  gains: Record<CreatorStatField, number>
  previousGrade: Grade
  promotedTo: Grade | null
  applied: boolean
} {
  const mainField = mainStatFieldOf(creator.statType)
  if (wouldPromote(creator) || clampStat(creator[mainField]) >= 100) {
    return {
      creator,
      gains: emptyGains(),
      previousGrade: creator.grade,
      promotedTo: null,
      applied: false,
    }
  }
  const gains = emptyGains()
  const remainder = { ...(creator.trainingRemainder ?? {}) }
  const nextStats = { ...creator }

  for (const field of STAT_FIELDS) {
    const current = clampStat(creator[field])
    const raw =
      field === mainField
        ? rollInt(TRAINING_ROLL_MAIN.min, TRAINING_ROLL_MAIN.max)
        : rollInt(TRAINING_ROLL_OFF.min, TRAINING_ROLL_OFF.max)
    const next = takeThird(current, raw, remainder[field] ?? 0)
    gains[field] = next.gain
    nextStats[field] = next.value
    remainder[field] = next.bank
  }

  return {
    creator: { ...nextStats, trainingRemainder: remainder },
    gains,
    previousGrade: creator.grade,
    promotedTo: null,
    applied: true,
  }
}
