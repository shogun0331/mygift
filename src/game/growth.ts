import type { Grade, OwnedCreator } from './characters'
import { GRADE_CAPS, rollInt } from './stats'

/** 다음 등급 승급에 필요한 인기·스킬 하한 */
export const GRADE_PROMOTE_THRESHOLD: Record<Exclude<Grade, 'C'>, number> = {
  B: 40,
  A: 60,
  S: 80,
}

const GRADE_ORDER: Grade[] = ['C', 'B', 'A', 'S']

export function nextGradeThreshold(current: Grade): { grade: Grade; need: number } | null {
  const idx = GRADE_ORDER.indexOf(current)
  if (idx < 0 || idx >= GRADE_ORDER.length - 1) return null
  const grade = GRADE_ORDER[idx + 1]!
  if (grade === 'C') return null
  return { grade, need: GRADE_PROMOTE_THRESHOLD[grade] }
}

export function resolveGradeFromStats(popularity: number, skill: number): Grade {
  if (popularity >= 80 && skill >= 80) return 'S'
  if (popularity >= 60 && skill >= 60) return 'A'
  if (popularity >= 40 && skill >= 40) return 'B'
  return 'C'
}

export type BroadcastGrowthResult = {
  creator: OwnedCreator
  popularityGain: number
  skillGain: number
  previousGrade: Grade
  /** 연쇄 승급 포함 최종 등급이 이전과 다르면 설정 */
  promotedTo: Grade | null
}

function promoteStep(grade: Grade, popularity: number, skill: number): Grade {
  const next = nextGradeThreshold(grade)
  if (!next) return grade
  if (popularity >= next.need && skill >= next.need) return next.grade
  return grade
}

/** 인기·스킬이 허용하는 한 여러 단계 승급 */
export function applyPromotions(
  grade: Grade,
  popularity: number,
  skill: number,
): Grade {
  let current = grade
  for (let i = 0; i < 3; i++) {
    const stepped = promoteStep(current, popularity, skill)
    if (stepped === current) break
    current = stepped
  }
  return current
}

/**
 * 월간 방송 완료 시(해당 월에 1회 이상 방송한 크리에이터) 인기·스킬 성장 및 등급 승급 판정
 */
export function applyBroadcastGrowth(creator: OwnedCreator): BroadcastGrowthResult {
  const popularityGain = rollInt(1, 3)
  const skillGain = rollInt(1, 2)
  const popularity = Math.min(100, Math.round(creator.popularity) + popularityGain)
  const skill = Math.min(100, Math.round(creator.skill ?? 0) + skillGain)
  const previousGrade = creator.grade
  const grade = applyPromotions(previousGrade, popularity, skill)
  const promotedTo = grade !== previousGrade ? grade : null
  const revenueMult = GRADE_CAPS[grade].revenueMult

  return {
    creator: {
      ...creator,
      popularity,
      skill,
      grade,
      revenueMult,
    },
    popularityGain,
    skillGain,
    previousGrade,
    promotedTo,
  }
}
