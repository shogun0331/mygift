import type { Grade, OwnedCreator } from './characters'
import { rollInt } from './stats'
import { pickVipTarget, toVipOffer, type VipOffer } from './vip'

export type DateArcStep = 0 | 1 | 2 | 3
export type DateStepKey = 'date1' | 'date2' | 'h'

export type SocialSpawnSpec = {
  minWait: number
  maxWait: number
  chance: number
}

/** 데이트 1→2차. 대기 후 확률 실패 시 다시 min~max 대기 */
export const DATE_SPAWN: SocialSpawnSpec = { minWait: 2, maxWait: 5, chance: 0.5 }
/** H 완료 캐릭터만. 선물/돈 요구 */
export const GIFT_SPAWN: SocialSpawnSpec = { minWait: 2, maxWait: 4, chance: 0.4 }
/** 인기 30↑ */
export const VIP_SPAWN: SocialSpawnSpec = { minWait: 3, maxWait: 6, chance: 0.5 }
/** 데이트 1·2차 완료 후 H(첫 회) 및 이후 H 재요청 */
export const H_SPAWN: SocialSpawnSpec = { minWait: 3, maxWait: 6, chance: 0.5 }

export const DATE_SP_BY_STEP: Record<DateStepKey, Record<Grade, number>> = {
  date1: { C: 1, B: 2, A: 3, S: 5 },
  date2: { C: 1, B: 2, A: 3, S: 5 },
  h: { C: 2, B: 3, A: 5, S: 8 },
}

export const GIFT_SPEC_BY_GRADE: Record<Grade, { costMin: number; costMax: number; sp: number }> = {
  C: { costMin: 100_000, costMax: 300_000, sp: 1 },
  B: { costMin: 300_000, costMax: 800_000, sp: 2 },
  A: { costMin: 800_000, costMax: 2_000_000, sp: 3 },
  S: { costMin: 2_000_000, costMax: 5_000_000, sp: 5 },
}

export const H_RETRY_BY_GRADE: Record<Grade, { staminaLoss: number; sp: number }> = {
  C: { staminaLoss: 10, sp: 1 },
  B: { staminaLoss: 15, sp: 2 },
  A: { staminaLoss: 20, sp: 3 },
  S: { staminaLoss: 30, sp: 5 },
}

export const GIFT_ACCEPT_VITALS = { min: 10, max: 20 } as const

export const REJECT_CONDITION_BY_GRADE: Record<Grade, { min: number; max: number }> = {
  C: { min: 5, max: 6 },
  B: { min: 6, max: 7 },
  A: { min: 7, max: 9 },
  S: { min: 8, max: 10 },
}

export type DatePending = {
  kind: 'date'
  creatorId: string
  creatorName: string
  grade: Grade
  profileImageUrl?: string | null
  step: DateStepKey
  spGain: number
}

export type GiftPending = {
  kind: 'gift'
  creatorId: string
  creatorName: string
  grade: Grade
  profileImageUrl?: string | null
  assetCost: number
  spGain: number
}

export type HRetryPending = {
  kind: 'hRetry'
  creatorId: string
  creatorName: string
  grade: Grade
  profileImageUrl?: string | null
}

export type SocialPending =
  | DatePending
  | GiftPending
  | HRetryPending
  | { kind: 'vip'; offer: VipOffer }

export function normalizeDateArcStep(raw: unknown): DateArcStep {
  const n = Math.round(Number(raw ?? 0) || 0)
  if (n <= 0) return 0
  if (n === 1) return 1
  if (n === 2) return 2
  return 3
}

export function nextDateStep(arc: DateArcStep): DateStepKey | null {
  if (arc <= 0) return 'date1'
  if (arc === 1) return 'date2'
  if (arc === 2) return 'h'
  return null
}

export function dateArcAfter(step: DateStepKey): DateArcStep {
  if (step === 'date1') return 1
  if (step === 'date2') return 2
  return 3
}

function notExcluded(creator: OwnedCreator, exclude: Set<string>) {
  return !exclude.has(creator.id)
}

function pickOne<T>(list: T[]): T | null {
  if (list.length === 0) return null
  return list[Math.floor(Math.random() * list.length)] ?? null
}

/** 데이트 1·2차 대상 (H 이전) */
export function pickDateTarget(
  creators: OwnedCreator[],
  exclude: Set<string> = new Set(),
): OwnedCreator | null {
  return pickOne(
    creators.filter(
      (creator) => notExcluded(creator, exclude) && normalizeDateArcStep(creator.dateArcStep) < 2,
    ),
  )
}

/** 데이트 완료 후 첫 H 대상 */
export function pickHUnlockTarget(
  creators: OwnedCreator[],
  exclude: Set<string> = new Set(),
): OwnedCreator | null {
  return pickOne(
    creators.filter(
      (creator) => notExcluded(creator, exclude) && normalizeDateArcStep(creator.dateArcStep) === 2,
    ),
  )
}

export function pickHCompletedTarget(
  creators: OwnedCreator[],
  exclude: Set<string> = new Set(),
): OwnedCreator | null {
  return pickOne(
    creators.filter(
      (creator) => notExcluded(creator, exclude) && normalizeDateArcStep(creator.dateArcStep) >= 3,
    ),
  )
}

function faceOf(creator: OwnedCreator) {
  return {
    creatorId: creator.id,
    creatorName: creator.name,
    grade: creator.grade,
    profileImageUrl: creator.profileImageUrl || null,
  }
}

export function buildDatePending(creator: OwnedCreator): DatePending | null {
  const step = nextDateStep(normalizeDateArcStep(creator.dateArcStep))
  if (!step) return null
  return {
    kind: 'date',
    ...faceOf(creator),
    step,
    spGain: DATE_SP_BY_STEP[step][creator.grade],
  }
}

export function buildGiftPending(creator: OwnedCreator): GiftPending {
  const spec = GIFT_SPEC_BY_GRADE[creator.grade]
  return {
    kind: 'gift',
    ...faceOf(creator),
    assetCost: rollInt(spec.costMin, spec.costMax),
    spGain: spec.sp,
  }
}

export function buildHRetryPending(creator: OwnedCreator): HRetryPending {
  return {
    kind: 'hRetry',
    ...faceOf(creator),
  }
}

export function rollGiftAcceptVitals(): { condition: number; stamina: number } {
  return {
    condition: rollInt(GIFT_ACCEPT_VITALS.min, GIFT_ACCEPT_VITALS.max),
    stamina: rollInt(GIFT_ACCEPT_VITALS.min, GIFT_ACCEPT_VITALS.max),
  }
}

export function rollRejectConditionLoss(grade: Grade): number {
  const spec = REJECT_CONDITION_BY_GRADE[grade]
  return rollInt(spec.min, spec.max)
}

export function rollChance(chance: number): boolean {
  return Math.random() < chance
}

type SpawnChannel = {
  /** 다음 확률 판정까지 남은 턴. ready면 의미 없음 */
  wait: number
  /** 확률 당첨 후 아직 등장하지 않음 — 다른 이벤트에 밀리면 이월 */
  ready: boolean
}

/** 이벤트별 독립 랜덤 주기. 한 턴에 후보 중 1개만 등장 */
export type SocialSpawnState = {
  date: SpawnChannel
  gift: SpawnChannel
  vip: SpawnChannel
  h: SpawnChannel
}

function rollWait(spec: SocialSpawnSpec): number {
  return rollInt(spec.minWait, spec.maxWait)
}

function freshChannel(spec: SocialSpawnSpec): SpawnChannel {
  return { wait: rollWait(spec), ready: false }
}

export function createSocialSpawnState(): SocialSpawnState {
  return {
    date: freshChannel(DATE_SPAWN),
    gift: freshChannel(GIFT_SPAWN),
    vip: freshChannel(VIP_SPAWN),
    h: freshChannel(H_SPAWN),
  }
}

function tickChannel(channel: SpawnChannel, spec: SocialSpawnSpec): SpawnChannel {
  if (channel.ready) return channel
  const wait = channel.wait - 1
  if (wait > 0) return { wait, ready: false }
  if (rollChance(spec.chance)) return { wait: 0, ready: true }
  return { wait: rollWait(spec), ready: false }
}

function consumeChannel(spec: SocialSpawnSpec): SpawnChannel {
  return { wait: rollWait(spec), ready: false }
}

function buildHPending(roster: OwnedCreator[]): SocialPending | null {
  const unlock = pickHUnlockTarget(roster)
  if (unlock) return buildDatePending(unlock)
  const retry = pickHCompletedTarget(roster)
  return retry ? buildHRetryPending(retry) : null
}

function channelOf(event: SocialPending): keyof SocialSpawnState {
  if (event.kind === 'vip') return 'vip'
  if (event.kind === 'gift') return 'gift'
  if (event.kind === 'hRetry' || (event.kind === 'date' && event.step === 'h')) return 'h'
  return 'date'
}

const SPAWN_SPEC: Record<keyof SocialSpawnState, SocialSpawnSpec> = {
  date: DATE_SPAWN,
  gift: GIFT_SPAWN,
  vip: VIP_SPAWN,
  h: H_SPAWN,
}

/**
 * 월 종료 시 호출.
 * blocked(등급평가·클리어 등)이면 이벤트 없음. 당첨된 ready는 다음 달로 이월.
 * 한 턴에는 후보 중 무작위로 1개만 반환. 선택된 채널만 새 랜덤 대기로 리셋.
 */
export function advanceAndPickSocialEvent(
  state: SocialSpawnState,
  roster: OwnedCreator[],
  blocked: boolean,
): { state: SocialSpawnState; event: SocialPending | null } {
  const next: SocialSpawnState = {
    date: tickChannel(state.date, DATE_SPAWN),
    gift: tickChannel(state.gift, GIFT_SPAWN),
    vip: tickChannel(state.vip, VIP_SPAWN),
    h: tickChannel(state.h, H_SPAWN),
  }

  if (blocked) {
    return { state: next, event: null }
  }

  const candidates: SocialPending[] = []
  if (next.date.ready) {
    const target = pickDateTarget(roster)
    const pending = target ? buildDatePending(target) : null
    if (pending) candidates.push(pending)
  }
  if (next.vip.ready) {
    const vipTarget = pickVipTarget(roster)
    if (vipTarget) candidates.push({ kind: 'vip', offer: toVipOffer(vipTarget) })
  }
  if (next.gift.ready) {
    const giftTarget = pickHCompletedTarget(roster)
    if (giftTarget) candidates.push(buildGiftPending(giftTarget))
  }
  if (next.h.ready) {
    const hPending = buildHPending(roster)
    if (hPending) candidates.push(hPending)
  }

  const event = pickOne(candidates)
  if (!event) return { state: next, event: null }

  const key = channelOf(event)
  return {
    state: { ...next, [key]: consumeChannel(SPAWN_SPEC[key]) },
    event,
  }
}
