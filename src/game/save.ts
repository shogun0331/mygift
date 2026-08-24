import type { Grade, OwnedCreator, RegisteredCharacter } from './characters'
import type { ScoutOffer, ScoutSystemState } from './scout'
import type { WeeklyCreatorAccum, WeekAccumulator } from './weeklyReport'
import type { LeagueState } from './ranking'
import type { SocialSpawnState } from './social'
import type { StudioSlot } from './studioSlots'
import type { SlotGear } from './slotGear'
import type { SlotManagerState } from './slotManagers'
import type { StationGrade } from './station'
import { resolveMediaSrc } from './mediaUrl'
import { GAME_EPOCH, monthToCalendarDate } from './broadcast'

/** WeekAccumulator.byCreator(Map) → 직렬화 가능 배열 */
export type SerializedWeekAccum = Omit<WeekAccumulator, 'byCreator'> & {
  byCreator: Array<[string, WeeklyCreatorAccum]>
}

/** 스카우트 오퍼 — 템플릿(RegisteredCharacter) 전체 대신 id만 저장 → 로드 시 재구성 */
export type SerializedScoutOffer = Omit<ScoutOffer, 'template'> & {
  templateId: string
}

export type SerializedScoutSystemState = Omit<ScoutSystemState, 'activeOffer'> & {
  activeOffer: SerializedScoutOffer | null
}

export type GameSave = {
  schemaVersion: 1
  /** 숨은 고유 회사 ID */
  id: string
  companyName: string
  createdAt: number
  savedAt: number
  playtimeMs: number
  gameMonth: number
  broadcastMonthNumber: number
  monthWeekIndex: number
  assets: number
  league: LeagueState
  stationGrade: StationGrade
  rankRefreshTurnsLeft: number
  ownedCreators: OwnedCreator[]
  studioSlots: StudioSlot[]
  managerState: SlotManagerState
  slotGearById: Record<string, SlotGear>
  hiredStaffSalaries: Record<string, number>
  hiredStaffStartMonths: Record<string, number>
  weekAccum: SerializedWeekAccum
  prevWeekRevenue: number | null
  socialSpawn: SocialSpawnState
  annualRevenueByYear: Record<number, number>
  watchedEventIds: string[]
  scout: {
    staffScoutAvailable: boolean
    creatorScoutAvailable: boolean
    creatorScoutFirstDone: boolean
  }
  /** 스카우트 런타임 상태 (오프닝 보장/대기 오퍼 등) */
  scoutSystem: SerializedScoutSystemState
  /** 월말 연간 심사/승급이 진행 중인지 (세이브-로드 유실 방지) */
  pendingStationReview?: boolean
}

export type TopCharacterMeta = {
  name: string
  grade: Grade
  imageUrl: string | null
  avatarTone?: string
}

export type SaveMeta = {
  id: string
  companyName: string
  createdAt: number
  savedAt: number
  playtimeMs: number
  assets: number
  viewers: number
  /** 게임 내 현재 날짜 (YYYY.MM.DD) */
  date: string
  topCharacter?: TopCharacterMeta | null
}

export function serializeWeekAccum(week: WeekAccumulator): SerializedWeekAccum {
  return {
    ...week,
    byCreator: [...week.byCreator.entries()],
  }
}

export function deserializeWeekAccum(raw: SerializedWeekAccum): WeekAccumulator {
  return {
    ...raw,
    byCreator: new Map(raw.byCreator),
  }
}

/** Blob(file)은 직렬화 불가 → 제거, blob: URL은 휘발성이므로 media:// 파일명 기반만 유지 */
function serializeMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('blob:')) return undefined
  return url
}

export function serializeOwnedCreator(creator: OwnedCreator): OwnedCreator {
  return {
    ...creator,
    images: (creator.images ?? []).map((img) => {
      const { file: _file, ...rest } = img
      return { ...rest, url: serializeMediaUrl(img.url) }
    }),
    videos: (creator.videos ?? []).map((vid) => {
      const { file: _file, ...rest } = vid
      return { ...rest, url: serializeMediaUrl(vid.url) ?? '' }
    }),
  }
}

function mediaUrl(characterId: string, kind: 'image' | 'video', fileName: string, cacheKey?: number) {
  const folder = kind === 'image' ? 'images' : 'videos'
  return resolveMediaSrc(`media://characters/${characterId}/${folder}/${fileName}`, cacheKey ?? fileName)
}

/** 로드 후 media:// 경로로 URL 복원 (fileName 기반) */
export function hydrateOwnedCreator(creator: OwnedCreator): OwnedCreator {
  return {
    ...creator,
    images: (creator.images ?? []).map((img) => ({
      ...img,
      url: img.url || (img.fileName ? mediaUrl(creator.id, 'image', img.fileName, img.fileSize) : ''),
    })),
    videos: (creator.videos ?? []).map((vid) => ({
      ...vid,
      url: vid.url || (vid.fileName ? mediaUrl(creator.id, 'video', vid.fileName, vid.fileSize) : ''),
    })),
  }
}

/** 스카우트 상태 저장 — 오퍼의 템플릿은 id만 보관 (미디어 제거) */
export function serializeScoutSystem(state: ScoutSystemState): SerializedScoutSystemState {
  return {
    ...state,
    activeOffer: state.activeOffer
      ? {
          grade: state.activeOffer.grade,
          stats: state.activeOffer.stats,
          salary: state.activeOffer.salary,
          templateId: state.activeOffer.template.id,
        }
      : null,
  }
}

/** 스카우트 상태 복원 — 템플릿을 등록 캐릭터 풀에서 재구성 (삭제됐으면 오퍼만 무효화) */
export function hydrateScoutSystem(
  raw: SerializedScoutSystemState,
  registered: RegisteredCharacter[],
): ScoutSystemState {
  const offer = raw.activeOffer
  const template = offer ? registered.find((c) => c.id === offer.templateId) ?? null : null
  return {
    ...raw,
    activeOffer: offer && template ? { template, grade: offer.grade, stats: offer.stats, salary: offer.salary } : null,
  }
}

/** 게임 월 인덱스 → 달력 날짜 문자열 */
export function gameDateString(monthIndex: number): string {
  const d = monthToCalendarDate(GAME_EPOCH, monthIndex)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

export function getTopCreatorMeta(save: GameSave): TopCharacterMeta | null {
  if (!save.ownedCreators || save.ownedCreators.length === 0) return null

  const GRADE_ORDER: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 }

  const sorted = [...save.ownedCreators].sort((a, b) => {
    const gA = GRADE_ORDER[a.grade] ?? 0
    const gB = GRADE_ORDER[b.grade] ?? 0
    if (gA !== gB) return gB - gA
    const scoreA =
      (a.statCommunication ?? 0) +
      (a.statPerformance ?? 0) +
      (a.statSexy ?? 0) +
      (a.statElegance ?? 0)
    const scoreB =
      (b.statCommunication ?? 0) +
      (b.statPerformance ?? 0) +
      (b.statSexy ?? 0) +
      (b.statElegance ?? 0)
    return scoreB - scoreA
  })

  const top = sorted[0]
  if (!top) return null

  const hydrated = hydrateOwnedCreator(top)
  const profileImg = (hydrated.images ?? [])[0]
  const rawUrl = hydrated.profileImageUrl || profileImg?.url
  const imageUrl = rawUrl ? resolveMediaSrc(rawUrl) : null

  return {
    name: top.name,
    grade: top.grade,
    imageUrl,
    avatarTone: top.avatarTone,
  }
}

export function saveMetaFrom(save: GameSave): SaveMeta {
  return {
    id: save.id,
    companyName: save.companyName,
    createdAt: save.createdAt,
    savedAt: save.savedAt,
    playtimeMs: save.playtimeMs,
    assets: save.assets,
    viewers: save.league?.viewers ?? 0,
    date: gameDateString(save.gameMonth ?? 0),
    topCharacter: getTopCreatorMeta(save),
  }
}

/** 누적 플레이타임 표시 — 언어 중립 포맷 (3h 12m / 12m / 45s) */
export function formatPlaytime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}
