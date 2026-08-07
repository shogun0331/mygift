import { useEffect, useRef, useState, type DragEvent } from 'react'
import { parseVnfExportZip } from '../events/parseVnfExport'
import {
  revokeEventMedia,
  type EventMediaAsset,
  type EventMediaKind,
  type GameEvent,
} from '../events/types'
import { EventSimulator } from './EventSimulator'

type EventManagePanelProps = {
  events: GameEvent[]
  onEventsChange: (events: GameEvent[]) => void
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

export function EventManagePanel({ events, onEventsChange }: EventManagePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)
  const [savingEventId, setSavingEventId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const selected = events.find((event) => event.id === selectedId) ?? null

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

      const res = await window.electronAPI.saveEventAssets(event.chapterId, assetsPayload)
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
      onEventsChange([...events, ...imported])
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
    if (target) revokeEventMedia(target)
    onEventsChange(events.filter((event) => event.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="game-panel rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="game-kicker">EVENT</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">이벤트 관리</h2>
            <p className="mt-2 text-sm text-slate-400">
              VNF Export ZIP을 추가하면 챕터마다 이벤트가 생성되고, 이미지·영상·사운드가 해당
              이벤트에 연결됩니다.
            </p>
          </div>
          <button
            type="button"
            disabled={importing}
            onClick={() => inputRef.current?.click()}
            className="game-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden>＋</span>
            {importing ? '가져오는 중…' : '이벤트 추가'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => void importZip(e.target.files?.[0])}
          />
        </div>

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
              : 'border-white/15 bg-black/20'
          }`}
        >
          <p className="text-sm font-medium text-slate-200">
            Export ZIP을 여기로 드래그하거나, 오른쪽 상단 <span className="text-indigo-300">이벤트 추가</span>로
            선택하세요
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

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="game-panel rounded-2xl p-4">
          <p className="game-stat-label mb-3 px-1">등록된 이벤트 ({events.length})</p>
          {events.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-slate-500">아직 등록된 이벤트가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((event) => {
                const counts = countByKind(event.media)
                const active = event.id === selectedId
                return (
                  <li
                    key={event.id}
                    className={`rounded-xl border px-3 py-3 transition ${
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
                        <p className="truncate text-sm font-semibold text-slate-100">{event.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {event.projectTitle} · ch{event.chapterId} · 노드 {event.nodes.length}개
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          이미지 {counts.image} · 영상 {counts.video} · 사운드 {counts.sound}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEvent(event.id)}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-rose-300"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="game-panel rounded-2xl p-4">
          {selected ? (
            <EventDetail
              event={selected}
              onSimulate={() => setShowSimulator(true)}
              onSave={() => void handleSaveAssets(selected)}
              isSaving={savingEventId === selected.id}
            />
          ) : (
            <p className="px-1 py-10 text-center text-sm text-slate-500">
              왼쪽에서 이벤트를 선택하면 연결된 미디어를 확인할 수 있습니다.
            </p>
          )}
        </div>
      </div>

      {showSimulator && selected && (
        <EventSimulator event={selected} onClose={() => setShowSimulator(false)} />
      )}
    </div>
  )
}

function EventDetail({
  event,
  onSimulate,
  onSave,
  isSaving,
}: {
  event: GameEvent
  onSimulate: () => void
  onSave: () => void
  isSaving: boolean
}) {
  const counts = countByKind(event.media)
  const groups: EventMediaKind[] = ['image', 'video', 'sound']

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="game-kicker">LINKED MEDIA</p>
          <h3 className="mt-1 text-base font-semibold text-slate-100">{event.title}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {event.sourceZipName} · start: {event.startNode || '—'} · 언어 {event.defaultLanguage}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="game-btn shrink-0 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            💾 {isSaving ? '저장 중...' : '에셋 폴더 저장'}
          </button>
          <button
            type="button"
            onClick={onSimulate}
            className="game-btn-primary shrink-0 rounded-xl px-3 py-2 text-xs font-semibold"
          >
            🎮 시뮬레이터 실행
          </button>
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-400">
          이미지 {counts.image} · 영상 {counts.video} · 사운드 {counts.sound} · 총{' '}
          {event.media.length}개 파일이 이 이벤트에 연결됨
        </p>
      </div>

      {groups.map((kind) => {
        const items = event.media.filter((asset) => asset.kind === kind)
        if (items.length === 0) return null
        return (
          <div key={kind}>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              {kindLabel[kind]} ({items.length})
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((asset) => (
                <li
                  key={asset.id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-black/25"
                >
                  <MediaThumb asset={asset} />
                  <div className="px-2 py-1.5">
                    <p className="truncate text-xs text-slate-200" title={asset.fileName}>
                      {asset.fileName}
                    </p>
                    <p className="text-[10px] text-slate-500">{formatFileSize(asset.size)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {event.media.length === 0 ? (
        <p className="text-sm text-slate-500">이 이벤트에 연결된 미디어가 없습니다.</p>
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
