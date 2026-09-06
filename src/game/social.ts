import type { Grade, OwnedCreator } from './characters'
import { characterDisplayName } from './characterLocales'
import { getCurrentLocale } from '../locales/i18n'
import { rollInt } from './stats'
import { pickVipTarget, toVipOffer, type VipOffer } from './vip'

export type DateArcStep = 0 | 1 | 2 | 3
export type DateStepKey = 'date1' | 'date2' | 'h'

export type SocialSpawnSpec = {
  minWait: number
  maxWait: number
  chance: number
}

/** 데이트 1→2차 대기 턴수 (2달 고정, 등장 확률 85%) */
export const DATE_SPAWN: SocialSpawnSpec = { minWait: 2, maxWait: 2, chance: 0.85 }
/** 보유 크리에이터 대상 VIP 제안 (2달 고정, 등장 확률 75%) */
export const VIP_SPAWN: SocialSpawnSpec = { minWait: 2, maxWait: 2, chance: 0.75 }
/** 데이트 1·2차 완료 후 H 및 이후 H 재요청 (2달 고정, 등장 확률 80%) */
export const H_SPAWN: SocialSpawnSpec = { minWait: 2, maxWait: 2, chance: 0.80 }

export const DATE_SP_BY_STEP: Record<DateStepKey, Record<Grade, number>> = {
  date1: { C: 1, B: 2, A: 3, S: 5 },
  date2: { C: 1, B: 2, A: 3, S: 5 },
  h: { C: 2, B: 3, A: 5, S: 8 },
}

export const H_RETRY_BY_GRADE: Record<Grade, { staminaLoss: number; sp: number }> = {
  C: { staminaLoss: 10, sp: 1 },
  B: { staminaLoss: 15, sp: 2 },
  A: { staminaLoss: 20, sp: 3 },
  S: { staminaLoss: 30, sp: 5 },
}

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

export type HRetryPending = {
  kind: 'hRetry'
  creatorId: string
  creatorName: string
  grade: Grade
  profileImageUrl?: string | null
}

export type SocialPending =
  | DatePending
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
    creatorName: characterDisplayName(creator, getCurrentLocale()),
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

export function buildHRetryPending(creator: OwnedCreator): HRetryPending {
  return {
    kind: 'hRetry',
    ...faceOf(creator),
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
  vip: SpawnChannel
  h: SpawnChannel
}

export function createSocialSpawnState(): SocialSpawnState {
  return {
    date: { wait: 2, ready: false },
    vip: { wait: 2, ready: false },
    h: { wait: 2, ready: false },
  }
}

function consumeChannel(): SpawnChannel {
  return { wait: 2, ready: false }
}

/**
 * 월 종료 시 호출.
 * 정확히 2달(2턴) 마다 한 번씩만 소셜 이벤트(데이트/H/VIP)가 발동하도록 보장합니다.
 */
import type { StationGrade } from './stationGradeConfig'

export function advanceAndPickSocialEvent(
  state: SocialSpawnState,
  roster: OwnedCreator[],
  blocked: boolean,
  stationGrade?: StationGrade,
): { state: SocialSpawnState; event: SocialPending | null } {
  const currentWait = state.date?.wait ?? 2
  const nextWait = currentWait - 1

  const nextState: SocialSpawnState = {
    date: { wait: nextWait, ready: nextWait <= 0 },
    vip: { wait: nextWait, ready: nextWait <= 0 },
    h: { wait: nextWait, ready: nextWait <= 0 },
  }

  // 아직 2달(2턴)이 되지 않았거나 블락된 경우 이벤트 없음
  if (nextWait > 0 || blocked) {
    return { state: nextState, event: null }
  }

  // 1. 메인 이벤트 대상 검색: 데이트 1·2차(dateArcStep < 2) 및 첫 H 이벤트(dateArcStep === 2)
  const mainDateTarget = pickDateTarget(roster)
  const mainHUnlockTarget = pickHUnlockTarget(roster)

  let event: SocialPending | null = null

  // 1) 메인 이벤트가 남아있는 경우 -> 메인 이벤트 진행 (높은 확률 약 85%)
  if (mainDateTarget || mainHUnlockTarget) {
    if (rollChance(DATE_SPAWN.chance)) {
      if (mainDateTarget && mainHUnlockTarget) {
        event = Math.random() < 0.5 ? buildDatePending(mainDateTarget) : buildDatePending(mainHUnlockTarget)
      } else if (mainDateTarget) {
        event = buildDatePending(mainDateTarget)
      } else if (mainHUnlockTarget) {
        event = buildDatePending(mainHUnlockTarget)
      }
    }
  } else {
    // 2) 메인 이벤트가 없을 경우 -> VIP 이벤트 및 H 재이벤트(H 완료된 크리에이터 대상) 중 높은 확률(약 80%)로 등장
    const isVipAllowed = !stationGrade || (stationGrade !== 'black' && stationGrade !== 'tiny')
    const vipTarget = isVipAllowed ? pickVipTarget(roster) : null
    const hRetryTarget = pickHCompletedTarget(roster) // dateArcStep >= 3 (메인 H이벤트가 지난 크리에이터만)

    const candidatePool: SocialPending[] = []
    if (vipTarget) {
      candidatePool.push({ kind: 'vip', offer: toVipOffer(vipTarget) })
    }
    if (hRetryTarget) {
      candidatePool.push(buildHRetryPending(hRetryTarget))
    }

    if (candidatePool.length > 0) {
      // 높은 확률로 등장 (무조건 100%는 아님, 약 80%)
      if (rollChance(0.80)) {
        event = candidatePool[Math.floor(Math.random() * candidatePool.length)]
      }
    }
  }

  // 소셜 이벤트가 발행된 경우 쿨다운을 2달(2턴)로 리셋
  if (event) {
    const resetChannel = consumeChannel()
    return {
      state: {
        date: resetChannel,
        vip: resetChannel,
        h: resetChannel,
      },
      event,
    }
  }

  // 이번 턴에 확률로 미발동되었거나 대상이 없어 발행하지 못한 경우, 다음 턴에도 즉시 판정 시도할 수 있도록 wait: 0 유지
  return {
    state: {
      date: { wait: 0, ready: true },
      vip: { wait: 0, ready: true },
      h: { wait: 0, ready: true },
    },
    event: null,
  }
}
