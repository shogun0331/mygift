import {
  normalizeCreatorStatType,
  type CreatorStatType,
  type Grade,
  type OwnedCreator,
} from './characters'
import { applyGradePromotion, mainStatValueOf, nextGradeBreak, wouldPromote } from './training'

export const PROMOTION_STAT_TYPES = [
  'sexy',
  'communication',
  'elegance',
  'performance',
] as const satisfies readonly CreatorStatType[]

export const PROMOTION_SUCCESS_RATE: Record<Exclude<Grade, 'C'>, number> = {
  B: 0.8,
  A: 0.6,
  S: 0.4,
}

export const PROMOTION_JACKPOT_RATE = 0.1
export const PROMOTION_FAIL_REFUND = 0.1
export const PROMOTION_JACKPOT_REFUND = 0.3
export const PROMOTION_JACKPOT_STAT_BONUS = 2

export type PromotionExamKind = 'fail' | 'success' | 'jackpot'

export type PromotionExamResult = {
  kind: PromotionExamKind
  fromGrade: Grade
  toGrade: Grade
  reels: [CreatorStatType, CreatorStatType, CreatorStatType]
  examCost: number
  refund: number
  mainStatBonus: number
}

export function isPromotionExamReady(
  creator: Pick<
    OwnedCreator,
    'grade' | 'statType' | 'statSexy' | 'statElegance' | 'statCommunication' | 'statPerformance'
  >,
): boolean {
  return wouldPromote(creator)
}

function pickReel(): CreatorStatType {
  return PROMOTION_STAT_TYPES[Math.floor(Math.random() * PROMOTION_STAT_TYPES.length)] ?? 'sexy'
}

function pickOther(exclude: CreatorStatType): CreatorStatType {
  const pool = PROMOTION_STAT_TYPES.filter((type) => type !== exclude)
  return pool[Math.floor(Math.random() * pool.length)] ?? 'performance'
}

function stageReels(
  kind: PromotionExamKind,
  mainType: CreatorStatType,
): [CreatorStatType, CreatorStatType, CreatorStatType] {
  if (kind === 'jackpot') return [mainType, mainType, mainType]
  if (kind === 'success') {
    const face = pickOther(mainType)
    return [face, face, face]
  }
  const pair = pickReel()
  return [pair, pair, pickOther(pair)]
}

export function resolvePromotionExam(
  creator: OwnedCreator,
  examCost: number,
): PromotionExamResult | null {
  const next = nextGradeBreak(creator.grade)
  if (!next || mainStatValueOf(creator) < next.need) return null

  const mainType = normalizeCreatorStatType(creator.statType)
  const success = Math.random() < PROMOTION_SUCCESS_RATE[next.grade]
  const jackpot = success && Math.random() < PROMOTION_JACKPOT_RATE
  const kind: PromotionExamKind = jackpot ? 'jackpot' : success ? 'success' : 'fail'
  const cost = Math.max(0, Math.round(examCost))

  return {
    kind,
    fromGrade: creator.grade,
    toGrade: next.grade,
    reels: stageReels(kind, mainType),
    examCost: cost,
    refund:
      kind === 'jackpot'
        ? Math.round(cost * PROMOTION_JACKPOT_REFUND)
        : kind === 'fail'
          ? Math.round(cost * PROMOTION_FAIL_REFUND)
          : 0,
    mainStatBonus: kind === 'jackpot' ? PROMOTION_JACKPOT_STAT_BONUS : 0,
  }
}

export function applyPromotionExamResult(
  creator: OwnedCreator,
  result: PromotionExamResult,
): OwnedCreator {
  if (result.kind === 'fail') return creator
  const next = applyGradePromotion(creator, result.toGrade)
  if (result.mainStatBonus <= 0) return next
  const type = normalizeCreatorStatType(next.statType)
  const field =
    type === 'sexy'
      ? 'statSexy'
      : type === 'communication'
        ? 'statCommunication'
        : type === 'elegance'
          ? 'statElegance'
          : 'statPerformance'
  const current = Math.max(0, Math.min(100, Number(next[field]) || 0))
  return {
    ...next,
    [field]: Math.min(100, current + result.mainStatBonus),
  }
}
