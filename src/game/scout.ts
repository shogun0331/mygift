import type { OwnedCreator, RegisteredCharacter } from './characters'
import { conditionFromScore, rollStartingConditionScore } from './condition'
import { rollNegotiatedSalary } from './salary'
import {
  clampStats,
  rollGrade,
  rollStatsForGrade,
  type CharacterStats,
} from './stats'
import type { Grade } from './characters'

export type ScoutOffer = {
  template: RegisteredCharacter
  grade: Grade
  stats: CharacterStats
  salary: number
}

function pickRandomTemplate(
  pool: RegisteredCharacter[],
  excludeIds: Set<string>,
): RegisteredCharacter | null {
  const available = pool.filter((character) => !excludeIds.has(character.id))
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)] ?? null
}

export function createScoutOffer(
  template: RegisteredCharacter,
  grade = rollGrade(),
): ScoutOffer {
  const stats = rollStatsForGrade(grade)
  return {
    template,
    grade,
    stats,
    salary: rollNegotiatedSalary(stats, grade),
  }
}

/**
 * 미영입 + 세션 패스 제외 풀에서 템플릿을 고르고 등급·능력치·연봉을 롤한다.
 * 풀이 비면 null.
 */
export function rerollScoutOffer(
  registered: RegisteredCharacter[],
  ownedIds: Iterable<string>,
  skippedIds: Iterable<string> = [],
): ScoutOffer | null {
  const exclude = new Set<string>([...ownedIds, ...skippedIds])
  const template = pickRandomTemplate(registered, exclude)
  if (!template) return null
  return createScoutOffer(template)
}

/** 스카우트 오퍼 → 보유 크리에이터 */
export function hireScoutOffer(offer: ScoutOffer): OwnedCreator {
  const stats = clampStats(offer.stats, offer.grade)
  const { template } = offer
  const conditionScore = rollStartingConditionScore()
  return {
    ...template,
    grade: offer.grade,
    popularity: stats.popularity,
    salary: offer.salary,
    skill: stats.skill,
    heat: stats.heat,
    trust: stats.trust,
    stamina: stats.stamina,
    staminaMax: stats.staminaMax,
    revenueMult: stats.revenueMult,
    contractWeeks: 12,
    nextPayTurns: 4,
    conditionScore,
    condition: conditionFromScore(conditionScore),
    restStreak: 0,
  }
}
