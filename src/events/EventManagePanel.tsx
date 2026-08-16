import { useEffect, useRef, useState, type DragEvent } from 'react'
import { createPortal } from 'react-dom'
import { parseVnfExportZip } from '../events/parseVnfExport'
import {
  createGameEventId,
  normalizeOwnerCharacterId,
  revokeEventMedia,
  type EventMediaAsset,
  type EventMediaKind,
  type GameEvent,
} from '../events/types'
import { EventSimulator } from './EventSimulator'
import {
  BLUR_DEFAULT,
  BlurRegionEditor,
  BlurRegionOverlay,
  clampBlur,
  readBlurRegions,
} from './BlurRegionEditor'
import type { RegisteredCharacter } from '../game/characters'
import {
  EVENT_DEFAULT_LOCALE,
  EVENT_LOCALES,
  emptyEventLocalization,
  mergeEventLocalization,
  normalizeEventLocale,
} from './eventLocales'

type EventManagePanelProps = {
  events: GameEvent[]
  onEventsChange: (events: GameEvent[]) => void
  registeredCharacters: RegisteredCharacter[]
  onSaveEventsManual?: () => void
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function countByKind(media: EventMediaAsset[]) {
  return {
    image: media.filter((m) => m.kind === 'image').length,
    video: media.filter((m) => m.kind === 'video').length,
    sound: media.filter((m) => m.kind === 'sound').length,
  }
}

const kindLabel: Record<EventMediaKind, string> = {
  image: '이미지',
  video: '영상',
  sound: '사운드',
}

type EditorNodeType = 'text' | 'graphic' | 'fade' | 'sound'

const NODE_TYPE_OPTIONS: Array<{ value: EditorNodeType; label: string }> = [
  { value: 'text', label: '텍스트' },
  { value: 'graphic', label: '그래픽' },
  { value: 'fade', label: '페이드' },
  { value: 'sound', label: '사운드' },
]

function makeNodeId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function createEmptyNode(type: EditorNodeType, id = makeNodeId()) {
  if (type === 'graphic') {
    return { id, type: 'graphic' as const, image: '', delay: 2.0, blurRegions: [], blurDefault: BLUR_DEFAULT }
  }
  if (type === 'fade') {
    return { id, type: 'fade' as const, fade: 'out' as const, duration: 1.2, color: '#000000' }
  }
  if (type === 'sound') {
    return {
      id,
      type: 'sound' as const,
      role: 'bgm' as const,
      sound: '',
      loop: true,
      stop: false,
    }
  }
  return {
    id,
    type: 'text' as const,
    speakerType: 'character',
    speaker: '',
    text: '',
    voice: '',
    stopVoice: true,
    stopBgm: false,
  }
}

function convertNodeToType(prev: Record<string, any>, type: EditorNodeType) {
  const id = prev.id || makeNodeId()
  const voiceFromPrev =
    typeof prev.voice === 'string'
      ? prev.voice
      : typeof prev.sound === 'string' && prev.type !== 'sound'
        ? prev.sound
        : ''
  if (type === 'text') {
    return {
      id,
      type: 'text',
      speakerType: prev.speakerType || 'character',
      speaker: prev.speaker || '',
      text: prev.text || '',
      voice: voiceFromPrev,
      stopVoice: prev.stopVoice !== false,
      stopBgm: Boolean(prev.stopBgm),
      ...(prev.text_key ? { text_key: prev.text_key } : {}),
    }
  }
  if (type === 'graphic') {
    return {
      id,
      type: 'graphic',
      image: prev.image || '',
      delay: prev.delay ?? 2.0,
      blurRegions: Array.isArray(prev.blurRegions) ? prev.blurRegions : [],
      blurDefault: Number.isFinite(Number(prev.blurDefault)) ? clampBlur(prev.blurDefault) : BLUR_DEFAULT,
    }
  }
  if (type === 'sound') {
    return {
      id,
      type: 'sound',
      role: prev.role === 'sfx' ? 'sfx' : 'bgm',
      sound: typeof prev.sound === 'string' ? prev.sound : voiceFromPrev,
      loop: prev.loop !== undefined ? Boolean(prev.loop) : prev.role !== 'sfx',
      stop: Boolean(prev.stop),
    }
  }
  const durationRaw = Number(prev.duration ?? prev.delay)
  return {
    id,
    type: 'fade',
    fade: prev.fade === 'in' ? 'in' : 'out',
    duration: Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : 1.2,
    color: prev.color || '#000000',
  }
}

// 다국어 번역용 공간을 JSON 구조 내에 자동으로 정규화하여 생성하는 헬퍼 함수
function normalizeEventLocalization(event: GameEvent): GameEvent {
  const defaultLanguage = normalizeEventLocale(event.defaultLanguage || EVENT_DEFAULT_LOCALE)
  const nextLoc = mergeEventLocalization(event.localization)

  const normalizedNodes = (event.nodes || []).map((n: any) => {
    if (n && n.type === 'text') {
      const textKey = n.text_key || n.id || `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

      if (!nextLoc[defaultLanguage][textKey]) {
        nextLoc[defaultLanguage][textKey] = n.text || ''
      }

      for (const lang of EVENT_LOCALES) {
        if (nextLoc[lang][textKey] === undefined) {
          nextLoc[lang][textKey] = ''
        }
      }

      return {
        ...n,
        text_key: textKey,
      }
    }
    return n
  })

  return {
    ...event,
    defaultLanguage,
    ownerCharacterId: normalizeOwnerCharacterId(event.ownerCharacterId),
    nodes: normalizedNodes,
    localization: nextLoc,
  }
}

export function EventManagePanel({
  events,
  onEventsChange,
  registeredCharacters,
  onSaveEventsManual,
}: EventManagePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)
  const [simulatorMode, setSimulatorMode] = useState<'debug' | 'game'>('debug')
  const [savingEventId, setSavingEventId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  // 수동 이벤트 생성 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newEvTitle, setNewEvTitle] = useState('')
  const [newEvOwner, setNewEvOwner] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [listQuery, setListQuery] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const selected = events.find((event) => event.id === selectedId) ?? null

  const handleEventsChange = (nextEvents: GameEvent[]) => {
    onEventsChange(nextEvents.map(normalizeEventLocalization))
  }

  useEffect(() => {
    if (selectedId && !events.some((event) => event.id === selectedId)) {
      setSelectedId(null)
    }
  }, [events, selectedId])

  const handleSaveAssets = async (event: GameEvent) => {
    if (!window.electronAPI?.saveEventAssets) {
      alert('Electron 데스크톱 환경에서만 로컬 에셋 저장이 가능합니다.')
      return
    }

    setSavingEventId(event.id)
    try {
      const assetsPayload = await Promise.all(
        event.media.map(async (asset) => {
          const buffer = await asset.blob.arrayBuffer()
          return {
            fileName: asset.fileName,
            kind: asset.kind,
            buffer: buffer,
          }
        })
      )

      const res = await window.electronAPI.saveEventAssets(event.id, assetsPayload)
      if (res.success) {
        alert(`물리 에셋 저장이 완료되었습니다!\n경로: ${res.path}`)
      } else {
        alert(`물리 에셋 저장에 실패했습니다:\n${res.error}`)
      }
    } catch (err) {
      console.error(err)
      alert('에셋 데이터를 변환하여 쓰는 도중 오류가 발생했습니다.')
    } finally {
      setSavingEventId(null)
    }
  }

  const importZip = async (file: File | undefined | null) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip') && file.type !== 'application/zip') {
      setError('VNF Export ZIP 파일만 추가할 수 있습니다.')
      return
    }

    setImporting(true)
    setError(null)
    setWarnings([])

    try {
      const { events: imported, warnings: nextWarnings } = await parseVnfExportZip(file)
      if (imported.length === 0) {
        setError('ZIP에서 생성할 이벤트가 없습니다.')
        return
      }
      handleEventsChange([...events, ...imported])
      setSelectedId(imported[0]?.id ?? null)
      setWarnings(nextWarnings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ZIP 가져오기에 실패했습니다.')
    } finally {
      setImporting(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    void importZip(e.dataTransfer.files?.[0])
  }

  const removeEvent = (id: string) => {
    const target = events.find((event) => event.id === id)
    if (!target) return
    if (!confirm(`이벤트 '${target.title}'을(를) 삭제하시겠습니까?\n연결된 미디어 파일도 디스크에서 삭제됩니다.`)) {
      return
    }
    revokeEventMedia(target)
    if (window.electronAPI?.deleteEventFolder) {
      void window.electronAPI.deleteEventFolder(id).catch((err) => {
        console.error('Failed to delete event folder from disk:', err)
      })
    }
    handleEventsChange(events.filter((event) => event.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  // 직접 이벤트 생성 제출
  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    const cleanedTitle = newEvTitle.trim()

    if (!cleanedTitle) {
      setCreateError('이벤트 제목을 입력해 주세요.')
      return
    }

    const eventId = createGameEventId(events.map((ev) => ev.id))

    const newEvent: GameEvent = {
      id: eventId,
      projectId: 'custom',
      projectTitle: '직접 생성',
      chapterId: 1,
      titleKey: eventId,
      title: cleanedTitle,
      startNode: '',
      nodes: [],
      localization: emptyEventLocalization(),
      defaultLanguage: EVENT_DEFAULT_LOCALE,
      characters: [],
      points: [],
      media: [],
      sourceZipName: '직접 생성',
      createdAt: new Date().toISOString(),
      ownerCharacterId: normalizeOwnerCharacterId(newEvOwner),
    }

    handleEventsChange([...events, newEvent])
    setSelectedId(newEvent.id)
    setShowCreateModal(false)

    // 입력 필드 초기화
    setNewEvTitle('')
    setNewEvOwner(null)
  }

  // 개별 이벤트 데이터 업데이트 헬퍼
  const updateEvent = (updated: GameEvent) => {
    handleEventsChange(events.map((ev) => (ev.id === updated.id ? updated : ev)))
  }

  const openCreateModal = (ownerCharacterId: string | null) => {
    setNewEvTitle('')
    setNewEvOwner(ownerCharacterId)
    setCreateError(null)
    setShowCreateModal(true)
  }

  const setEventOwner = (eventId: string, ownerCharacterId: string | null) => {
    handleEventsChange(
      events.map((ev) =>
        ev.id === eventId ? { ...ev, ownerCharacterId: normalizeOwnerCharacterId(ownerCharacterId) } : ev,
      ),
    )
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const query = listQuery.trim().toLowerCase()
  const matchesQuery = (event: GameEvent) =>
    !query ||
    event.title.toLowerCase().includes(query) ||
    event.id.toLowerCase().includes(query)

  const knownCharacterIds = new Set(registeredCharacters.map((c) => c.id))
  const sharedEvents = events.filter(
    (event) => !normalizeOwnerCharacterId(event.ownerCharacterId) && matchesQuery(event),
  )
  const orphanEvents = events.filter((event) => {
    const owner = normalizeOwnerCharacterId(event.ownerCharacterId)
    return Boolean(owner) && !knownCharacterIds.has(owner as string) && matchesQuery(event)
  })

  const ownerSelect = (event: GameEvent) => (
    <select
      value={normalizeOwnerCharacterId(event.ownerCharacterId) ?? ''}
      onChange={(e) => setEventOwner(event.id, e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
      className="mt-1.5 w-full rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-[10px] text-slate-300 outline-none focus:border-indigo-500/50"
      title="이벤트 소속"
    >
      <option value="">공용</option>
      {registeredCharacters.map((character) => (
        <option key={character.id} value={character.id}>
          {character.name}
        </option>
      ))}
    </select>
  )

  const renderEventRow = (event: GameEvent) => {
    const active = event.id === selectedId
    return (
      <li
        key={event.id}
        className={`rounded-xl border px-3 py-2.5 transition ${
          active
            ? 'border-indigo-400/40 bg-indigo-500/15'
            : 'border-white/10 bg-black/20 hover:border-white/20'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedId(event.id)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-sm font-semibold text-slate-100" title={event.title}>
              {event.title}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              노드 {event.nodes?.length ?? 0}개 · 미디어 {event.media?.length ?? 0}개
            </p>
          </button>
          <button
            type="button"
            onClick={() => removeEvent(event.id)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-rose-300 transition"
          >
            삭제
          </button>
        </div>
        {ownerSelect(event)}
      </li>
    )
  }

  const renderGroup = (key: string, title: string, groupEvents: GameEvent[], ownerForCreate: string | null) => {
    const collapsed = Boolean(collapsedGroups[key])
    return (
      <div key={key} className="mb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggleGroup(key)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-white/5"
          >
            <span className="text-[10px] text-slate-500">{collapsed ? '▸' : '▾'}</span>
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {title}
            </span>
            <span className="text-[10px] text-slate-600">({groupEvents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => openCreateModal(ownerForCreate)}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] text-indigo-300 hover:bg-indigo-500/10"
            title={`${title}에 이벤트 추가`}
          >
            +
          </button>
        </div>
        {collapsed ? null : groupEvents.length === 0 ? (
          <p className="px-2 pb-2 text-[11px] text-slate-600">없음</p>
        ) : (
          <ul className="space-y-2 pb-1">{groupEvents.map(renderEventRow)}</ul>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {/* Top Controls */}
      <div className="game-panel rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="game-kicker">EVENT</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">이벤트 관리</h2>
            <p className="mt-2 text-sm text-slate-400">
              비주얼 노벨용 이벤트를 구성합니다. VNF ZIP 파일을 업로드하여 가져오거나, 직접 새
              이벤트를 만들어 텍스트/그래픽 노드를 꾸밀 수 있습니다.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {onSaveEventsManual && (
              <button
                type="button"
                onClick={onSaveEventsManual}
                className="game-btn shrink-0 rounded-xl px-4 py-2 text-sm border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
              >
                💾 이벤트 저장
              </button>
            )}
            <button
              type="button"
            onClick={() => openCreateModal(null)}
              className="game-btn shrink-0 rounded-xl px-4 py-2 text-sm"
            >
              ＋ 직접 추가
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => inputRef.current?.click()}
              className="game-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              📤 {importing ? '가져오는 중…' : 'ZIP 가져오기'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => void importZip(e.target.files?.[0])}
            />
          </div>
        </div>

        {/* ZIP Drop Zone */}
        <div
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
            if (e.currentTarget.contains(e.relatedTarget as Node)) return
            setDragging(false)
          }}
          onDrop={onDrop}
          className={`mt-5 rounded-2xl border border-dashed px-4 py-8 text-center transition ${
            dragging
              ? 'border-indigo-400/60 bg-indigo-500/10'
              : 'border-white/15 bg-black/20 hover:border-white/25'
          }`}
        >
          <p className="text-sm font-medium text-slate-200">
            Export ZIP 파일을 여기로 드래그하여 바로 가져올 수도 있습니다
          </p>
          <p className="mt-1 text-xs text-slate-500">
            파일명 예: project_id_export.zip · 챕터 1개 = 이벤트 1개
          </p>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
        {warnings.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Main Split Layout */}
      <div className="grid min-h-0 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left Side: Event List */}
        <div className="game-panel flex flex-col rounded-2xl p-4 min-h-[400px]">
          <p className="game-stat-label mb-2 px-1">등록된 이벤트 ({events.length})</p>
          <input
            type="search"
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder="제목 또는 ID 검색"
            className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50"
          />
          {events.length === 0 ? (
            <p className="px-1 py-10 text-center text-sm text-slate-500">
              아직 등록된 이벤트가 없습니다.
            </p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-1">
              {renderGroup('shared', '공용', sharedEvents, null)}
              {registeredCharacters.map((character) =>
                renderGroup(
                  character.id,
                  character.name,
                  events.filter(
                    (event) =>
                      normalizeOwnerCharacterId(event.ownerCharacterId) === character.id &&
                      matchesQuery(event),
                  ),
                  character.id,
                ),
              )}
              {orphanEvents.length > 0
                ? renderGroup('orphan', '기타 (삭제된 캐릭터)', orphanEvents, null)
                : null}
            </div>
          )}
        </div>

        {/* Right Side: Event Detail / Sequence Node Editor */}
        <div className="game-panel rounded-2xl p-4">
          {selected ? (
            <EventDetail
              event={selected}
              onSimulate={(mode) => {
                setSimulatorMode(mode)
                setShowSimulator(true)
              }}
              onSave={() => void handleSaveAssets(selected)}
              isSaving={savingEventId === selected.id}
              registeredCharacters={registeredCharacters}
              onUpdateEvent={updateEvent}
            />
          ) : (
            <p className="px-1 py-20 text-center text-sm text-slate-500">
              왼쪽 목록에서 이벤트를 선택하면 상세 노드 시퀀스 편집 및 연결 미디어를 관리할 수
              있습니다.
            </p>
          )}
        </div>
      </div>

      {/* Simulator Modal */}
      {showSimulator && selected && (
        <EventSimulator
          event={selected}
          mode={simulatorMode}
          onClose={() => setShowSimulator(false)}
        />
      )}

      {/* 수동 이벤트 직접 추가 모달 — game-panel(backdrop-filter) 밖에 포탈해야 화면 전체에 고정됨 */}
      {showCreateModal &&
        createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/25 bg-slate-900 p-6 shadow-2xl animate-fade-in">
            <h3 className="text-base font-semibold text-slate-100">새 이벤트 생성</h3>
            <p className="mt-1 text-xs text-slate-400">
              제목과 소속만 정하면 됩니다.
            </p>

            <form onSubmit={handleCreateEventSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400">이벤트 제목</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="예: 세아 스카웃 이벤트"
                  value={newEvTitle}
                  onChange={(e) => setNewEvTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400">소속</label>
                <select
                  value={newEvOwner ?? ''}
                  onChange={(e) => setNewEvOwner(e.target.value || null)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50"
                >
                  <option value="">공용</option>
                  {registeredCharacters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </div>

              {createError && (
                <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-300">
                  {createError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateError(null)
                  }}
                  className="rounded-xl border border-white/10 hover:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="game-btn-primary rounded-xl px-4 py-2 text-xs font-semibold text-white transition"
                >
                  생성하기
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

type EventDetailProps = {
  event: GameEvent
  onSimulate: (mode: 'debug' | 'game') => void
  onSave: () => void
  isSaving: boolean
  registeredCharacters: RegisteredCharacter[]
  onUpdateEvent: (updated: GameEvent) => void
}

function isScriptTextFile(file: File) {
  const name = file.name.toLowerCase()
  return name.endsWith('.txt') || file.type === 'text/plain'
}

async function readScriptTextFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  }
  const start = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0
  return new TextDecoder('utf-8').decode(bytes.subarray(start))
}

function EventDetail({
  event,
  onSimulate,
  onSave,
  isSaving,
  registeredCharacters,
  onUpdateEvent,
}: EventDetailProps) {
  const [activeTab, setActiveTab] = useState<'nodes' | 'media'>('nodes')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const counts = countByKind(event.media)

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [fileDragOverIndex, setFileDragOverIndex] = useState<number | null>(null)
  const [showScriptModal, setShowScriptModal] = useState(false)
  const [scriptText, setScriptText] = useState('')
  const [scriptFileName, setScriptFileName] = useState('')
  const [scriptTxtOver, setScriptTxtOver] = useState(false)
  const scriptFileInputRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append')
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [blurEditorIndex, setBlurEditorIndex] = useState<number | null>(null)
  const nodeCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (!focusNodeId) return
    const el = nodeCardRefs.current.get(focusNodeId)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const timer = window.setTimeout(() => setFocusNodeId(null), 1800)
    return () => window.clearTimeout(timer)
  }, [focusNodeId, event.nodes])

  const getInsertIndex = () => {
    const nodes = (event.nodes || []) as any[]
    if (nodes.length === 0) return 0

    const centerY = window.innerHeight / 2
    let bestIndex = nodes.length - 1
    let bestDist = Infinity

    nodes.forEach((node, index) => {
      const id = String(node?.id || '')
      const el = id ? nodeCardRefs.current.get(id) : null
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const mid = (rect.top + rect.bottom) / 2
      const dist = Math.abs(mid - centerY)
      if (dist < bestDist) {
        bestDist = dist
        bestIndex = index
      }
    })

    return bestIndex + 1
  }

  const insertNode = (type: EditorNodeType) => {
    const newNode = createEmptyNode(type)
    const updatedNodes = [...(event.nodes || [])]
    const insertAt = Math.min(getInsertIndex(), updatedNodes.length)
    updatedNodes.splice(insertAt, 0, newNode)
    const startNode = event.startNode || newNode.id

    onUpdateEvent({
      ...event,
      nodes: updatedNodes,
      startNode,
    })
    setFocusNodeId(newNode.id)
  }

  const convertNodeType = (index: number, type: EditorNodeType) => {
    const updatedNodes = [...(event.nodes || [])]
    const prev = { ...(updatedNodes[index] as Record<string, any>) }
    if (prev.type === type) return
    updatedNodes[index] = convertNodeToType(prev, type)
    onUpdateEvent({ ...event, nodes: updatedNodes })
  }

  const duplicateNode = (index: number) => {
    const source = event.nodes?.[index]
    if (!source || typeof source !== 'object') return
    const copy = JSON.parse(JSON.stringify(source)) as Record<string, any>
    const newId = makeNodeId()
    copy.id = newId
    if (copy.key) copy.key = newId
    if (copy.text_key) copy.text_key = newId
    const updatedNodes = [...(event.nodes || [])]
    updatedNodes.splice(index + 1, 0, copy)
    onUpdateEvent({ ...event, nodes: updatedNodes })
    setFocusNodeId(newId)
  }

  // 스크립트 텍스트 파싱 및 가져오기 핸들러
  const handleImportScript = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scriptText.trim()) return

    const lines = scriptText.split('\n')
    const parsedNodes: any[] = []
    const nextCharacters = [...(event.characters || [])]
    const stamp = Date.now()

    const ensureCharacter = (id: string, name: string) => {
      if (!nextCharacters.some((c) => c.id === id)) {
        nextCharacters.push({ id, name })
      }
    }

    lines.forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed) return

      const nextId = () =>
        `node_${stamp}_${parsedNodes.length}_${Math.random().toString(36).slice(2, 6)}`

      // 1. 그래픽 노드 파싱 (전각 콜론 포함)
      // 예: "그래픽: #1 — 거실 입구 (풀샷)"
      const graphicMatch = trimmed.match(/^그래픽\s*[:：]\s*(.*)$/)
      if (graphicMatch) {
        const desc = graphicMatch[1].trim()

        const matchedAsset = event.media.find((m) =>
          m.fileName.toLowerCase().includes(desc.toLowerCase()) ||
          desc.toLowerCase().includes(m.fileName.toLowerCase())
        )

        parsedNodes.push({
          id: nextId(),
          type: 'graphic',
          image: matchedAsset ? matchedAsset.fileName : '',
          delay: 2.0,
          blurRegions: [],
          blurDefault: BLUR_DEFAULT,
        })
        return
      }

      // 1-b. 페이드 노드 파싱
      // 예: "페이드: 아웃" / "페이드: 인"
      const fadeMatch = trimmed.match(/^페이드\s*[:：]\s*(.*)$/)
      if (fadeMatch) {
        const raw = fadeMatch[1].trim().toLowerCase()
        const isIn = raw.includes('인') || raw === 'in' || raw.includes('밝')
        parsedNodes.push({
          id: nextId(),
          type: 'fade',
          fade: isIn ? 'in' : 'out',
          duration: 1.2,
          color: '#000000',
        })
        return
      }

      // 2. 대사/텍스트 노드 파싱
      // 예: "이모: 너, 잠 안 와?"
      const dialogueMatch = trimmed.match(/^([^:：]+)\s*[:：]\s*(.*)$/)
      if (dialogueMatch) {
        const speakerName = dialogueMatch[1].trim()
        const text = dialogueMatch[2].trim()

        let speakerType: 'character' | 'player' | 'narrator' = 'character'
        let speaker = ''

        if (speakerName === '플레이어' || speakerName.toLowerCase() === 'player') {
          speakerType = 'player'
          speaker = 'player'
        } else if (
          speakerName === '지문' ||
          speakerName === '나레이션' ||
          speakerName.toLowerCase() === 'narrator'
        ) {
          speakerType = 'narrator'
          speaker = ''
        } else {
          const char = registeredCharacters.find((c) => c.name === speakerName)
          if (char) {
            speaker = char.id
            ensureCharacter(char.id, char.name)
          } else {
            speaker = speakerName
            ensureCharacter(speakerName, speakerName)
          }
        }

        parsedNodes.push({
          id: nextId(),
          type: 'text',
          speakerType,
          speaker,
          text,
        })
        return
      }

      // 3. 지문 노드 (구분자 콜론이 없는 일반 라인)
      parsedNodes.push({
        id: nextId(),
        type: 'text',
        speakerType: 'narrator',
        speaker: '',
        text: trimmed,
      })
    })

    const updatedNodes =
      importMode === 'replace' ? parsedNodes : [...(event.nodes || []), ...parsedNodes]
    const startNode = updatedNodes[0]
      ? (updatedNodes[0] as any).id || (updatedNodes[0] as any).key || ''
      : ''

    onUpdateEvent({
      ...event,
      characters: nextCharacters,
      nodes: updatedNodes,
      startNode,
    })

    setScriptText('')
    setScriptFileName('')
    setShowScriptModal(false)
  }

  const applyScriptFile = async (file: File) => {
    if (!isScriptTextFile(file)) return false
    const text = await readScriptTextFile(file)
    setScriptText(text)
    setScriptFileName(file.name)
    setShowScriptModal(true)
    return true
  }

  // 파일 드롭 핸들러
  const handleFileDrop = (e: React.DragEvent, targetNodeIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    setFileDragOverIndex(null)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (isScriptTextFile(file)) {
      void applyScriptFile(file)
      return
    }

    const kind: EventMediaKind = file.type.startsWith('video/')
      ? 'video'
      : file.type.startsWith('audio/')
      ? 'sound'
      : 'image'

    if (kind !== 'image' && kind !== 'video') {
      alert('이미지 또는 비디오 파일만 드롭할 수 있습니다.')
      return
    }

    const url = URL.createObjectURL(file)
    const newAsset: EventMediaAsset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fileName: file.name,
      kind,
      sourcePath: `chapter_assets/events/${event.id}/${kind === 'image' ? 'images' : 'videos'}/${file.name}`,
      blob: file,
      url,
      size: file.size,
    }

    const updatedMedia = [...(event.media || []), newAsset]
    const updatedNodes = [...(event.nodes || [])]
    const node = { ...(updatedNodes[targetNodeIndex] as Record<string, any>), image: file.name }
    updatedNodes[targetNodeIndex] = node

    onUpdateEvent({
      ...event,
      media: updatedMedia,
      nodes: updatedNodes,
    })
  }

  // 노드 값 변경 처리
  const handleNodeChange = (index: number, fields: Record<string, any>) => {
    const updatedNodes = [...(event.nodes || [])]
    const targetNode = { ...(updatedNodes[index] as Record<string, any>), ...fields }

    // 만약 화자(speakerType & speaker)가 변경된 경우,
    // event.characters에 해당 캐릭터가 매핑되어 있어야 EventSimulator의 getCharacterName에서 참조함.
    if (fields.speakerType === 'character' && fields.speaker) {
      const charInfo = registeredCharacters.find((c) => c.id === fields.speaker)
      if (charInfo) {
        const exist = event.characters.some((c) => c.id === charInfo.id)
        if (!exist) {
          event.characters.push({
            id: charInfo.id,
            name: charInfo.name,
          })
        }
      }
    }

    updatedNodes[index] = targetNode
    const nextEvent: GameEvent = { ...event, nodes: updatedNodes }
    if (typeof fields.text === 'string' && targetNode.type === 'text') {
      const textKey = String(targetNode.text_key || targetNode.id || '')
      const lang = normalizeEventLocale(event.defaultLanguage || EVENT_DEFAULT_LOCALE)
      if (textKey) {
        nextEvent.localization = mergeEventLocalization(event.localization)
        nextEvent.localization[lang] = {
          ...nextEvent.localization[lang],
          [textKey]: fields.text,
        }
      }
    }
    onUpdateEvent(nextEvent)
  }

  // 노드 삭제
  const removeNode = (index: number) => {
    const updatedNodes = [...(event.nodes || [])]
    updatedNodes.splice(index, 1)

    const startNode = updatedNodes[0]
      ? (updatedNodes[0] as any).id || (updatedNodes[0] as any).key || ''
      : ''

    onUpdateEvent({
      ...event,
      nodes: updatedNodes,
      startNode,
    })
  }

  // 드래그 앤 드롭 정렬 핸들러
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault()
  }

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return
    const updatedNodes = [...(event.nodes || [])]
    const [movedNode] = updatedNodes.splice(draggedIndex, 1)
    updatedNodes.splice(index, 0, movedNode)

    const startNode = updatedNodes[0]
      ? (updatedNodes[0] as any).id || (updatedNodes[0] as any).key || ''
      : ''

    onUpdateEvent({
      ...event,
      nodes: updatedNodes,
      startNode,
    })
    setDraggedIndex(null)
  }

  // 로컬 미디어 직접 업로드 핸들러
  const handleUploadMedia = (
    e: React.ChangeEvent<HTMLInputElement>,
    targetNodeIndex?: number,
    bindField?: 'image' | 'voice' | 'sound',
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const kind: EventMediaKind = file.type.startsWith('video/')
      ? 'video'
      : file.type.startsWith('audio/')
      ? 'sound'
      : 'image'

    const url = URL.createObjectURL(file)
    const newAsset: EventMediaAsset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fileName: file.name,
      kind,
      sourcePath: `chapter_assets/events/${event.id}/${kind === 'image' ? 'images' : kind === 'video' ? 'videos' : 'sounds'}/${file.name}`,
      blob: file,
      url,
      size: file.size,
    }

    const updatedMedia = [...(event.media || []), newAsset]

    let updatedNodes = [...(event.nodes || [])]
    if (targetNodeIndex !== undefined) {
      const existing = { ...(updatedNodes[targetNodeIndex] as Record<string, any>) }
      const field =
        bindField ||
        (existing.type === 'sound' ? 'sound' : kind === 'sound' ? 'voice' : 'image')
      existing[field] = file.name
      updatedNodes[targetNodeIndex] = existing
    }

    onUpdateEvent({
      ...event,
      media: updatedMedia,
      nodes: updatedNodes,
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // 연결된 미디어 삭제 핸들러
  const handleRemoveMedia = (assetId: string) => {
    const assetToRemove = event.media.find((m) => m.id === assetId)
    if (!assetToRemove) return

    // 현재 노드에서 이 파일명을 참조하고 있는지 검사
    const isReferenced = (event.nodes || []).some(
      (node: any) =>
        node.image === assetToRemove.fileName ||
        node.voice === assetToRemove.fileName ||
        node.sound === assetToRemove.fileName
    )

    let confirmMsg = `미디어 파일 '${assetToRemove.fileName}'을(를) 삭제하시겠습니까?\n디스크에 저장된 파일도 함께 삭제됩니다.`
    if (isReferenced) {
      confirmMsg = `이 미디어(${assetToRemove.fileName})는 현재 스토리 노드에서 참조 중입니다. 정말 삭제하시겠습니까?\n삭제 시 관련 노드의 미디어 연결도 함께 초기화됩니다.`
    }

    if (!confirm(confirmMsg)) return

    if (assetToRemove.url && assetToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(assetToRemove.url)
    }

    if (window.electronAPI?.deleteEventFile) {
      void window.electronAPI
        .deleteEventFile(event.id, assetToRemove.kind, assetToRemove.fileName)
        .catch((err) => {
          console.error('Failed to delete event media from disk:', err)
        })
    }

    const updatedMedia = event.media.filter((m) => m.id !== assetId)
    let updatedNodes = [...(event.nodes || [])]
    if (isReferenced) {
      updatedNodes = updatedNodes.map((node: any) => {
        const next = { ...node }
        if (next.image === assetToRemove.fileName) next.image = ''
        if (next.voice === assetToRemove.fileName) next.voice = ''
        if (next.sound === assetToRemove.fileName) next.sound = ''
        return next
      })
    }

    onUpdateEvent({
      ...event,
      media: updatedMedia,
      nodes: updatedNodes,
    })
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="game-kicker">SELECTED EVENT</p>
            <h3 className="mt-1 text-base font-semibold text-slate-100">{event.title}</h3>
            {event.startNode ? (
              <p className="mt-1 text-xs text-slate-500">start: {event.startNode}</p>
            ) : null}
          <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
            <span className="shrink-0">소속</span>
            <select
              value={normalizeOwnerCharacterId(event.ownerCharacterId) ?? ''}
              onChange={(e) =>
                onUpdateEvent({
                  ...event,
                  ownerCharacterId: e.target.value ? e.target.value : null,
                })
              }
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
            >
              <option value="">공용</option>
              {registeredCharacters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="game-btn shrink-0 rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            💾 {isSaving ? '저장 중...' : '에셋 폴더 저장'}
          </button>
          <button
            type="button"
            disabled={(event.nodes?.length ?? 0) === 0}
            onClick={() => onSimulate('debug')}
            className="game-btn shrink-0 rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            🎮 시뮬레이터 (디버그)
          </button>
          <button
            type="button"
            disabled={(event.nodes?.length ?? 0) === 0}
            onClick={() => onSimulate('game')}
            className="game-btn-primary shrink-0 rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            📺 시뮬레이터 (인게임)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('nodes')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === 'nodes'
              ? 'border-indigo-500 text-indigo-300 bg-white/2'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          노드 시퀀스 ({event.nodes?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === 'media'
              ? 'border-indigo-500 text-indigo-300 bg-white/2'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          연결된 미디어 ({event.media?.length ?? 0})
        </button>
      </div>

      {/* Tab Contents: Node Editor */}
      {activeTab === 'nodes' && (
        <div
          className={`space-y-4 rounded-xl transition ${
            scriptTxtOver ? 'ring-2 ring-indigo-400/60 bg-indigo-500/5' : ''
          }`}
          onDragEnter={(e) => {
            if ([...e.dataTransfer.types].includes('Files')) setScriptTxtOver(true)
          }}
          onDragOver={(e) => {
            if (![...e.dataTransfer.types].includes('Files')) return
            e.preventDefault()
            setScriptTxtOver(true)
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return
            setScriptTxtOver(false)
          }}
          onDrop={(e) => {
            const file = e.dataTransfer.files?.[0]
            if (file && isScriptTextFile(file)) {
              e.preventDefault()
              e.stopPropagation()
              setScriptTxtOver(false)
              void applyScriptFile(file)
            } else {
              setScriptTxtOver(false)
            }
          }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-slate-500">
              새 노드는 지금 보고 있는 카드 바로 아래에 추가됩니다. 드래그로 순서를 바꿀 수 있습니다. txt 대본은 여기로 드롭해도 됩니다.
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowScriptModal(true)}
                className="rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-3 py-1.5 text-xs text-indigo-300 font-medium transition"
              >
                📝 스크립트 가져오기
              </button>
              <button
                type="button"
                onClick={() => insertNode('text')}
                className="rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-3 py-1.5 text-xs text-indigo-300 font-medium transition"
              >
                ＋ 텍스트 노드
              </button>
              <button
                type="button"
                onClick={() => insertNode('graphic')}
                className="rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-3 py-1.5 text-xs text-indigo-300 font-medium transition"
              >
                ＋ 그래픽 노드
              </button>
              <button
                type="button"
                onClick={() => insertNode('fade')}
                className="rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-3 py-1.5 text-xs text-indigo-300 font-medium transition"
              >
                ＋ 페이드 노드
              </button>
              <button
                type="button"
                onClick={() => insertNode('sound')}
                className="rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-3 py-1.5 text-xs text-indigo-300 font-medium transition"
              >
                ＋ 사운드 노드
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {(!event.nodes || event.nodes.length === 0) ? (
              <div className="rounded-xl border border-white/5 bg-black/10 py-12 text-center">
                <p className="text-sm text-slate-500">생성된 비주얼 노벨 노드가 없습니다.</p>
                <p className="mt-1 text-xs text-slate-600">
                  우측 상단의 추가 버튼을 눌러 스토리를 만들어보세요!
                </p>
              </div>
            ) : (
              (event.nodes as any[]).map((node, index) => {
                const isFade = node.type === 'fade'
                const isGraphic = node.type === 'graphic'
                const isSound = node.type === 'sound'
                const isText = !isFade && !isGraphic && !isSound
                const speakerType = node.speakerType || 'character'
                const editorType: EditorNodeType = isFade
                  ? 'fade'
                  : isGraphic
                    ? 'graphic'
                    : isSound
                      ? 'sound'
                      : 'text'
                const isFocused = focusNodeId && node.id === focusNodeId
                const soundAssets = (event.media || []).filter((m) => m.kind === 'sound')

                return (
                  <div
                    key={node.id || index}
                    ref={(el) => {
                      if (!node.id) return
                      if (el) nodeCardRefs.current.set(node.id, el)
                      else nodeCardRefs.current.delete(node.id)
                    }}
                    draggable
                    onDragStart={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('input, textarea, select, button, label')) {
                        e.preventDefault()
                        return
                      }
                      handleDragStart(index)
                    }}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    className={`relative rounded-xl border bg-black/25 p-4 transition-all hover:border-white/20 ${
                      draggedIndex === index ? 'opacity-40 border-indigo-500 bg-indigo-500/5' : 'border-white/10'
                    } ${isFocused ? 'ring-2 ring-indigo-400/70 border-indigo-400/50' : ''}`}
                  >
                    {/* Card Header & Controls */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 gap-2">
                      <div className="flex items-center gap-2 min-w-0 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300">
                        <span className="text-xs">↕</span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          #{index + 1}
                        </span>
                        <select
                          value={editorType}
                          onChange={(e) => convertNodeType(index, e.target.value as EditorNodeType)}
                          className="rounded-md border border-white/10 bg-black/50 px-1.5 py-0.5 text-[10px] text-slate-200 outline-none focus:border-indigo-500/50 cursor-pointer"
                          title="노드 형태 변경"
                        >
                          {NODE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label} 노드
                            </option>
                          ))}
                        </select>
                        <span className="text-[9px] text-slate-600 font-mono truncate">({node.id})</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateNode(index)}
                          className="rounded hover:bg-white/5 px-1.5 py-1 text-xs text-slate-500 hover:text-indigo-300 transition"
                          title="바로 아래에 복사"
                        >
                          📋 복사
                        </button>
                        <button
                          type="button"
                          onClick={() => removeNode(index)}
                          className="rounded hover:bg-white/5 p-1 text-xs text-slate-500 hover:text-rose-400 transition"
                          title="노드 삭제"
                        >
                          🗑 삭제
                        </button>
                      </div>
                    </div>

                    {/* Node Specific Form fields */}
                    {isText ? (
                      <div className="space-y-3">
                        {/* 화자 선택 그룹 */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <label className="text-[11px] font-semibold text-slate-400 w-16">
                            화자 타입
                          </label>
                          <div className="flex gap-1.5">
                            {(['character', 'player', 'narrator'] as const).map((type) => {
                              const label =
                                type === 'character'
                                  ? '등록 캐릭터'
                                  : type === 'player'
                                  ? '플레이어'
                                  : '지문'
                              const active = speakerType === type
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() =>
                                    handleNodeChange(index, {
                                      speakerType: type,
                                      speaker: type === 'player' ? 'player' : '',
                                    })
                                  }
                                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                                    active
                                      ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-300'
                                      : 'border-white/10 bg-black/25 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* 화자 캐릭터 드롭다운 */}
                        {speakerType === 'character' && (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center animate-fade-in">
                            <label className="text-[11px] font-semibold text-slate-400 w-16">
                              캐릭터 선택
                            </label>
                            <select
                              value={node.speaker || ''}
                              onChange={(e) =>
                                handleNodeChange(index, { speaker: e.target.value })
                              }
                              className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500/50 cursor-pointer min-w-[160px]"
                            >
                              <option value="">-- 화자 선택 없음 --</option>
                              {registeredCharacters.map((char) => (
                                <option key={char.id} value={char.id}>
                                  {char.name} ({char.job})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* 대사 텍스트 에어리어 */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-slate-400"> 대사 </label>
                          <textarea
                            value={node.text || ''}
                            onChange={(e) => handleNodeChange(index, { text: e.target.value })}
                            placeholder="노출될 대사를 여기에 입력하세요..."
                            rows={2}
                            className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50 resize-y"
                          />
                        </div>

                        <div className="space-y-2 rounded-xl border border-white/5 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] font-semibold text-slate-400">대사 음성</label>
                            <label className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">
                              📁 음성 파일 추가
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleUploadMedia(e, index, 'voice')}
                              />
                            </label>
                          </div>
                          <select
                            value={typeof node.voice === 'string' ? node.voice : ''}
                            onChange={(e) => handleNodeChange(index, { voice: e.target.value })}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            <option value="">-- 음성 없음 --</option>
                            {soundAssets.map((asset) => (
                              <option key={asset.id} value={asset.fileName}>
                                {asset.fileName}
                              </option>
                            ))}
                          </select>
                          <div className="flex flex-wrap gap-4 pt-1">
                            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={node.stopVoice !== false}
                                onChange={(e) => handleNodeChange(index, { stopVoice: e.target.checked })}
                                className="accent-indigo-500"
                              />
                              이 줄에서 보이스 끄기
                            </label>
                            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={Boolean(node.stopBgm)}
                                onChange={(e) => handleNodeChange(index, { stopBgm: e.target.checked })}
                                className="accent-indigo-500"
                              />
                              이 줄에서 배경음 끄기
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            보이스 끄기는 기본 켜짐입니다. 이전 줄 음성이 이 대사와 겹치지 않습니다.
                          </p>
                        </div>
                      </div>
                    ) : isSound ? (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <label className="text-[11px] font-semibold text-slate-400 w-16">역할</label>
                          <div className="flex gap-1.5">
                            {([
                              { value: 'bgm', label: '배경음' },
                              { value: 'sfx', label: '이펙트음' },
                            ] as const).map((option) => {
                              const active = (node.role || 'bgm') === option.value
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() =>
                                    handleNodeChange(index, {
                                      role: option.value,
                                      loop: option.value === 'bgm' ? node.loop !== false : Boolean(node.loop),
                                    })
                                  }
                                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                                    active
                                      ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-300'
                                      : 'border-white/10 bg-black/25 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(node.loop)}
                              onChange={(e) => handleNodeChange(index, { loop: e.target.checked })}
                              className="accent-indigo-500"
                            />
                            루프 재생
                          </label>
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(node.stop)}
                              onChange={(e) => handleNodeChange(index, { stop: e.target.checked })}
                              className="accent-indigo-500"
                            />
                            이 채널 정지 (파일 없이 끄기)
                          </label>
                        </div>

                        {!node.stop ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-slate-400">사운드 파일</label>
                              <label className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">
                                📁 새 파일 추가
                                <input
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  onChange={(e) => handleUploadMedia(e, index, 'sound')}
                                />
                              </label>
                            </div>
                            <select
                              value={node.sound || ''}
                              onChange={(e) => handleNodeChange(index, { sound: e.target.value })}
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/50 cursor-pointer"
                            >
                              <option value="">-- 사운드 선택 --</option>
                              {soundAssets.map((asset) => (
                                <option key={asset.id} value={asset.fileName}>
                                  {asset.fileName}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500">
                            정지가 켜져 있으면 {(node.role || 'bgm') === 'sfx' ? '이펙트음' : '배경음'} 채널만 즉시 멈춥니다.
                          </p>
                        )}
                      </div>
                    ) : isFade ? (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <label className="text-[11px] font-semibold text-slate-400 w-16">
                            방향
                          </label>
                          <div className="flex gap-1.5">
                            {([
                              { value: 'out', label: '페이드 아웃 (어두워짐)' },
                              { value: 'in', label: '페이드 인 (밝아짐)' },
                            ] as const).map((option) => {
                              const active = (node.fade || 'out') === option.value
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleNodeChange(index, { fade: option.value })}
                                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                                    active
                                      ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-300'
                                      : 'border-white/10 bg-black/25 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-semibold text-slate-400">
                              전환 시간 (초)
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={node.duration !== undefined ? node.duration : 1.2}
                              onChange={(e) =>
                                handleNodeChange(index, {
                                  duration: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                                })
                              }
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-semibold text-slate-400">
                              페이드 색
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={node.color || '#000000'}
                                onChange={(e) => handleNodeChange(index, { color: e.target.value })}
                                className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => handleNodeChange(index, { color: '#000000' })}
                                className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
                              >
                                검정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleNodeChange(index, { color: '#ffffff' })}
                                className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
                              >
                                흰색
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          페이드 아웃 다음에는 장면(그래픽/대사)을 두고, 다시 페이드 인으로 밝히면 자연스럽습니다.
                        </p>
                      </div>
                    ) : (
                      /* Graphic Node Fields */
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* 미디어 선택 */}
                        <div
                          className="space-y-1.5"
                          onDragOver={(e) => {
                            if (e.dataTransfer.types.includes('Files')) {
                              e.preventDefault()
                              e.stopPropagation()
                              setFileDragOverIndex(index)
                            }
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setFileDragOverIndex(null)
                          }}
                          onDrop={(e) => handleFileDrop(e, index)}
                        >
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-semibold text-slate-400">
                              배경 미디어
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setBlurEditorIndex(index)}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                              >
                                블러 영역 편집
                                {(node.blurRegions?.length ?? 0) > 0
                                  ? ` (${node.blurRegions.length})`
                                  : ''}
                              </button>
                              <label className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">
                                📁 새 파일 추가
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  className="hidden"
                                  onChange={(e) => handleUploadMedia(e, index)}
                                />
                              </label>
                            </div>
                          </div>

                          <div className={`relative transition rounded-lg border ${
                            fileDragOverIndex === index
                              ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]'
                              : 'border-white/10 bg-black/40'
                          }`}>
                            <select
                              value={node.image || ''}
                              onChange={(e) => handleNodeChange(index, { image: e.target.value })}
                              className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/50 cursor-pointer"
                            >
                              <option value="" className="bg-slate-900">-- 미디어 선택 안함 --</option>
                              {event.media
                                .filter((m) => m.kind === 'image' || m.kind === 'video')
                                .map((asset) => (
                                  <option key={asset.id} value={asset.fileName} className="bg-slate-900">
                                    [{kindLabel[asset.kind]}] {asset.fileName}
                                  </option>
                                ))}
                            </select>
                            {fileDragOverIndex === index && (
                              <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/90 rounded-lg text-[11px] font-bold text-white pointer-events-none animate-pulse">
                                📥 여기에 이미지/영상 파일 드롭
                              </div>
                            )}
                          </div>
                          {node.image && (() => {
                            const asset = event.media.find((m) => m.fileName === node.image)
                            if (!asset) {
                              return (
                                <p className="text-[10px] text-rose-400/80">
                                  ⚠ 연결됨: {node.image} (물리 에셋 없음)
                                </p>
                              )
                            }
                            return (
                              <div className="mt-2 flex items-center gap-3 animate-fade-in bg-black/20 p-1.5 rounded-lg border border-white/5 w-fit">
                                <div className="relative w-24 aspect-video overflow-hidden rounded border border-white/10 bg-black/40">
                                  {asset.kind === 'image' ? (
                                    <img
                                      src={asset.url}
                                      alt="Preview"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : asset.kind === 'video' ? (
                                    <video
                                      src={asset.url}
                                      muted
                                      playsInline
                                      className="h-full w-full object-cover"
                                    />
                                  ) : null}
                                  <BlurRegionOverlay regions={readBlurRegions(node)} />
                                </div>
                                <div className="text-[10px] text-slate-400 min-w-0 max-w-[150px]">
                                  <p className="truncate text-slate-200 font-semibold" title={asset.fileName}>
                                    {asset.fileName}
                                  </p>
                                  <p className="mt-0.5 text-slate-500">
                                    {kindLabel[asset.kind]} · {formatFileSize(asset.size)}
                                  </p>
                                </div>
                              </div>
                            )
                          })()}
                        </div>

                        {/* 노출 딜레이 시간 */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-semibold text-slate-400">
                            화면 노출 시간 (초)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={node.delay !== undefined ? node.delay : 2.0}
                            onChange={(e) =>
                              handleNodeChange(index, {
                                delay: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
                          />
                          <p className="text-[10px] text-slate-500">
                            설정된 시간이 지나면 다음 노드로 자동 진행됩니다. (0초 설정 시 수동 클릭
                            대기)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: Media List (기존 기능) */}
      {activeTab === 'media' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              이미지 {counts.image} · 영상 {counts.video} · 사운드 {counts.sound} · 총{' '}
              {event.media?.length ?? 0}개 파일
            </p>
            {/* 공통 파일 업로드 버튼 */}
            <label className="rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-3 py-1.5 text-xs text-indigo-300 font-medium transition cursor-pointer">
              📁 로컬 미디어 추가
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={(e) => handleUploadMedia(e)}
              />
            </label>
          </div>

          {['image', 'video', 'sound'].map((kind) => {
            const items = (event.media || []).filter((asset) => asset.kind === kind)
            if (items.length === 0) return null
            return (
              <div key={kind} className="space-y-2 animate-fade-in">
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {kindLabel[kind as EventMediaKind]} ({items.length})
                </p>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {items.map((asset) => (
                    <li
                      key={asset.id}
                      className="overflow-hidden rounded-xl border border-white/10 bg-black/25 flex flex-col justify-between"
                    >
                      <MediaThumb asset={asset} />
                      <div className="px-2 py-1.5 border-t border-white/5 bg-black/10 flex items-center justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-slate-200" title={asset.fileName}>
                            {asset.fileName}
                          </p>
                          <p className="text-[10px] text-slate-500">{formatFileSize(asset.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(asset.id)}
                          className="shrink-0 rounded p-1 hover:bg-white/5 text-[10px] text-slate-500 hover:text-rose-400 transition"
                          title="미디어 삭제"
                        >
                          🗑
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          {(!event.media || event.media.length === 0) ? (
            <p className="text-center py-10 text-xs text-slate-500">
              이 이벤트에 등록된 미디어가 없습니다. 우측 상단의 추가 버튼을 눌러 추가하세요.
            </p>
          ) : null}
        </div>
      )}

      {/* 스크립트 일괄 가져오기 모달 — 패널 밖(body)에 그려야 화면 전체에 고정됨 */}
      {showScriptModal &&
        createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-indigo-500/25 bg-slate-900 p-6 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]"
          >
            <h3 className="text-base font-semibold text-slate-100">시나리오 스크립트 일괄 가져오기</h3>
            <p className="mt-1 text-xs text-slate-400">
              대본을 붙여 넣거나 <span className="text-indigo-300">.txt</span> 파일을 끌어다 놓으면, 텍스트·그래픽 노드 시퀀스를 만듭니다.
            </p>

            <form onSubmit={handleImportScript} className="mt-4 space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-400">시나리오 텍스트</label>
                  <div className="flex items-center gap-2">
                    {scriptFileName ? (
                      <span className="max-w-[140px] truncate text-[10px] font-mono text-indigo-300" title={scriptFileName}>
                        {scriptFileName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">라인별 구분 파싱</span>
                    )}
                    <label className="cursor-pointer text-[10px] font-semibold text-indigo-400 hover:text-indigo-300">
                      txt 열기
                      <input
                        ref={scriptFileInputRef}
                        type="file"
                        accept=".txt,text/plain"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void applyScriptFile(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div
                  className={`relative mt-1.5 flex min-h-0 flex-1 flex-col rounded-xl border ${
                    scriptTxtOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/10'
                  }`}
                  onDragEnter={(e) => {
                    if ([...e.dataTransfer.types].includes('Files')) {
                      e.preventDefault()
                      setScriptTxtOver(true)
                    }
                  }}
                  onDragOver={(e) => {
                    if (![...e.dataTransfer.types].includes('Files')) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'copy'
                    setScriptTxtOver(true)
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return
                    setScriptTxtOver(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setScriptTxtOver(false)
                    const file = e.dataTransfer.files?.[0]
                    if (!file) return
                    if (!isScriptTextFile(file)) {
                      alert('.txt 파일만 가져올 수 있습니다.')
                      return
                    }
                    void applyScriptFile(file)
                  }}
                >
                  <textarea
                    required
                    rows={12}
                    placeholder={`[작성 예시]\n그래픽: #1 — 거실 입구\n이모: 너, 잠 안 와?\n플레이어: 이모, 많이 드셨어요?\n\n또는 이 칸에 .txt 파일을 드롭하세요.`}
                    value={scriptText}
                    onChange={(e) => {
                      setScriptText(e.target.value)
                      if (scriptFileName) setScriptFileName('')
                    }}
                    className="w-full flex-1 rounded-xl bg-black/40 p-3 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50 font-mono resize-none overflow-y-auto border-0"
                  />
                  {scriptTxtOver ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-indigo-950/70 text-sm font-semibold text-indigo-100">
                      txt 파일을 놓으면 대본을 읽습니다
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 가져오기 옵션 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">가져오기 방식</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-indigo-500"
                    />
                    기존 노드 뒤에 추가
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-indigo-500"
                    />
                    기존 노드 전체 덮어쓰기
                  </label>
                </div>
              </div>

              {/* 도움말 박스 */}
              <div className="rounded-lg bg-black/35 p-3 text-[11px] text-slate-500 border border-white/5 space-y-1">
                <p className="font-semibold text-slate-400">💡 텍스트 문법 가이드</p>
                <p>• <span className="text-indigo-300 font-semibold">그래픽: 설명</span> : 그래픽 노드 생성</p>
                <p>• <span className="text-indigo-300 font-semibold">페이드: 인</span> / <span className="text-indigo-300 font-semibold">페이드: 아웃</span> : 화면 전환 노드</p>
                <p>• <span className="text-indigo-300 font-semibold">이름: 대사</span> : 해당 이름의 화자와 대사 노드 생성 (플레이어는 별도 지정)</p>
                <p>• <span className="text-indigo-300 font-semibold">지문: 설명</span> 또는 콜론 없는 문장 : 지문(나레이션) 노드</p>
                <p>• <span className="text-indigo-300 font-semibold">일반 문장</span> : 이름 없는 지문 노드 생성</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowScriptModal(false)
                    setScriptText('')
                    setScriptFileName('')
                  }}
                  className="rounded-xl border border-white/10 hover:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="game-btn-primary rounded-xl px-4 py-2 text-xs font-semibold text-white transition"
                >
                  스크립트 반영하기
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {blurEditorIndex !== null && event.nodes?.[blurEditorIndex] ? (
        <BlurRegionEditor
          asset={
            event.media.find(
              (m) => m.fileName === (event.nodes[blurEditorIndex] as any).image,
            ) ?? null
          }
          regions={readBlurRegions(event.nodes[blurEditorIndex])}
          blurDefault={clampBlur(Number((event.nodes[blurEditorIndex] as any).blurDefault))}
          onChange={({ blurRegions, blurDefault }) => {
            handleNodeChange(blurEditorIndex, { blurRegions, blurDefault })
          }}
          onClose={() => setBlurEditorIndex(null)}
        />
      ) : null}
    </div>
  )
}

function MediaThumb({ asset }: { asset: EventMediaAsset }) {
  if (asset.kind === 'image') {
    return (
      <div className="aspect-video bg-black/40">
        <img src={asset.url} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }
  if (asset.kind === 'video') {
    return (
      <div className="aspect-video bg-black/40">
        <video src={asset.url} muted playsInline className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className="flex aspect-video items-center justify-center bg-black/40 px-2">
      <audio src={asset.url} controls preload="metadata" className="w-full" />
    </div>
  )
}
