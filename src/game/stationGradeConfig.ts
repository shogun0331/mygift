import type { Grade } from './characters'
import type { CompanyTierId } from './ranking'

export type StationTierId = Exclude<CompanyTierId, 'black'>
export type StationGrade = StationTierId

export type StationSpec = {
  grade: StationGrade
  slots: number
  maxRank: number
  viewerCap: number | null
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

/** 해당 등급에 머무를 때의 스튜디오 슬롯 수 */
export type StationTierSpec = {
  slots: number
}

/** 다음 등급으로 올라가기 위한 연간 심사 조건 */
export type StationPromotionRule = {
  to: Exclude<StationTierId, 'tiny'>
  requiredViewers: number
  minUnlockedSlots: OptionalNumberCondition
  minAssets: OptionalNumberCondition
  creatorRequirements: CreatorCountRequirement[]
  spReward: number
  unlockSlotIndexes: number[]
}

export type StationGradeConfig = {
  tiers: Record<StationTierId, StationTierSpec>
  promotions: Record<Exclude<StationTierId, 'tiny'>, StationPromotionRule>
}

export const STATION_TIER_ORDER: StationTierId[] = ['tiny', 'sme', 'mid', 'large', 'top']

export const STATION_TIER_LABEL: Record<StationTierId, string> = {
  tiny: '영세기업',
  sme: '중소기업',
  mid: '중견기업',
  large: '대기업',
  top: '일등기업',
}

/** 순위 상한 — 랭킹 구간과 동일 */
const TIER_MAX_RANK: Record<StationTierId, number> = {
  tiny: 150,
  sme: 100,
  mid: 50,
  large: 20,
  top: 1,
}

export function nextStationTier(current: StationTierId): Exclude<StationTierId, 'tiny'> | null {
  const idx = STATION_TIER_ORDER.indexOf(current)
  if (idx < 0 || idx >= STATION_TIER_ORDER.length - 1) return null
  return STATION_TIER_ORDER[idx + 1] as Exclude<StationTierId, 'tiny'>
}

export function stationTierRank(tier: StationTierId): number {
  return STATION_TIER_ORDER.indexOf(tier)
}

const EQUIP_REQ_RANK: Record<Grade, number> = { C: 0, B: 1, A: 2, S: 3 }

export function meetsStationTierForEquip(current: StationGrade, required: Grade): boolean {
  return stationTierRank(current) >= EQUIP_REQ_RANK[required]
}

/** 현재 등급 시청자 상한 = 다음 등급 승급에 필요한 시청자 수 */
export function tierViewerCap(config: StationGradeConfig, grade: StationGrade): number | null {
  const next = nextStationTier(grade)
  if (!next) return null
  return config.promotions[next].requiredViewers
}

export function tierMaxRank(grade: StationGrade): number {
  return TIER_MAX_RANK[grade]
}

function defaultCreatorReq(id: string, minGrade: Grade, count: number, enabled = true): CreatorCountRequirement {
  return { id, minGrade, count, enabled }
}

export function defaultStationGradeConfig(): StationGradeConfig {
  return {
    tiers: {
      tiny: { slots: 2 },
      sme: { slots: 2 },
      mid: { slots: 4 },
      large: { slots: 5 },
      top: { slots: 6 },
    },
    promotions: {
      sme: {
        to: 'sme',
        requiredViewers: 1_000,
        minUnlockedSlots: { enabled: false, value: 1 },
        minAssets: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('b1', 'B', 1)],
        spReward: 3,
        unlockSlotIndexes: [],
      },
      mid: {
        to: 'mid',
        requiredViewers: 10_000,
        minUnlockedSlots: { enabled: false, value: 2 },
        minAssets: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('a2', 'A', 2)],
        spReward: 5,
        unlockSlotIndexes: [],
      },
      large: {
        to: 'large',
        requiredViewers: 50_000,
        minUnlockedSlots: { enabled: false, value: 3 },
        minAssets: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('a3', 'A', 3)],
        spReward: 7,
        unlockSlotIndexes: [],
      },
      top: {
        to: 'top',
        requiredViewers: 100_000,
        minUnlockedSlots: { enabled: false, value: 4 },
        minAssets: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('s2', 'S', 2)],
        spReward: 10,
        unlockSlotIndexes: [],
      },
    },
  }
}

function normalizeOptionalNumber(raw: unknown, fallback: OptionalNumberCondition): OptionalNumberCondition {
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
    const minGrade = grades.includes(row.minGrade as Grade) ? (row.minGrade as Grade) : fallback[index]?.minGrade ?? 'B'
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
    requiredViewers: Math.max(0, Math.round(Number(row.requiredViewers) ?? fallback.requiredViewers)),
    minUnlockedSlots: normalizeOptionalNumber(row.minUnlockedSlots, fallback.minUnlockedSlots),
    minAssets: normalizeOptionalNumber(row.minAssets, fallback.minAssets),
    creatorRequirements: normalizeCreatorRequirements(row.creatorRequirements, fallback.creatorRequirements),
    spReward: Math.max(0, Math.round(Number(row.spReward) ?? fallback.spReward)),
    unlockSlotIndexes: Array.isArray(row.unlockSlotIndexes)
      ? row.unlockSlotIndexes.map((v) => Math.max(0, Math.round(Number(v) || 0))).filter((v) => v > 0)
      : [...fallback.unlockSlotIndexes],
  }
}

function normalizeTierSpec(raw: unknown, fallback: StationTierSpec): StationTierSpec {
  if (!raw || typeof raw !== 'object') return { ...fallback }
  const row = raw as Record<string, unknown>
  return {
    slots: Math.max(1, Math.min(6, Math.round(Number(row.slots) ?? fallback.slots))),
  }
}

function migrateLegacyConfig(raw: Record<string, unknown>, defaults: StationGradeConfig): StationGradeConfig {
  const tiers = { ...defaults.tiers }
  const baseSpec = raw.baseSpec
  if (baseSpec && typeof baseSpec === 'object') {
    const base = baseSpec as Record<string, unknown>
    tiers.tiny = normalizeTierSpec({ slots: base.slots }, defaults.tiers.tiny)
  }
  const promotionsRaw = raw.promotions
  if (promotionsRaw && typeof promotionsRaw === 'object') {
    for (const key of STATION_TIER_ORDER.slice(1) as Array<Exclude<StationTierId, 'tiny'>>) {
      const legacy = (promotionsRaw as Record<string, unknown>)[key]
      if (legacy && typeof legacy === 'object') {
        const row = legacy as Record<string, unknown>
        if (row.slots != null) {
          tiers[key] = normalizeTierSpec({ slots: row.slots }, defaults.tiers[key])
        }
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
          ('viewerCap' in (row as object) || 'maxRank' in (row as object) || 'slots' in (row as object)),
      )
    if (record.baseSpec || hasLegacyPromoFields) {
      migrated = migrateLegacyConfig(record, defaults)
    }
  }

  const tiers = { ...migrated.tiers }
  const tiersRaw = record.tiers
  if (tiersRaw && typeof tiersRaw === 'object') {
    for (const key of STATION_TIER_ORDER) {
      tiers[key] = normalizeTierSpec((tiersRaw as Record<string, unknown>)[key], migrated.tiers[key])
    }
  } else if (!record.baseSpec) {
    for (const key of STATION_TIER_ORDER) {
      tiers[key] = migrated.tiers[key]
    }
  }

  const promotions = { ...defaults.promotions }
  const promotionsRaw = record.promotions
  if (promotionsRaw && typeof promotionsRaw === 'object') {
    for (const key of STATION_TIER_ORDER.slice(1) as Array<Exclude<StationTierId, 'tiny'>>) {
      promotions[key] = normalizePromotionRule(
        (promotionsRaw as Record<string, unknown>)[key],
        defaults.promotions[key],
      )
    }
  }

  return { tiers, promotions }
}

export function stationSpecOf(config: StationGradeConfig, grade: StationGrade): StationSpec {
  return {
    grade,
    slots: config.tiers[grade].slots,
    maxRank: tierMaxRank(grade),
    viewerCap: tierViewerCap(config, grade),
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
  next: Exclude<StationTierId, 'tiny'> | null
  eligible: boolean
  checks: StationReviewCheck[]
  spReward: number
  unlockSlotIndexes: number[]
} {
  const next = nextStationTier(current)
  if (!next) {
    return { next: null, eligible: false, checks: [], spReward: 0, unlockSlotIndexes: [] }
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

  const eligible = checks.every((check) => check.met)
  return {
    next,
    eligible,
    checks,
    spReward: rule.spReward,
    unlockSlotIndexes: rule.unlockSlotIndexes,
  }
}
