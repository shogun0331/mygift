import type { Grade } from './characters'
import { type CharacterLocaleText } from './characterLocales'
import { companyTierOf, type CompanyTierId } from './ranking'
import { DEFAULT_VIEWER_BALANCE, type ViewerBalance } from './viewerBalance'

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
  minSnsSubscribers?: OptionalNumberCondition
  creatorRequirements: CreatorCountRequirement[]
}

import { readBlurRegions } from '../events/BlurRegionEditor'
import type { BlurRegion } from '../events/types'

export type CreatorType = 'elegance' | 'performance' | 'communication' | 'sexy'

export type AuditJudgeMediaSlot = {
  url: string | null
  blurRegions: BlurRegion[]
}

export type AuditJudgeConfig = {
  id: string
  name: string
  names?: Record<string, string>
  avatarUrl: string
  avatarBlurRegions?: BlurRegion[]
  targetTier?: Exclude<StationTierId, 'black' | 'tiny'> | 'all'
  successMediaUrl?: string
  successBlurRegions?: BlurRegion[]
  failMediaUrl?: string
  failBlurRegions?: BlurRegion[]
  /** 만족도 구간별 심사관 16:9 미디어 및 모자이크/블러 영역 (A: 고만족 80%↑, B: 중만족 30~79%, C: 저만족 0~29%) */
  auditMedia?: {
    A?: AuditJudgeMediaSlot | string
    B?: AuditJudgeMediaSlot | string
    C?: AuditJudgeMediaSlot | string
  }
  attackPower: number
  satisfactionMod: number
  description: string
  descriptions?: Record<string, string>
}

export function normalizeJudgeMediaSlot(raw: unknown): AuditJudgeMediaSlot {
  if (!raw) return { url: null, blurRegions: [] }
  if (typeof raw === 'string') return { url: raw.trim() || null, blurRegions: [] }
  if (typeof raw === 'object') {
    const row = raw as Record<string, unknown>
    const url = typeof row.url === 'string' ? row.url.trim() || null : null
    const blurRegions = readBlurRegions(row)
    return { url, blurRegions }
  }
  return { url: null, blurRegions: [] }
}

export function getJudgeSatisfactionMediaSlot(judge?: AuditJudgeConfig | null, currentPct = 0): AuditJudgeMediaSlot {
  if (!judge) return { url: null, blurRegions: [] }
  const mediaObj = judge.auditMedia
  if (currentPct >= 80) {
    const aSlot = normalizeJudgeMediaSlot(mediaObj?.A)
    if (aSlot.url) return aSlot
  } else if (currentPct >= 30) {
    const bSlot = normalizeJudgeMediaSlot(mediaObj?.B)
    if (bSlot.url) return bSlot
  } else {
    const cSlot = normalizeJudgeMediaSlot(mediaObj?.C)
    if (cSlot.url) return cSlot
  }
  return { url: judge.avatarUrl || null, blurRegions: judge.avatarBlurRegions || [] }
}

export function getJudgeSatisfactionMediaUrl(judge?: AuditJudgeConfig | null, currentPct = 0): string {
  return getJudgeSatisfactionMediaSlot(judge, currentPct).url || ''
}

export type AuditStageSetting = {
  targetSatisfaction: number
  recommendedGrade: Grade
  staminaCost: number
  judgeAttackMod: number
}

export type PromotionAuditConfig = {
  judges: AuditJudgeConfig[]
  stageSettings: Record<Exclude<StationTierId, 'black' | 'tiny'>, AuditStageSetting>
}

export type StationGradeConfig = {
  tiers: Record<StationTierId, StationTierSpec>
  promotions: Record<Exclude<StationTierId, 'black'>, StationPromotionRule>
  /** 승급 심사 미니게임 4인 심사관 및 밸런스 설정 */
  auditConfig?: PromotionAuditConfig
  /** 최종 1위(1등 클리어) 달성에 필요한 시청자 수 (기본값: 750,000) */
  topClearViewers?: number
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
  /** 시청자 성장 밸런스 — JSON `balance` 섹션에서 관리 */
  balance?: ViewerBalance
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

/** 현재 등급 시청자 상한 (제한 제거 -> null) */
export function tierViewerCap(_config: StationGradeConfig, _grade: StationGrade): number | null {
  return null
}

/** 실제 보유 가능 상한 (제한 제거 -> null) */
export function tierViewerHoldCap(_config: StationGradeConfig, _grade: StationGrade): number | null {
  return null
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
      tiny: { maxScoutCreators: 3 },
      sme: { maxScoutCreators: 4 },
      mid: { maxScoutCreators: 5 },
      large: { maxScoutCreators: 6 },
      top: { maxScoutCreators: 8 },
    },
    promotions: {
      tiny: {
        to: 'tiny',
        requiredViewers: 1_000,
        minUnlockedSlots: { enabled: false, value: 1 },
        minAssets: { enabled: false, value: 0 },
        minSnsSubscribers: { enabled: false, value: 0 },
        creatorRequirements: [],
      },
      sme: {
        to: 'sme',
        requiredViewers: 10_000,
        minUnlockedSlots: { enabled: false, value: 1 },
        minAssets: { enabled: false, value: 0 },
        minSnsSubscribers: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('b1', 'B', 1, false)],
      },
      mid: {
        to: 'mid',
        requiredViewers: 40_000,
        minUnlockedSlots: { enabled: false, value: 2 },
        minAssets: { enabled: false, value: 0 },
        minSnsSubscribers: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('a2', 'B', 2)],
      },
      large: {
        to: 'large',
        requiredViewers: 160_000,
        minUnlockedSlots: { enabled: false, value: 3 },
        minAssets: { enabled: false, value: 0 },
        minSnsSubscribers: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('a3', 'A', 2)],
      },
      top: {
        to: 'top',
        requiredViewers: 500_000,
        minUnlockedSlots: { enabled: false, value: 4 },
        minAssets: { enabled: false, value: 0 },
        minSnsSubscribers: { enabled: false, value: 0 },
        creatorRequirements: [defaultCreatorReq('s2', 'S', 1)],
      },
    },
    auditConfig: defaultAuditConfig(),
    topClearViewers: 750_000,
    slotUnlockPrices: [...DEFAULT_SLOT_UNLOCK_PRICES],
    slotUnlockMinGrades: [...DEFAULT_SLOT_UNLOCK_MIN_GRADES],
    balance: { ...DEFAULT_VIEWER_BALANCE },
  }
}

export const FIXED_JUDGES_LOCALES: Record<
  number,
  { names: CharacterLocaleText; descriptions: CharacterLocaleText }
> = {
  0: {
    names: {
      ko: '사토 켄지',
      en: 'Kenji Sato',
      ja: '佐藤 健二',
      'zh-cn': '佐藤健二',
      ru: 'Кэндзи Сато',
      es: 'Kenji Sato',
      de: 'Kenji Sato',
    },
    descriptions: {
      ko: '전통과 기품, 격식을 엄격하게 심사하는 수석 심사관.',
      en: 'Senior evaluator who strictly assesses tradition, elegance, and formality.',
      ja: '伝統と気品、格式を厳格に審査する主任審査員。',
      'zh-cn': '严格审查传统、高雅与礼仪的首席审查员。',
      ru: 'Старший эксперт, строго оценивающий традиции, элегантность и формальности.',
      es: 'Evaluador principal que juzga strictly la tradición, la elegancia y la formalidad.',
      de: 'Chefprüfer, der Tradition, Eleganz und Formstrengheit bewertet.',
    },
  },
  1: {
    names: {
      ko: '타나카 렌',
      en: 'Ren Tanaka',
      ja: '田中 蓮',
      'zh-cn': '田中莲',
      ru: 'Рэн Танака',
      es: 'Ren Tanaka',
      de: 'Ren Tanaka',
    },
    descriptions: {
      ko: '압도적인 스킬과 화려한 무대 퍼포먼스를 중시하는 심사관.',
      en: 'Evaluator who focuses on overwhelming skills and dynamic stage performance.',
      ja: '圧倒的なスキルと華やかなステージパフォーマンスを重視する審査員。',
      'zh-cn': '重视压倒性技巧与华丽舞台表演的审查员。',
      ru: 'Эксперт, уделяющий внимание выдающимся навыкам и ярким выступлениям.',
      es: 'Evaluador que se enfoca en habilidades deslumbrantes y espectáculo escénico.',
      de: 'Prüfer, der den Fokus auf überragendes Können und Bühnenperformance legt.',
    },
  },
  2: {
    names: {
      ko: '야마모토 류세이',
      en: 'Ryusei Yamamoto',
      ja: '山本 龍星',
      'zh-cn': '山本龙星',
      ru: 'Рюсэй Яма모토',
      es: 'Ryusei Yamamoto',
      de: 'Ryusei Yamamoto',
    },
    descriptions: {
      ko: '시청자와의 진정성 있는 소통과 공감을 최우선으로 보는 심사관.',
      en: 'Evaluator who prioritizes authentic communication and viewer empathy.',
      ja: '視聴者との真心ある対話と共感を最優先に評価する審査員。',
      'zh-cn': '将与观众的真诚沟通与共鸣放在首位的审查员。',
      ru: 'Эксперт, ставящий во главу угла искреннее общение и эмпатию со зрителями.',
      es: 'Evaluador que prioriza la comunicación authentic y la empatía con la audiencia.',
      de: 'Prüfer, der authentische Kommunikation und Empathie mit dem Publikum schätzt.',
    },
  },
  3: {
    names: {
      ko: '카와무라 다이치',
      en: 'Daichi Kawamura',
      ja: '川村 大地',
      'zh-cn': '川村大地',
      ru: 'Дайти Кава무ра',
      es: 'Daichi Kawamura',
      de: 'Daichi Kawamura',
    },
    descriptions: {
      ko: '독보적인 아우라와 치명적인 카리스마 매력을 평가하는 심사관.',
      en: 'Evaluator who assesses unique aura and irresistible charismatic attraction.',
      ja: '独創的なオーラと致命的なカリスマ性を評価する審査員。',
      'zh-cn': '评估独一无二的气场与致命魅力风采的审查员。',
      ru: 'Эксперт, оценивающий уникальную ауру и неотразимую харизму.',
      es: 'Evaluador que juzga el aura única y el atractivo carismático irresistible.',
      de: 'Prüfer, der die einzigartige Ausstrahlung und unwiderstehliche Aura bewertet.',
    },
  },
}

export function defaultAuditConfig(): PromotionAuditConfig {
  return {
    judges: [
      {
        id: 'judge_1',
        name: FIXED_JUDGES_LOCALES[0].names.ko,
        names: FIXED_JUDGES_LOCALES[0].names,
        avatarUrl: '',
        targetTier: 'sme',
        successMediaUrl: '',
        failMediaUrl: '',
        attackPower: 8,
        satisfactionMod: 1.0,
        description: FIXED_JUDGES_LOCALES[0].descriptions.ko,
        descriptions: FIXED_JUDGES_LOCALES[0].descriptions,
      },
      {
        id: 'judge_2',
        name: FIXED_JUDGES_LOCALES[1].names.ko,
        names: FIXED_JUDGES_LOCALES[1].names,
        avatarUrl: '',
        targetTier: 'mid',
        successMediaUrl: '',
        failMediaUrl: '',
        attackPower: 12,
        satisfactionMod: 1.1,
        description: FIXED_JUDGES_LOCALES[1].descriptions.ko,
        descriptions: FIXED_JUDGES_LOCALES[1].descriptions,
      },
      {
        id: 'judge_3',
        name: FIXED_JUDGES_LOCALES[2].names.ko,
        names: FIXED_JUDGES_LOCALES[2].names,
        avatarUrl: '',
        targetTier: 'large',
        successMediaUrl: '',
        failMediaUrl: '',
        attackPower: 6,
        satisfactionMod: 0.9,
        description: FIXED_JUDGES_LOCALES[2].descriptions.ko,
        descriptions: FIXED_JUDGES_LOCALES[2].descriptions,
      },
      {
        id: 'judge_4',
        name: FIXED_JUDGES_LOCALES[3].names.ko,
        names: FIXED_JUDGES_LOCALES[3].names,
        avatarUrl: '',
        targetTier: 'top',
        successMediaUrl: '',
        failMediaUrl: '',
        attackPower: 15,
        satisfactionMod: 1.2,
        description: FIXED_JUDGES_LOCALES[3].descriptions.ko,
        descriptions: FIXED_JUDGES_LOCALES[3].descriptions,
      },
    ],
    stageSettings: {
      sme: { targetSatisfaction: 60, recommendedGrade: 'B', staminaCost: 15, judgeAttackMod: 1.0 },
      mid: { targetSatisfaction: 80, recommendedGrade: 'A', staminaCost: 20, judgeAttackMod: 1.2 },
      large: { targetSatisfaction: 100, recommendedGrade: 'S', staminaCost: 25, judgeAttackMod: 1.5 },
      top: { targetSatisfaction: 120, recommendedGrade: 'S', staminaCost: 30, judgeAttackMod: 2.0 },
    },
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
    minSnsSubscribers: normalizeOptionalNumber(
      row.minSnsSubscribers,
      fallback.minSnsSubscribers ?? { enabled: false, value: 0 },
    ),
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

  const topClearViewers =
    typeof record.topClearViewers === 'number' && Number.isFinite(record.topClearViewers)
      ? Math.max(0, Math.round(record.topClearViewers))
      : defaults.topClearViewers ?? 750_000

  return {
    tiers,
    promotions,
    auditConfig: normalizeAuditConfig(record.auditConfig, defaults.auditConfig),
    topClearViewers,
    slotUnlockPrices: normalizeSlotUnlockPrices(
      record.slotUnlockPrices,
      defaults.slotUnlockPrices,
    ),
    slotUnlockMinGrades: normalizeSlotUnlockMinGrades(
      record.slotUnlockMinGrades,
      defaults.slotUnlockMinGrades,
    ),
    balance: normalizeViewerBalance(record.balance),
  }
}

function normalizeAuditConfig(
  raw: unknown,
  fallback?: PromotionAuditConfig,
): PromotionAuditConfig {
  const base = fallback ?? defaultAuditConfig()
  if (!raw || typeof raw !== 'object') return base
  const row = raw as Record<string, unknown>

  const rawJudges = Array.isArray(row.judges) && row.judges.length >= 4 ? row.judges.slice(0, 4) : base.judges
  const validTiers = ['sme', 'mid', 'large', 'top', 'all']
  const defaultTargetTiers: Array<Exclude<StationTierId, 'black' | 'tiny'>> = ['sme', 'mid', 'large', 'top']

  const judges = [0, 1, 2, 3].map((idx) => {
    const item = rawJudges[idx]
    const rowItem = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const fallbackJudge = base.judges[idx] ?? base.judges[0]!
    const fixedInfo = FIXED_JUDGES_LOCALES[idx % 4] ?? FIXED_JUDGES_LOCALES[0]!
    const assignedTier = defaultTargetTiers[idx % 4]!

    const targetTier = validTiers.includes(rowItem.targetTier as string)
      ? (rowItem.targetTier as Exclude<StationTierId, 'black' | 'tiny'> | 'all')
      : assignedTier

    // 이름과 설명은 세이브데이터나 구버전 JSON에 관계없이 무조건 일본 남성 4인 7개국어 고정 데이터로 강제 덮어쓰기
    const name = fixedInfo.names.ko
    const names = fixedInfo.names
    const description = fixedInfo.descriptions.ko
    const descriptions = fixedInfo.descriptions

    const avatarBlurRegions = readBlurRegions({ blurRegions: rowItem.avatarBlurRegions })
    const successBlurRegions = readBlurRegions({ blurRegions: rowItem.successBlurRegions })
    const failBlurRegions = readBlurRegions({ blurRegions: rowItem.failBlurRegions })

    const auditMediaRaw = rowItem.auditMedia && typeof rowItem.auditMedia === 'object' ? (rowItem.auditMedia as Record<string, unknown>) : {}
    const auditMedia = {
      A: normalizeJudgeMediaSlot(auditMediaRaw.A),
      B: normalizeJudgeMediaSlot(auditMediaRaw.B),
      C: normalizeJudgeMediaSlot(auditMediaRaw.C),
    }

    return {
      id: typeof rowItem.id === 'string' && rowItem.id.trim() ? rowItem.id.trim() : `judge_${idx + 1}`,
      name,
      names,
      avatarUrl: typeof rowItem.avatarUrl === 'string' ? rowItem.avatarUrl : '',
      avatarBlurRegions,
      targetTier,
      successMediaUrl: typeof rowItem.successMediaUrl === 'string' ? rowItem.successMediaUrl : '',
      successBlurRegions,
      failMediaUrl: typeof rowItem.failMediaUrl === 'string' ? rowItem.failMediaUrl : '',
      failBlurRegions,
      auditMedia,
      attackPower: Math.max(0, Math.round(Number(rowItem.attackPower) || fallbackJudge.attackPower || 10)),
      satisfactionMod: Math.max(0.1, Number(rowItem.satisfactionMod) || fallbackJudge.satisfactionMod || 1.0),
      description,
      descriptions,
    }
  })

  const rawStages = row.stageSettings && typeof row.stageSettings === 'object' ? (row.stageSettings as Record<string, unknown>) : {}
  const grades: Grade[] = ['S', 'A', 'B', 'C']
  const stageSettings = { ...base.stageSettings }

  for (const tierKey of ['sme', 'mid', 'large', 'top'] as Array<Exclude<StationTierId, 'black' | 'tiny'>>) {
    const fallbackStage = base.stageSettings[tierKey]
    const item = rawStages[tierKey] && typeof rawStages[tierKey] === 'object' ? (rawStages[tierKey] as Record<string, unknown>) : {}
    const recGrade = grades.includes(item.recommendedGrade as Grade) ? (item.recommendedGrade as Grade) : fallbackStage.recommendedGrade

    stageSettings[tierKey] = {
      targetSatisfaction: Math.max(10, Math.round(Number(item.targetSatisfaction) || fallbackStage.targetSatisfaction)),
      recommendedGrade: recGrade,
      staminaCost: Math.max(0, Math.round(Number(item.staminaCost) || fallbackStage.staminaCost)),
      judgeAttackMod: Math.max(0.1, Number(item.judgeAttackMod) || fallbackStage.judgeAttackMod),
    }
  }

  return {
    judges,
    stageSettings,
  }
}

/** balance 섹션 normalize — 누락/잘못된 값은 기본값으로 */
function normalizeViewerBalance(raw: unknown): ViewerBalance {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const pick = (key: keyof ViewerBalance) => {
    const n = Number(row[key])
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_VIEWER_BALANCE[key]
  }
  return {
    viewerPerCommPoint: pick('viewerPerCommPoint'),
    viewerGrowthRate: pick('viewerGrowthRate'),
    viewerOrganicGrowthRate: pick('viewerOrganicGrowthRate'),
    idleViewerDecay: pick('idleViewerDecay'),
    subscriberViewerRate: pick('subscriberViewerRate'),
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
  snsSubscribers?: number
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

  if (rule.minSnsSubscribers?.enabled) {
    const snsSubs = ctx.snsSubscribers ?? 0
    const met = snsSubs >= rule.minSnsSubscribers.value
    checks.push({
      id: 'snsSubscribers',
      label: '필요 SNS 구독자',
      met,
      detail: `${snsSubs.toLocaleString()} / ${rule.minSnsSubscribers.value.toLocaleString()}명`,
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
