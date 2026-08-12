import type { Grade, OwnedCreator } from './characters'
import { rollInt } from './stats'

/** 스폰 주기(3~6턴, 50%)는 social.ts VIP_SPAWN. 인기 30 이상인 보유 캐릭터만 */
export const VIP_SPAWN_CHANCE = 0.5
export const VIP_POPULARITY_MIN = 30

export const VIP_ACCEPT_BY_GRADE: Record<
  Grade,
  { spMin: number; spMax: number; staminaMaxLoss: number }
> = {
  C: { spMin: 1, spMax: 2, staminaMaxLoss: 10 },
  B: { spMin: 2, spMax: 4, staminaMaxLoss: 15 },
  A: { spMin: 3, spMax: 6, staminaMaxLoss: 20 },
  S: { spMin: 5, spMax: 10, staminaMaxLoss: 30 },
}

export const VIP_REJECT_VIEWERS_BY_GRADE: Record<Grade, { min: number; max: number }> = {
  C: { min: 500, max: 1_000 },
  B: { min: 1_500, max: 3_000 },
  A: { min: 4_000, max: 8_000 },
  S: { min: 10_000, max: 20_000 },
}

export type VipOffer = {
  creatorId: string
  creatorName: string
  grade: Grade
  profileImageUrl?: string | null
}

export function pickVipTarget(
  creators: OwnedCreator[],
  exclude: Set<string> = new Set(),
): OwnedCreator | null {
  const eligible = creators.filter(
    (creator) =>
      !exclude.has(creator.id) && (Number(creator.popularity) || 0) >= VIP_POPULARITY_MIN,
  )
  if (eligible.length === 0) return null
  return eligible[Math.floor(Math.random() * eligible.length)] ?? null
}

export function rollVipSpawn(): boolean {
  return Math.random() < VIP_SPAWN_CHANCE
}

export function rollVipAcceptSp(grade: Grade): number {
  const spec = VIP_ACCEPT_BY_GRADE[grade]
  return rollInt(spec.spMin, spec.spMax)
}

export function rollVipRejectViewers(grade: Grade): number {
  const spec = VIP_REJECT_VIEWERS_BY_GRADE[grade]
  return rollInt(spec.min, spec.max)
}

export function toVipOffer(creator: OwnedCreator): VipOffer {
  return {
    creatorId: creator.id,
    creatorName: creator.name,
    grade: creator.grade,
    profileImageUrl: creator.profileImageUrl || null,
  }
}
