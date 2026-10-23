import type { BlurRegion } from '../events/types'
import type { Grade, OwnedCreator } from './characters'
import { characterDisplayName, pickCharacterLocaleText, type CharacterLocaleText } from './characterLocales'
import { getCurrentLocale } from '../locales/i18n'
import { pressureDamageOf } from './auditEngine'
import { clampStamina } from './condition'
import { LEAGUE_SIZE } from './ranking'
import { rollInt } from './stats'
import {
  VIP_TIER_IDS,
  stationTierRank,
  type StationGrade,
  type VipTierId,
  type VipVisitConfig,
} from './stationGradeConfig'

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

/** 상세보기 VIP 만남은 캐릭터당 1회 */
export function hasUsedCreatorVip(creator: Pick<OwnedCreator, 'vipUsed'>): boolean {
  return Boolean(creator.vipUsed)
}

export function markCreatorVipUsed<T extends { vipUsed?: boolean }>(creator: T): T {
  if (creator.vipUsed) return creator
  return { ...creator, vipUsed: true }
}

export type VipVisit = {
  characterId: string
  characterName: string
  names?: CharacterLocaleText
  title: string
  imageUrl: string
  blurRegions: BlurRegion[]
  stat: number
  ironWall: number
  pressure: number
  pay: number
  rewardText: string
}

export function isVipGrade(grade: StationGrade): grade is VipTierId {
  return (VIP_TIER_IDS as readonly string[]).includes(grade)
}

function unitInRange(value: number, min: number, max: number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const span = hi - lo
  if (span <= 0) return 0
  return (Math.min(hi, Math.max(lo, value)) - lo) / span
}

/** 능력치가 구간에서 차지하는 비율을 지불액 구간에 그대로 적용한다. */
export function vipPayFromStat(
  stat: number,
  statMin: number,
  statMax: number,
  payMin: number,
  payMax: number,
): number {
  const payLo = Math.min(payMin, payMax)
  const payHi = Math.max(payMin, payMax)
  return Math.round(payLo + (payHi - payLo) * unitInRange(stat, statMin, statMax))
}

/** 능력치 비율과 철벽 비율의 평균으로 지불액을 정한다. */
export function vipVisitPay(input: {
  stat: number
  statMin: number
  statMax: number
  ironWall: number
  ironWallMin: number
  ironWallMax: number
  payMin: number
  payMax: number
}): number {
  const ratio =
    (unitInRange(input.stat, input.statMin, input.statMax) +
      unitInRange(input.ironWall, input.ironWallMin, input.ironWallMax)) /
    2
  const payLo = Math.min(input.payMin, input.payMax)
  const payHi = Math.max(input.payMin, input.payMax)
  return Math.round(payLo + (payHi - payLo) * ratio)
}

/** 수락 시 압박에서 멘탈 방어를 뺀 만큼 스테미나를 깎는다. */
export function applyVipVisitPressure<T extends { stamina: number; staminaMax: number; statMental: number }>(
  creators: T[],
  pressure: number,
): T[] {
  return creators.map((creator) => {
    const damage = pressureDamageOf(pressure, creator.statMental)
    if (damage <= 0) return creator
    return { ...creator, stamina: clampStamina(creator.stamina - damage, creator.staminaMax) }
  })
}

export function rollVipWait(): number {
  return rollInt(3, 5)
}

export function hasPlayableFan(config: VipVisitConfig | undefined): boolean {
  if (!config) return false
  return config.characters.some((character) =>
    Boolean(character.imageUrl.trim() || character.centerImageUrl?.trim() || character.satisfiedImageUrl?.trim()),
  )
}

export function rollVipVisit(config: VipVisitConfig | undefined, grade: StationGrade): VipVisit | null {
  if (!isVipGrade(grade) || !config || !hasPlayableFan(config)) return null
  const characters = config.characters.filter((character) =>
    Boolean(character.imageUrl.trim() || character.centerImageUrl?.trim() || character.satisfiedImageUrl?.trim()),
  )
  const rewards = config.tiers[grade].rewards.filter((reward) => reward.text.trim())
  const character = characters[Math.floor(Math.random() * characters.length)]!
  const reward = rewards.length > 0 ? rewards[Math.floor(Math.random() * rewards.length)]! : null
  const tier = config.tiers[grade]
  const stat = rollInt(Math.min(tier.satisfactionMin, tier.satisfactionMax), Math.max(tier.satisfactionMin, tier.satisfactionMax))
  const ironWall = rollInt(Math.min(tier.ironWallMin, tier.ironWallMax), Math.max(tier.ironWallMin, tier.ironWallMax))
  const pressure = rollInt(Math.min(tier.pressureMin, tier.pressureMax), Math.max(tier.pressureMin, tier.pressureMax))
  return {
    characterId: character.id,
    characterName: pickCharacterLocaleText(character.names, getCurrentLocale(), character.name.trim() || 'VIP'),
    names: character.names,
    title: character.title?.trim() ?? '',
    imageUrl: character.imageUrl,
    blurRegions: character.blurRegions ?? [],
    stat,
    ironWall,
    pressure,
    pay: vipVisitPay({
      stat,
      statMin: tier.satisfactionMin,
      statMax: tier.satisfactionMax,
      ironWall,
      ironWallMin: tier.ironWallMin,
      ironWallMax: tier.ironWallMax,
      payMin: tier.payMin,
      payMax: tier.payMax,
    }),
    rewardText: reward?.text.trim() ?? '',
  }
}

/** 중소 이상에서만 대기를 깎고, 0이 되면 방문을 만든다. */
export function advanceVipVisit(input: {
  grade: StationGrade
  wait: number | null
  config: VipVisitConfig | undefined
}): { wait: number | null; visit: VipVisit | null } {
  if (stationTierRank(input.grade) < stationTierRank('sme')) {
    return { wait: input.wait, visit: null }
  }
  if (input.wait == null) {
    return { wait: rollVipWait(), visit: null }
  }
  const next = input.wait - 1
  if (next > 0) return { wait: next, visit: null }
  return { wait: rollVipWait(), visit: rollVipVisit(input.config, input.grade) }
}
