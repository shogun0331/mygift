/**
 * 팬미팅·승급심사 카드전 전투 상수/수식.
 * 턴제 심사(pressureDamageOf)와는 분리되어 있다.
 */

export const FAN_MEETING_COMBAT = {
  /** 철벽 비례 감쇠 상수: wallFactor = K / (ironWall + K) */
  ironWallK: 100,
  /** 일반 타격 퍼포먼스 배율 하한·상한 */
  rollMin: 0.9,
  rollMax: 1.0,
  crit: {
    mismatchChance: 0.1,
    mismatchMultiplier: 1.3,
    matchChance: 0.15,
    matchMultiplier: 1.5,
  },
  /** 만족(클리어) 타격 시 압박 피해 배율 */
  satisfiedDamageFactor: 0.5,
  /** 압박 최소보장: max(baseFloor - mental * mentalFloorScale, minFloor) */
  pressureFloorBase: 0.35,
  pressureFloorMin: 0.1,
  mentalFloorScale: 0.003,
  /** 멘탈 방어 비율 (mentalDefenseOf 과 동일) */
  mentalDefenseRate: 0.35,
} as const

function clampStat(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

/** 철벽 적용 배율. ignoreWall 이면 1 */
export function ironWallFactor(ironWall: number, ignoreWall = false): number {
  if (ignoreWall) return 1
  const wall = Math.max(0, Math.round(Number(ironWall) || 0))
  const k = FAN_MEETING_COMBAT.ironWallK
  return k / (wall + k)
}

export function mentalDefenseOf(mental: number): number {
  return Math.round(clampStat(mental) * FAN_MEETING_COMBAT.mentalDefenseRate)
}

/** 멘탈에 따라 줄어드는 압박 최소보장 비율 */
export function pressureFloorRate(mental: number): number {
  const m = clampStat(mental)
  return Math.max(
    FAN_MEETING_COMBAT.pressureFloorMin,
    FAN_MEETING_COMBAT.pressureFloorBase - m * FAN_MEETING_COMBAT.mentalFloorScale,
  )
}

/**
 * 카드전 압박 피해.
 * max(round(P × floorRate), P − mentalDefense)
 */
export function fanPressureDamage(pressure: number, mental: number): number {
  const press = Math.max(0, Math.round(Number(pressure) || 0))
  if (press <= 0) return 0
  const kept = Math.max(1, Math.round(press * pressureFloorRate(mental)))
  return Math.max(kept, press - mentalDefenseOf(mental))
}

export function applySatisfiedDamageFactor(rawDamage: number, satisfied: boolean): number {
  if (!satisfied) return Math.max(0, Math.round(rawDamage))
  return Math.max(0, Math.round(rawDamage * FAN_MEETING_COMBAT.satisfiedDamageFactor))
}

export type CardStrikeResult = {
  scoreGained: number
  isCritical: boolean
  criticalMultiplier: number
}

/**
 * 카드전·턴제 공용 타격 롤.
 * - 일반: perf × (0.9~1.0) × wallFactor
 * - 크리티컬: 타입 일치 시 15%/×1.5, 불일치 시 10%/×1.3, 철벽 무시
 */
export function rollCardStrike(
  performance: number,
  ironWall: number,
  typeMatched = false,
): CardStrikeResult {
  const perf = clampStat(performance)
  const crit = FAN_MEETING_COMBAT.crit
  const chance = typeMatched ? crit.matchChance : crit.mismatchChance
  if (Math.random() < chance) {
    const multiplier = typeMatched ? crit.matchMultiplier : crit.mismatchMultiplier
    return {
      scoreGained: Math.max(0, Math.round(perf * multiplier)),
      isCritical: true,
      criticalMultiplier: multiplier,
    }
  }
  const { rollMin, rollMax } = FAN_MEETING_COMBAT
  const roll = rollMin + Math.random() * (rollMax - rollMin)
  const factor = ironWallFactor(ironWall, typeMatched)
  return {
    scoreGained: Math.max(0, Math.round(perf * roll * factor)),
    isCritical: false,
    criticalMultiplier: 1,
  }
}

export type StrikePreview = {
  scoreMin: number
  scoreMax: number
  /** 크리 미포함 일반 타격 기준 */
  damage: number
  /** 이번 타로 만족 가능한 최소 점수면 true → 피해는 절반 힌트 */
  likelySatisfy: boolean
}

/** UI용 예상 만족도 구간·압박 피해 (크리티컬 제외) */
export function previewCardPlay(input: {
  performance: number
  mental: number
  ironWall: number
  pressure: number
  typeMatched: boolean
  satisfaction: number
  target: number
}): StrikePreview {
  const perf = clampStat(input.performance)
  const factor = ironWallFactor(input.ironWall, input.typeMatched)
  const scoreMin = Math.max(0, Math.round(perf * FAN_MEETING_COMBAT.rollMin * factor))
  const scoreMax = Math.max(0, Math.round(perf * FAN_MEETING_COMBAT.rollMax * factor))
  const remaining = Math.max(0, input.target - input.satisfaction)
  const likelySatisfy = remaining > 0 && scoreMin >= remaining
  const raw = fanPressureDamage(input.pressure, input.mental)
  const damage = applySatisfiedDamageFactor(raw, likelySatisfy)
  return { scoreMin, scoreMax, damage, likelySatisfy }
}

/** 티어별 기대 타수 스냅샷 검증용 고정 시나리오 */
export function expectedHitsToClear(input: {
  target: number
  performance: number
  ironWall: number
  typeMatched: boolean
}): number {
  const preview = previewCardPlay({
    performance: input.performance,
    mental: 50,
    ironWall: input.ironWall,
    pressure: 40,
    typeMatched: input.typeMatched,
    satisfaction: 0,
    target: input.target,
  })
  const avg = (preview.scoreMin + preview.scoreMax) / 2
  if (avg <= 0) return Number.POSITIVE_INFINITY
  return Math.ceil(input.target / avg)
}
