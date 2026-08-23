import type { CharacterEventLinks } from '../events/types'
import { emptyCharacterEventLinks } from '../events/types'
import {
  type CharacterLocaleText,
  mergeCharacterLocaleText,
  normalizeCharacterNamedFields,
  primaryCharacterLocaleText,
} from './characterLocales'
import {
  conditionFromScore,
  scoreOf,
  STAMINA_MAX,
} from './condition'
import { estimateDefaultSalaryForGrade } from './salary'
import { characterMediaUrl } from './mediaUrl'
import {
  normalizeSnsPosts,
  normalizeSnsPublishedPosts,
  type SnsPendingPost,
  type SnsPostDef,
  type SnsPublishedPost,
} from './sns'
import { creatorVisuals } from './studioSlots'

export type Grade = 'S' | 'A' | 'B' | 'C'

/** 에디터에서 고르는 특화 타입. 영입 시 해당 스탯이 높게 시작 */
export const CREATOR_STAT_TYPES = ['sexy', 'communication', 'elegance', 'performance'] as const
export type CreatorStatType = (typeof CREATOR_STAT_TYPES)[number]

export function normalizeCreatorStatType(raw: unknown): CreatorStatType {
  if (
    raw === 'sexy' ||
    raw === 'communication' ||
    raw === 'elegance' ||
    raw === 'performance'
  ) {
    return raw
  }
  return 'sexy'
}

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
  level: number            // 수위 영상은 LV.1만 사용
  stage: number            // 해당 레벨 그룹 안의 단계 숫자
  keys: string[]           // 예: ['idle'] — 기본 대기 표시용
}

/** 에디터에 등록된 캐릭터 (스카우트 대상 풀) */
export type RegisteredCharacter = {
  id: string
  /** 기본(ko) 닉네임 — 검색·슬롯 스냅샷·폴백용 */
  name: string
  /** 언어별 닉네임 (ko/en/ja/zh-cn/ru/es/de) */
  names: CharacterLocaleText
  age: string
  /** 기본(ko) 직업 — concept 폴백용 */
  job: string
  /** 언어별 직업 */
  jobs: CharacterLocaleText
  bust: string
  weight: string
  grade: Grade
  /** 특화 타입 — 영입 롤의 주력 스탯 */
  statType: CreatorStatType
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
  /** 에디터 SNS 피드. 수위별 순차 오픈 */
  snsPosts?: SnsPostDef[]
  /** 미디어 교체 시 증가 — 영상 캐시/리마운트용 */
  mediaRevision?: number
}

/** 인게임에서 스카우트로 영입한 보유 크리에이터 */
export type OwnedCreator = RegisteredCharacter & {
  contractWeeks: number
  nextPayTurns: number
  heat: number
  trust: number
  stamina: number
  staminaMax: number
  revenueMult: number
  statSexy: number
  statElegance: number
  statCommunication: number
  statPerformance: number
  /** 컨디션 티어 (conditionScore에서 파생) */
  condition: string
  /** 컨디션 점수 0~100 */
  conditionScore: number
  /** 연속 휴식 주수 */
  restStreak: number
  /** 휴가를 사용한 방송월 번호 (월 1회) */
  lastVacationMonth?: number | null
  /** 데이트 아크: 0=데이트1 대기, 1=데이트2, 2=H, 3=H 완료 */
  dateArcStep?: 0 | 1 | 2 | 3
  snsPublishedIds?: string[]
  snsFeed?: SnsPublishedPost[]
  snsPending?: SnsPendingPost | null
  /** @deprecated trust 사용. 구 세이브 호환용 */
  loyalty?: number
}

export type CharacterDraft = {
  id?: string
  name: string
  names?: Partial<Record<string, string>> | CharacterLocaleText
  age: string
  job: string
  jobs?: Partial<Record<string, string>> | CharacterLocaleText
  bust: string
  weight: string
  statType?: CreatorStatType
  eventLinks: CharacterEventLinks
  profileImageUrl?: string | null
  profileBlob?: Blob | null
  characterIconId?: string | null
  characterIllustrationId?: string | null
  profileImageId?: string | null
  profileVideoId?: string | null
  images?: CharacterImage[]
  videos?: CharacterVideo[]
  snsPosts?: SnsPostDef[]
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

/** 로드·세이브 직전 닉네임/직업 로케일 정규화 */
export function normalizeRegisteredCharacter(
  raw: RegisteredCharacter | (Partial<RegisteredCharacter> & { id: string; name?: string }),
): RegisteredCharacter {
  const named = normalizeCharacterNamedFields({
    name: raw.name,
    names: raw.names,
    job: raw.job,
    jobs: raw.jobs,
    concept: raw.concept,
  })
  const grade = (raw.grade as Grade | undefined) ?? defaultGradeFromJob(named.job)
  const visuals = creatorVisuals(raw.id, named.name)
  return {
    id: raw.id,
    name: named.name,
    names: named.names,
    age: String(raw.age ?? ''),
    job: named.job,
    jobs: named.jobs,
    bust: String(raw.bust ?? ''),
    weight: String(raw.weight ?? ''),
    grade,
    statType: normalizeCreatorStatType(raw.statType),
    concept: named.concept,
    salary: Number(raw.salary ?? defaultSalary(grade)) || defaultSalary(grade),
    eventLinks: raw.eventLinks ?? emptyCharacterEventLinks(),
    avatarTone: raw.avatarTone || visuals.avatarTone,
    profileImageUrl: raw.profileImageUrl ?? null,
    profileBlob: raw.profileBlob ?? null,
    characterIconId: raw.characterIconId ?? null,
    characterIllustrationId: raw.characterIllustrationId ?? null,
    profileImageId: raw.profileImageId ?? null,
    profileVideoId: raw.profileVideoId ?? null,
    images: raw.images ?? [],
    videos: (raw.videos ?? []).map((video) => ({ ...video, level: 1 })),
    snsPosts: normalizeSnsPosts(raw.snsPosts),
    mediaRevision: raw.mediaRevision,
  }
}

/** 에디터에서 캐릭터 등록 */
export function createRegisteredCharacter(draft: CharacterDraft): RegisteredCharacter {
  const id = draft.id || createId()
  const names = mergeCharacterLocaleText(draft.names, draft.name)
  const jobs = mergeCharacterLocaleText(draft.jobs, draft.job)
  const name = primaryCharacterLocaleText(names)
  const job = primaryCharacterLocaleText(jobs)
  return normalizeRegisteredCharacter({
    id,
    name,
    names,
    age: draft.age,
    job,
    jobs,
    statType: draft.statType,
    eventLinks: draft.eventLinks ?? emptyCharacterEventLinks(),
    profileImageUrl: draft.profileImageUrl ?? null,
    profileBlob: draft.profileBlob || null,
    characterIconId: draft.characterIconId ?? null,
    characterIllustrationId: draft.characterIllustrationId ?? null,
    profileImageId: draft.profileImageId ?? null,
    profileVideoId: draft.profileVideoId ?? null,
    images: draft.images ?? [],
    videos: draft.videos ?? [],
    snsPosts: normalizeSnsPosts(draft.snsPosts),
    mediaRevision: draft.mediaRevision,
  })
}

/** 스카우트 영입 → 보유 크리에이터 (레거시: 고정 스탯). 신규 영입은 hireScoutOffer 사용 */
export function scoutCharacter(character: RegisteredCharacter): OwnedCreator {
  const conditionScore = 100
  return {
    ...character,
    contractWeeks: 12,
    nextPayTurns: 4,
    heat: 1,
    trust: 50,
    stamina: STAMINA_MAX,
    staminaMax: STAMINA_MAX,
    revenueMult: 1.0,
    statSexy: 25,
    statElegance: 25,
    statCommunication: 25,
    statPerformance: 25,
    conditionScore,
    condition: conditionFromScore(conditionScore),
    restStreak: 0,
    lastVacationMonth: null,
    dateArcStep: 0,
    snsPublishedIds: [],
    snsFeed: [],
    snsPending: null,
  }
}

/** 구 세이브(loyalty 등) → 신규 능력치 필드 보정 */
export function normalizeOwnedCreator(
  raw: OwnedCreator & { loyalty?: number; skill?: number; popularity?: number },
): OwnedCreator {
  const { skill: _skill, popularity: _popularity, ...rest } = raw
  const base = normalizeRegisteredCharacter(rest)
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
  const arcRaw = Math.round(Number(raw.dateArcStep ?? 0) || 0)
  const dateArcStep: 0 | 1 | 2 | 3 = arcRaw <= 0 ? 0 : arcRaw === 1 ? 1 : arcRaw === 2 ? 2 : 3
  const personalityOf = (value: unknown) => {
    const n = Number(value)
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)))
    return 25
  }
  return {
    ...rest,
    ...base,
    heat: Math.max(1, Math.min(2, Number(raw.heat ?? 1) || 1)),
    dateArcStep,
    trust,
    stamina,
    staminaMax,
    revenueMult: Number(raw.revenueMult ?? 1) || 1,
    statSexy: personalityOf(raw.statSexy),
    statElegance: personalityOf(raw.statElegance),
    statCommunication: personalityOf(raw.statCommunication),
    statPerformance: personalityOf(raw.statPerformance),
    conditionScore,
    condition: conditionFromScore(conditionScore),
    restStreak: Math.max(0, Math.round(Number(raw.restStreak ?? 0) || 0)),
    lastVacationMonth: Number.isFinite(lastVacationMonthRaw) ? lastVacationMonthRaw : null,
    snsPublishedIds: Array.isArray(raw.snsPublishedIds)
      ? raw.snsPublishedIds.map(String)
      : [],
    snsFeed: normalizeSnsPublishedPosts(raw.snsFeed),
    snsPending: raw.snsPending && typeof raw.snsPending === 'object' ? raw.snsPending : null,
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

/** 기본 대기(idle) 영상 URL — 수위 영상은 LV.1만 사용 */
export function findLevelIdleVideoUrl(
  creator: { id?: string; videos?: CharacterVideo[] | null },
  _level = 1,
): string | null {
  const match = (creator.videos ?? []).find((video) => video.keys?.includes('idle'))
  return resolveCharacterVideoUrl(creator, match)
}

/** 방송용 클립: idle이 아닌 영상 */
export function listBroadcastPlayVideos(
  creator: { id?: string; videos?: CharacterVideo[] | null },
  _level = 1,
): CharacterVideo[] {
  return (creator.videos ?? []).filter(
    (video) => !video.keys?.includes('idle') && Boolean(resolveCharacterVideoUrl(creator, video)),
  )
}

function resolveCharacterVideoUrl(
  creator: { id?: string },
  video?: CharacterVideo | null,
): string | null {
  if (!video) return null
  if (video.url) return video.url
  if (creator.id && video.fileName) return characterMediaUrl(creator.id, 'video', video.fileName)
  return null
}

/**
 * idle을 제외하고 랜덤 1개. 방송 클립이 없으면 idle로 폴백.
 * avoidUrl이 있고 후보가 2개 이상이면 직전 클립은 빼서 같은 영상이 연속되지 않게 한다.
 */
export function pickRandomBroadcastVideoUrl(
  creator: { id?: string; videos?: CharacterVideo[] | null },
  level = 1,
  avoidUrl?: string | null,
): string | null {
  let playlist = listBroadcastPlayVideos(creator, level)
  if (avoidUrl && playlist.length > 1) {
    const without = playlist.filter((video) => resolveCharacterVideoUrl(creator, video) !== avoidUrl)
    if (without.length > 0) playlist = without
  }
  if (playlist.length === 0) {
    return findLevelIdleVideoUrl(creator, level)
  }
  const index = Math.floor(Math.random() * playlist.length)
  return resolveCharacterVideoUrl(creator, playlist[index]) ?? findLevelIdleVideoUrl(creator, level)
}

export function toStudioHandCard(creator: OwnedCreator) {
  return {
    id: creator.id,
    name: creator.name,
    grade: creator.grade,
    stamina: creator.stamina,
    staminaMax: creator.staminaMax,
    conditionScore: scoreOf(creator),
    statType: normalizeCreatorStatType(creator.statType),
    profileImageUrl: creator.profileImageUrl || null,
    idleVideoUrl: findLevelIdleVideoUrl(creator),
    mediaRevision: creator.mediaRevision,
  }
}
