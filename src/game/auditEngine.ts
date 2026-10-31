import type { Grade } from './characters'
import {
  mentalDefenseOf as mentalDefenseFromCombat,
  rollCardStrike,
} from './fanMeetingCombat'
import {
  defaultAuditConfig,
  type AuditJudgeConfig,
  type CreatorType,
  type PromotionAuditConfig,
  type StationGrade,
  type StationGradeConfig,
} from './stationGradeConfig'

export const CREATOR_TYPE_LABEL: Record<CreatorType, { label: string; icon: string; tone: string }> = {
  mental: { label: '멘탈', icon: '💎', tone: 'text-purple-400 border-purple-500/40 bg-purple-950/60' },
  performance: { label: '퍼포먼스', icon: '🎯', tone: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/60' },
  communication: { label: '소통', icon: '💬', tone: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60' },
  sexy: { label: '섹시', icon: '🔥', tone: 'text-rose-400 border-rose-500/40 bg-rose-950/60' },
}

export function getCreatorTypeDisplayName(type: CreatorType, t?: (key: string, params?: Record<string, string | number>) => string): string {
  if (t) {
    switch (type) {
      case 'sexy': return t('creator.statSexy')
      case 'mental': return t('creator.statMental')
      case 'communication': return t('creator.statCommunication')
      case 'performance': return t('creator.statPerformance')
    }
  }
  return CREATOR_TYPE_LABEL[type]?.label || type
}

export const ALL_CREATOR_TYPES: CreatorType[] = ['mental', 'performance', 'communication', 'sexy']

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
  maxTurn?: number
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
  failReason?: 'no_cards' | 'satisfaction_failed'
}

/** 크리에이터 ID/해시 기반 타입 결정. 구 저장값 elegance 는 mental */
export function typeForCreator(creatorId: string, customType?: string): CreatorType {
  if (customType === 'elegance') return 'mental'
  if (customType && (ALL_CREATOR_TYPES as string[]).includes(customType)) {
    return customType as CreatorType
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

  const turnDemands: CreatorType[] = []
  for (let t = 0; t < 10; t += 1) {
    const randType = ALL_CREATOR_TYPES[Math.floor(Math.random() * ALL_CREATOR_TYPES.length)]!
    turnDemands.push(randType)
  }

  return {
    tier,
    judge,
    currentTurn: 1,
    turnDemands,
    currentSatisfaction: 0,
    targetSatisfaction: stage.targetSatisfaction,
    recommendedGrade: stage.recommendedGrade,
    baseStaminaCost: 0,
    cooldownMap: {},
    staminaDeductions: {},
    history: [],
    isCompleted: false,
    isSuccess: false,
  }
}

function clampStat(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

/** 멘탈 방어 = round(멘탈 × 0.35) */
export function mentalDefenseOf(mental: number): number {
  return mentalDefenseFromCombat(mental)
}

/**
 * 타격 롤 (카드전·턴제 공용).
 * 일반: perf × 0.9~1.0 × (K/(ironWall+K)). 타입 일치·크리티컬은 철벽 무시.
 * 크리: 일치 15%/×1.5, 불일치 10%/×1.3
 */
export function rollAuditStrike(
  performance: number,
  ironWall: number,
  typeMatched = false,
): {
  scoreGained: number
  isCritical: boolean
  criticalMultiplier: number
} {
  return rollCardStrike(performance, ironWall, typeMatched)
}

/** 턴제 심사·VIP 방문의 압박. 카드전(승급심사/팬미팅)은 fanPressureDamage를 쓴다. */
export function pressureDamageOf(pressure: number, mental: number): number {
  return Math.max(0, Math.round(Number(pressure) || 0) - mentalDefenseOf(mental))
}

/** 카드 제출. 요구 타입과 같으면 철벽을 무시하고 만족도가 오른다 */
export function submitTurnPerformance(
  session: AuditSession,
  creator: {
    id: string
    name: string
    type?: string
    statSexy?: number
    statMental?: number
    statElegance?: number
    statCommunication?: number
    statPerformance?: number
  },
  creatorGrade: Grade,
  _stageAttackMod = 1,
): AuditSession {
  if (session.isCompleted) {
    return session
  }

  const turn = session.currentTurn
  const performance = clampStat(creator.statPerformance)
  const mental = clampStat(creator.statMental ?? creator.statElegance)
  const nextTurnDemands = [...session.turnDemands]
  while (nextTurnDemands.length <= turn) {
    const randType = ALL_CREATOR_TYPES[Math.floor(Math.random() * ALL_CREATOR_TYPES.length)]!
    nextTurnDemands.push(randType)
  }
  const demandedType = nextTurnDemands[turn - 1] ?? 'mental'
  const cType = typeForCreator(creator.id, creator.type)
  const typeMatched = cType === demandedType
  const strike = rollAuditStrike(performance, session.judge.ironWall, typeMatched)
  const nextSatisfaction = Math.min(
    session.targetSatisfaction,
    Math.max(0, session.currentSatisfaction + strike.scoreGained),
  )
  const won = nextSatisfaction >= session.targetSatisfaction
  const damage = won ? 0 : pressureDamageOf(session.judge.pressure, mental)

  const nextStaminaDeductions = {
    ...session.staminaDeductions,
    [creator.id]: (session.staminaDeductions[creator.id] ?? 0) + damage,
  }

  const ratio = session.targetSatisfaction > 0 ? nextSatisfaction / session.targetSatisfaction : 0
  let mediaReaction: 'high' | 'mid' | 'low' = 'mid'
  if (ratio >= 0.8) mediaReaction = 'high'
  else if (ratio < 0.3) mediaReaction = 'low'

  let message = `${creator.name} 퍼포먼스!`
  if (typeMatched && strike.isCritical) {
    message += ` 타입 일치, 철벽 무시, 취향 저격! (+${strike.scoreGained})`
  } else if (typeMatched) {
    message += ` 타입 일치, 철벽 무시 (+${strike.scoreGained})`
  } else if (strike.isCritical) {
    message += ` 취향 저격! 1.5배 (+${strike.scoreGained})`
  } else {
    message += ` (+${strike.scoreGained})`
  }
  if (!won && damage > 0) {
    message += ` 압박 -${damage}`
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
    gradeMet: true,
    scoreGained: strike.scoreGained,
    reboundDamage: damage,
    extraStaminaCost: 0,
    totalStaminaDeducted: damage,
    mediaReaction,
    isCritical: strike.isCritical,
    criticalMultiplier: strike.criticalMultiplier,
    message,
  }

  return {
    ...session,
    currentTurn: turn + 1,
    turnDemands: nextTurnDemands,
    currentSatisfaction: nextSatisfaction,
    cooldownMap: {},
    staminaDeductions: nextStaminaDeductions,
    history: [...session.history, turnResult],
    isCompleted: won,
    isSuccess: won,
  }
}
