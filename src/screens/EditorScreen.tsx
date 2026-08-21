import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { EventManagePanel } from '../events/EventManagePanel'
import { EventSimulator } from '../events/EventSimulator'
import {
  CHARACTER_EVENT_SLOTS,
  emptyCharacterEventLinks,
  eventUsableInCharacterSlot,
  type CharacterEventLinks,
  type CharacterEventSlotKey,
  type GameEvent,
} from '../events/types'
import type { RegisteredCharacter } from '../game/characters'
import {
  CHARACTER_DEFAULT_LOCALE,
  mergeCharacterLocaleText,
  type CharacterLocaleText,
} from '../game/characterLocales'
import { resolveMediaSrc } from '../game/mediaUrl'

type EditorTab = 'character' | 'notification' | 'event'
type CharacterView = 'list' | 'add' | 'edit'

type EditorScreenProps = {
  registeredCharacters: RegisteredCharacter[]
  onRegisterCharacter: (payload: AddCharacterPayload) => void | Promise<void>
  onUpdateCharacter: (id: string, payload: AddCharacterPayload) => void | Promise<void>
  onDeleteCharacter: (id: string) => void
  events: GameEvent[]
  isEventsLoaded: boolean
  onEventsChange: (events: GameEvent[]) => void
  onSaveEventsManual?: () => void
  onBack: () => void
}

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/ogg,video/quicktime'

function isImageFile(file: File | undefined | null): file is File {
  return Boolean(file && file.type.startsWith('image/'))
}

function isVideoFile(file: File | undefined | null): file is File {
  return Boolean(file && file.type.startsWith('video/'))
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function EditorScreen({
  registeredCharacters,
  onRegisterCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  events,
  isEventsLoaded,
  onEventsChange,
  onSaveEventsManual,
  onBack,
}: EditorScreenProps) {
  const [tab, setTab] = useState<EditorTab>('character')
  const [characterView, setCharacterView] = useState<CharacterView>('list')
  const [editingCharacter, setEditingCharacter] = useState<RegisteredCharacter | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)
  const [simulatorMode, setSimulatorMode] = useState<'debug' | 'game'>('debug')
  const [selectedSimulatorEvent, setSelectedSimulatorEvent] = useState<GameEvent | null>(null)
  const handleSimulateLinkedEvent = (
    character: RegisteredCharacter,
    slotKey: CharacterEventSlotKey,
    mode: 'debug' | 'game'
  ) => {
    const linkedId = character.eventLinks[slotKey]
    const event = linkedId ? events.find((e) => e.id === linkedId) : null
    if (!event) return
    setSelectedSimulatorEvent(event)
    setSimulatorMode(mode)
    setShowSimulator(true)
  }
  const eventsRef = useRef(events)
  eventsRef.current = events

  function openCharacterList() {
    setEditingCharacter(null)
    setCharacterView('list')
  }

  useEffect(() => {
    return () => {
      // Do not revoke events URLs on unmount as they are persisted and used globally.
      // revokeEvents(eventsRef.current)
    }
  }, [])

  return (
    <main className="game-stage fixed inset-0 grid h-dvh grid-rows-[auto_1fr] overflow-hidden">
      <header className="game-hud z-20 flex shrink-0 items-center justify-between px-6 py-3">
        <div>
          <p className="game-kicker">DEV ONLY</p>
          <h1 className="game-title mt-1 text-2xl">EDITOR</h1>
        </div>
        <button type="button" onClick={onBack} className="game-btn px-4 py-2 text-sm">
          뒤로가기
        </button>
      </header>

      <div className="grid min-h-0 grid-cols-[240px_1fr]">
        <aside className="game-dock z-10 flex min-h-0 flex-col gap-2 border-r border-indigo-500/15 px-3 py-4">
          <p className="game-stat-label px-2 mb-1">메뉴</p>
          <button
            type="button"
            onClick={() => {
              setTab('character')
              openCharacterList()
            }}
            className={`game-btn-tab flex w-full items-center justify-start rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
              tab === 'character' ? 'is-active' : ''
            }`}
          >
            캐릭터 관리
          </button>
          <button
            type="button"
            onClick={() => setTab('notification')}
            className={`game-btn-tab flex w-full items-center justify-start rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
              tab === 'notification' ? 'is-active' : ''
            }`}
          >
            알림설정
          </button>
          <button
            type="button"
            onClick={() => setTab('event')}
            className={`game-btn-tab flex w-full items-center justify-start rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
              tab === 'event' ? 'is-active' : ''
            }`}
          >
            이벤트 관리
          </button>
        </aside>

        <section className="relative z-10 min-h-0 overflow-auto p-6">
          {tab === 'character' ? (
            characterView === 'list' ? (
              <div className="game-panel rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">캐릭터 관리</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      등록된 캐릭터는 인게임 스카우트 목록에 등장합니다. ({registeredCharacters.length}명)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCharacterView('add')}
                    className="game-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm"
                  >
                    <span aria-hidden>＋</span>
                    캐릭터 추가
                  </button>
                </div>

                {registeredCharacters.length === 0 ? (
                  <p className="mt-8 text-center text-sm text-slate-500">
                    아직 등록된 캐릭터가 없습니다.
                  </p>
                ) : (
                  <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {registeredCharacters.map((character) => (
                      <li
                        key={character.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                      >
                        {character.profileImageUrl ? (
                          <img
                            src={resolveMediaSrc(character.profileImageUrl)}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-slate-950 ${character.avatarTone}`}
                          >
                            {character.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-100">
                            {character.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {character.grade}급 · {character.concept}
                            {character.age ? ` · ${character.age}세` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCharacter(character)
                              setCharacterView('edit')
                            }}
                            className="game-btn rounded-lg px-2.5 py-1.5 text-xs"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `"${character.name}" 캐릭터를 삭제할까요? 저장된 미디어 파일도 함께 제거됩니다.`,
                                )
                              ) {
                                onDeleteCharacter(character.id)
                              }
                            }}
                            className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : characterView === 'edit' && editingCharacter ? (
              <AddCharacterPanel
                key={editingCharacter.id}
                events={events}
                isEventsLoaded={isEventsLoaded}
                initialCharacter={editingCharacter}
                onCancel={openCharacterList}
                onSubmit={async (payload) => {
                  await onUpdateCharacter(editingCharacter.id, payload)
                  openCharacterList()
                }}
                onSimulateLinkedEvent={handleSimulateLinkedEvent}
              />
            ) : (
              <AddCharacterPanel
                events={events}
                isEventsLoaded={isEventsLoaded}
                onCancel={openCharacterList}
                onSubmit={async (payload) => {
                  await onRegisterCharacter(payload)
                  openCharacterList()
                }}
                onSimulateLinkedEvent={handleSimulateLinkedEvent}
              />
            )
          ) : tab === 'notification' ? (
            <div className="game-panel rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="game-kicker">NOTIFICATION</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-100">알림설정</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    게임 내 알림·이벤트 문구와 조건을 여기에서 구성합니다.
                  </p>
                </div>
                <button
                  type="button"
                  className="game-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm"
                >
                  <span aria-hidden>＋</span>
                  알림 추가
                </button>
              </div>
            </div>
          ) : tab === 'event' ? (
            <EventManagePanel
              events={events}
              onEventsChange={onEventsChange}
              registeredCharacters={registeredCharacters}
              onSaveEventsManual={onSaveEventsManual}
            />
          ) : null}
        </section>
      </div>
      {showSimulator && selectedSimulatorEvent && (
        <EventSimulator
          key={selectedSimulatorEvent.id}
          event={selectedSimulatorEvent}
          mode={simulatorMode}
          returnLabel="에디터로 돌아가기"
          onClose={() => {
            setShowSimulator(false)
            setSelectedSimulatorEvent(null)
          }}
          registeredCharacters={registeredCharacters}
        />
      )}
    </main>
  )
}

type MediaItem = {
  id: string
  file?: File
  fileName?: string
  fileSize?: number
  url: string
  keys: string[]
}

type VideoMediaItem = MediaItem & {
  level: number
  stage: number
}

export type AddCharacterPayload = {
  name: string
  names: CharacterLocaleText
  age: string
  job: string
  jobs: CharacterLocaleText
  bust: string
  weight: string
  characterIconId: string | null
  characterIllustrationId: string | null
  profileImageId: string | null
  profileVideoId: string | null
  eventLinks: CharacterEventLinks
  images: Array<{
    id: string
    file?: File
    fileName?: string
    fileSize?: number
    url?: string
    keys: string[]
  }>
  videos: Array<{
    id: string
    file?: File
    fileName?: string
    fileSize?: number
    url?: string
    keys: string[]
    level: number
    stage: number
  }>
}

type AddCharacterPanelProps = {
  events: GameEvent[]
  isEventsLoaded: boolean
  initialCharacter?: RegisteredCharacter | null
  onCancel: () => void
  onSubmit: (payload: AddCharacterPayload) => void | Promise<void>
  onSimulateLinkedEvent: (character: RegisteredCharacter, slotKey: CharacterEventSlotKey, mode: 'debug' | 'game') => void
}

const fieldClassName =
  'mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/40'

function AddCharacterPanel({
  events,
  isEventsLoaded,
  initialCharacter = null,
  onCancel,
  onSubmit,
  onSimulateLinkedEvent,
}: AddCharacterPanelProps) {
  const isEditing = Boolean(initialCharacter)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const createdObjectUrls = useRef(new Set<string>())
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState(initialCharacter?.name ?? '')
  const [age, setAge] = useState(initialCharacter?.age ?? '')
  const [job, setJob] = useState(initialCharacter?.job ?? '')
  const [bust, setBust] = useState(initialCharacter?.bust ?? '')
  const [weight, setWeight] = useState(initialCharacter?.weight ?? '')
  const [eventLinks, setEventLinks] = useState<CharacterEventLinks>(() => ({
    ...emptyCharacterEventLinks(),
    ...(initialCharacter?.eventLinks ?? {}),
  }))

  const [images, setImages] = useState<MediaItem[]>(() =>
    (initialCharacter?.images ?? []).map((image) => {
      const rawUrl =
        image.url ||
        (image.fileName && initialCharacter
          ? `media://characters/${initialCharacter.id}/images/${image.fileName}`
          : '')
      return {
        id: image.id,
        file: image.file,
        fileName: image.fileName,
        fileSize: image.fileSize,
        url: resolveMediaSrc(rawUrl),
        keys: image.keys ?? [],
      }
    }),
  )
  const [characterIconId, setCharacterIconId] = useState<string | null>(
    initialCharacter?.characterIconId ?? null,
  )
  const [characterIllustrationId, setCharacterIllustrationId] = useState<string | null>(
    initialCharacter?.characterIllustrationId ?? null,
  )
  const [profileImageId, setProfileImageId] = useState<string | null>(
    initialCharacter?.profileImageId ?? null,
  )
  const [imageDragging, setImageDragging] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageKeyDrafts, setImageKeyDrafts] = useState<Record<string, string>>({})

  const [videos, setVideos] = useState<VideoMediaItem[]>(() =>
    (initialCharacter?.videos ?? []).map((video) => {
      const rawUrl =
        video.url ||
        (video.fileName && initialCharacter
          ? `media://characters/${initialCharacter.id}/videos/${video.fileName}`
          : '')
      return {
        id: video.id,
        file: video.file,
        fileName: video.fileName,
        fileSize: video.fileSize,
        url: resolveMediaSrc(rawUrl),
        keys: video.keys ?? [],
        level: 1,
        stage: Math.max(1, Math.floor(Number(video.stage ?? 1) || 1)),
      }
    }),
  )
  const [profileVideoId, setProfileVideoId] = useState<string | null>(
    initialCharacter?.profileVideoId ?? null,
  )
  const [videoDragging, setVideoDragging] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)

  // Drop links to events that were deleted from event management
  useEffect(() => {
    if (!isEventsLoaded) return
    const ids = new Set(events.map((event) => event.id))
    setEventLinks((prev) => {
      let changed = false
      const next = { ...prev }
      for (const slot of CHARACTER_EVENT_SLOTS) {
        const linked = next[slot.key]
        if (linked && !ids.has(linked)) {
          next[slot.key] = null
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [events, isEventsLoaded])

  function setEventLink(slot: CharacterEventSlotKey, eventId: string | null) {
    setEventLinks((prev) => ({ ...prev, [slot]: eventId }))
  }

  function trackObjectUrl(url: string) {
    createdObjectUrls.current.add(url)
    return url
  }

  function revokeTrackedUrl(url: string | undefined) {
    if (!url || !createdObjectUrls.current.has(url)) return
    URL.revokeObjectURL(url)
    createdObjectUrls.current.delete(url)
  }

  useEffect(() => {
    return () => {
      for (const url of createdObjectUrls.current) URL.revokeObjectURL(url)
      createdObjectUrls.current.clear()
    }
  }, [])

  function addImages(files: FileList | File[]) {
    const list = Array.from(files)
    const imageFiles = list.filter(isImageFile)
    if (imageFiles.length === 0) {
      setImageError('이미지 파일만 등록할 수 있습니다.')
      return
    }
    setImageError(
      imageFiles.length < list.length ? '이미지 파일만 추가되었습니다. (영상은 제외됨)' : null,
    )
    setImages((prev) => [
      ...prev,
      ...imageFiles.map((file) => ({
        id: createId(),
        file,
        fileName: file.name,
        fileSize: file.size,
        url: trackObjectUrl(URL.createObjectURL(file)),
        keys: [] as string[],
      })),
    ])
  }

  function addVideos(files: FileList | File[]) {
    const list = Array.from(files)
    const videoFiles = list.filter(isVideoFile)
    if (videoFiles.length === 0) {
      setVideoError('영상 파일만 등록할 수 있습니다.')
      return
    }
    setVideoError(
      videoFiles.length < list.length ? '영상 파일만 추가되었습니다. (이미지는 제외됨)' : null,
    )
    setVideos((prev) => {
      const hasIdle = prev.some((vid) => vid.keys.includes('idle'))
      const added = videoFiles.map((file, index) => ({
        id: createId(),
        file,
        fileName: file.name,
        fileSize: file.size,
        url: trackObjectUrl(URL.createObjectURL(file)),
        keys: !hasIdle && index === 0 ? (['idle'] as string[]) : ([] as string[]),
        level: 1,
        stage: 1,
      }))
      return [...prev, ...added]
    })
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) revokeTrackedUrl(target.url)
      return prev.filter((item) => item.id !== id)
    })
    setCharacterIconId((current) => (current === id ? null : current))
    setCharacterIllustrationId((current) => (current === id ? null : current))
    setProfileImageId((current) => (current === id ? null : current))
    setImageKeyDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function removeVideo(id: string) {
    setVideos((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) revokeTrackedUrl(target.url)
      const next = prev.filter((item) => item.id !== id)
      // 제거한 영상이 기본 대기였으면 남은 첫 영상을 자동 지정
      if (target?.keys.includes('idle')) {
        const fallback = next[0]
        if (fallback) {
          return next.map((item) =>
            item.id === fallback.id
              ? { ...item, keys: item.keys.includes('idle') ? item.keys : ['idle', ...item.keys] }
              : item,
          )
        }
      }
      return next
    })
    setProfileVideoId((current) => (current === id ? null : current))
  }

  function setVideoAsIdle(id: string) {
    setVideos((prev) => {
      const target = prev.find((item) => item.id === id)
      if (!target) return prev
      return prev.map((item) => {
        const keysWithoutIdle = item.keys.filter((key) => key !== 'idle')
        if (item.id === id) {
          return { ...item, keys: ['idle', ...keysWithoutIdle], level: 1 }
        }
        return { ...item, keys: keysWithoutIdle, level: 1 }
      })
    })
  }

  function setVideoStage(id: string, nextStageRaw: number) {
    const nextStage = Math.max(1, Math.floor(Number(nextStageRaw) || 1))
    setVideos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stage: nextStage } : item)),
    )
  }

  function addKey(
    itemId: string,
    drafts: Record<string, string>,
    setDrafts: (updater: (prev: Record<string, string>) => Record<string, string>) => void,
    setItems: (updater: (prev: MediaItem[]) => MediaItem[]) => void,
  ) {
    const draft = (drafts[itemId] ?? '').trim()
    if (!draft) return
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        if (item.keys.includes(draft)) return item
        return { ...item, keys: [...item.keys, draft] }
      }),
    )
    setDrafts((prev) => ({ ...prev, [itemId]: '' }))
  }

  function removeKey(
    itemId: string,
    key: string,
    setItems: (updater: (prev: MediaItem[]) => MediaItem[]) => void,
  ) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, keys: item.keys.filter((k) => k !== key) } : item,
      ),
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving) return
    // 에디터는 한국어만 편집. 다른 언어 번역은 기존 값을 유지한다.
    const names: CharacterLocaleText = {
      ...mergeCharacterLocaleText(initialCharacter?.names, initialCharacter?.name ?? ''),
      [CHARACTER_DEFAULT_LOCALE]: trimmed,
    }
    const jobs: CharacterLocaleText = {
      ...mergeCharacterLocaleText(initialCharacter?.jobs, initialCharacter?.job ?? ''),
      [CHARACTER_DEFAULT_LOCALE]: job.trim(),
    }
    setSaving(true)
    try {
      await onSubmit({
        name: trimmed,
        names,
        age: age.trim(),
        job: job.trim(),
        jobs,
        bust: bust.trim(),
        weight: weight.trim(),
        characterIconId,
        characterIllustrationId,
        profileImageId,
        profileVideoId,
        eventLinks,
        images: images.map((image) => ({
          id: image.id,
          file: image.file,
          fileName: image.fileName,
          fileSize: image.fileSize,
          url: image.url,
          keys: image.keys,
        })),
        videos: videos.map((video) => ({
          id: video.id,
          file: video.file,
          fileName: video.fileName,
          fileSize: video.fileSize,
          url: video.url,
          keys: video.keys,
          level: 1,
          stage: video.stage,
        })),
      })
    } finally {
      setSaving(false)
    }
  }

  function buildDraftCharacter(): RegisteredCharacter {
    const names: CharacterLocaleText = {
      ...mergeCharacterLocaleText(initialCharacter?.names, initialCharacter?.name ?? ''),
      [CHARACTER_DEFAULT_LOCALE]: name.trim(),
    }
    const jobs: CharacterLocaleText = {
      ...mergeCharacterLocaleText(initialCharacter?.jobs, initialCharacter?.job ?? ''),
      [CHARACTER_DEFAULT_LOCALE]: job.trim(),
    }
    return {
      grade: 'C',
      popularity: 0,
      concept: job.trim() || '뉴비',
      salary: 0,
      avatarTone: '',
      profileImageUrl: null,
      images: [],
      videos: [],
      ...(initialCharacter ?? {}),
      id: initialCharacter?.id ?? 'temp_id',
      name: name.trim(),
      names,
      age,
      job: job.trim(),
      jobs,
      bust,
      weight,
      eventLinks,
    }
  }

  return (
    <form onSubmit={handleSubmit} className="game-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="game-kicker">CHARACTER</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">
            {isEditing ? '캐릭터 수정' : '캐릭터 추가'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isEditing
              ? '프로필, 기본 정보, 이미지·영상, 이벤트를 수정합니다.'
              : '프로필, 기본 정보, 이미지·영상, 이벤트를 등록합니다.'}
          </p>
        </div>
        <button type="button" onClick={onCancel} className="game-btn shrink-0 rounded-xl px-4 py-2 text-sm">
          목록으로
        </button>
      </div>

      <div className="mt-6 max-w-3xl space-y-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-wrap gap-4">
            <ProfilePickPreview
              label="캐릭터 아이콘"
              selectedId={characterIconId}
              options={images}
              onSelect={(id) => setCharacterIconId(id)}
              kind="image"
              size="icon"
            />

            <ProfilePickPreview
              label="캐릭터 일러스트"
              selectedId={characterIllustrationId}
              options={images}
              onSelect={(id) => setCharacterIllustrationId(id)}
              kind="image"
              size="illustration"
            />

            <ProfilePickPreview
              label="프로필 이미지"
              selectedId={profileImageId}
              options={images}
              onSelect={(id) => setProfileImageId(id)}
              kind="image"
            />

            <ProfilePickPreview
              label="프로필 영상"
              selectedId={profileVideoId}
              options={videos}
              onSelect={(id) => setProfileVideoId(id)}
              kind="video"
            />
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="game-stat-label">캐릭터 이름</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                autoFocus
                className={fieldClassName}
              />
            </label>

            <label className="block">
              <span className="game-stat-label">나이</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="예: 22"
                className={fieldClassName}
              />
            </label>

            <label className="block">
              <span className="game-stat-label">직업</span>
              <input
                type="text"
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="예: 스트리머"
                className={fieldClassName}
              />
            </label>

            <label className="block">
              <span className="game-stat-label">가슴 크기</span>
              <input
                type="text"
                value={bust}
                onChange={(e) => setBust(e.target.value)}
                placeholder="예: C컵"
                className={fieldClassName}
              />
            </label>

            <label className="block">
              <span className="game-stat-label">몸무게</span>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="예: 48kg"
                className={fieldClassName}
              />
            </label>
          </div>
        </div>

        <MediaRegisterSection
          title="이미지 등록"
          description="이미지를 등록한 뒤 키를 연결하고, 아이콘·일러스트·프로필 이미지로 지정할 수 있습니다."
          dropLabel="이미지를 드래그 앤 드롭"
          dropHint="또는 클릭해서 파일 선택 (PNG, JPG, WEBP, GIF) · 여러 개 가능"
          accept={IMAGE_ACCEPT}
          inputRef={imageInputRef}
          dragging={imageDragging}
          setDragging={setImageDragging}
          error={imageError}
          onAddFiles={addImages}
          items={images}
          profileId={profileImageId}
          drafts={imageKeyDrafts}
          profileBadge="프로필 이미지"
          onDraftChange={(id, value) =>
            setImageKeyDrafts((prev) => ({ ...prev, [id]: value }))
          }
          onAddKey={(id) => addKey(id, imageKeyDrafts, setImageKeyDrafts, setImages)}
          onRemoveKey={(id, key) => removeKey(id, key, setImages)}
          onSetProfile={(id) =>
            setProfileImageId((current) => (current === id ? null : id))
          }
          onRemove={removeImage}
          renderPreview={(item) => (
            <img
              src={item.url}
              alt={item.file?.name || item.fileName || '이미지'}
              className="h-28 w-full rounded-xl bg-black object-cover sm:w-44"
            />
          )}
        />

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">수위 영상 등록</h3>
            <p className="mt-1 text-xs text-slate-500">
              기본 대기 영상 1개와 방송용 클립을 등록합니다. 수위 단계는 숫자로 입력합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-slate-200">등록 영상</span>
              <span className="text-[10px] text-slate-500">
                등록 {videos.length}개 ·{' '}
                {videos.some((v) => v.keys?.includes('idle'))
                  ? '✅ 기본 대기 완료'
                  : '⚠️ 기본 대기 필요'}
              </span>
            </div>

            <GradedVideoRegisterSection
              videos={videos}
              videoDragging={videoDragging}
              setVideoDragging={setVideoDragging}
              videoError={videoError}
              onAddVideos={addVideos}
              onSetIdle={setVideoAsIdle}
              onChangeStage={setVideoStage}
              onRemove={removeVideo}
            />
          </div>
        </div>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">이벤트 연동</h3>
            <p className="mt-1 text-xs text-slate-500">
              이벤트 관리에 등록된 이벤트를 슬롯별로 연결합니다. 미디어·사운드가 묶인 이벤트 ID로
              나중에 참조됩니다.
            </p>
          </div>

          {events.length === 0 ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
              등록된 이벤트가 없습니다. 왼쪽 메뉴의 <span className="font-semibold">이벤트 관리</span>
              에서 ZIP을 추가한 뒤 연결하세요.
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CHARACTER_EVENT_SLOTS.map((slot) => {
              const linkedId = eventLinks[slot.key]
              const linked = linkedId ? events.find((event) => event.id === linkedId) : null
              return (
                <label key={slot.key} className="block">
                  <span className="game-stat-label">{slot.label}</span>
                  <select
                    value={linkedId ?? ''}
                    disabled={events.length === 0}
                    onChange={(e) => setEventLink(slot.key, e.target.value || null)}
                    className={`${fieldClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <option value="">연결 안 함</option>
                    {events
                      .filter((event) =>
                        eventUsableInCharacterSlot(event, initialCharacter?.id ?? '', linkedId),
                      )
                      .map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} (미디어 {event.media.length})
                      </option>
                    ))}
                  </select>
                  {linked ? (
                    <div className="mt-1.5 flex items-center justify-between gap-2 bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
                      <p className="truncate text-xs text-slate-400">
                        {linked.projectTitle} · ch{linked.chapterId} · 노드 {linked.nodes.length}개
                      </p>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onSimulateLinkedEvent(buildDraftCharacter(), slot.key, 'debug')
                          }}
                          className="rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-2 py-0.5 text-[10px] text-indigo-300 font-medium transition cursor-pointer"
                        >
                          디버그
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSimulateLinkedEvent(buildDraftCharacter(), slot.key, 'game')
                          }}
                          className="rounded bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/25 px-2 py-0.5 text-[10px] text-pink-300 font-medium transition cursor-pointer"
                        >
                          인게임
                        </button>
                      </div>
                    </div>
                  ) : null}
                </label>
              )
            })}
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="game-btn rounded-xl px-4 py-2 text-sm disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="game-btn-primary rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? '저장 중…' : isEditing ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </form>
  )
}

type ProfilePickPreviewProps = {
  label: string
  selectedId: string | null
  options: MediaItem[]
  onSelect: (id: string | null) => void
  kind: 'image' | 'video'
  size?: 'default' | 'icon' | 'illustration'
}

function ProfilePickPreview({
  label,
  selectedId,
  options,
  onSelect,
  kind,
  size = 'default',
}: ProfilePickPreviewProps) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const selected = options.find((item) => item.id === selectedId) ?? null
  const mediaLabel = kind === 'image' ? '이미지' : '영상'
  const isIcon = size === 'icon'
  const isIllustration = size === 'illustration'

  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <>
      <div>
        <span className="game-stat-label">{label}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`mt-2 flex flex-col overflow-hidden border border-white/15 bg-black/20 text-left transition hover:border-indigo-400/40 ${
            isIcon
              ? 'h-24 w-24 rounded-full'
              : isIllustration
                ? 'aspect-[3/4] h-44 w-auto rounded-2xl'
                : 'h-36 w-36 rounded-2xl'
          }`}
          aria-haspopup="dialog"
        >
          {selected ? (
            kind === 'image' ? (
              <img
                src={selected.url}
                alt={`${label} 미리보기`}
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                src={selected.url}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
              <span className={`${isIcon ? 'text-lg' : 'text-xl'} text-indigo-300`} aria-hidden>
                ＋
              </span>
              <p className={`leading-snug text-slate-400 ${isIcon ? 'text-[10px]' : 'text-[11px]'}`}>
                {isIcon ? '아이콘 선택' : isIllustration ? '일러스트 선택' : '클릭해서 선택'}
              </p>
            </div>
          )}
        </button>
      </div>

      {open ? (
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            role="presentation"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
              className="game-panel-strong flex max-h-[min(36rem,85dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div>
                  <p className="game-kicker">SELECT</p>
                  <h3 id={titleId} className="mt-1 text-lg font-semibold text-slate-100">
                    {label} 선택
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {options.length > 0
                      ? `등록된 ${mediaLabel} ${options.length}개 · 미리보기를 눌러 선택`
                      : `등록된 ${mediaLabel}가 없습니다`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="game-btn shrink-0 rounded-xl px-3 py-1.5 text-sm"
                >
                  닫기
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-5">
                {options.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {options.map((item) => {
                      const isActive = item.id === selectedId
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onSelect(item.id)
                              setOpen(false)
                            }}
                            className={`group flex w-full flex-col overflow-hidden rounded-2xl border text-left transition ${
                              isActive
                                ? 'border-indigo-400/60 ring-2 ring-indigo-400/35'
                                : 'border-white/10 hover:border-indigo-400/40'
                            }`}
                          >
                            <div className="relative aspect-square bg-black/40">
                              {kind === 'image' ? (
                                <img
                                  src={item.url}
                                  alt={item.file?.name || item.fileName || '미리보기'}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <video
                                  src={item.url}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="h-full w-full object-cover"
                                />
                              )}
                              {isActive ? (
                                <span className="absolute top-2 right-2 rounded-md bg-indigo-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                  선택됨
                                </span>
                              ) : null}
                            </div>
                            <div className="border-t border-white/10 bg-black/30 px-2.5 py-2">
                              <p className="truncate text-xs font-medium text-slate-100">
                                {item.file?.name || item.fileName || '이름 없음'}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                {formatFileSize(item.file?.size || item.fileSize || 0)}
                              </p>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 text-center">
                    <p className="text-sm text-slate-300">선택할 {mediaLabel}가 없습니다.</p>
                    <p className="mt-1 text-xs text-slate-500">
                      먼저 {mediaLabel} 등록 영역에서 파일을 추가하세요.
                    </p>
                  </div>
                )}
              </div>

              {selectedId ? (
                <div className="flex justify-end border-t border-white/10 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(null)
                      setOpen(false)
                    }}
                    className="game-btn rounded-xl px-4 py-2 text-sm"
                  >
                    선택 해제
                  </button>
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )
      ) : null}
    </>
  )
}

type MediaRegisterSectionProps = {
  title: string
  description: string
  dropLabel: string
  dropHint: string
  accept: string
  inputRef: RefObject<HTMLInputElement | null>
  dragging: boolean
  setDragging: (value: boolean) => void
  error: string | null
  onAddFiles: (files: FileList | File[]) => void
  items: MediaItem[]
  profileId: string | null
  drafts: Record<string, string>
  profileBadge: string
  onDraftChange: (id: string, value: string) => void
  onAddKey: (id: string) => void
  onRemoveKey: (id: string, key: string) => void
  onSetProfile: (id: string) => void
  onRemove: (id: string) => void
  renderPreview: (item: MediaItem) => ReactNode
}

function MediaRegisterSection({
  title,
  description,
  dropLabel,
  dropHint,
  accept,
  inputRef,
  dragging,
  setDragging,
  error,
  onAddFiles,
  items,
  profileId,
  drafts,
  profileBadge,
  onDraftChange,
  onAddKey,
  onRemoveKey,
  onSetProfile,
  onRemove,
  renderPreview,
}: MediaRegisterSectionProps) {
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) onAddFiles(e.dataTransfer.files)
  }

  return (
    <section>
      <div>
        <span className="game-stat-label">{title}</span>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragging(false)
          }
        }}
        onDrop={handleDrop}
        className={`mt-3 flex min-h-[8.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition ${
          dragging
            ? 'border-indigo-400/70 bg-indigo-500/15'
            : 'border-white/15 bg-black/20 hover:border-indigo-400/40 hover:bg-black/30'
        }`}
      >
        <span className="text-2xl text-indigo-300" aria-hidden>
          ＋
        </span>
        <p className="text-sm font-medium text-slate-200">{dropLabel}</p>
        <p className="text-xs text-slate-500">{dropHint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onAddFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      {items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <MediaKeyCard
              key={item.id}
              item={item}
              isProfile={profileId === item.id}
              draft={drafts[item.id] ?? ''}
              profileBadge={profileBadge}
              onDraftChange={(value) => onDraftChange(item.id, value)}
              onAddKey={() => onAddKey(item.id)}
              onRemoveKey={(keyName) => onRemoveKey(item.id, keyName)}
              onSetProfile={() => onSetProfile(item.id)}
              onRemove={() => onRemove(item.id)}
              preview={renderPreview(item)}
            />
          ))}
        </ul>
      ) : null}
    </section>
  )
}

type MediaKeyCardProps = {
  item: MediaItem
  isProfile: boolean
  draft: string
  profileBadge: string
  onDraftChange: (value: string) => void
  onAddKey: () => void
  onRemoveKey: (key: string) => void
  onSetProfile: () => void
  onRemove: () => void
  preview: ReactNode
}

function MediaKeyCard({
  item,
  isProfile,
  draft,
  profileBadge,
  onDraftChange,
  onAddKey,
  onRemoveKey,
  onSetProfile,
  onRemove,
  preview,
}: MediaKeyCardProps) {
  const draftId = useId()

  return (
    <li
      className={`rounded-2xl border bg-black/25 p-4 ${
        isProfile ? 'border-indigo-400/45 ring-1 ring-indigo-400/25' : 'border-white/10'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="shrink-0 sm:w-44">{preview}</div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-slate-100">
                  {item.file?.name || item.fileName || '미디어'}
                </p>
                {isProfile ? <span className="game-chip-gold">{profileBadge}</span> : null}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatFileSize(item.file?.size || item.fileSize || 0)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={onSetProfile}
                className={`rounded-lg px-2.5 py-1 text-xs ${
                  isProfile ? 'game-btn-primary' : 'game-btn'
                }`}
              >
                {isProfile ? '프로필 해제' : '프로필로 지정'}
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="game-btn rounded-lg px-2.5 py-1 text-xs"
              >
                제거
              </button>
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor={draftId} className="game-stat-label">
              키 등록
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id={draftId}
                type="text"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAddKey()
                  }
                }}
                placeholder="예: idle, Q, dance"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/40"
              />
              <button
                type="button"
                onClick={onAddKey}
                disabled={!draft.trim()}
                className="game-btn-primary shrink-0 rounded-xl px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                키 추가
              </button>
            </div>

            {item.keys.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.keys.map((keyName) => (
                  <span key={keyName} className="game-chip inline-flex items-center gap-1.5 pr-1">
                    {keyName}
                    <button
                      type="button"
                      onClick={() => onRemoveKey(keyName)}
                      className="rounded-md px-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
                      aria-label={`${keyName} 키 삭제`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">아직 등록된 키가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

/** 수위 영상 등록 (기본 대기 1개 + 방송 클립) */
type GradedVideoRegisterSectionProps = {
  videos: VideoMediaItem[]
  videoDragging: boolean
  setVideoDragging: (d: boolean) => void
  videoError: string | null
  onAddVideos: (files: FileList | File[]) => void
  onSetIdle: (id: string) => void
  onChangeStage: (id: string, stage: number) => void
  onRemove: (id: string) => void
}

function GradedVideoRegisterSection({
  videos,
  videoDragging,
  setVideoDragging,
  videoError,
  onAddVideos,
  onSetIdle,
  onChangeStage,
  onRemove,
}: GradedVideoRegisterSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setVideoDragging(true)
        }}
        onDragLeave={() => setVideoDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setVideoDragging(false)
          if (e.dataTransfer.files) {
            onAddVideos(e.dataTransfer.files)
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed py-6 px-4 transition ${
          videoDragging
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-white/10 bg-black/15 hover:bg-black/25 hover:border-white/20'
        }`}
      >
        <input
          type="file"
          ref={inputRef}
          multiple
          accept={VIDEO_ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              onAddVideos(e.target.files)
            }
          }}
        />
        <span className="text-xl">🎥</span>
        <p className="mt-1.5 text-xs font-semibold text-slate-300">
          영상을 드래그 앤 드롭하거나 클릭하여 추가
        </p>
        <p className="mt-0.5 text-[10px] text-slate-500">MP4, WEBM, MOV 지원 · 여러 개 가능</p>
      </div>

      {videoError && <p className="text-[11px] text-rose-400">{videoError}</p>}

      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((item) => {
            const hasIdle = item.keys.includes('idle')
            const sizeMB = item.fileSize ? (item.fileSize / (1024 * 1024)).toFixed(1) : '—'
            return (
              <div
                key={item.id}
                className={`flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-2.5 sm:flex-row sm:items-center ${
                  hasIdle ? 'ring-1 ring-indigo-500/30 border-indigo-500/30' : ''
                }`}
              >
                <div className="relative shrink-0 overflow-hidden rounded-lg bg-black">
                  <video
                    key={`${item.id}-${item.fileName ?? ''}-${item.fileSize ?? 0}-${item.url}`}
                    src={resolveMediaSrc(item.url, item.fileSize ?? item.id)}
                    controls
                    preload="auto"
                    playsInline
                    className="h-20 w-36 object-cover"
                  />
                  {hasIdle && (
                    <span className="absolute top-1 right-1 rounded bg-indigo-500 px-1 py-0.5 text-[8px] font-bold text-white shadow">
                      기본 대기
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <p className="truncate text-xs font-semibold text-slate-200">
                    {item.file?.name || item.fileName || '동영상'}
                  </p>
                  <p className="text-[10px] text-slate-500">{sizeMB} MB</p>
                  <label className="flex items-center gap-2">
                    <span className="shrink-0 text-[10px] font-semibold tracking-wide text-slate-400">
                      수위 단계
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={item.stage}
                      onChange={(e) =>
                        onChangeStage(item.id, Math.max(1, Math.floor(Number(e.target.value) || 1)))
                      }
                      className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] font-semibold text-slate-100 outline-none transition focus:border-indigo-400/40"
                    />
                  </label>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSetIdle(item.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      hasIdle
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {hasIdle ? '★ 기본 대기' : '☆ 기본 대기 지정'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20"
                  >
                    제거
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
