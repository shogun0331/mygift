import type { StudioSlot } from './studioSlots'

export type StaffKind = 'security' | 'repair' | 'care' | 'production'

export type SlotManagers = {
  security?: string | null
  repair?: string | null
  care?: string | null
  production?: string | null
}

export type SlotManagerState = {
  hiredStaffIds: string[]
  equippedBySlotId: Record<string, SlotManagers>
}

export const STAFF_SLOT_KINDS: StaffKind[] = ['security', 'repair', 'care', 'production']

export const CARE_STAMINA_MULT = 0.5
/** 좋음(90 미만)까지 떨어지면 이 점수로 회복 — 최고 하한 */
export const CARE_CONDITION_FLOOR = 90
export const SECURITY_CHANCE_MUL = 0
export const REPAIR_FAIL_MUL = 0
export const PRODUCTION_REVENUE_MUL = 1.25
export const PRODUCTION_VIEWER_BONUS_RATE = 0.02
export const PRODUCTION_VIEWER_BONUS_MIN = 12

export function productionViewerBonus(currentViewers: number) {
  return Math.max(
    PRODUCTION_VIEWER_BONUS_MIN,
    Math.round(Math.max(0, currentViewers) * PRODUCTION_VIEWER_BONUS_RATE),
  )
}

export const STAFF_HIRE_COST = 2_500

export function createEmptySlotManagers(): SlotManagers {
  return {
    security: null,
    repair: null,
    care: null,
    production: null,
  }
}

export function createEmptySlotManagerState(): SlotManagerState {
  return {
    hiredStaffIds: [],
    equippedBySlotId: {},
  }
}

export function normalizeManagerState(raw: Partial<SlotManagerState> | null | undefined): SlotManagerState {
  const hired = Array.isArray(raw?.hiredStaffIds)
    ? raw.hiredStaffIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []
  const equipped: Record<string, SlotManagers> = {}
  const source = raw?.equippedBySlotId ?? {}
  for (const [slotId, managers] of Object.entries(source)) {
    equipped[slotId] = {
      security: managers?.security ?? null,
      repair: managers?.repair ?? null,
      care: managers?.care ?? null,
      production: managers?.production ?? null,
    }
  }
  return {
    hiredStaffIds: [...new Set(hired)],
    equippedBySlotId: equipped,
  }
}

/** 해금된 칸에 엔트리가 없으면 빈 장착으로 채운다. 잠긴 칸은 장착을 버린다. */
export function ensureUnlockedSlotManagers(
  state: SlotManagerState,
  slots: StudioSlot[],
): SlotManagerState {
  const nextEquipped = { ...state.equippedBySlotId }
  let changed = false

  for (const slot of slots) {
    if (slot.status === 'locked') {
      if (nextEquipped[slot.id]) {
        delete nextEquipped[slot.id]
        changed = true
      }
      continue
    }
    if (!nextEquipped[slot.id]) {
      nextEquipped[slot.id] = createEmptySlotManagers()
      changed = true
    }
  }

  return changed ? { ...state, equippedBySlotId: nextEquipped } : state
}

export function isStaffHired(state: SlotManagerState, staffId: string) {
  return state.hiredStaffIds.includes(staffId)
}

export function hireStaff(state: SlotManagerState, staffId: string): SlotManagerState {
  if (state.hiredStaffIds.includes(staffId)) return state
  return {
    ...state,
    hiredStaffIds: [...state.hiredStaffIds, staffId],
  }
}

export function staffIdOnSlot(state: SlotManagerState, slotId: string, kind: StaffKind) {
  return state.equippedBySlotId[slotId]?.[kind] ?? null
}

export function findSlotIdForStaff(state: SlotManagerState, staffId: string): string | null {
  for (const [slotId, managers] of Object.entries(state.equippedBySlotId)) {
    for (const kind of STAFF_SLOT_KINDS) {
      if (managers[kind] === staffId) return slotId
    }
  }
  return null
}

export function unequipStaff(state: SlotManagerState, slotId: string, kind: StaffKind): SlotManagerState {
  const current = state.equippedBySlotId[slotId]
  if (!current || !current[kind]) return state
  return {
    ...state,
    equippedBySlotId: {
      ...state.equippedBySlotId,
      [slotId]: { ...current, [kind]: null },
    },
  }
}

/** 같은 스태프는 한 칸에만. 종류당 슬롯 1명. */
export function equipStaff(
  state: SlotManagerState,
  slotId: string,
  kind: StaffKind,
  staffId: string,
): SlotManagerState {
  if (!state.hiredStaffIds.includes(staffId)) return state

  let next: SlotManagerState = state
  // 해금 엔트리가 아직 없으면 여기서 만들어 장착이 조용히 실패하지 않게 한다.
  if (!next.equippedBySlotId[slotId]) {
    next = {
      ...next,
      equippedBySlotId: {
        ...next.equippedBySlotId,
        [slotId]: createEmptySlotManagers(),
      },
    }
  }

  const occupiedSlotId = findSlotIdForStaff(next, staffId)
  if (occupiedSlotId) {
    const occupied = next.equippedBySlotId[occupiedSlotId]
    if (occupied) {
      const cleared: SlotManagers = { ...occupied }
      for (const slotKind of STAFF_SLOT_KINDS) {
        if (cleared[slotKind] === staffId) cleared[slotKind] = null
      }
      next = {
        ...next,
        equippedBySlotId: {
          ...next.equippedBySlotId,
          [occupiedSlotId]: cleared,
        },
      }
    }
  }

  const target = next.equippedBySlotId[slotId] ?? createEmptySlotManagers()
  return {
    ...next,
    equippedBySlotId: {
      ...next.equippedBySlotId,
      [slotId]: { ...target, [kind]: staffId },
    },
  }
}

export function removeStaffFromState(state: SlotManagerState, staffId: string): SlotManagerState {
  const nextEquipped: Record<string, SlotManagers> = {}
  for (const [slotId, managers] of Object.entries(state.equippedBySlotId)) {
    const nextManagers: SlotManagers = { ...managers }
    for (const kind of STAFF_SLOT_KINDS) {
      if (nextManagers[kind] === staffId) nextManagers[kind] = null
    }
    nextEquipped[slotId] = nextManagers
  }
  return {
    hiredStaffIds: state.hiredStaffIds.filter((id) => id !== staffId),
    equippedBySlotId: nextEquipped,
  }
}

export function staffBonusOf(
  state: SlotManagerState,
  slotId: string,
  kind: StaffKind,
): { equipped: boolean; staffId: string | null; mul: number } {
  const staffId = staffIdOnSlot(state, slotId, kind)
  const equipped = Boolean(staffId)
  const mul =
    kind === 'care'
      ? equipped
        ? CARE_STAMINA_MULT
        : 1
      : kind === 'security'
        ? equipped
          ? SECURITY_CHANCE_MUL
          : 1
        : kind === 'repair'
          ? equipped
            ? REPAIR_FAIL_MUL
            : 1
          : equipped
            ? PRODUCTION_REVENUE_MUL
            : 1
  return { equipped, staffId, mul }
}
