import type { CharacterEventLinks } from '../events/types'
import { emptyCharacterEventLinks } from '../events/types'
import { creatorVisuals } from './studioSlots'

export type Grade = 'S' | 'A' | 'B' | 'C'

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
  name: string
  age: string
  job: string
  bust: string
  weight: string
  eventLinks: CharacterEventLinks
  profileImageUrl?: string | null
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
  const id = createId()
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
    profileBlob: (draft as any).profileBlob || null,
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

export function toStudioHandCard(creator: OwnedCreator) {
  return {
    id: creator.id,
    name: creator.name,
    grade: creator.grade,
    popularity: creator.popularity,
  }
}
