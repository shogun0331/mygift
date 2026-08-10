import type { CharacterEventLinks } from '../events/types'
import { emptyCharacterEventLinks } from '../events/types'
import {
  conditionFromScore,
  scoreOf,
  STAMINA_MAX,
} from './condition'
import { estimateDefaultSalaryForGrade } from './salary'
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
  level: number            // 수위 레벨 (그룹: LV.1~4 등)
  stage: number            // 수위 단계 (해당 레벨 그룹 안의 단계 숫자)
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
  skill: number
  heat: number
  trust: number
  stamina: number
  staminaMax: number
  revenueMult: number
  /** 컨디션 티어 (conditionScore에서 파생) */
  condition: string
  /** 컨디션 점수 0~100 */
  conditionScore: number
  /** 연속 휴식 주수 */
  restStreak: number
  /** 휴가를 사용한 방송월 번호 (월 1회) */
  lastVacationMonth?: number | null
  /** @deprecated trust 사용. 구 세이브 호환용 */
  loyalty?: number
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
  return estimateDefaultSalaryForGrade(grade)
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

/** 스카우트 영입 → 보유 크리에이터 (레거시: 고정 스탯). 신규 영입은 hireScoutOffer 사용 */
export function scoutCharacter(character: RegisteredCharacter): OwnedCreator {
  const conditionScore = 100
  return {
    ...character,
    contractWeeks: 12,
    nextPayTurns: 4,
    skill: 25,
    heat: 1,
    trust: 50,
    stamina: STAMINA_MAX,
    staminaMax: STAMINA_MAX,
    revenueMult: 1.0,
    conditionScore,
    condition: conditionFromScore(conditionScore),
    restStreak: 0,
    lastVacationMonth: null,
  }
}

/** 구 세이브(loyalty 등) → 신규 능력치 필드 보정 */
export function normalizeOwnedCreator(raw: OwnedCreator & { loyalty?: number }): OwnedCreator {
  const trust = Math.max(0, Math.min(100, Number(raw.trust ?? raw.loyalty ?? 50) || 50))
  const staminaMax = Math.min(
    STAMINA_MAX,
    Math.max(1, Number(raw.staminaMax ?? STAMINA_MAX) || STAMINA_MAX),
  )
  const stamina = Math.max(0, Math.min(staminaMax, Number(raw.stamina ?? staminaMax) || staminaMax))
  const conditionRaw = (raw.condition ?? 'normal').toLowerCase()
  const conditionTier =
    conditionRaw === 'best' ||
    conditionRaw === 'good' ||
    conditionRaw === 'normal' ||
    conditionRaw === 'bad' ||
    conditionRaw === 'worst'
      ? conditionRaw
      : 'normal'
  let conditionScore = Number(raw.conditionScore)
  if (!Number.isFinite(conditionScore)) {
    const mid: Record<string, number> = {
      best: 95,
      good: 80,
      normal: 60,
      bad: 40,
      worst: 15,
    }
    conditionScore = mid[conditionTier] ?? 60
  }
  conditionScore = Math.max(0, Math.min(100, Math.round(conditionScore)))
  const lastVacationMonthRaw = Number(raw.lastVacationMonth)
  return {
    ...raw,
    skill: Math.max(0, Math.min(100, Number(raw.skill ?? 25) || 25)),
    heat: Math.max(1, Math.min(2, Number(raw.heat ?? 1) || 1)),
    trust,
    stamina,
    staminaMax,
    revenueMult: Number(raw.revenueMult ?? 1) || 1,
    conditionScore,
    condition: conditionFromScore(conditionScore),
    restStreak: Math.max(0, Math.round(Number(raw.restStreak ?? 0) || 0)),
    lastVacationMonth: Number.isFinite(lastVacationMonthRaw) ? lastVacationMonthRaw : null,
    loyalty: undefined,
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

/**
 * 방송 일별 영상: 해당 수위 레벨의 비-idle 영상을 stage 오름차순으로 고른 뒤 dayIndex로 선택.
 * 없으면 idle로 폴백.
 */
export function findBroadcastDayVideoUrl(
  creator: { videos?: CharacterVideo[] | null },
  dayIndex: number,
  level = 1,
): string | null {
  const playlist = (creator.videos ?? [])
    .filter(
      (video) =>
        video.level === level &&
        !video.keys?.includes('idle') &&
        Boolean(video.url),
    )
    .sort((a, b) => a.stage - b.stage || a.id.localeCompare(b.id))

  if (playlist.length === 0) {
    return findLevelIdleVideoUrl(creator, level)
  }

  const safeIndex = ((Math.floor(dayIndex) % playlist.length) + playlist.length) % playlist.length
  return playlist[safeIndex]?.url ?? findLevelIdleVideoUrl(creator, level)
}

export function toStudioHandCard(creator: OwnedCreator) {
  return {
    id: creator.id,
    name: creator.name,
    grade: creator.grade,
    popularity: creator.popularity,
    stamina: creator.stamina,
    staminaMax: creator.staminaMax,
    conditionScore: scoreOf(creator),
    profileImageUrl: creator.profileImageUrl || null,
    idleVideoUrl: findLevelIdleVideoUrl(creator, 1),
    mediaRevision: creator.mediaRevision,
  }
}
