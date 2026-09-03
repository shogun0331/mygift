import type { Grade, OwnedCreator } from './characters'
import { characterDisplayName } from './characterLocales'
import { getCurrentLocale } from '../locales/i18n'
import { clampStamina } from './condition'
import { LEAGUE_SIZE } from './ranking'
import { rollInt } from './stats'

/** 스폰 주기(3~6턴, 50%)는 social.ts VIP_SPAWN. 보유 캐릭터 중 선택 */
export const VIP_SPAWN_CHANCE = 0.5

export const VIP_REJECT_VIEWERS_BY_GRADE: Record<Grade, { min: number; max: number }> = {
  C: { min: 500, max: 1_000 },
  B: { min: 1_500, max: 3_000 },
  A: { min: 4_000, max: 8_000 },
  S: { min: 10_000, max: 20_000 },
}

/**
 * 방송국 랭킹(1=최고)에 따른 VIP 수락 보수.
 * 희귀 이벤트 + 스테미나 전량 소진 대가에 맞는 큰 금액.
 */
export function vipAcceptPayoutRange(rank: number): { min: number; max: number } {
  const r = Math.max(1, Math.min(LEAGUE_SIZE, Math.round(rank)))
  if (r <= 10) return { min: 600_000, max: 900_000 }
  if (r <= 20) return { min: 400_000, max: 600_000 }
  if (r <= 50) return { min: 250_000, max: 400_000 }
  if (r <= 100) return { min: 150_000, max: 250_000 }
  if (r <= 150) return { min: 90_000, max: 150_000 }
  return { min: 50_000, max: 90_000 }
}

export function rollVipAcceptPayout(rank: number): number {
  const { min, max } = vipAcceptPayoutRange(rank)
  return rollInt(min, max)
}

/** VIP 수락 시 해당 캐릭터 스테미나 전량 소진 */
export function applyVipStaminaDrain<T extends { stamina: number; staminaMax: number }>(
  creator: T,
): T {
  return {
    ...creator,
    stamina: clampStamina(0, creator.staminaMax),
  }
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
  const eligible = creators.filter((creator) => !exclude.has(creator.id))
  if (eligible.length === 0) return null
  return eligible[Math.floor(Math.random() * eligible.length)] ?? null
}

export function rollVipSpawn(): boolean {
  return Math.random() < VIP_SPAWN_CHANCE
}

export function rollVipRejectViewers(grade: Grade): number {
  const spec = VIP_REJECT_VIEWERS_BY_GRADE[grade]
  return rollInt(spec.min, spec.max)
}

export function toVipOffer(creator: OwnedCreator): VipOffer {
  return {
    creatorId: creator.id,
    creatorName: characterDisplayName(creator, getCurrentLocale()),
    grade: creator.grade,
    profileImageUrl: creator.profileImageUrl || null,
  }
}
