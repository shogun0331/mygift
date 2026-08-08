import type { CharacterEventLinks } from '../events/types'
import { emptyCharacterEventLinks } from '../events/types'
import { creatorVisuals } from './studioSlots'

export type Grade = 'S' | 'A' | 'B' | 'C'

export type CharacterImage = {
  id: string
  file?: File
  fileName?: string
  fileSize?: number
  url?: string
  keys: string[]
}

export type CharacterVideo = {
  id: string
  file?: File              // 업로드 시의 브라우저 파일 객체 (직렬화 제외)
  fileName?: string        // 물리 저장용 파일명
  fileSize?: number
  url: string              // media:// 또는 blob:
  level: number            // 수위 단계 (사용자가 입력하는 정수, 1 이상)
  keys: string[]           // 예: ['idle'] — 기본 대기 표시용
}

/** 에디터에 등록된 캐릭터 (스카우트 대상 풀) */
export type RegisteredCharacter = {
  id: string
  name: string
  age: string
  job: string
  bust: string
  weight: string
  grade: Grade
  popularity: number
  concept: string
  salary: number
  eventLinks: CharacterEventLinks
  avatarTone: string
  /** optional preview url (object URL) */
  profileImageUrl: string | null
  profileBlob?: Blob | null
  characterIconId?: string | null
  characterIllustrationId?: string | null
  profileImageId?: string | null
  profileVideoId?: string | null
  images?: CharacterImage[]
  videos?: CharacterVideo[]
  /** 미디어 교체 시 증가 — 영상 캐시/리마운트용 */
  mediaRevision?: number
}

/** 인게임에서 스카우트로 영입한 보유 크리에이터 */
export type OwnedCreator = RegisteredCharacter & {
  contractWeeks: number
  nextPayTurns: number
  loyalty: number
  stamina: number
  staminaMax: number
  condition: string
}

export type CharacterDraft = {
  id?: string
  name: string
  age: string
  job: string
  bust: string
  weight: string
  eventLinks: CharacterEventLinks
  profileImageUrl?: string | null
  profileBlob?: Blob | null
  characterIconId?: string | null
  characterIllustrationId?: string | null
  profileImageId?: string | null
  profileVideoId?: string | null
  images?: CharacterImage[]
  videos?: CharacterVideo[]
  mediaRevision?: number
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function defaultGradeFromJob(_job: string): Grade {
  return 'C'
}

function defaultSalary(grade: Grade) {
  switch (grade) {
    case 'S':
      return 150_000_000
    case 'A':
      return 110_000_000
    case 'B':
      return 60_000_000
    default:
      return 22_000_000
  }
}

function defaultPopularity(grade: Grade) {
  switch (grade) {
    case 'S':
      return 80
    case 'A':
      return 65
    case 'B':
      return 45
    default:
      return 25
  }
}

/** 에디터에서 캐릭터 등록 */
export function createRegisteredCharacter(draft: CharacterDraft): RegisteredCharacter {
  const id = draft.id || createId()
  const grade = defaultGradeFromJob(draft.job)
  const visuals = creatorVisuals(id, draft.name)
  return {
    id,
    name: draft.name,
    age: draft.age,
    job: draft.job,
    bust: draft.bust,
    weight: draft.weight,
    grade,
    popularity: defaultPopularity(grade),
    concept: draft.job.trim() || '뉴비',
    salary: defaultSalary(grade),
    eventLinks: draft.eventLinks ?? emptyCharacterEventLinks(),
    avatarTone: visuals.avatarTone,
    profileImageUrl: draft.profileImageUrl ?? null,
    profileBlob: draft.profileBlob || null,
    characterIconId: draft.characterIconId ?? null,
    characterIllustrationId: draft.characterIllustrationId ?? null,
    profileImageId: draft.profileImageId ?? null,
    profileVideoId: draft.profileVideoId ?? null,
    images: draft.images ?? [],
    videos: draft.videos ?? [],
    mediaRevision: draft.mediaRevision,
  }
}

/** 스카우트 영입 → 보유 크리에이터 */
export function scoutCharacter(character: RegisteredCharacter): OwnedCreator {
  return {
    ...character,
    contractWeeks: 12,
    nextPayTurns: 4,
    loyalty: 50,
    stamina: 80,
    staminaMax: 100,
    condition: 'NORMAL',
  }
}

export function scoutCandidates(
  registered: RegisteredCharacter[],
  owned: OwnedCreator[],
): RegisteredCharacter[] {
  const ownedIds = new Set(owned.map((c) => c.id))
  return registered.filter((c) => !ownedIds.has(c.id))
}

/** 수위 레벨의 기본 대기(idle) 영상 URL */
export function findLevelIdleVideoUrl(
  creator: { videos?: CharacterVideo[] | null },
  level = 1,
): string | null {
  const match = (creator.videos ?? []).find(
    (video) => video.level === level && video.keys?.includes('idle') && Boolean(video.url),
  )
  return match?.url ?? null
}

export function toStudioHandCard(creator: OwnedCreator) {
  return {
    id: creator.id,
    name: creator.name,
    grade: creator.grade,
    popularity: creator.popularity,
    profileImageUrl: creator.profileImageUrl || null,
    idleVideoUrl: findLevelIdleVideoUrl(creator, 1),
    mediaRevision: creator.mediaRevision,
  }
}
