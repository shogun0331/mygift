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
  TIER_RANK_BANDS,
  type StationGradeConfig,
  type StationGrade,
  type StationReviewCheck,
  type StationSpec,
} from './stationGradeConfig'
import { setViewerBalance } from './viewerBalance'

export type { StationGrade, StationSpec, StationReviewCheck, StationGradeConfig }
export {
  STATION_TIER_ORDER as STATION_GRADE_ORDER,
  STATION_TIER_LABEL,
  TIER_RANK_BANDS,
  tierViewerCap,
  tierViewerHoldCap,
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
  // 시청자 성장 밸런스도 함께 적용 (station_grade_config.json `balance`)
  setViewerBalance(config?.balance)
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
  _grade: StationGrade,
  _config?: StationGradeConfig,
): number {
  return Math.max(VIEWER_FLOOR, Math.round(raw))
}

/**
 * 현재 등급 순위 구간에서 시청자 진행도에 따른 결정적 순위.
 * 시청자 0% → 구간 최하위(black 300위), 필수 시청자 100% → 구간 최상위(black 151위).
 */
export function stationRankForGrade(
  grade: StationGrade,
  viewers: number,
  config?: StationGradeConfig,
): number {
  const cfg = config ?? getActiveConfig()
  const band = TIER_RANK_BANDS[grade]
  if (!band) return 1

  const next = nextStationTier(grade)
  let requiredViewers = 0
  let baseViewers = 0

  if (next) {
    requiredViewers = cfg.promotions[next].requiredViewers
  } else {
    // 최고 등급(top, 일등기업)일 경우:
    // 일등기업 입성 조건 시청자(startViewers)를 기준 0% (10위)로 두고,
    // 설정된 topClearViewers (기본 750,000)를 달성해야 100% (최종 1위/1등 클리어)가 된다.
    const promoToTop = cfg.promotions['top']
    const startViewers = promoToTop ? promoToTop.requiredViewers : 500_000
    baseViewers = startViewers
    requiredViewers = cfg.topClearViewers ?? Math.round(startViewers * 1.5)
  }

  const denominator = requiredViewers - baseViewers
  const currentDiff = viewers - baseViewers
  const progress = denominator <= 0 ? 1 : Math.max(0, Math.min(1, currentDiff / denominator))
  const rank = Math.round(band.worst - progress * (band.worst - band.best))
  return Math.max(band.best, Math.min(band.worst, rank))
}

export type StationReviewContext = {
  viewers: number
  unlockedSlotCount: number
  assets: number
  creators: Array<{ grade: Grade }>
  snsSubscribers?: number
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
  ctx: Partial<Omit<StationReviewContext, 'viewers' | 'creators'>> = {},
  config?: StationGradeConfig,
): StationReviewStatus {
  const cfg = config ?? getActiveConfig()
  const spec = stationSpecOf(cfg, grade)
  const evaluation = evaluateStationPromotion(cfg, grade, {
    viewers,
    unlockedSlotCount: ctx.unlockedSlotCount ?? 0,
    assets: ctx.assets ?? 0,
    creators,
    snsSubscribers: ctx.snsSubscribers ?? 0,
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

/**
 * 방송국 승급 시 도착 등급별 자산 보상.
 * (심사·미니게임까지 통과해 등급이 실제로 오를 때 지급)
 */
export const STATION_PROMOTION_ASSET_REWARD: Record<Exclude<StationGrade, 'black'>, number> = {
  tiny: 120_000,
  sme: 250_000,
  mid: 450_000,
  large: 700_000,
  top: 1_200_000,
}

export function stationPromotionAssetReward(nextGrade: StationGrade): number {
  if (nextGrade === 'black') return 0
  return STATION_PROMOTION_ASSET_REWARD[nextGrade] ?? 0
}
