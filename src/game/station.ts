import type { Grade } from './characters'
import {
  defaultStationGradeConfig,
  evaluateStationPromotion,
  meetsStationTierForEquip,
  nextStationTier,
  stationSpecOf,
  stationTierRank,
  STATION_TIER_LABEL,
  STATION_TIER_ORDER,
  type StationGradeConfig,
  type StationGrade,
  type StationReviewCheck,
  type StationSpec,
} from './stationGradeConfig'

export type { StationGrade, StationSpec, StationReviewCheck, StationGradeConfig }
export {
  STATION_TIER_ORDER as STATION_GRADE_ORDER,
  STATION_TIER_LABEL,
  defaultStationGradeConfig,
  normalizeStationGradeConfig,
} from './stationGradeConfig'

export const VIEWER_FLOOR = 150

const LEGACY_STATION_MAP: Record<string, StationGrade> = {
  C: 'tiny',
  B: 'sme',
  A: 'mid',
  S: 'top',
}

let activeConfig: StationGradeConfig | null = null

function getActiveConfig(): StationGradeConfig {
  if (!activeConfig) {
    activeConfig = defaultStationGradeConfig()
  }
  return activeConfig
}

export function setStationGradeConfig(config: StationGradeConfig): void {
  activeConfig = config
}

export function getStationGradeConfig(): StationGradeConfig {
  return getActiveConfig()
}

export function normalizeStationGrade(raw: unknown): StationGrade {
  if (typeof raw === 'string' && STATION_TIER_ORDER.includes(raw as StationGrade)) {
    return raw as StationGrade
  }
  if (typeof raw === 'string' && raw in LEGACY_STATION_MAP) {
    return LEGACY_STATION_MAP[raw]!
  }
  return 'black'
}

export function stationGradeRank(grade: StationGrade): number {
  return stationTierRank(grade)
}

export function nextStationGrade(current: StationGrade): Exclude<StationGrade, 'black'> | null {
  return nextStationTier(current)
}

/** 장비 트리 게이트 — 노드의 C/B/A/S 요구와 방송국 티어 순위 비교 */
export function meetsStationGrade(current: StationGrade, required: Grade): boolean {
  return meetsStationTierForEquip(current, required)
}

export function stationSpec(grade: StationGrade, config?: StationGradeConfig): StationSpec {
  return stationSpecOf(config ?? getActiveConfig(), grade)
}

export function gatedFloorOfStation(
  grade: StationGrade,
  config?: StationGradeConfig,
): number {
  return stationSpecOf(config ?? getActiveConfig(), grade).maxRank
}

export function capStationViewers(
  raw: number,
  grade: StationGrade,
  config?: StationGradeConfig,
): number {
  const cfg = config ?? getActiveConfig()
  const cappedFloor = Math.max(VIEWER_FLOOR, Math.round(raw))
  const cap = stationSpecOf(cfg, grade).viewerCap
  if (cap == null) return cappedFloor
  return Math.min(cap, cappedFloor)
}

export type StationReviewContext = {
  viewers: number
  unlockedSlotCount: number
  assets: number
  creators: Array<{ grade: Grade }>
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
  checks: StationReviewCheck[]
  eligible: boolean
  maxRank: number
  viewerCap: number | null
  nextSlots: number
}

function legacyCreatorFields(checks: StationReviewCheck[]): {
  creatorGrade: Grade
  creatorCurrent: number
  creatorRequired: number
  creatorsMet: boolean
} {
  const creatorChecks = checks.filter((check) => check.id !== 'viewers' && check.id !== 'slots' && check.id !== 'assets')
  if (creatorChecks.length === 0) {
    return { creatorGrade: 'S', creatorCurrent: 0, creatorRequired: 0, creatorsMet: true }
  }
  const first = creatorChecks[0]!
  const match = first.detail.match(/^(\d+)\s*\/\s*(\d+)/)
  const creatorCurrent = match ? Number(match[1]) : 0
  const creatorRequired = match ? Number(match[2]) : 0
  const gradeMatch = first.label.match(/^([CABS])/)
  return {
    creatorGrade: (gradeMatch?.[1] as Grade | undefined) ?? 'B',
    creatorCurrent,
    creatorRequired,
    creatorsMet: creatorChecks.every((check) => check.met),
  }
}

export function getStationReviewStatus(
  grade: StationGrade,
  viewers: number,
  creators: Array<{ grade: Grade }>,
  ctx: Omit<StationReviewContext, 'viewers' | 'creators'> = { unlockedSlotCount: 0, assets: 0 },
  config?: StationGradeConfig,
): StationReviewStatus {
  const cfg = config ?? getActiveConfig()
  const spec = stationSpecOf(cfg, grade)
  const evaluation = evaluateStationPromotion(cfg, grade, {
    viewers,
    unlockedSlotCount: ctx.unlockedSlotCount,
    assets: ctx.assets,
    creators,
  })
  const viewersCheck = evaluation.checks.find((check) => check.id === 'viewers')
  const requiredViewers =
    evaluation.next != null ? cfg.promotions[evaluation.next].requiredViewers : viewers
  const legacy = legacyCreatorFields(evaluation.checks)
  const nextSpec = evaluation.next ? stationSpecOf(cfg, evaluation.next) : null

  return {
    current: grade,
    next: evaluation.next,
    viewers,
    requiredViewers,
    viewersMet: viewersCheck?.met ?? true,
    ...legacy,
    checks: evaluation.checks,
    eligible: evaluation.eligible,
    maxRank: spec.maxRank,
    viewerCap: spec.viewerCap,
    nextSlots: nextSpec?.slots ?? spec.slots,
  }
}

/** 심사는 유지 또는 +1만. 하락 없음 */
export function applyStationReview(
  grade: StationGrade,
  viewers: number,
  creators: Array<{ grade: Grade }>,
  ctx: Omit<StationReviewContext, 'viewers' | 'creators'> = { unlockedSlotCount: 0, assets: 0 },
  config?: StationGradeConfig,
): { grade: StationGrade; promoted: boolean; status: StationReviewStatus } {
  const status = getStationReviewStatus(grade, viewers, creators, ctx, config)
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

export function stationGradeLabel(grade: StationGrade): string {
  return STATION_TIER_LABEL[grade]
}
