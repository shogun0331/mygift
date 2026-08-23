import type { StudioSlot } from './studioSlots'
import { rollInt } from './stats'

/** 슬롯 장비 상태 — 크리에이터가 아니라 방송 칸에 붙는다 */
export type SlotGear = {
  /** 내구도 0–100. 방송한 주마다 소모. 수리해도 회복하지 않음 */
  durability: number
  /** 신뢰도 0–100. 고장 확률을 깎음 */
  reliability: number
  /** 고장 플래그. 방송이 끝나도 유지. 클릭 수리 시에만 false */
  broken: boolean
}

export const SLOT_GEAR_DURABILITY_START = 80
export const SLOT_GEAR_RELIABILITY_START = 40
export const SLOT_GEAR_WEAR_MIN = 2
export const SLOT_GEAR_WEAR_MAX = 4

const FAIL_BASE = 0.04
const FAIL_PER_MISSING_DURABILITY = 0.0018
const FAIL_PER_RELIABILITY = 0.0005
const FAIL_MIN = 0.03
const FAIL_MAX = 0.22

function clamp01(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function clampStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function createInitialSlotGear(): SlotGear {
  return {
    durability: SLOT_GEAR_DURABILITY_START,
    reliability: SLOT_GEAR_RELIABILITY_START,
    broken: false,
  }
}

export function createSlotGearMapFromSlots(slots: StudioSlot[]): Record<string, SlotGear> {
  const map: Record<string, SlotGear> = {}
  for (const slot of slots) {
    if (slot.status === 'locked') continue
    map[slot.id] = createInitialSlotGear()
  }
  return map
}

/** 해금된 칸에 엔트리가 없으면 초기값으로 채운다 */
export function ensureUnlockedSlotGear(
  gearById: Record<string, SlotGear>,
  slots: StudioSlot[],
): Record<string, SlotGear> {
  let changed = false
  const next = { ...gearById }
  for (const slot of slots) {
    if (slot.status === 'locked') continue
    if (!next[slot.id]) {
      next[slot.id] = createInitialSlotGear()
      changed = true
    }
  }
  return changed ? next : gearById
}

export function findSlotIdForCreator(slots: StudioSlot[], creatorId: string): string | null {
  const slot = slots.find(
    (row) => row.status === 'assigned' && row.assignment?.creatorId === creatorId,
  )
  return slot?.id ?? null
}

export function isCreatorSlotBroken(
  slots: StudioSlot[],
  gearById: Record<string, SlotGear>,
  creatorId: string,
): boolean {
  const slotId = findSlotIdForCreator(slots, creatorId)
  if (!slotId) return false
  return Boolean(gearById[slotId]?.broken)
}

/**
 * 방송 중인 칸, 주 1회 고장 확률
 * clamp(4% + (100-durability)*0.18% - reliability*0.05%, 3%, 22%)
 */
export function gearFailChance(gear: SlotGear, failMul = 1): number {
  const mul = Math.max(0, failMul)
  if (mul <= 0) return 0
  const raw =
    (FAIL_BASE +
      (100 - gear.durability) * FAIL_PER_MISSING_DURABILITY -
      gear.reliability * FAIL_PER_RELIABILITY) *
    mul
  return clamp01(raw, FAIL_MIN, FAIL_MAX)
}

export function wearSlotGear(gear: SlotGear): SlotGear {
  const loss = rollInt(SLOT_GEAR_WEAR_MIN, SLOT_GEAR_WEAR_MAX)
  return { ...gear, durability: clampStat(gear.durability - loss) }
}

export function repairSlotGear(gear: SlotGear): SlotGear {
  if (!gear.broken) return gear
  return { ...gear, broken: false }
}

export function tryBreakSlotGear(gear: SlotGear, failMul = 1): SlotGear {
  if (gear.broken) return gear
  if (Math.random() < gearFailChance(gear, failMul)) {
    return { ...gear, broken: true }
  }
  return gear
}

export function applyWeeklySlotGear(
  gearById: Record<string, SlotGear>,
  slots: StudioSlot[],
  broadcastedCreatorIds: ReadonlySet<string>,
  opts: {
    skipFailCreatorIds?: ReadonlySet<string>
    /** 슬롯별 고장 배율. 수리 스태프 장착 시 0 */
    failMulBySlotId?: Record<string, number>
  } = {},
): Record<string, SlotGear> {
  const next = { ...gearById }
  const skipFailIds = opts.skipFailCreatorIds ?? new Set<string>()
  const failMulBySlotId = opts.failMulBySlotId ?? {}

  for (const slot of slots) {
    if (slot.status !== 'assigned' || !slot.assignment) continue
    if (!broadcastedCreatorIds.has(slot.assignment.creatorId)) continue

    const current = next[slot.id] ?? createInitialSlotGear()
    let updated = current
    const failMul = failMulBySlotId[slot.id] ?? 1
    const skipFail =
      skipFailIds.has(slot.assignment.creatorId) || updated.broken || failMul <= 0

    if (!skipFail) {
      updated = tryBreakSlotGear(updated, failMul)
    }

    updated = wearSlotGear(updated)
    next[slot.id] = updated
  }

  return next
}
