import type { OwnedCreator } from './characters'
import {
  buildDatePending,
  nextDateStep,
  normalizeDateArcStep,
  type DatePending,
  type DateStepKey,
} from './social'

export const AFFECTION_MAX = 100
export const AFFECTION_BROADCAST = 2
export const AFFECTION_TRAINING = 1
export const AFFECTION_VACATION = 8
export const AFFECTION_H = 10
/** 일반 SNS 게시. 파격 화보는 rollSnsAffection */
export const AFFECTION_SNS = 2

export const AFFECTION_THRESHOLDS: Record<DateStepKey, number> = {
  date1: 20,
  date2: 40,
  h: 80,
}

export type AffectionGain = {
  creatorId: string
  name: string
  portraitUrl: string | null
  before: number
  after: number
  amount: number
}

export function clampAffection(value: unknown): number {
  const n = Math.round(Number(value) || 0)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(AFFECTION_MAX, n))
}

/** 파격 화보 게시 호감도. 5~10 */
export function rollSnsAffection(): number {
  return 5 + Math.floor(Math.random() * 6)
}

export function applyAffection(
  creator: OwnedCreator,
  amount: number,
): { creator: OwnedCreator; gained: number } {
  const before = clampAffection(creator.affection)
  const add = Math.max(0, Math.round(amount))
  const after = Math.min(AFFECTION_MAX, before + add)
  return { creator: { ...creator, affection: after }, gained: after - before }
}

export function affectionGainOf(
  creator: OwnedCreator,
  before: number,
  after: number,
  name: string,
): AffectionGain {
  return {
    creatorId: creator.id,
    name,
    portraitUrl: creator.profileImageUrl || null,
    before,
    after,
    amount: after - before,
  }
}

export function isWaitingForAffectionScene(creator: OwnedCreator): boolean {
  const step = nextDateStep(normalizeDateArcStep(creator.dateArcStep))
  if (!step) return false
  return clampAffection(creator.affection) >= AFFECTION_THRESHOLDS[step]
}

/** 먼저 줄을 선 사람은 유지하고, 새로 넘긴 사람만 뒤에 붙인다. */
export function enqueueAffectionCreator(queue: string[], creator: OwnedCreator): string[] {
  if (!isWaitingForAffectionScene(creator)) return queue
  if (queue.includes(creator.id)) return queue
  return [...queue, creator.id]
}

/** 같은 순간에 여러 명이 넘으면 호감도가 높은 순, 같으면 슬롯 순으로 뒤에 붙인다. */
export function enqueueAffectionCreators(
  queue: string[],
  rows: Array<{ creator: OwnedCreator; slotIndex: number }>,
): string[] {
  const present = new Set(queue)
  const fresh = rows
    .filter((row) => isWaitingForAffectionScene(row.creator) && !present.has(row.creator.id))
    .sort((a, b) => {
      const byAffection = clampAffection(b.creator.affection) - clampAffection(a.creator.affection)
      if (byAffection !== 0) return byAffection
      return a.slotIndex - b.slotIndex
    })
  return [...queue, ...fresh.map((row) => row.creator.id)]
}

/** 씬을 본 뒤 다음 경계도 이미 넘었으면 줄의 맨 뒤로 보낸다. */
export function requeueAffectionAfterScene(queue: string[], creator: OwnedCreator): string[] {
  const without = queue.filter((id) => id !== creator.id)
  if (!isWaitingForAffectionScene(creator)) return without
  return [...without, creator.id]
}

/**
 * 지금 호감도가 오른 사람 중 대기열에 있는 한 명만 꺼낸다.
 * 앞에 대기 중인 다른 사람은 그대로 두고, 턴 종료 때 따로 부른다.
 */
export function takeGainedAffectionScene(
  queue: string[],
  roster: OwnedCreator[],
  gainedIds: ReadonlySet<string>,
): { queue: string[]; pending: DatePending | null } {
  const index = queue.findIndex((id) => {
    if (!gainedIds.has(id)) return false
    const creator = roster.find((row) => row.id === id)
    return Boolean(creator && isWaitingForAffectionScene(creator))
  })
  if (index < 0) return { queue, pending: null }
  const id = queue[index]!
  const creator = roster.find((row) => row.id === id)
  const pending = creator ? buildDatePending(creator) : null
  const nextQueue = queue.filter((row) => row !== id)
  if (!pending) return { queue: nextQueue, pending: null }
  return { queue: nextQueue, pending }
}

/** 이번 턴 VN은 대기열의 맨 앞 한 명만. 조건을 잃은 사람은 건너뛴다. */
export function takeNextAffectionScene(
  queue: string[],
  roster: OwnedCreator[],
): { queue: string[]; pending: DatePending | null } {
  const rest = [...queue]
  while (rest.length > 0) {
    const id = rest.shift()!
    const creator = roster.find((row) => row.id === id)
    if (!creator || !isWaitingForAffectionScene(creator)) continue
    const pending = buildDatePending(creator)
    if (!pending) continue
    return { queue: rest, pending }
  }
  return { queue: [], pending: null }
}
