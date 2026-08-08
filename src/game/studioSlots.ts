export type StudioSlotStatus = 'empty' | 'locked' | 'assigned'

export type StudioSlotAssignment = {
  creatorId: string
  creatorName: string
  grade: string
  popularity: number
  profileImageUrl?: string | null
  /** 대시보드 대기 루프용 — 수위 레벨 1 idle 영상 */
  idleVideoUrl?: string | null
  mediaRevision?: number
}

export type StudioSlot = {
  id: string
  index: number
  label: string
  /** locked | empty(미배정) | assigned(배정) — assigned일 때 assignment 존재 */
  status: StudioSlotStatus
  assignment: StudioSlotAssignment | null
}

export type StudioHandCard = {
  id: string
  name: string
  grade: string
  popularity: number
  profileImageUrl?: string | null
  idleVideoUrl?: string | null
  mediaRevision?: number
}

/** 시작: 1번만 미배정(해금), 나머지 잠금. 캐릭터 없음. */
export function createInitialStudioSlots(): StudioSlot[] {
  return Array.from({ length: 6 }, (_, i) => {
    const index = i + 1
    const unlocked = index === 1
    return {
      id: `slot-${index}`,
      index,
      label: `SLOT ${String(index).padStart(2, '0')}`,
      status: unlocked ? 'empty' : 'locked',
      assignment: null,
    }
  })
}

export function assignCreatorToSlot(
  slots: StudioSlot[],
  slotId: string,
  card: StudioHandCard,
): StudioSlot[] {
  const target = slots.find((slot) => slot.id === slotId)
  if (!target || target.status === 'locked') return slots

  return slots.map((slot) => {
    if (slot.assignment?.creatorId === card.id && slot.id !== slotId) {
      return {
        ...slot,
        status: slot.status === 'locked' ? 'locked' : 'empty',
        assignment: null,
      }
    }
    if (slot.id !== slotId) return slot
    return {
      ...slot,
      status: 'assigned',
      assignment: {
        creatorId: card.id,
        creatorName: card.name,
        grade: card.grade,
        popularity: card.popularity,
        profileImageUrl: card.profileImageUrl || null,
        idleVideoUrl: card.idleVideoUrl || null,
        mediaRevision: card.mediaRevision,
      },
    }
  })
}

export function clearStudioSlot(slots: StudioSlot[], slotId: string): StudioSlot[] {
  return slots.map((slot) => {
    if (slot.id !== slotId || slot.status === 'locked') return slot
    return {
      ...slot,
      status: 'empty',
      assignment: null,
    }
  })
}

/** 스튜디오 슬롯 ↔ 대기 슬롯(빈/배정) 간 배치 이동. 대상이 배정이면 서로 교환 */
export function moveCreatorBetweenSlots(
  slots: StudioSlot[],
  fromSlotId: string,
  toSlotId: string,
): StudioSlot[] {
  if (fromSlotId === toSlotId) return slots
  const from = slots.find((slot) => slot.id === fromSlotId)
  const to = slots.find((slot) => slot.id === toSlotId)
  if (!from || !to) return slots
  if (from.status !== 'assigned' || !from.assignment) return slots
  if (to.status === 'locked') return slots

  const fromAssignment = from.assignment
  const toAssignment = to.status === 'assigned' ? to.assignment : null

  return slots.map((slot) => {
    if (slot.id === fromSlotId) {
      if (toAssignment) {
        return { ...slot, status: 'assigned', assignment: toAssignment }
      }
      return { ...slot, status: 'empty', assignment: null }
    }
    if (slot.id === toSlotId) {
      return { ...slot, status: 'assigned', assignment: fromAssignment }
    }
    return slot
  })
}

const AVATAR_TONES = [
  'from-rose-400 to-amber-300',
  'from-violet-300 to-pink-400',
  'from-emerald-300 to-cyan-400',
  'from-orange-300 to-rose-400',
  'from-sky-300 to-indigo-400',
  'from-fuchsia-300 to-violet-400',
]

const PREVIEWS = [
  'from-rose-500/40 via-fuchsia-700/30 to-slate-950',
  'from-violet-400/35 via-indigo-600/35 to-slate-950',
  'from-orange-400/35 via-amber-700/25 to-slate-950',
  'from-sky-400/30 via-indigo-800/35 to-slate-950',
  'from-emerald-400/30 via-cyan-800/30 to-slate-950',
  'from-fuchsia-400/30 via-rose-800/30 to-slate-950',
]

function hashString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function creatorVisuals(creatorId: string, creatorName: string) {
  const h = hashString(creatorId || creatorName)
  return {
    avatar: creatorName.slice(0, 1),
    avatarTone: AVATAR_TONES[h % AVATAR_TONES.length]!,
    preview: PREVIEWS[h % PREVIEWS.length]!,
    concept: 'CREATOR',
  }
}
