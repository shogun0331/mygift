import { useState, useEffect } from 'react'
import {
  saveEvents,
  loadEvents,
  saveCharacters,
  loadCharacters,
  saveCommonEventLinks,
  loadCommonEventLinks,
  saveStationGradeConfig,
  loadStationGradeConfig,
  saveBgmConfig,
  loadBgmConfig,
  persistBgmFiles,
  pruneUnusedBgmFiles,
  removeBgmFile,
} from './events/db'
import type { GameEvent } from './events/types'
import {
  emptyCommonEventLinks,
  normalizeCommonEventLinks,
  type CommonEventLinks,
} from './events/commonEventLinks'
import {
  defaultStationGradeConfig,
  normalizeStationGradeConfig,
  type StationGradeConfig,
} from './game/stationGradeConfig'
import { setStationGradeConfig } from './game/station'
import { setViewerBalance } from './game/viewerBalance'
import { normalizeOwnerCharacterId } from './events/types'
import {
  createRegisteredCharacter,
  findCharacterProfileUrl,
  findLevelIdleVideoUrl,
  normalizeOwnedCreator,
  normalizeRegisteredCharacter,
  type OwnedCreator,
  type RegisteredCharacter,
  type CharacterVideo,
} from './game/characters'
import { fetchPublicJson } from './game/publicJson'
import { resolveMediaSrc } from './game/mediaUrl'
import { createInitialStudioSlots, type StudioSlot } from './game/studioSlots'
import {
  createRegisteredStaff,
  normalizeRegisteredStaff,
  staffMediaUrl,
  type AddStaffPayload,
  type RegisteredStaff,
} from './game/staff'
import { mergeSeededStaff } from './game/staffRoster'
import {
  createEmptySlotManagerState,
  ensureUnlockedSlotManagers,
  removeStaffFromState,
  type SlotManagerState,
} from './game/slotManagers'
import type { AddCharacterPayload } from './screens/EditorScreen'
import { EditorScreen } from './screens/EditorScreen'
import { InGame } from './screens/InGame'
import { MainMenu } from './screens/MainMenu'
import { hydrateOwnedCreator, type GameSave } from './game/save'
import {
  captureCurrentSave,
  flushAutoSave,
  loadGame,
  saveGame,
} from './game/saveService'
import { NewGameModal } from './screens/NewGameModal'
import { LoadGameModal } from './screens/LoadGameModal'
import {
  BGM_TRACKS,
  emptyBgmConfig,
  normalizeBgmConfig,
  setBgmLibrary,
  type BgmTrack,
  type GameBgmConfig,
} from './game/bgm'

const STAFF_STORAGE_KEY = 'broadcast-staff-json'

type Screen = 'main' | 'game' | 'editor'

/** 미디어 id 기반 고유 파일명 — 같은 원본 이름을 여러 번 올려도 덮어쓰지 않음 */
function buildSafeFileName(mediaId: string, originalName: string) {
  const trimmed = (originalName || 'asset').trim()
  const lastDot = trimmed.lastIndexOf('.')
  const ext =
    lastDot >= 0 ? trimmed.slice(lastDot).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) : ''
  const rawBase = lastDot >= 0 ? trimmed.slice(0, lastDot) : trimmed
  const base =
    rawBase
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48) || 'asset'
  return `${mediaId}__${base}${ext}`
}

function mediaUrl(characterId: string, kind: 'image' | 'video', fileName: string, cacheKey?: string | number) {
  const folder = kind === 'image' ? 'images' : 'videos'
  return resolveMediaSrc(`media://characters/${characterId}/${folder}/${fileName}`, cacheKey ?? fileName)
}

function soundMediaUrl(characterId: string, fileName: string, cacheKey?: string | number) {
  return resolveMediaSrc(
    `media://characters/${characterId}/sounds/${fileName}`,
    cacheKey ?? fileName,
  )
}

function hydrateRegisteredCharacter(c: any): RegisteredCharacter {
  const images = (c.images ?? []).map((img: any) => ({
    ...img,
    url: img.fileName
      ? mediaUrl(c.id, 'image', img.fileName, img.fileSize)
      : img.url
        ? resolveMediaSrc(img.url, img.fileSize)
        : img.file
          ? URL.createObjectURL(img.file)
          : '',
  }))
  const videos = (c.videos ?? []).map((vid: any) => ({
    ...vid,
    stage: Math.max(1, Math.floor(Number(vid.stage ?? 1) || 1)),
    level: 1,
    url: vid.fileName
      ? mediaUrl(c.id, 'video', vid.fileName, vid.fileSize)
      : vid.url
        ? resolveMediaSrc(vid.url, vid.fileSize)
        : vid.file
          ? URL.createObjectURL(vid.file)
          : '',
  }))
  const profileImg = images.find((img: any) => img.id === c.profileImageId)
  const specialVacationRaw = c.specialVacation
  const specialVacation =
    specialVacationRaw && typeof specialVacationRaw === 'object'
      ? {
          ...specialVacationRaw,
          voice:
            specialVacationRaw.voice?.fileName
              ? {
                  ...specialVacationRaw.voice,
                  url: soundMediaUrl(
                    c.id,
                    specialVacationRaw.voice.fileName,
                    specialVacationRaw.voice.fileSize,
                  ),
                }
              : specialVacationRaw.voice ?? null,
        }
      : specialVacationRaw
  return normalizeRegisteredCharacter({
    ...c,
    images,
    videos,
    specialVacation,
    profileImageUrl:
      profileImg?.url ||
      findCharacterProfileUrl({
        id: c.id,
        characterIconId: c.characterIconId,
        profileImageId: c.profileImageId,
        profileImageUrl: c.profileImageUrl ? resolveMediaSrc(c.profileImageUrl) : c.profileImageUrl,
        images,
      }),
  })
}

function hydrateRegisteredStaff(raw: any): RegisteredStaff {
  const images = (raw.images ?? []).map((img: any) => ({
    ...img,
    url: img.fileName
      ? staffMediaUrl(raw.id, img.fileName, img.fileSize)
      : img.url
        ? resolveMediaSrc(img.url, img.fileSize)
        : img.file
          ? URL.createObjectURL(img.file)
          : '',
  }))
  return normalizeRegisteredStaff({
    ...raw,
    images,
  })
}

async function loadRegisteredStaffFromDisk(): Promise<RegisteredStaff[]> {
  let source: any[] = []

  try {
    const res = await window.electronAPI?.loadStaffJson?.()
    if (res?.success && Array.isArray(res.staff)) {
      source = res.staff
    }
  } catch (err) {
    console.error('Failed to load staff via Electron:', err)
  }

  if (source.length === 0 && typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      const parsed = await fetchPublicJson<any[]>('/staff/staff.json')
      if (Array.isArray(parsed) && parsed.length > 0) {
        source = parsed
      }
    } catch (err) {
      console.warn('Failed to load staff.json from public folder:', err)
    }
  }

  if (source.length === 0 && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STAFF_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) source = parsed
      }
    } catch {
      // ignore
    }
  }

  return mergeSeededStaff(source.map(hydrateRegisteredStaff))
}

async function saveStaffMediaToProject(staffId: string, payload: AddStaffPayload): Promise<AddStaffPayload> {
  if (!window.electronAPI?.saveStaffAssets) return payload

  const assetsToSave: Array<{
    id: string
    fileName: string
    kind: string
    buffer: ArrayBuffer
  }> = []

  const images = await Promise.all(
    payload.images.map(async (img) => {
      if (!img.file) {
        if (img.fileName) {
          return {
            ...img,
            file: undefined,
            url: staffMediaUrl(staffId, img.fileName, img.fileSize),
          }
        }
        return { ...img, file: undefined }
      }
      const buffer = await img.file.arrayBuffer()
      const safeName = buildSafeFileName(img.id, img.file.name)
      assetsToSave.push({
        id: img.id,
        fileName: safeName,
        kind: 'image',
        buffer,
      })
      return {
        id: img.id,
        fileName: safeName,
        fileSize: img.file.size,
        url: staffMediaUrl(staffId, safeName, img.file.size),
        file: undefined,
      }
    }),
  )

  if (assetsToSave.length > 0) {
    const res = await window.electronAPI.saveStaffAssets(staffId, assetsToSave)
    if (!res?.success) {
      throw new Error(res?.error || '스태프 이미지를 저장하지 못했습니다.')
    }
  }

  return { ...payload, images }
}

async function loadRegisteredCharactersFromDisk(): Promise<RegisteredCharacter[]> {
  let source: any[] = []

  try {
    const res = await window.electronAPI?.loadCharactersJson?.()
    if (res?.success && Array.isArray(res.characters) && res.characters.length > 0) {
      source = res.characters
    }
  } catch (err) {
    console.error('Failed to load characters via Electron:', err)
  }

  if (source.length === 0 && typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      const parsed = await fetchPublicJson<any[]>('/characters/characters.json')
      if (Array.isArray(parsed) && parsed.length > 0) {
        source = parsed
      }
    } catch (err) {
      console.warn('Failed to load characters.json from public folder:', err)
    }
  }

  if (source.length === 0) {
    try {
      const records = await loadCharacters()
      return records.map((r) => {
        const c = r.character
        c.profileBlob = r.profileBlob || undefined
        if (r.profileBlob) {
          c.profileImageUrl = URL.createObjectURL(r.profileBlob)
        }
        return hydrateRegisteredCharacter(c)
      })
    } catch (err) {
      console.error('Failed to load characters from IndexedDB:', err)
      return []
    }
  }

  const list = source.map(hydrateRegisteredCharacter)
  const migrated: RegisteredCharacter[] = []
  for (const character of list) {
    try {
      migrated.push(await dedupeSharedMediaFiles(character))
    } catch (err) {
      console.error('Failed to migrate character media:', character.id, err)
      migrated.push(character)
    }
  }
  return migrated
}

function syncOwnedWithRegistered(
  owned: OwnedCreator[],
  registered: RegisteredCharacter[],
): OwnedCreator[] {
  if (owned.length === 0) return owned
  let changed = false
  const next = owned.map((creator) => {
    const normalized = normalizeOwnedCreator(creator)
    if (
      normalized.heat !== creator.heat ||
      normalized.trust !== creator.trust ||
      normalized.revenueMult !== creator.revenueMult
    ) {
      changed = true
    }
    const source = registered.find((item) => item.id === creator.id)
    if (!source) return normalized
    if (
      source.videos === creator.videos &&
      source.images === creator.images &&
      source.snsPosts === creator.snsPosts &&
      source.auditMedia === creator.auditMedia &&
      source.shortsVn === creator.shortsVn &&
      source.specialVacation === creator.specialVacation &&
      source.profileImageUrl === creator.profileImageUrl &&
      source.name === creator.name &&
      source.names === creator.names &&
      source.job === creator.job &&
      source.jobs === creator.jobs &&
      source.mediaRevision === creator.mediaRevision &&
      !changed
    ) {
      return normalized
    }
    changed = true
    return normalizeOwnedCreator({
      ...normalized,
      name: source.name,
      names: source.names,
      age: source.age,
      job: source.job,
      jobs: source.jobs,
      bust: source.bust,
      weight: source.weight,
      concept: source.concept,
      eventLinks: source.eventLinks,
      profileImageUrl: source.profileImageUrl,
      profileBlob: source.profileBlob ?? null,
      characterIconId: source.characterIconId,
      characterIllustrationId: source.characterIllustrationId,
      profileImageId: source.profileImageId,
      profileVideoId: source.profileVideoId,
      images: source.images,
      videos: source.videos,
      snsPosts: source.snsPosts,
      auditMedia: source.auditMedia,
      shortsVn: source.shortsVn,
      specialVacation: source.specialVacation,
      mediaRevision: source.mediaRevision,
    })
  })
  return changed ? next : owned
}

function syncStudioSlotsWithOwned(slots: StudioSlot[], owned: OwnedCreator[]): StudioSlot[] {
  let changed = false
  const next = slots.map((slot) => {
    if (!slot.assignment) return slot
    const creator = owned.find((item) => item.id === slot.assignment!.creatorId)
    if (!creator) return slot
    const idleVideoUrl = findLevelIdleVideoUrl(creator)
    const profileImageUrl = findCharacterProfileUrl(creator)
    const revision = creator.mediaRevision
    if (
      slot.assignment.idleVideoUrl === idleVideoUrl &&
      slot.assignment.profileImageUrl === profileImageUrl &&
      slot.assignment.mediaRevision === revision &&
      slot.assignment.creatorName === creator.name &&
      slot.assignment.grade === creator.grade &&
      slot.assignment.statType === creator.statType
    ) {
      return slot
    }
    changed = true
    return {
      ...slot,
      assignment: {
        ...slot.assignment,
        creatorName: creator.name,
        grade: creator.grade,
        statType: creator.statType,
        profileImageUrl,
        idleVideoUrl,
        mediaRevision: revision,
      },
    }
  })
  return changed ? next : slots
}

function collectFileNameRefs(
  images: Array<{ id: string; fileName?: string }>,
  videos: Array<{ id: string; fileName?: string }>,
) {
  const refs = new Map<string, number>()
  for (const item of [...images, ...videos]) {
    if (!item.fileName) continue
    refs.set(item.fileName, (refs.get(item.fileName) || 0) + 1)
  }
  return refs
}

async function saveCharacterMediaToProject(characterId: string, payload: AddCharacterPayload) {
  if (!window.electronAPI?.saveCharacterAssets) return payload

  const assetsToSave: Array<{
    id: string
    fileName: string
    kind: 'image' | 'video' | 'sound'
    buffer: ArrayBuffer
  }> = []
  const obsoleteNames: Array<{ kind: 'image' | 'video' | 'sound'; fileName: string }> = []

  const images = await Promise.all(
    payload.images.map(async (img) => {
      if (!img.file) {
        if (img.fileName) {
          return {
            ...img,
            file: undefined,
            url: mediaUrl(characterId, 'image', img.fileName, img.fileSize),
          }
        }
        return { ...img, file: undefined }
      }

      try {
        const buffer = await img.file.arrayBuffer()
        const safeName = buildSafeFileName(img.id, img.file.name)
        if (img.fileName && img.fileName !== safeName) {
          obsoleteNames.push({ kind: 'image', fileName: img.fileName })
        }
        assetsToSave.push({
          id: img.id,
          fileName: safeName,
          kind: 'image',
          buffer,
        })
        return {
          id: img.id,
          keys: img.keys,
          fileName: safeName,
          fileSize: img.file.size,
          url: mediaUrl(characterId, 'image', safeName, img.file.size),
          file: undefined,
        }
      } catch (err) {
        console.error('Failed to read image arrayBuffer:', err)
        throw err
      }
    }),
  )

  const videos = await Promise.all(
    payload.videos.map(async (vid) => {
      if (!vid.file) {
        if (vid.fileName) {
          return {
            ...vid,
            level: 1,
            file: undefined,
            url: mediaUrl(characterId, 'video', vid.fileName, vid.fileSize),
          }
        }
        return {
          ...vid,
          level: 1,
          file: undefined,
          url: vid.url || '',
        }
      }

      try {
        const buffer = await vid.file.arrayBuffer()
        const safeName = buildSafeFileName(vid.id, vid.file.name)
        if (vid.fileName && vid.fileName !== safeName) {
          obsoleteNames.push({ kind: 'video', fileName: vid.fileName })
        }
        assetsToSave.push({
          id: vid.id,
          fileName: safeName,
          kind: 'video',
          buffer,
        })
        return {
          id: vid.id,
          keys: vid.keys,
          level: 1,
          stage: Math.max(1, Math.floor(Number(vid.stage ?? 1) || 1)),
          fileName: safeName,
          fileSize: vid.file.size,
          url: mediaUrl(characterId, 'video', safeName, vid.file.size),
          file: undefined,
        }
      } catch (err) {
        console.error('Failed to read video arrayBuffer:', err)
        throw err
      }
    }),
  )

  let specialVacation = payload.specialVacation
  if (specialVacation?.voice?.file) {
    const voice = specialVacation.voice
    const buffer = await voice.file.arrayBuffer()
    const safeName = buildSafeFileName(voice.id, voice.file.name)
    if (voice.fileName && voice.fileName !== safeName) {
      obsoleteNames.push({ kind: 'sound', fileName: voice.fileName })
    }
    assetsToSave.push({
      id: voice.id,
      fileName: safeName,
      kind: 'sound',
      buffer,
    })
    specialVacation = {
      ...specialVacation,
      voice: {
        id: voice.id,
        fileName: safeName,
        fileSize: voice.file.size,
        url: soundMediaUrl(characterId, safeName, voice.file.size),
        file: undefined,
      },
    }
  } else if (specialVacation?.voice?.fileName) {
    specialVacation = {
      ...specialVacation,
      voice: {
        ...specialVacation.voice,
        file: undefined,
        url: soundMediaUrl(
          characterId,
          specialVacation.voice.fileName,
          specialVacation.voice.fileSize,
        ),
      },
    }
  }

  if (assetsToSave.length > 0) {
    const res = await window.electronAPI.saveCharacterAssets(characterId, assetsToSave)
    if (!res.success) {
      throw new Error(res.error || '캐릭터 미디어를 폴더에 저장하지 못했습니다.')
    }
  }

  const keptRefs = collectFileNameRefs(images, videos)
  if (specialVacation?.voice?.fileName) {
    keptRefs.set(
      specialVacation.voice.fileName,
      (keptRefs.get(specialVacation.voice.fileName) || 0) + 1,
    )
  }
  if (window.electronAPI.deleteCharacterFile) {
    for (const obsolete of obsoleteNames) {
      if ((keptRefs.get(obsolete.fileName) || 0) > 0) continue
      await window.electronAPI.deleteCharacterFile(characterId, obsolete.kind, obsolete.fileName)
    }
  }

  return {
    ...payload,
    images,
    videos,
    specialVacation,
  }
}

/** 과거에 같은 원본 파일명으로 덮어쓴 미디어를 id별 고유 파일로 복제 */
async function dedupeSharedMediaFiles(character: RegisteredCharacter): Promise<RegisteredCharacter> {
  if (!window.electronAPI?.cloneCharacterFile) return character

  const images = [...(character.images ?? [])]
  const videos = [...(character.videos ?? [])]
  let changed = false

  const migrate = async <T extends { id: string; fileName?: string; url?: string }>(
    kind: 'image' | 'video',
    item: T,
  ): Promise<T> => {
    if (!item.fileName) return item
    const uniqueName = buildSafeFileName(item.id, item.fileName.replace(/^.*?__/, '') || item.fileName)
    if (item.fileName === uniqueName) return item

    const res = await window.electronAPI!.cloneCharacterFile!(
      character.id,
      kind,
      item.fileName,
      uniqueName,
    )
    if (!res.success) {
      console.error('Failed to clone shared media:', res.error, item)
      return item
    }
    changed = true
    return {
      ...item,
      fileName: uniqueName,
      url: mediaUrl(character.id, kind, uniqueName),
    }
  }

  // 파일명이 중복된 항목만 분리 복제 (첫 참조는 원본 유지 후 고유명으로 복사해도 무방)
  const imageNameCount = collectFileNameRefs(images, [])
  const videoNameCount = collectFileNameRefs([], videos)

  for (let i = 0; i < images.length; i++) {
    const name = images[i].fileName
    if (name && (imageNameCount.get(name) || 0) > 1) {
      images[i] = await migrate('image', images[i])
    } else if (name && !name.includes(images[i].id)) {
      // id 접두사가 없는 기존 파일도 고유명으로 정규화
      images[i] = await migrate('image', images[i])
    }
  }

  for (let i = 0; i < videos.length; i++) {
    const name = videos[i].fileName
    if (name && (videoNameCount.get(name) || 0) > 1) {
      videos[i] = await migrate('video', videos[i])
    } else if (name && !name.includes(videos[i].id)) {
      videos[i] = await migrate('video', videos[i])
    }
  }

  if (!changed) return character

  // 더 이상 참조되지 않는 옛 공유 파일 정리
  const kept = collectFileNameRefs(images, videos)
  const oldNames = [
    ...(character.images ?? []).map((img) => ({ kind: 'image' as const, fileName: img.fileName })),
    ...(character.videos ?? []).map((vid) => ({ kind: 'video' as const, fileName: vid.fileName })),
  ]
  if (window.electronAPI.deleteCharacterFile) {
    const seen = new Set<string>()
    for (const old of oldNames) {
      if (!old.fileName || seen.has(old.fileName)) continue
      seen.add(old.fileName)
      if ((kept.get(old.fileName) || 0) > 0) continue
      await window.electronAPI.deleteCharacterFile(character.id, old.kind, old.fileName)
    }
  }

  const profile =
    character.profileImageId != null
      ? images.find((image) => image.id === character.profileImageId)
      : null

  return {
    ...character,
    images,
    videos,
    profileImageUrl: profile?.url || character.profileImageUrl,
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('main')
  /** 에디터에 등록된 캐릭터 (스카우트 풀) */
  const [registeredCharacters, setRegisteredCharacters] = useState<RegisteredCharacter[]>([])
  /** 인게임 보유 크리에이터 — 새 게임 시작 시 비움 */
  const [ownedCreators, setOwnedCreators] = useState<OwnedCreator[]>([])
  /** 스튜디오 배치 — 메인/에디터를 오가도 유지 */
  const [studioSlots, setStudioSlots] = useState<StudioSlot[]>(() => createInitialStudioSlots())
  const [registeredStaff, setRegisteredStaff] = useState<RegisteredStaff[]>([])
  const [isStaffLoaded, setIsStaffLoaded] = useState(false)
  const [managerState, setManagerState] = useState<SlotManagerState>(() => createEmptySlotManagerState())
  /** 에디터 등록 이벤트 상태 (App 단으로 Lift up) */
  const [events, setEvents] = useState<GameEvent[]>([])
  /** 이벤트 로드 완료 상태 플래그 */
  const [isEventsLoaded, setIsEventsLoaded] = useState(false)
  const [commonEventLinks, setCommonEventLinks] = useState<CommonEventLinks>(emptyCommonEventLinks)
  const [isCommonEventLinksLoaded, setIsCommonEventLinksLoaded] = useState(false)
  const [stationGradeConfig, setStationGradeConfigState] = useState<StationGradeConfig>(
    defaultStationGradeConfig,
  )
  const [isStationGradeConfigLoaded, setIsStationGradeConfigLoaded] = useState(false)
  const [bgmConfig, setBgmConfig] = useState<GameBgmConfig>(emptyBgmConfig)
  const [isBgmConfigLoaded, setIsBgmConfigLoaded] = useState(false)
  /** 데이터 로드 완료 상태 플래그 */
  const [isLoaded, setIsLoaded] = useState(false)
  /** 인게임에서 1회 이상 시청한 시뮬레이터 이벤트 */
  const [watchedEventIds, setWatchedEventIds] = useState<string[]>([])
  const [editorReturnScreen, setEditorReturnScreen] = useState<Screen>('main')
  /** 현재 회사 메타 (새 게임/로드 시 설정) */
  const [companyMeta, setCompanyMeta] = useState<{
    id: string
    name: string
    createdAt: number
  } | null>(null)
  /** InGame 재마운트(에디터 복귀/로드) 시 하이드레이션용 세이브 */
  const [initialSave, setInitialSave] = useState<GameSave | null>(null)
  const [showNewGame, setShowNewGame] = useState(false)
  const [showLoadGame, setShowLoadGame] = useState(false)

  function openEditor(returnTo: 'main' | 'game' = 'main') {
    // 에디터 진입 전 현재 진행 상태를 저장 → 복귀 시 초기화 방지
    const latest = captureCurrentSave()
    if (latest) {
      saveGame(latest)
      setInitialSave(latest)
    } else {
      flushAutoSave()
    }
    setEditorReturnScreen(returnTo)
    setScreen('editor')
  }

  // 1. 최초 마운트 시 데이터 로드
  useEffect(() => {
    loadEvents()
      .then((loaded) => {
        setEvents(
          loaded.map((event) => ({
            ...event,
            ownerCharacterId: normalizeOwnerCharacterId(event.ownerCharacterId),
          })),
        )
        setIsEventsLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load events:', err)
        setIsEventsLoaded(true)
      })

    loadRegisteredCharactersFromDisk()
      .then((chars) => {
        setRegisteredCharacters(chars)
        setIsLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load characters:', err)
        setIsLoaded(true)
      })

    loadCommonEventLinks()
      .then((links) => {
        setCommonEventLinks(normalizeCommonEventLinks(links))
        setIsCommonEventLinksLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load common event links:', err)
        setIsCommonEventLinksLoaded(true)
      })

    loadStationGradeConfig()
      .then((config) => {
        const normalized = normalizeStationGradeConfig(config)
        setStationGradeConfigState(normalized)
        setStationGradeConfig(normalized)
        setIsStationGradeConfigLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load station grade config:', err)
        setIsStationGradeConfigLoaded(true)
      })

    loadBgmConfig()
      .then((config) => {
        const normalized = normalizeBgmConfig(config)
        setBgmConfig(normalized)
        setBgmLibrary(normalized)
        setIsBgmConfigLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load BGM config:', err)
        setIsBgmConfigLoaded(true)
      })

    loadRegisteredStaffFromDisk()
      .then((rows) => {
        setRegisteredStaff(rows)
        setIsStaffLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load staff:', err)
        setIsStaffLoaded(true)
      })
  }, [])

  useEffect(() => {
    if (!isCommonEventLinksLoaded) return
    saveCommonEventLinks(commonEventLinks).catch((err) => {
      console.error('Failed to save common event links:', err)
    })
  }, [commonEventLinks, isCommonEventLinksLoaded])

  useEffect(() => {
    if (!isStationGradeConfigLoaded) return
    setStationGradeConfig(stationGradeConfig)
    saveStationGradeConfig(stationGradeConfig).catch((err) => {
      console.error('Failed to save station grade config:', err)
    })
  }, [stationGradeConfig, isStationGradeConfigLoaded])

  useEffect(() => {
    if (!isBgmConfigLoaded) return
    setBgmLibrary(bgmConfig)
    saveBgmConfig(bgmConfig).catch((err) => {
      console.error('Failed to save BGM config:', err)
    })
  }, [bgmConfig, isBgmConfigLoaded])

  // 3. 캐릭터 상태 변경 시 자동 저장
  useEffect(() => {
    if (!isLoaded) return

    if (window.electronAPI?.saveCharactersJson) {
      const cleanCharacters = registeredCharacters.map((c) => {
        const cleanImages = c.images?.map((img) => ({
          id: img.id,
          fileName: img.fileName,
          fileSize: img.fileSize,
          // JSON 저장 시 media:// 커스텀 파일 프로토콜 형태로 치환하여 저장
          url: img.fileName ? `media://characters/${c.id}/images/${img.fileName}` : img.url,
          keys: img.keys,
        })) ?? []
        const cleanVideos = c.videos?.map((vid) => ({
          id: vid.id,
          fileName: vid.fileName,
          fileSize: vid.fileSize,
          url: vid.fileName ? `media://characters/${c.id}/videos/${vid.fileName}` : vid.url,
          keys: vid.keys,
          level: 1,
          stage: Math.max(1, Math.floor(Number(vid.stage ?? 1) || 1)),
        })) ?? []

        const profileImageObj = cleanImages.find((img) => img.id === c.profileImageId)
        const profileImageUrl = profileImageObj ? profileImageObj.url : c.profileImageUrl

        return {
          id: c.id,
          name: c.name,
          names: c.names,
          age: c.age,
          job: c.job,
          jobs: c.jobs,
          bust: c.bust,
          weight: c.weight,
          grade: c.grade,
          statType: c.statType,
          concept: c.concept,
          salary: c.salary,
          eventLinks: c.eventLinks,
          avatarTone: c.avatarTone,
          profileImageUrl: profileImageUrl,
          characterIconId: c.characterIconId || null,
          characterIllustrationId: c.characterIllustrationId || null,
          profileImageId: c.profileImageId || null,
          profileVideoId: c.profileVideoId || null,
          mediaRevision: c.mediaRevision,
          images: cleanImages,
          videos: cleanVideos,
          snsPosts: (c.snsPosts ?? []).map((post) => ({
            id: post.id,
            heat: post.heat,
            imageId: post.imageId,
            videoId: post.videoId ?? null,
            captions: post.captions,
            captionLine: post.captionLine,
            blurRegions: post.blurRegions ?? [],
            blurDefault: post.blurDefault ?? 4,
          })),
          auditMedia: {
            A: {
              url: c.auditMedia?.A?.url ?? null,
              blurRegions: c.auditMedia?.A?.blurRegions ?? [],
            },
            B: {
              url: c.auditMedia?.B?.url ?? null,
              blurRegions: c.auditMedia?.B?.blurRegions ?? [],
            },
            C: {
              url: c.auditMedia?.C?.url ?? null,
              blurRegions: c.auditMedia?.C?.blurRegions ?? [],
            },
          },
          shortsVn: {
            vip: (c.shortsVn?.vip ?? []).map((beat) => ({
              id: beat.id,
              mediaUrl: beat.mediaUrl,
              caption: beat.caption,
              durationSec: beat.durationSec,
              blurRegions: beat.blurRegions ?? [],
              sourceNodeId: beat.sourceNodeId ?? null,
              captionNodeId: beat.captionNodeId ?? null,
            })),
            h: (c.shortsVn?.h ?? []).map((beat) => ({
              id: beat.id,
              mediaUrl: beat.mediaUrl,
              caption: beat.caption,
              durationSec: beat.durationSec,
              blurRegions: beat.blurRegions ?? [],
              sourceNodeId: beat.sourceNodeId ?? null,
              captionNodeId: beat.captionNodeId ?? null,
            })),
          },
          specialVacation: {
            imageIds: c.specialVacation?.imageIds ?? [],
            captions: c.specialVacation?.captions ?? {
              ko: '',
              en: '',
              ja: '',
              'zh-cn': '',
              ru: '',
              es: '',
              de: '',
            },
            voice: c.specialVacation?.voice
              ? {
                  id: c.specialVacation.voice.id,
                  fileName: c.specialVacation.voice.fileName,
                  fileSize: c.specialVacation.voice.fileSize,
                  url: c.specialVacation.voice.url,
                }
              : null,
          },
        }
      })
      window.electronAPI.saveCharactersJson(cleanCharacters)
        .catch((err) => console.error('Failed to save characters JSON:', err))
    } else {
      const records = registeredCharacters.map((c) => ({
        id: c.id,
        character: c,
        profileBlob: c.profileBlob || null,
      }))
      saveCharacters(records).catch((err) => console.error('Failed to save characters:', err))
    }
  }, [registeredCharacters, isLoaded])

  // 에디터에서 캐릭터를 수정하면 보유 크리에이터·스튜디오 배치에 즉시 반영
  useEffect(() => {
    if (!isLoaded) return
    setOwnedCreators((prev) => syncOwnedWithRegistered(prev, registeredCharacters))
  }, [registeredCharacters, isLoaded])

  useEffect(() => {
    setStudioSlots((prev) => syncStudioSlotsWithOwned(prev, ownedCreators))
  }, [ownedCreators])

  useEffect(() => {
    setManagerState((prev) => ensureUnlockedSlotManagers(prev, studioSlots))
  }, [studioSlots])

  useEffect(() => {
    if (!isStaffLoaded) return
    const clean = registeredStaff.map((row) => ({
      id: row.id,
      name: row.name,
      names: row.names,
      nameKey: row.nameKey,
      gender: row.gender,
      kind: row.kind,
      iconImageId: row.iconImageId,
      cardImageId: row.cardImageId,
      mediaRevision: row.mediaRevision,
      images: row.images.map((img) => ({
        id: img.id,
        fileName: img.fileName,
        fileSize: img.fileSize,
        url: img.fileName ? `media://staff/${row.id}/images/${img.fileName}` : img.url,
      })),
    }))
    if (window.electronAPI?.saveStaffJson) {
      window.electronAPI.saveStaffJson(clean).catch((err) => console.error('Failed to save staff JSON:', err))
    } else {
      try {
        localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(clean))
      } catch (err) {
        console.error('Failed to save staff to localStorage:', err)
      }
    }
  }, [registeredStaff, isStaffLoaded])

  async function handleRegisterStaff(payload: AddStaffPayload) {
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const saved = await saveStaffMediaToProject(id, payload)
      setRegisteredStaff((prev) => [
        ...prev,
        createRegisteredStaff({
          id,
          name: saved.name,
          names: saved.names,
          nameKey: saved.nameKey,
          gender: saved.gender,
          kind: saved.kind,
          iconImageId: saved.iconImageId,
          cardImageId: saved.cardImageId,
          images: saved.images,
          mediaRevision: Date.now(),
        }),
      ])
    } catch (err) {
      console.error('handleRegisterStaff error:', err)
      alert(err instanceof Error ? err.message : '스태프를 추가하는 도중 오류가 발생했습니다.')
    }
  }

  async function handleUpdateStaff(id: string, payload: AddStaffPayload) {
    try {
      const old = registeredStaff.find((row) => row.id === id)
      const saved = await saveStaffMediaToProject(id, payload)
      if (old && window.electronAPI?.deleteStaffFile) {
        for (const oldImg of old.images) {
          const still = saved.images.some((img) => img.id === oldImg.id)
          if (still || !oldImg.fileName) continue
          await window.electronAPI.deleteStaffFile(id, oldImg.fileName)
        }
      }
      setRegisteredStaff((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row
          for (const img of row.images) {
            if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url)
          }
          return createRegisteredStaff({
            id,
            name: saved.name,
            names: saved.names,
            nameKey: saved.nameKey,
            gender: saved.gender,
            kind: saved.kind,
            iconImageId: saved.iconImageId,
            cardImageId: saved.cardImageId,
            images: saved.images,
            mediaRevision: Date.now(),
          })
        }),
      )
    } catch (err) {
      console.error('handleUpdateStaff error:', err)
      alert(err instanceof Error ? err.message : '스태프를 수정하는 도중 오류가 발생했습니다.')
    }
  }

  function handleDeleteStaff(id: string) {
    if (window.electronAPI?.deleteStaffFolder) {
      window.electronAPI.deleteStaffFolder(id).catch((err) => console.error('Failed to delete staff folder:', err))
    }
    setRegisteredStaff((prev) => {
      const target = prev.find((row) => row.id === id)
      if (target) {
        for (const img of target.images) {
          if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url)
        }
      }
      return prev.filter((row) => row.id !== id)
    })
    setManagerState((prev) => removeStaffFromState(prev, id))
  }

  async function handleRegisterCharacter(payload: AddCharacterPayload) {
    try {
      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const savedPayload = await saveCharacterMediaToProject(tempId, payload)

      const profile =
        savedPayload.profileImageId != null
          ? savedPayload.images.find((image) => image.id === savedPayload.profileImageId)
          : null
      const profileImageUrl = profile?.url || null

      setRegisteredCharacters((prev) => [
        ...prev,
        createRegisteredCharacter({
          id: tempId,
          name: savedPayload.name,
          names: savedPayload.names,
          age: savedPayload.age,
          job: savedPayload.job,
          jobs: savedPayload.jobs,
          bust: savedPayload.bust,
          weight: savedPayload.weight,
          statType: savedPayload.statType,
          eventLinks: savedPayload.eventLinks,
          profileImageUrl,
          profileBlob: null,
          characterIconId: savedPayload.characterIconId,
          characterIllustrationId: savedPayload.characterIllustrationId,
          profileImageId: savedPayload.profileImageId,
          profileVideoId: savedPayload.profileVideoId,
          images: savedPayload.images,
          videos: savedPayload.videos as CharacterVideo[],
          snsPosts: savedPayload.snsPosts,
          auditMedia: savedPayload.auditMedia,
          shortsVn: savedPayload.shortsVn,
          specialVacation: savedPayload.specialVacation,
          mediaRevision: Date.now(),
        }),
      ])
    } catch (err) {
      console.error('handleRegisterCharacter error:', err)
      alert(
        err instanceof Error
          ? err.message
          : '캐릭터를 추가하는 도중 오류가 발생했습니다.',
      )
    }
  }

  async function handleUpdateCharacter(id: string, payload: AddCharacterPayload) {
    try {
      const oldChar = registeredCharacters.find((c) => c.id === id)
      const savedPayload = await saveCharacterMediaToProject(id, payload)

      // 제거된 미디어만 삭제. 다른 항목이 같은 파일명을 쓰면 유지
      if (oldChar && window.electronAPI?.deleteCharacterFile) {
        const keptRefs = collectFileNameRefs(savedPayload.images, savedPayload.videos)
        if (oldChar.images) {
          for (const oldImg of oldChar.images) {
            const stillExists = savedPayload.images.some((img) => img.id === oldImg.id)
            if (stillExists || !oldImg.fileName) continue
            if ((keptRefs.get(oldImg.fileName) || 0) > 0) continue
            await window.electronAPI.deleteCharacterFile(id, 'image', oldImg.fileName)
          }
        }
        if (oldChar.videos) {
          for (const oldVid of oldChar.videos) {
            const stillExists = savedPayload.videos.some((vid) => vid.id === oldVid.id)
            if (stillExists || !oldVid.fileName) continue
            if ((keptRefs.get(oldVid.fileName) || 0) > 0) continue
            await window.electronAPI.deleteCharacterFile(id, 'video', oldVid.fileName)
          }
        }
        const oldVoice = oldChar.specialVacation?.voice
        const nextVoice = savedPayload.specialVacation?.voice
        if (
          oldVoice?.fileName &&
          oldVoice.fileName !== nextVoice?.fileName &&
          (!nextVoice?.fileName || oldVoice.fileName !== nextVoice.fileName)
        ) {
          await window.electronAPI.deleteCharacterFile(id, 'sound', oldVoice.fileName)
        }
      }

      if (window.electronAPI?.pruneCharacterFiles) {
        await window.electronAPI.pruneCharacterFiles(id, {
          image: savedPayload.images
            .map((image) => image.fileName)
            .filter((name): name is string => Boolean(name)),
          video: savedPayload.videos
            .map((video) => video.fileName)
            .filter((name): name is string => Boolean(name)),
          sound: savedPayload.specialVacation?.voice?.fileName
            ? [savedPayload.specialVacation.voice.fileName]
            : [],
        })
      }

      const profile =
        savedPayload.profileImageId != null
          ? savedPayload.images.find((image) => image.id === savedPayload.profileImageId)
          : null
      const profileImageUrl = profile?.url || null

      const nextCharacter = createRegisteredCharacter({
        id,
        name: savedPayload.name,
        names: savedPayload.names,
        age: savedPayload.age,
        job: savedPayload.job,
        jobs: savedPayload.jobs,
        bust: savedPayload.bust,
        weight: savedPayload.weight,
        statType: savedPayload.statType,
        eventLinks: savedPayload.eventLinks,
        profileImageUrl,
        profileBlob: null,
        characterIconId: savedPayload.characterIconId,
        characterIllustrationId: savedPayload.characterIllustrationId,
        profileImageId: savedPayload.profileImageId,
        profileVideoId: savedPayload.profileVideoId,
        images: savedPayload.images,
        videos: savedPayload.videos as CharacterVideo[],
        snsPosts: savedPayload.snsPosts ?? oldChar?.snsPosts ?? [],
        auditMedia: savedPayload.auditMedia ?? oldChar?.auditMedia,
        shortsVn: savedPayload.shortsVn ?? oldChar?.shortsVn,
        specialVacation: savedPayload.specialVacation ?? oldChar?.specialVacation,
        mediaRevision: Date.now(),
      })

      setRegisteredCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c

          if (c.profileImageUrl && c.profileImageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(c.profileImageUrl)
          }
          if (c.images) {
            for (const img of c.images) {
              if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url)
            }
          }
          if (c.videos) {
            for (const vid of c.videos) {
              if (vid.url?.startsWith('blob:')) URL.revokeObjectURL(vid.url)
            }
          }

          return {
            ...c,
            ...nextCharacter,
            grade: c.grade,
            salary: c.salary,
            avatarTone: c.avatarTone,
          }
        }),
      )

      // 이미 스카우트된 크리에이터에도 새 영상/이미지 반영 (대시보드 idle 재생용)
      setOwnedCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...nextCharacter } : c)),
      )
    } catch (err) {
      console.error('handleUpdateCharacter error:', err)
      alert(
        err instanceof Error
          ? err.message
          : '캐릭터를 수정하는 도중 오류가 발생했습니다.',
      )
    }
  }

  function handleDeleteCharacter(id: string) {
    if (window.electronAPI?.deleteCharacterFolder) {
      window.electronAPI.deleteCharacterFolder(id)
        .catch((err) => console.error('Failed to delete character folder from disk:', err))
    }

    setRegisteredCharacters((prev) => {
      const target = prev.find((c) => c.id === id)
      if (target) {
        if (target.profileImageUrl && target.profileImageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(target.profileImageUrl)
        }
        if (target.images) {
          for (const img of target.images) {
            if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url)
          }
        }
        if (target.videos) {
          for (const vid of target.videos) {
            if (vid.url?.startsWith('blob:')) URL.revokeObjectURL(vid.url)
          }
        }
      }
      return prev.filter((c) => c.id !== id)
    })
    setOwnedCreators((prev) => prev.filter((c) => c.id !== id))
  }

  function handleScout(creator: OwnedCreator) {
    setOwnedCreators((prev) => {
      if (prev.some((c) => c.id === creator.id)) return prev
      return [...prev, normalizeOwnedCreator(creator)]
    })
  }

  function startNewGame(companyName: string) {
    const name = (companyName || 'STAR').trim() || 'STAR'
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `company-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    setCompanyMeta({ id, name, createdAt: Date.now() })
    setInitialSave(null)
    setOwnedCreators([])
    setStudioSlots(createInitialStudioSlots())
    setManagerState(createEmptySlotManagerState())
    setWatchedEventIds([])
    setScreen('game')
  }

  function loadSaveGame(id: string) {
    const save = loadGame(id)
    if (!save) return
    setCompanyMeta({ id: save.id, name: save.companyName, createdAt: save.createdAt })
    setInitialSave(save)
    const owned = syncOwnedWithRegistered(
      (save.ownedCreators ?? []).map(hydrateOwnedCreator),
      registeredCharacters,
    )
    setOwnedCreators(owned)
    setStudioSlots(
      syncStudioSlotsWithOwned(save.studioSlots ?? createInitialStudioSlots(), owned),
    )
    setManagerState(save.managerState ?? createEmptySlotManagerState())
    setWatchedEventIds(save.watchedEventIds ?? [])
    setScreen('game')
  }

  function markEventWatched(eventId: string) {
    if (!eventId) return
    setWatchedEventIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]))
  }

  const handleSaveEventsManual = async () => {
    try {
      await saveEvents(events)
      const saveTarget = window.electronAPI?.saveEventsJson
        ? '로컬 JSON 파일(events.json)'
        : '브라우저 DB(IndexedDB)'
      alert(`이벤트 데이터가 ${saveTarget}에 저장되었습니다.`)
    } catch (err) {
      console.error(err)
      const detail = err instanceof Error ? err.message : String(err)
      alert(`이벤트 데이터 저장 중 오류가 발생했습니다.\n${detail}`)
    }
  }

  const handleSaveStationGradeManual = async () => {
    try {
      const updated = await saveStationGradeConfig(stationGradeConfig)
      if (updated) {
        setStationGradeConfigState(updated)
        setStationGradeConfig(updated)
        setViewerBalance(updated.balance)
      }
      const saveTarget = window.electronAPI?.saveStationGradeConfigJson
        ? '로컬 JSON 파일(station_grade_config.json)'
        : '브라우저 저장소(localStorage)'
      alert(`방송국 등급 설정이 ${saveTarget}에 저장되고 즉시 적용되었습니다.`)
    } catch (err) {
      console.error(err)
      alert('방송국 등급 설정 저장 중 오류가 발생했습니다.')
    }
  }

  const handleReloadStationGradeFromFile = async () => {
    try {
      localStorage.removeItem('broadcast-station-grade-config')
      const freshConfig = await loadStationGradeConfig()
      setStationGradeConfigState(freshConfig)
      setStationGradeConfig(freshConfig)
      setViewerBalance(freshConfig.balance)
      alert('🔄 최신 station_grade_config.json 파일 및 밸런스 설정이 게임에 즉시 적용되었습니다!')
    } catch (err) {
      console.error(err)
      alert('방송국 등급 설정 새로고침 중 오류가 발생했습니다.')
    }
  }

  function buildBgmFileName(track: BgmTrack, originalName: string) {
    const trimmed = (originalName || 'bgm').trim()
    const lastDot = trimmed.lastIndexOf('.')
    const ext =
      lastDot >= 0 ? trimmed.slice(lastDot).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 8) : '.mp3'
    return `${track}__${Date.now()}${ext || '.mp3'}`
  }

  function keptBgmFiles(next: GameBgmConfig) {
    return BGM_TRACKS.map((key) => next[key].fileName).filter((name): name is string => Boolean(name))
  }

  async function handleUploadBgm(track: BgmTrack, file: File) {
    const fileName = buildBgmFileName(track, file.name)
    const buffer = await file.arrayBuffer()
    const res = await persistBgmFiles([{ fileName, buffer }])
    if (!res.success) throw new Error(res.error || 'BGM 파일 저장 실패')
    const next = { ...bgmConfig, [track]: { fileName } }
    const prev = bgmConfig[track].fileName
    if (prev && prev !== fileName) {
      await removeBgmFile(prev)
    }
    await pruneUnusedBgmFiles(keptBgmFiles(next))
    setBgmConfig(next)
  }

  async function handleClearBgm(track: BgmTrack) {
    const prev = bgmConfig[track].fileName
    const next = { ...bgmConfig, [track]: { fileName: null } }
    if (prev) {
      await removeBgmFile(prev)
    }
    await pruneUnusedBgmFiles(keptBgmFiles(next))
    setBgmConfig(next)
  }

  if (screen === 'editor') {
    return (
      <EditorScreen
        registeredCharacters={registeredCharacters}
        onRegisterCharacter={handleRegisterCharacter}
        onUpdateCharacter={handleUpdateCharacter}
        onDeleteCharacter={handleDeleteCharacter}
        events={events}
        isEventsLoaded={isEventsLoaded}
        onEventsChange={setEvents}
        onSaveEventsManual={handleSaveEventsManual}
        commonEventLinks={commonEventLinks}
        onCommonEventLinksChange={setCommonEventLinks}
        stationGradeConfig={stationGradeConfig}
        onStationGradeConfigChange={setStationGradeConfigState}
        onSaveStationGradeManual={handleSaveStationGradeManual}
        onReloadStationGradeFromFile={handleReloadStationGradeFromFile}
        registeredStaff={registeredStaff}
        onRegisterStaff={handleRegisterStaff}
        onUpdateStaff={handleUpdateStaff}
        onDeleteStaff={handleDeleteStaff}
        bgmConfig={bgmConfig}
        onBgmConfigChange={setBgmConfig}
        onUploadBgm={handleUploadBgm}
        onClearBgm={handleClearBgm}
        onBack={() => setScreen(editorReturnScreen === 'game' ? 'game' : 'main')}
      />
    )
  }

  if (screen === 'game') {
    return (
      <InGame
        registeredCharacters={registeredCharacters}
        ownedCreators={ownedCreators}
        studioSlots={studioSlots}
        events={events}
        registeredStaff={registeredStaff}
        managerState={managerState}
        onManagerStateChange={setManagerState}
        onStudioSlotsChange={setStudioSlots}
        onOwnedCreatorsChange={setOwnedCreators}
        onScout={handleScout}
        onBack={() => {
          flushAutoSave()
          setScreen('main')
        }}
        onOpenEditor={() => openEditor('game')}
        watchedEventIds={watchedEventIds}
        onEventWatched={markEventWatched}
        stationGradeConfig={stationGradeConfig}
        companyMeta={companyMeta}
        initialSave={initialSave}
      />
    )
  }

  return (
    <>
      <MainMenu
        onNewGame={() => setShowNewGame(true)}
        onLoadGame={(id) => (id ? loadSaveGame(id) : setShowLoadGame(true))}
        onOpenEditor={() => openEditor('main')}
      />
      {showNewGame ? (
        <NewGameModal
          onConfirm={(name) => {
            setShowNewGame(false)
            startNewGame(name)
          }}
          onCancel={() => setShowNewGame(false)}
        />
      ) : null}
      {showLoadGame ? (
        <LoadGameModal
          onLoad={(id) => {
            setShowLoadGame(false)
            loadSaveGame(id)
          }}
          onClose={() => setShowLoadGame(false)}
        />
      ) : null}
    </>
  )
}
