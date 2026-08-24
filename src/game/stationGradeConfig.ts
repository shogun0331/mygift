import type { Grade } from './characters'
import { companyTierOf, type CompanyTierId } from './ranking'

export type StationTierId = CompanyTierId
export type StationGrade = StationTierId

export type StationSpec = {
  grade: StationGrade
  slots: number
  maxRank: number
  viewerCap: number | null
  maxScoutCreators: number
}

export type OptionalNumberCondition = {
  enabled: boolean
  value: number
}

export type CreatorCountRequirement = {
  id: string
  minGrade: Grade
  count: number
  enabled: boolean
}

/** 해당 등급에 머무를 때의 스카우트 인원 상한 */
export type StationTierSpec = {
  /** 이 등급에서 보유·스카우트 가능한 최대 크리에이터 수 */
  maxScoutCreators: number
}

/** 다음 등급으로 올라가기 위한 연간 심사 조건 */
export type StationPromotionRule = {
  to: Exclude<StationTierId, 'black'>
  requiredViewers: number
  minUnlockedSlots: OptionalNumberCondition
  minAssets: OptionalNumberCondition
  creatorRequirements: CreatorCountRequirement[]
}

export type StationGradeConfig = {
  tiers: Record<StationTierId, StationTierSpec>
  promotions: Record<Exclude<StationTierId, 'black'>, StationPromotionRule>
  /**
   * 슬롯 해금 가격 (USD).
   * 인덱스 0 = 2번째 칸 해금가 … (현재 열린 n개일 때 prices[n-1])
   */
  slotUnlockPrices: number[]
  /**
   * 슬롯 해금에 필요한 최소 방송국 등급.
   * 인덱스 0 = 2번째 칸 … (prices와 동일 인덱스)
   */
  slotUnlockMinGrades: StationTierId[]
}

export const STATION_TIER_ORDER: StationTierId[] = ['black', 'tiny', 'sme', 'mid', 'large', 'top']

export const STATION_TIER_LABEL: Record<StationTierId, string> = {
  black: '일반사업자',
  tiny: '영세기업',
  sme: '중소기업',
  mid: '중견기업',
  large: '대기업',
  top: '일등기업',
}

/** 기본 슬롯 해금가 — 2칸~$1k, 3칸~$3k … */
export const DEFAULT_SLOT_UNLOCK_PRICES = [1_000, 3_000, 9_000, 27_000, 81_000]

/** 기본 슬롯 해금 최소 등급 — 2칸~6칸 (랭킹 기업 등급 기준) */
export const DEFAULT_SLOT_UNLOCK_MIN_GRADES: StationTierId[] = [
  'sme',
  'mid',
  'mid',
  'large',
  'top',
]

/** 순위 상한 — 랭킹 구간과 동일 */
const TIER_MAX_RANK: Record<StationTierId, number> = {
  black: 151,
  tiny: 101,
  sme: 51,
  mid: 21,
  large: 11,
  top: 1,
}

/**
 * 등급별 순위 구간 — 시청자 진행도(0% → worst, 필수 100% → best)에 따라 순위가 상승.
 * 일반사업자(black)는 300위 ~ 151위부터 시작한다.
 */
export const TIER_RANK_BANDS: Record<StationTierId, { best: number; worst: number }> = {
  black: { best: 151, worst: 300 },
  tiny: { best: 101, worst: 150 },
  sme: { best: 51, worst: 100 },
  mid: { best: 21, worst: 50 },
  large: { best: 11, worst: 20 },
  top: { best: 1, worst: 10 },
}

export function nextStationTier(current: StationTierId): Exclude<StationTierId, 'black'> | null {
  const idx = STATION_TIER_ORDER.indexOf(current)
  if (idx < 0 || idx >= STATION_TIER_ORDER.length - 1) return null
  return STATION_TIER_ORDER[idx + 1] as Exclude<StationTierId, 'black'>
}

export function stationTierRank(tier: StationTierId): number {
  return STATION_TIER_ORDER.indexOf(tier)
}

const EQUIP_REQ_RANK: Record<Grade, number> = { C: 0, B: 1, A: 2, S: 3 }

export function meetsStationTierForEquip(current: StationGrade, required: Grade): boolean {
  return stationTierRank(current) >= EQUIP_REQ_RANK[required]
}

/** 현재 등급 시청자 상한(심사 목표) = 다음 등급 승급에 필요한 시청자 수 */
export function tierViewerCap(config: StationGradeConfig, grade: StationGrade): number | null {
  const next = nextStationTier(grade)
  if (!next) return null
  return config.promotions[next].requiredViewers
}

/** 실제 보유 가능 상한 — 승급 필요 시청자 수의 110%까지 확보 허용 */
export function tierViewerHoldCap(config: StationGradeConfig, grade: StationGrade): number | null {
  const base = tierViewerCap(config, grade)
  if (base == null) return null
  return Math.round(base * 1.1)
}

export function tierMaxRank(grade: StationGrade): number {
  return TIER_MAX_RANK[grade]
}

/**
 * 현재 방송국/기업 등급에서 열 수 있는 최대 슬롯 수.
 * 슬롯 해금 조건(필요 등급)에서 파생 — 등급별 슬롯 상한 필드는 없음.
 * `currentGrade`는 방송국 등급 또는 랭킹 기업 등급(black 포함)을 받을 수 있다.
 */
export function maxSlotsForGrade(
  config: StationGradeConfig,
  grade: StationGrade | CompanyTierId,
): number {
  const currentRank = unlockTierRank(grade)
  let max = 1
  for (let index = 0; index < 5; index += 1) {
    const required =
      config.slotUnlockMinGrades[index] ??
      DEFAULT_SLOT_UNLOCK_MIN_GRADES[index] ??
      'tiny'
    if (currentRank >= unlockTierRank(required)) {
      max = Math.max(max, index + 2)
    }
  }
  return Math.max(1, Math.min(6, max))
}

/** 슬롯 해금 비교용 등급 순위 (black < tiny < sme < …) */
const UNLOCK_TIER_ORDER: CompanyTierId[] = ['black', 'tiny', 'sme', 'mid', 'large', 'top']

function unlockTierRank(tier: StationGrade | CompanyTierId): number {
  const idx = UNLOCK_TIER_ORDER.indexOf(tier)
  return idx >= 0 ? idx : 0
}

export function maxScoutCreatorsForGrade(config: StationGradeConfig, grade: StationGrade): number {
  return Math.max(1, Math.min(12, config.tiers[grade]?.maxScoutCreators ?? 1))
}

/**
 * 현재 열린 슬롯 수 기준으로 다음 칸 해금 가격.
 * 더 이상 열 수 없으면 null.
 */
export function slotUnlockPriceOf(
  config: StationGradeConfig,
  unlockedSlotCount: number,
): number | null {
  const n = Math.max(1, Math.round(unlockedSlotCount))
  if (n >= 6) return null
  const price = config.slotUnlockPrices[n - 1]
  if (price == null || !Number.isFinite(price) || price < 0) return null
  return Math.round(price)
}

/**
 * 현재 열린 슬롯 수 기준으로 다음 칸 해금에 필요한 최소 방송국 등급.
 */
export function slotUnlockMinGradeOf(
  config: StationGradeConfig,
  unlockedSlotCount: number,
): StationTierId | null {
  const n = Math.max(1, Math.round(unlockedSlotCount))
  if (n >= 6) return null
  const grade =
    config.slotUnlockMinGrades[n - 1] ??
    DEFAULT_SLOT_UNLOCK_MIN_GRADES[n - 1] ??
    'tiny'
  return STATION_TIER_ORDER.includes(grade) ? grade : 'tiny'
}

/** 다음 슬롯 해금에 현재 등급이 충분한지 (방송국 등급 또는 랭킹 기업 등급) */
export function meetsSlotUnlockGrade(
  config: StationGradeConfig,
  currentGrade: StationGrade | CompanyTierId,
  unlockedSlotCount: number,
): boolean {
  const required = slotUnlockMinGradeOf(config, unlockedSlotCount)
  if (!required) return false
  return unlockTierRank(currentGrade) >= unlockTierRank(required)
}

/**
 * 현재 랭킹 순위로 슬롯 해금 등급 충족 여부.
 * 필요 등급 구간의 최하위 순위(worstRank) 이하면 충족.
 * 예: 중소기업(sme)=100위 이하 → 일반사업자(151+)는 불가.
 */
export function meetsSlotUnlockByRank(
  config: StationGradeConfig,
  currentRank: number,
  unlockedSlotCount: number,
): boolean {
  const required = slotUnlockMinGradeOf(config, unlockedSlotCount)
  if (!required) return false
  const worstAllowed: Record<StationTierId, number> = {
    black: 200,
    tiny: 150,
    sme: 100,
    mid: 50,
    large: 20,
    top: 10,
  }
  return Math.max(1, Math.round(currentRank)) <= worstAllowed[required]
}

/** 현재 랭킹 순위로 열 수 있는 최대 슬롯 수 */
export function maxSlotsForRank(config: StationGradeConfig, currentRank: number): number {
  return maxSlotsForGrade(config, companyTierOf(currentRank).id)
}

function defaultCreatorReq(
  id: string,
  minGrade: Grade,
  count: number,
  enabled = true,
): CreatorCountRequirement {
  return { id, minGrade, count, enabled }
}

export function defaultStationGradeConfig(): StationGradeConfig {
  return {
    tiers: {
      black: { maxScoutCreators: 2 },
      tiny: { maxScoutCreators: 2 },
      sme: { maxScoutCreators: 3 },
      mid: { maxScoutCreators: 4 },
      large: { maxScoutCreators: 5 },
      top: { maxScoutCreators: 6 },
    },
    promotions: {
      tiny: {
        to: 'tiny',
        requiredViewers: 500,
        minUnlockedSlots: { enabled: false, value: 1 },
        minAssets: { enabled: false, value: 0 },
        creatorRequirements: [],
      },
      sme: {
        to: 'sme',
        requiredViewers: 5_000,
        minUnlockedSlots: { enabled: false, value: 1 },
        minAssets: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('b1', 'B', 1, false)],
      },
      mid: {
        to: 'mid',
        requiredViewers: 20_000,
        minUnlockedSlots: { enabled: false, value: 2 },
        minAssets: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('a2', 'B', 2)],
      },
      large: {
        to: 'large',
        requiredViewers: 100_000,
        minUnlockedSlots: { enabled: false, value: 3 },
        minAssets: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('a3', 'A', 2)],
      },
      top: {
        to: 'top',
        requiredViewers: 300_000,
        minUnlockedSlots: { enabled: false, value: 4 },
        minAssets: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('s2', 'S', 1)],
      },
    },
    slotUnlockPrices: [...DEFAULT_SLOT_UNLOCK_PRICES],
    slotUnlockMinGrades: [...DEFAULT_SLOT_UNLOCK_MIN_GRADES],
  }
}

function normalizeOptionalNumber(
  raw: unknown,
  fallback: OptionalNumberCondition,
): OptionalNumberCondition {
  if (!raw || typeof raw !== 'object') return fallback
  const row = raw as Record<string, unknown>
  return {
    enabled: typeof row.enabled === 'boolean' ? row.enabled : fallback.enabled,
    value: Math.max(0, Math.round(Number(row.value) || fallback.value)),
  }
}

function normalizeCreatorRequirements(
  raw: unknown,
  fallback: CreatorCountRequirement[],
): CreatorCountRequirement[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback.map((row) => ({ ...row }))
  const grades: Grade[] = ['S', 'A', 'B', 'C']
  return raw.map((item, index) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const minGrade = grades.includes(row.minGrade as Grade)
      ? (row.minGrade as Grade)
      : fallback[index]?.minGrade ?? 'B'
    return {
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `req-${index}`,
      minGrade,
      count: Math.max(0, Math.round(Number(row.count) || fallback[index]?.count || 0)),
      enabled: typeof row.enabled === 'boolean' ? row.enabled : fallback[index]?.enabled ?? true,
    }
  })
}

function normalizePromotionRule(
  raw: unknown,
  fallback: StationPromotionRule,
): StationPromotionRule {
  if (!raw || typeof raw !== 'object') {
    return { ...fallback, creatorRequirements: fallback.creatorRequirements.map((r) => ({ ...r })) }
  }
  const row = raw as Record<string, unknown>
  return {
    to: fallback.to,
    requiredViewers: Math.max(
      0,
      Math.round(Number(row.requiredViewers) ?? fallback.requiredViewers),
    ),
    minUnlockedSlots: normalizeOptionalNumber(row.minUnlockedSlots, fallback.minUnlockedSlots),
    minAssets: normalizeOptionalNumber(row.minAssets, fallback.minAssets),
    creatorRequirements: normalizeCreatorRequirements(
      row.creatorRequirements,
      fallback.creatorRequirements,
    ),
  }
}

function normalizeTierSpec(raw: unknown, fallback: StationTierSpec): StationTierSpec {
  if (!raw || typeof raw !== 'object') return { ...fallback }
  const row = raw as Record<string, unknown>
  return {
    maxScoutCreators: Math.max(
      1,
      Math.min(12, Math.round(Number(row.maxScoutCreators) ?? fallback.maxScoutCreators)),
    ),
  }
}

function normalizeSlotUnlockPrices(raw: unknown, fallback: number[]): number[] {
  const base = fallback.length >= 5 ? fallback : DEFAULT_SLOT_UNLOCK_PRICES
  if (!Array.isArray(raw) || raw.length === 0) return [...base]
  const next = base.map((fallbackPrice, index) => {
    const value = Math.round(Number(raw[index]))
    return Number.isFinite(value) && value >= 0 ? value : fallbackPrice
  })
  while (next.length < 5) next.push(DEFAULT_SLOT_UNLOCK_PRICES[next.length] ?? 0)
  return next.slice(0, 5)
}

function normalizeSlotUnlockMinGrades(raw: unknown, fallback: StationTierId[]): StationTierId[] {
  const base = fallback.length >= 5 ? fallback : DEFAULT_SLOT_UNLOCK_MIN_GRADES
  if (!Array.isArray(raw) || raw.length === 0) return [...base]
  const next = base.map((fallbackGrade, index) => {
    const value = raw[index]
    return typeof value === 'string' && STATION_TIER_ORDER.includes(value as StationTierId)
      ? (value as StationTierId)
      : fallbackGrade
  })
  while (next.length < 5) {
    next.push(DEFAULT_SLOT_UNLOCK_MIN_GRADES[next.length] ?? 'tiny')
  }
  return next.slice(0, 5)
}

function migrateLegacyConfig(
  raw: Record<string, unknown>,
  defaults: StationGradeConfig,
): StationGradeConfig {
  const tiers = { ...defaults.tiers }
  const baseSpec = raw.baseSpec
  if (baseSpec && typeof baseSpec === 'object') {
    tiers.black = normalizeTierSpec(baseSpec, defaults.tiers.black)
  }
  const promotionsRaw = raw.promotions
  if (promotionsRaw && typeof promotionsRaw === 'object') {
    for (const key of STATION_TIER_ORDER.slice(1) as Array<Exclude<StationTierId, 'black'>>) {
      const legacy = (promotionsRaw as Record<string, unknown>)[key]
      if (legacy && typeof legacy === 'object') {
        tiers[key] = normalizeTierSpec(legacy, defaults.tiers[key])
      }
    }
  }
  return { ...defaults, tiers }
}

export function normalizeStationGradeConfig(raw: unknown): StationGradeConfig {
  const defaults = defaultStationGradeConfig()
  if (!raw || typeof raw !== 'object') return defaults
  const record = raw as Record<string, unknown>

  let migrated = defaults
  if (record.baseSpec || (record.promotions && typeof record.promotions === 'object')) {
    const legacyPromo = record.promotions as Record<string, unknown> | undefined
    const hasLegacyPromoFields =
      legacyPromo &&
      Object.values(legacyPromo).some(
        (row) =>
          row &&
          typeof row === 'object' &&
          ('viewerCap' in (row as object) ||
            'maxRank' in (row as object) ||
            'slots' in (row as object)),
      )
    if (record.baseSpec || hasLegacyPromoFields) {
      migrated = migrateLegacyConfig(record, defaults)
    }
  }

  const tiers = { ...migrated.tiers }
  const tiersRaw = record.tiers
  if (tiersRaw && typeof tiersRaw === 'object') {
    for (const key of STATION_TIER_ORDER) {
      tiers[key] = normalizeTierSpec(
        (tiersRaw as Record<string, unknown>)[key],
        migrated.tiers[key],
      )
    }
  } else if (!record.baseSpec) {
    for (const key of STATION_TIER_ORDER) {
      tiers[key] = migrated.tiers[key]
    }
  }

  const promotions = { ...defaults.promotions }
  const promotionsRaw = record.promotions
  if (promotionsRaw && typeof promotionsRaw === 'object') {
    for (const key of STATION_TIER_ORDER.slice(1) as Array<Exclude<StationTierId, 'black'>>) {
      promotions[key] = normalizePromotionRule(
        (promotionsRaw as Record<string, unknown>)[key],
        defaults.promotions[key],
      )
    }
  }

  return {
    tiers,
    promotions,
    slotUnlockPrices: normalizeSlotUnlockPrices(
      record.slotUnlockPrices,
      defaults.slotUnlockPrices,
    ),
    slotUnlockMinGrades: normalizeSlotUnlockMinGrades(
      record.slotUnlockMinGrades,
      defaults.slotUnlockMinGrades,
    ),
  }
}

export function stationSpecOf(config: StationGradeConfig, grade: StationGrade): StationSpec {
  return {
    grade,
    slots: maxSlotsForGrade(config, grade),
    maxRank: tierMaxRank(grade),
    viewerCap: tierViewerCap(config, grade),
    maxScoutCreators: config.tiers[grade].maxScoutCreators,
  }
}

export type StationReviewCheck = {
  id: string
  label: string
  met: boolean
  detail: string
}

export type StationReviewContext = {
  viewers: number
  unlockedSlotCount: number
  assets: number
  creators: Array<{ grade: Grade }>
}

const CREATOR_GRADE_RANK: Record<Grade, number> = { C: 0, B: 1, A: 2, S: 3 }

function countCreatorsAtLeast(creators: Array<{ grade: Grade }>, minGrade: Grade): number {
  const min = CREATOR_GRADE_RANK[minGrade]
  return creators.filter((c) => CREATOR_GRADE_RANK[c.grade] >= min).length
}

export function evaluateStationPromotion(
  config: StationGradeConfig,
  current: StationGrade,
  ctx: StationReviewContext,
): {
  next: Exclude<StationTierId, 'black'> | null
  eligible: boolean
  checks: StationReviewCheck[]
} {
  const next = nextStationTier(current)
  if (!next) {
    return { next: null, eligible: false, checks: [] }
  }
  const rule = config.promotions[next]
  const checks: StationReviewCheck[] = []

  const viewersMet = ctx.viewers >= rule.requiredViewers
  checks.push({
    id: 'viewers',
    label: '필요 시청자',
    met: viewersMet,
    detail: `${ctx.viewers.toLocaleString()} / ${rule.requiredViewers.toLocaleString()}명`,
  })

  if (rule.minUnlockedSlots.enabled) {
    const met = ctx.unlockedSlotCount >= rule.minUnlockedSlots.value
    checks.push({
      id: 'slots',
      label: '오픈 슬롯',
      met,
      detail: `${ctx.unlockedSlotCount} / ${rule.minUnlockedSlots.value}칸`,
    })
  }

  if (rule.minAssets.enabled) {
    const met = ctx.assets >= rule.minAssets.value
    checks.push({
      id: 'assets',
      label: '보유 자산',
      met,
      detail: `$${ctx.assets.toLocaleString()} / $${rule.minAssets.value.toLocaleString()}`,
    })
  }

  for (const req of rule.creatorRequirements) {
    if (!req.enabled) continue
    const currentCount = countCreatorsAtLeast(ctx.creators, req.minGrade)
    checks.push({
      id: req.id,
      label: `${req.minGrade}랭크 이상`,
      met: currentCount >= req.count,
      detail: `${currentCount} / ${req.count}명`,
    })
  }

  return {
    next,
    eligible: checks.every((check) => check.met),
    checks,
  }
}
