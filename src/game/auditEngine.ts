import type { Grade } from './characters'
import {
  defaultAuditConfig,
  type AuditJudgeConfig,
  type CreatorType,
  type PromotionAuditConfig,
  type StationGrade,
  type StationGradeConfig,
} from './stationGradeConfig'

export const CREATOR_TYPE_LABEL: Record<CreatorType, { label: string; icon: string; tone: string }> = {
  elegance: { label: '기품', icon: '💎', tone: 'text-purple-400 border-purple-500/40 bg-purple-950/60' },
  performance: { label: '퍼포먼스', icon: '🎯', tone: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/60' },
  communication: { label: '소통', icon: '💬', tone: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60' },
  sexy: { label: '섹시', icon: '🔥', tone: 'text-rose-400 border-rose-500/40 bg-rose-950/60' },
}

export const ALL_CREATOR_TYPES: CreatorType[] = ['elegance', 'performance', 'communication', 'sexy']

export type TurnActionResult = {
  turn: number
  creatorId: string
  creatorName: string
  creatorType: CreatorType
  demandedType: CreatorType
  typeMatched: boolean
  creatorGrade: Grade
  recommendedGrade: Grade
  gradeMet: boolean
  scoreGained: number
  reboundDamage: number
  extraStaminaCost: number
  totalStaminaDeducted: number
  mediaReaction: 'high' | 'mid' | 'low'
  isCritical?: boolean
  criticalMultiplier?: number
  message: string
}

export type AuditSession = {
  tier: Exclude<StationGrade, 'black' | 'tiny'>
  judge: AuditJudgeConfig
  currentTurn: number
  maxTurn: number
  turnDemands: CreatorType[]
  currentSatisfaction: number
  targetSatisfaction: number
  recommendedGrade: Grade
  baseStaminaCost: number
  cooldownMap: Record<string, number>
  staminaDeductions: Record<string, number>
  history: TurnActionResult[]
  isCompleted: boolean
  isSuccess: boolean
}

const GRADE_ORDER: Record<Grade, number> = { C: 0, B: 1, A: 2, S: 3 }

/** 크리에이터 ID/해시 기반 타입 결정 */
export function typeForCreator(creatorId: string, customType?: CreatorType): CreatorType {
  if (customType && ALL_CREATOR_TYPES.includes(customType)) {
    return customType
  }
  let hash = 0
  for (let i = 0; i < creatorId.length; i += 1) {
    hash = (hash << 5) - hash + creatorId.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % ALL_CREATOR_TYPES.length
  return ALL_CREATOR_TYPES[index]!
}

/** 승급 심사 미니게임 세션 생성 */
export function createAuditSession(
  tier: Exclude<StationGrade, 'black' | 'tiny'>,
  config?: StationGradeConfig,
  assignedJudgeId?: string,
): AuditSession {
  const auditCfg: PromotionAuditConfig = config?.auditConfig ?? defaultAuditConfig()
  const stage = auditCfg.stageSettings[tier] ?? auditCfg.stageSettings.sme
  const judges = auditCfg.judges.length > 0 ? auditCfg.judges : defaultAuditConfig().judges

  let judge: AuditJudgeConfig = judges[0]!
  if (assignedJudgeId) {
    const found = judges.find((j) => j.id === assignedJudgeId)
    if (found) judge = found
  } else {
    const matchedJudges = judges.filter(
      (j) => !j.targetTier || j.targetTier === 'all' || j.targetTier === tier,
    )
    const pool = matchedJudges.length > 0 ? matchedJudges : judges
    const randIdx = Math.floor(Math.random() * pool.length)
    judge = pool[randIdx] ?? judges[0]!
  }

  // 5턴 각 턴별 무작위 요구 타입 결정
  const turnDemands: CreatorType[] = []
  for (let t = 0; t < 5; t += 1) {
    const randType = ALL_CREATOR_TYPES[Math.floor(Math.random() * ALL_CREATOR_TYPES.length)]!
    turnDemands.push(randType)
  }

  return {
    tier,
    judge,
    currentTurn: 1,
    maxTurn: 5,
    turnDemands,
    currentSatisfaction: 0,
    targetSatisfaction: stage.targetSatisfaction,
    recommendedGrade: stage.recommendedGrade,
    baseStaminaCost: stage.staminaCost,
    cooldownMap: {},
    staminaDeductions: {},
    history: [],
    isCompleted: false,
    isSuccess: false,
  }
}

/** 40 ~ 100 스탯 범위를 0.8배(40 스탯 시작점) ~ 2.0배(100 스탯 마지노선) 계수로 정밀 변환 */
export function calcStatFactor(statValue: number): number {
  const clamped = Math.max(40, Math.min(100, statValue))
  // 40 스탯 -> 0.8x, 70 스탯 -> 1.4x, 100 스탯 -> 2.0x
  const factor = 0.8 + ((clamped - 40) / 60) * 1.2
  return Number(factor.toFixed(2))
}

/** 캐릭터 개별 요구 타입 능력치 수치 추출 헬퍼 (statSexy / statElegance / statCommunication / statPerformance) */
export function getCreatorStatValue(
  creator: {
    statSexy?: number
    statElegance?: number
    statCommunication?: number
    statPerformance?: number
    statValue?: number
    stats?: Record<string, number>
  },
  demandedType: CreatorType,
): number {
  if (typeof creator.statValue === 'number' && !isNaN(creator.statValue)) {
    return Math.max(40, Math.min(100, creator.statValue))
  }

  // 1. 요구 타입별 스탯 매핑 (40~100)
  if (demandedType === 'sexy' && typeof creator.statSexy === 'number') return Math.max(40, Math.min(100, creator.statSexy))
  if (demandedType === 'elegance' && typeof creator.statElegance === 'number') return Math.max(40, Math.min(100, creator.statElegance))
  if (demandedType === 'communication' && typeof creator.statCommunication === 'number') return Math.max(40, Math.min(100, creator.statCommunication))
  if (demandedType === 'performance' && typeof creator.statPerformance === 'number') return Math.max(40, Math.min(100, creator.statPerformance))

  // 2. stats 맵 객체 매핑
  if (creator.stats && typeof creator.stats[demandedType] === 'number') {
    return Math.max(40, Math.min(100, creator.stats[demandedType]))
  }

  // 3. 스탯 중 최고값 매핑
  const allStats = [creator.statSexy, creator.statElegance, creator.statCommunication, creator.statPerformance].filter(
    (v): v is number => typeof v === 'number' && !isNaN(v),
  )
  if (allStats.length > 0) {
    return Math.max(40, Math.min(100, Math.max(...allStats)))
  }

  return 40 // 신입 기본 시작 스탯 (40 ~ 100 범위)
}

/** 카드 제출 및 턴 진행 계산 */
export function submitTurnPerformance(
  session: AuditSession,
  creator: {
    id: string
    name: string
    type?: CreatorType
    statSexy?: number
    statElegance?: number
    statCommunication?: number
    statPerformance?: number
    stats?: Record<string, number>
    statValue?: number
  },
  creatorGrade: Grade,
  stageAttackMod = 1.0,
): AuditSession {
  if (session.isCompleted || session.currentTurn > session.maxTurn) {
    return session
  }

  const turn = session.currentTurn
  const demandedType = session.turnDemands[turn - 1] ?? 'elegance'
  const cType = typeForCreator(creator.id, creator.type)
  const typeMatched = cType === demandedType

  // 등급 정합성 (Power Factor)
  const cRank = GRADE_ORDER[creatorGrade] ?? 0
  const reqRank = GRADE_ORDER[session.recommendedGrade] ?? 0
  const gradeMet = cRank >= reqRank

  let powerFactor = 1.0
  if (gradeMet) {
    powerFactor = cRank > reqRank ? 1.2 : 1.0
  } else {
    const diff = reqRank - cRank
    powerFactor = diff >= 2 ? 0.4 : 0.6 // 등급 미달 시 40% ~ 60% 로 점수 반토막
  }

  // 🌟 캐릭터 개별 능력치 (40~100 정밀 스케일) 비례 반영 계수 산출 (40 스탯=0.8x ~ 100 스탯=2.0x)
  const rawStatValue = getCreatorStatValue(creator, demandedType)
  const statFactor = calcStatFactor(rawStatValue)

  // 💥 30% 확률 크리티컬 히트 시스템 (Critical Multiplier: 2.0x ~ 2.5x)
  const isCritical = Math.random() < 0.30
  const criticalMultiplier = isCritical ? Number((2.0 + Math.random() * 0.5).toFixed(2)) : 1.0

  // 기본 만족도 점수 계산 (40~100 스탯 0.8x~2.0x 정밀 비례!)
  const baseScore = 15
  const typeMultiplier = typeMatched ? 1.5 : 1.0
  let scoreGained = Math.round(
    baseScore * statFactor * typeMultiplier * powerFactor * session.judge.satisfactionMod * criticalMultiplier
  )

  // 등급 미달 시 심사관 반격 데미지 & 추가 메인 스테미나 소모
  let reboundDamage = 0
  let extraStaminaCost = 0
  if (!gradeMet) {
    reboundDamage = Math.round(session.judge.attackPower * stageAttackMod)
    extraStaminaCost = 10
    scoreGained = Math.max(2, scoreGained - reboundDamage)
  }

  const nextSatisfaction = Math.min(
    session.targetSatisfaction,
    Math.max(0, session.currentSatisfaction + scoreGained),
  )

  const totalStaminaCost = session.baseStaminaCost + extraStaminaCost
  const nextStaminaDeductions = {
    ...session.staminaDeductions,
    [creator.id]: (session.staminaDeductions[creator.id] ?? 0) + totalStaminaCost,
  }

  // 쿨다운 사용 안함 (스테미나만 소모하도록 쿨다운 제거)
  const nextCooldownMap: Record<string, number> = {}

  // 반응 미디어 판정 (high: 80%↑, mid: 30~79%, low: 0~29%)
  const ratio = session.targetSatisfaction > 0 ? nextSatisfaction / session.targetSatisfaction : 0
  let mediaReaction: 'high' | 'mid' | 'low' = 'mid'
  if (ratio >= 0.8) mediaReaction = 'high'
  else if (ratio < 0.3) mediaReaction = 'low'

  let message = `${CREATOR_TYPE_LABEL[cType].icon} ${creator.name} 퍼포먼스!`
  if (isCritical) {
    message += ` 💥 CRITICAL! ${criticalMultiplier}배 대폭발!`
  }
  if (typeMatched && gradeMet) {
    message += ` ✨ 타입 일치 1.5배 만족도 대폭 상승! (+${scoreGained}점)`
  } else if (typeMatched && !gradeMet) {
    message += ` ⚠️ 타입은 맞지만 등급 미달로 점수 감점! (+${scoreGained}점, 심사관 반격 -${reboundDamage}점)`
  } else if (!typeMatched && gradeMet) {
    message += ` 💬 일반 반응 (+${scoreGained}점)`
  } else {
    message += ` ⚡ 미달 및 불일치 감점 (+${scoreGained}점)`
  }

  const turnResult: TurnActionResult = {
    turn,
    creatorId: creator.id,
    creatorName: creator.name,
    creatorType: cType,
    demandedType,
    typeMatched,
    creatorGrade,
    recommendedGrade: session.recommendedGrade,
    gradeMet,
    scoreGained,
    reboundDamage,
    extraStaminaCost,
    totalStaminaDeducted: totalStaminaCost,
    mediaReaction,
    isCritical,
    criticalMultiplier,
    message,
  }

  const isSuccess = nextSatisfaction >= session.targetSatisfaction
  const isCompleted = isSuccess || turn >= session.maxTurn

  return {
    ...session,
    currentTurn: turn + 1,
    currentSatisfaction: nextSatisfaction,
    cooldownMap: nextCooldownMap,
    staminaDeductions: nextStaminaDeductions,
    history: [...session.history, turnResult],
    isCompleted,
    isSuccess,
  }
}
