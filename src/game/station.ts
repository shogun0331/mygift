import type { Grade } from './characters'

type GradedCreator = { grade: Grade }

export type StationGrade = 'C' | 'B' | 'A' | 'S'

export const STATION_GRADE_ORDER: StationGrade[] = ['C', 'B', 'A', 'S']

export const VIEWER_FLOOR = 150

export type StationSpec = {
  grade: StationGrade
  slots: number
  maxRank: number
  viewerCap: number | null
}

export const STATION_SPECS: Record<StationGrade, StationSpec> = {
  C: { grade: 'C', slots: 2, maxRank: 50, viewerCap: 1_000 },
  B: { grade: 'B', slots: 2, maxRank: 30, viewerCap: 10_000 },
  A: { grade: 'A', slots: 4, maxRank: 10, viewerCap: 100_000 },
  S: { grade: 'S', slots: 6, maxRank: 1, viewerCap: null },
}

export type StationPromotionDef = {
  to: StationGrade
  viewers: number
  minCreatorGrade: Grade
  minCreators: number
  spReward: number
  unlockSlotIndexes: number[]
}

export const STATION_PROMOTIONS: Record<'B' | 'A' | 'S', StationPromotionDef> = {
  B: {
    to: 'B',
    viewers: 1_000,
    minCreatorGrade: 'B',
    minCreators: 1,
    spReward: 3,
    unlockSlotIndexes: [],
  },
  A: {
    to: 'A',
    viewers: 10_000,
    minCreatorGrade: 'A',
    minCreators: 2,
    spReward: 5,
    unlockSlotIndexes: [],
  },
  S: {
    to: 'S',
    viewers: 100_000,
    minCreatorGrade: 'S',
    minCreators: 2,
    spReward: 10,
    unlockSlotIndexes: [],
  },
}

const GRADE_RANK: Record<Grade, number> = { C: 0, B: 1, A: 2, S: 3 }

export function stationGradeRank(grade: StationGrade): number {
  return GRADE_RANK[grade]
}

export function nextStationGrade(current: StationGrade): 'B' | 'A' | 'S' | null {
  if (current === 'C') return 'B'
  if (current === 'B') return 'A'
  if (current === 'A') return 'S'
  return null
}

export function meetsStationGrade(current: StationGrade, required: StationGrade): boolean {
  return stationGradeRank(current) >= stationGradeRank(required)
}

export function gatedFloorOfStation(grade: StationGrade): number {
  return STATION_SPECS[grade].maxRank
}

export function capStationViewers(raw: number, grade: StationGrade): number {
  const cappedFloor = Math.max(VIEWER_FLOOR, Math.round(raw))
  const cap = STATION_SPECS[grade].viewerCap
  if (cap == null) return cappedFloor
  return Math.min(cap, cappedFloor)
}

export function countCreatorsAtLeast(creators: GradedCreator[], minGrade: Grade): number {
  const min = GRADE_RANK[minGrade]
  return creators.filter((c) => GRADE_RANK[c.grade] >= min).length
}

export type StationReviewStatus = {
  current: StationGrade
  next: StationGrade | null
  viewers: number
  requiredViewers: number
  viewersMet: boolean
  creatorGrade: Grade
  creatorCurrent: number
  creatorRequired: number
  creatorsMet: boolean
  eligible: boolean
  maxRank: number
  viewerCap: number | null
  spReward: number
  unlockSlotIndexes: number[]
}

export function getStationReviewStatus(
  grade: StationGrade,
  viewers: number,
  creators: GradedCreator[],
): StationReviewStatus {
  const spec = STATION_SPECS[grade]
  const next = nextStationGrade(grade)
  if (!next) {
    return {
      current: grade,
      next: null,
      viewers,
      requiredViewers: viewers,
      viewersMet: true,
      creatorGrade: 'S',
      creatorCurrent: countCreatorsAtLeast(creators, 'S'),
      creatorRequired: 0,
      creatorsMet: true,
      eligible: false,
      maxRank: spec.maxRank,
      viewerCap: spec.viewerCap,
      spReward: 0,
      unlockSlotIndexes: [],
    }
  }
  const promo = STATION_PROMOTIONS[next]
  const creatorCurrent = countCreatorsAtLeast(creators, promo.minCreatorGrade)
  const viewersMet = viewers >= promo.viewers
  const creatorsMet = creatorCurrent >= promo.minCreators
  return {
    current: grade,
    next,
    viewers,
    requiredViewers: promo.viewers,
    viewersMet,
    creatorGrade: promo.minCreatorGrade,
    creatorCurrent,
    creatorRequired: promo.minCreators,
    creatorsMet,
    eligible: viewersMet && creatorsMet,
    maxRank: spec.maxRank,
    viewerCap: spec.viewerCap,
    spReward: promo.spReward,
    unlockSlotIndexes: promo.unlockSlotIndexes,
  }
}

/** 심사는 유지 또는 +1만. 하락 없음 */
export function applyStationReview(
  grade: StationGrade,
  viewers: number,
  creators: GradedCreator[],
): { grade: StationGrade; promoted: boolean; status: StationReviewStatus } {
  const status = getStationReviewStatus(grade, viewers, creators)
  if (!status.next || !status.eligible) {
    return { grade, promoted: false, status }
  }
  return { grade: status.next, promoted: true, status }
}

/** 시작(9월) 이후의 1월 1일 진입이면 연간 심사 */
export function isAnnualReviewMonth(date: Date, epoch: Date): boolean {
  return date.getMonth() === 0 && date.getFullYear() > epoch.getFullYear()
}

export function nextJanuaryAfter(from: Date, epoch: Date): Date {
  const firstReviewYear = epoch.getFullYear() + 1
  return new Date(Math.max(firstReviewYear, from.getFullYear() + 1), 0, 1)
}
