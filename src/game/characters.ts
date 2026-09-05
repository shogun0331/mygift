import type { BlurRegion, CharacterEventLinks } from '../events/types'
import { emptyCharacterEventLinks } from '../events/types'
import { readBlurRegions } from '../events/BlurRegionEditor'
import {
  CHARACTER_LOCALES,
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
import { defaultSpecialVacationCaptionsForCharacter } from './specialVacationLines'
import { creatorVisuals } from './studioSlots'
import type { RegisteredStaff } from './staff'

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

/** 캐릭터별 승급심사 3단계 퍼포먼스 영상 (A: 고만족도 80%↑, B: 중만족도 30~79%, C: 저만족도 0~29%) */
export type CharacterAuditMediaSlot = {
  url: string | null
  blurRegions: BlurRegion[]
}

export type CharacterAuditMedia = {
  A: CharacterAuditMediaSlot
  B: CharacterAuditMediaSlot
  C: CharacterAuditMediaSlot
}

function sanitizeAuditMediaUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const url = raw.trim()
  if (!url) return null
  if (url.startsWith('blob:')) return null
  return url
}

export function emptyAuditMediaSlot(): CharacterAuditMediaSlot {
  return { url: null, blurRegions: [] }
}

export function normalizeAuditMediaSlot(raw: unknown): CharacterAuditMediaSlot {
  if (typeof raw === 'string') {
    return { url: sanitizeAuditMediaUrl(raw), blurRegions: [] }
  }
  if (!raw || typeof raw !== 'object') return emptyAuditMediaSlot()
  const row = raw as Record<string, unknown>
  return {
    url: sanitizeAuditMediaUrl(row.url),
    blurRegions: readBlurRegions(row),
  }
}

export function normalizeAuditMedia(raw: unknown): CharacterAuditMedia {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    A: normalizeAuditMediaSlot(row.A),
    B: normalizeAuditMediaSlot(row.B),
    C: normalizeAuditMediaSlot(row.C),
  }
}

export function mergeAuditMedia(
  primary?: CharacterAuditMedia | null,
  fallback?: CharacterAuditMedia | null,
): CharacterAuditMedia {
  const a = normalizeAuditMedia(primary)
  const b = normalizeAuditMedia(fallback)
  const slot = (left: CharacterAuditMediaSlot, right: CharacterAuditMediaSlot) => ({
    url: left.url ?? right.url,
    blurRegions: left.blurRegions.length > 0 ? left.blurRegions : right.blurRegions,
  })
  return {
    A: slot(a.A, b.A),
    B: slot(a.B, b.B),
    C: slot(a.C, b.C),
  }
}

export function auditMediaSlotUrl(
  slot: CharacterAuditMediaSlot | string | null | undefined,
): string | null {
  if (!slot) return null
  if (typeof slot === 'string') return sanitizeAuditMediaUrl(slot)
  return sanitizeAuditMediaUrl(slot.url)
}

/** 재시청 VIP/H 숏츠 VN 한 컷 (영상·이미지 + 대사 노드) */
export type ShortsVnBeat = {
  id: string
  mediaUrl: string
  /** 선택한 대사 노드에서 해석한 미리보기/폴백 텍스트 */
  caption: string
  durationSec: number
  blurRegions: BlurRegion[]
  /** 미디어를 고른 VN 그래픽/영상 노드 (선택) */
  sourceNodeId?: string | null
  /** 하단에 표시할 원본 대사 노드 ID */
  captionNodeId?: string | null
}

export type CharacterShortsVn = {
  vip: ShortsVnBeat[]
  h: ShortsVnBeat[]
}

export type ShortsVnSlotKey = keyof CharacterShortsVn

export function emptyShortsVn(): CharacterShortsVn {
  return { vip: [], h: [] }
}

function createShortsBeatId() {
  return `shorts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeShortsVnBeat(raw: unknown): ShortsVnBeat | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const mediaUrl = sanitizeAuditMediaUrl(row.mediaUrl ?? row.url)
  if (!mediaUrl) return null
  const durationRaw = Number(row.durationSec ?? row.duration ?? 2)
  const durationSec =
    Number.isFinite(durationRaw) && durationRaw > 0 ? Math.min(30, Math.max(0.5, durationRaw)) : 2
  return {
    id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : createShortsBeatId(),
    mediaUrl,
    caption: typeof row.caption === 'string' ? row.caption : typeof row.text === 'string' ? row.text : '',
    durationSec,
    blurRegions: readBlurRegions(row),
    sourceNodeId:
      typeof row.sourceNodeId === 'string' && row.sourceNodeId.trim()
        ? row.sourceNodeId.trim()
        : null,
    captionNodeId:
      typeof row.captionNodeId === 'string' && row.captionNodeId.trim()
        ? row.captionNodeId.trim()
        : null,
  }
}

export function normalizeShortsVn(raw: unknown): CharacterShortsVn {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const list = (value: unknown): ShortsVnBeat[] => {
    if (!Array.isArray(value)) return []
    return value.map(normalizeShortsVnBeat).filter((beat): beat is ShortsVnBeat => Boolean(beat))
  }
  return {
    vip: list(row.vip),
    h: list(row.h),
  }
}

export function mergeShortsVn(
  primary?: CharacterShortsVn | null,
  fallback?: CharacterShortsVn | null,
): CharacterShortsVn {
  const a = normalizeShortsVn(primary)
  const b = normalizeShortsVn(fallback)
  return {
    vip: a.vip.length > 0 ? a.vip : b.vip,
    h: a.h.length > 0 ? a.h : b.h,
  }
}

export function shortsVnBeatsForSlot(
  shorts: CharacterShortsVn | null | undefined,
  slot: ShortsVnSlotKey,
): ShortsVnBeat[] {
  return normalizeShortsVn(shorts)[slot]
}

/** 특별휴가에 등록하는 이미지 키 / 최대 장수 */
export const SPECIAL_VACATION_IMAGE_KEY = 'specialVacation'
export const SPECIAL_VACATION_IMAGE_MAX = 10

export type SpecialVacationVoice = {
  id: string
  fileName?: string
  fileSize?: number
  url?: string
  /** 업로드 시만 존재 (직렬화 제외) */
  file?: File
}

export type CharacterSpecialVacation = {
  /** character.images 중 특별휴가용 이미지 id (최대 10) */
  imageIds: string[]
  /** 7개국 감사 대본 */
  captions: CharacterLocaleText
  /** 음성 1개 (다국어 아님) */
  voice: SpecialVacationVoice | null
}

export function emptySpecialVacation(characterName?: string | null): CharacterSpecialVacation {
  return {
    imageIds: [],
    captions: defaultSpecialVacationCaptionsForCharacter(characterName),
    voice: null,
  }
}

function sanitizeVacationVoice(raw: unknown): SpecialVacationVoice | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : ''
  const fileName = typeof row.fileName === 'string' && row.fileName.trim() ? row.fileName.trim() : ''
  const url = typeof row.url === 'string' && row.url.trim() && !row.url.startsWith('blob:') ? row.url.trim() : ''
  if (!id && !fileName && !url) return null
  const fileSizeRaw = Number(row.fileSize)
  return {
    id: id || `vac-voice-${Date.now()}`,
    fileName: fileName || undefined,
    fileSize: Number.isFinite(fileSizeRaw) ? fileSizeRaw : undefined,
    url: url || undefined,
    file: row.file instanceof File ? row.file : undefined,
  }
}

export function normalizeSpecialVacation(
  raw: unknown,
  characterName?: string | null,
): CharacterSpecialVacation {
  const defaults = defaultSpecialVacationCaptionsForCharacter(characterName)
  if (!raw || typeof raw !== 'object') {
    return { imageIds: [], captions: defaults, voice: null }
  }
  const row = raw as Record<string, unknown>
  const ids = Array.isArray(row.imageIds)
    ? row.imageIds
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter(Boolean)
        .slice(0, SPECIAL_VACATION_IMAGE_MAX)
    : []
  const captions = mergeCharacterLocaleText(row.captions as CharacterLocaleText | undefined)
  const hasAnyCaption = CHARACTER_LOCALES.some((lang) => captions[lang]?.trim())
  return {
    imageIds: ids,
    captions: hasAnyCaption ? captions : defaults,
    voice: sanitizeVacationVoice(row.voice),
  }
}

export function mergeSpecialVacation(
  primary?: CharacterSpecialVacation | null,
  fallback?: CharacterSpecialVacation | null,
  characterName?: string | null,
): CharacterSpecialVacation {
  const a = normalizeSpecialVacation(primary, characterName)
  const b = normalizeSpecialVacation(fallback, characterName)
  const captions = CHARACTER_LOCALES.some((lang) => a.captions[lang]?.trim())
    ? a.captions
    : b.captions
  return {
    imageIds: a.imageIds.length > 0 ? a.imageIds : b.imageIds,
    captions,
    voice: a.voice ?? b.voice,
  }
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
  /** 승급심사 3단계 퍼포먼스 미디어 (A: 80%↑, B: 30~79%, C: 0~29%) */
  auditMedia?: CharacterAuditMedia
  /** 재시청 VIP/H 숏츠 VN 비트 */
  shortsVn?: CharacterShortsVn
  /** 특별휴가 컷 이미지 (최대 10) */
  specialVacation?: CharacterSpecialVacation
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
  /** 특별휴가를 사용한 방송 턴(월) 번호 — 턴당 1회 */
  lastVacationMonth?: number | null
  /** 프로포즈 상태: 'accepted' | 'rejected' | null */
  proposalState?: 'accepted' | 'rejected' | null
  /** 데이트 아크: 0=데이트1 대기, 1=데이트2, 2=H, 3=H 완료 */
  dateArcStep?: 0 | 1 | 2 | 3
  snsPublishedIds?: string[]
  snsFeed?: SnsPublishedPost[]
  snsPending?: SnsPendingPost | null
  snsSubscribers?: number
  /** 연속 가벼운 어필 횟수. 파격적인 화보 가중치 */
  snsHeat3Pity?: number
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
  auditMedia?: CharacterAuditMedia
  shortsVn?: CharacterShortsVn
  specialVacation?: CharacterSpecialVacation
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
    eventLinks: { ...emptyCharacterEventLinks(), ...(raw.eventLinks ?? {}) },
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
    auditMedia: normalizeAuditMedia(raw.auditMedia),
    shortsVn: normalizeShortsVn(raw.shortsVn),
    specialVacation: normalizeSpecialVacation(raw.specialVacation, named.name),
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
    eventLinks: { ...emptyCharacterEventLinks(), ...(draft.eventLinks ?? {}) },
    profileImageUrl: draft.profileImageUrl ?? null,
    profileBlob: draft.profileBlob || null,
    characterIconId: draft.characterIconId ?? null,
    characterIllustrationId: draft.characterIllustrationId ?? null,
    profileImageId: draft.profileImageId ?? null,
    profileVideoId: draft.profileVideoId ?? null,
    images: draft.images ?? [],
    videos: draft.videos ?? [],
    snsPosts: normalizeSnsPosts(draft.snsPosts),
    auditMedia: normalizeAuditMedia(draft.auditMedia),
    shortsVn: normalizeShortsVn(draft.shortsVn),
    specialVacation: normalizeSpecialVacation(draft.specialVacation, name),
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
    snsHeat3Pity: 0,
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
    proposalState:
      raw.proposalState === 'accepted'
        ? 'accepted'
        : raw.proposalState === 'rejected'
          ? 'rejected'
          : null,
    snsPublishedIds: Array.isArray(raw.snsPublishedIds)
      ? raw.snsPublishedIds.map(String)
      : [],
    snsFeed: normalizeSnsPublishedPosts(raw.snsFeed),
    snsPending: raw.snsPending && typeof raw.snsPending === 'object' ? raw.snsPending : null,
    snsSubscribers: Math.max(0, Math.round(Number(raw.snsSubscribers ?? 0) || 0)),
    snsHeat3Pity: Math.max(0, Math.round(Number(raw.snsHeat3Pity ?? 0) || 0)),
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

type CharacterMediaOwner = {
  id?: string
  characterIconId?: string | null
  profileImageId?: string | null
  profileImageUrl?: string | null
  images?: CharacterImage[] | null
  videos?: CharacterVideo[] | null
}

function resolveCharacterImageUrl(
  creator: { id?: string },
  image?: CharacterImage | null,
): string | null {
  if (!image) return null
  if (creator.id && image.fileName && !image.file) {
    return characterMediaUrl(creator.id, 'image', image.fileName)
  }
  if (image.url) return image.url
  if (creator.id && image.fileName) return characterMediaUrl(creator.id, 'image', image.fileName)
  return null
}

/** 대시보드·랭킹 원형 아이콘. 캐릭터 아이콘 → 프로필 이미지 순 */
export function findCharacterIconUrl(creator?: CharacterMediaOwner | null): string | null {
  if (!creator) return null
  const images = creator.images ?? []
  const icon = images.find((image) => image.id === creator.characterIconId)
  const fromIcon = resolveCharacterImageUrl(creator, icon)
  if (fromIcon) return fromIcon
  const profile = images.find((image) => image.id === creator.profileImageId)
  const fromProfile = resolveCharacterImageUrl(creator, profile)
  if (fromProfile) return fromProfile
  return creator.profileImageUrl || null
}

export function findCharacterProfileUrl(creator?: CharacterMediaOwner | null): string | null {
  if (!creator) return null
  const images = creator.images ?? []
  const profile = images.find((image) => image.id === creator.profileImageId)
  const fromProfile = resolveCharacterImageUrl(creator, profile)
  if (fromProfile) return fromProfile
  return creator.profileImageUrl || findCharacterIconUrl(creator)
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
  if (creator.id && video.fileName && !video.file) {
    return characterMediaUrl(creator.id, 'video', video.fileName)
  }
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
    names: creator.names,
    grade: creator.grade,
    stamina: creator.stamina,
    staminaMax: creator.staminaMax,
    conditionScore: scoreOf(creator),
    statType: normalizeCreatorStatType(creator.statType),
    profileImageUrl: findCharacterProfileUrl(creator),
    idleVideoUrl: findLevelIdleVideoUrl(creator),
    mediaRevision: creator.mediaRevision,
  }
}

export type ScoutedStaffCandidate = RegisteredStaff & {
  proposedSalary: number
  proposedHireCost: number
}
