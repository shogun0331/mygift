export type EventMediaKind = 'image' | 'video' | 'sound'

/** Fixed event slots that a character can bind to registered GameEvents */
export const CHARACTER_EVENT_SLOTS = [
  { key: 'scout', label: '스카웃 이벤트' },
  { key: 'salary', label: '연봉 협상 이벤트' },
  { key: 'vip', label: 'VIP 이벤트' },
  { key: 'h', label: 'H 이벤트' },
  { key: 'date1', label: '데이트 1 이벤트' },
  { key: 'date2', label: '데이트 2 이벤트' },
] as const

export type CharacterEventSlotKey = (typeof CHARACTER_EVENT_SLOTS)[number]['key']

export type CharacterEventLinks = Record<CharacterEventSlotKey, string | null>

export function createGameEventId(existingIds?: Iterable<string>): string {
  const taken = new Set(existingIds ?? [])
  const make = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `ev_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`
  let id = make()
  while (taken.has(id)) id = make()
  return id
}

export function emptyCharacterEventLinks(): CharacterEventLinks {
  return {
    scout: null,
    salary: null,
    vip: null,
    h: null,
    date1: null,
    date2: null,
  }
}

export type BlurRegion = {
  id: string
  x: number
  y: number
  w: number
  h: number
  blur: number
}

export type EventMediaAsset = {
  id: string
  fileName: string
  kind: EventMediaKind
  /** Original path inside the export ZIP */
  sourcePath: string
  blob: Blob
  url: string
  size: number
}

export type VnfPointDef = {
  key: string
  label: string
}

export type VnfCharacterDef = {
  id: string
  nameKey?: string
  name?: string
  names?: Record<string, string>
}

export type GameEvent = {
  id: string
  /** Source project id from export */
  projectId: string
  projectTitle: string
  /** Original chapter number from VNF export (= one game event) */
  chapterId: number
  titleKey: string
  /** Resolved title in default language (fallback: titleKey) */
  title: string
  startNode: string
  nodes: unknown[]
  /** lang → key → text */
  localization: Record<string, Record<string, string>>
  defaultLanguage: string
  characters: VnfCharacterDef[]
  points: VnfPointDef[]
  /** Media bound to this event (images / videos / sounds) */
  media: EventMediaAsset[]
  sourceZipName: string
  createdAt: string
  /** null = 공용. 값이 있으면 그 캐릭터 전용 */
  ownerCharacterId: string | null
}

export function normalizeOwnerCharacterId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const id = value.trim()
  return id ? id : null
}

export function eventUsableInCharacterSlot(
  event: GameEvent,
  characterId: string,
  keepEventId?: string | null,
): boolean {
  if (keepEventId && event.id === keepEventId) return true
  const owner = normalizeOwnerCharacterId(event.ownerCharacterId)
  return owner === null || owner === characterId
}

/** 캐릭터 전용이 아닌 공용 이벤트 */
export function isCommonEvent(event: GameEvent): boolean {
  return normalizeOwnerCharacterId(event.ownerCharacterId) === null
}

export function revokeEventMedia(event: GameEvent) {
  for (const asset of event.media) {
    URL.revokeObjectURL(asset.url)
  }
}

export function revokeEvents(events: GameEvent[]) {
  for (const event of events) revokeEventMedia(event)
}
