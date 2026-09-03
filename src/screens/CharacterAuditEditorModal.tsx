import { useMemo, useRef, useState } from 'react'
import {
  emptyAuditMediaSlot,
  normalizeAuditMedia,
  type CharacterAuditMedia,
  type CharacterAuditMediaSlot,
  type RegisteredCharacter,
} from '../game/characters'
import { BlurRegionOverlay, readBlurRegions } from '../events/BlurRegionEditor'
import type { BlurRegion } from '../events/types'
import { resolveMediaSrc } from '../game/mediaUrl'
import { CHARACTER_EVENT_SLOTS, type EventMediaAsset, type GameEvent } from '../events/types'
import { MediaGalleryPickerModal } from '../events/EventManagePanel'

type Props = {
  character: RegisteredCharacter
  events: GameEvent[]
  onSave: (auditMedia: CharacterAuditMedia) => void
  onClose: () => void
}

type AuditSlot = 'A' | 'B' | 'C'

function walkEventNodes(nodes: any[], visit: (node: any) => void) {
  for (const node of nodes ?? []) {
    if (!node) continue
    visit(node)
    if (Array.isArray(node.nodes)) walkEventNodes(node.nodes, visit)
  }
}

function baseName(value: string) {
  const clean = String(value || '').split('?')[0].replace(/\\/g, '/')
  try {
    return decodeURIComponent(clean.split('/').pop() || '')
  } catch {
    return clean.split('/').pop() || ''
  }
}

export function blurRegionsForVnFile(events: GameEvent[], fileName: string): BlurRegion[] {
  const target = baseName(fileName)
  if (!target) return []
  for (const event of events) {
    let found: BlurRegion[] = []
    walkEventNodes(event.nodes ?? [], (node) => {
      if (found.length > 0) return
      if (baseName(String(node.image || '')) !== target) return
      const regions = readBlurRegions(node)
      if (regions.length > 0) found = regions
    })
    if (found.length > 0) return found
  }
  return []
}

function collectLinkedVnMedia(character: RegisteredCharacter, events: GameEvent[]): EventMediaAsset[] {
  const linkedIds = new Set(
    CHARACTER_EVENT_SLOTS.map((slot) => character.eventLinks?.[slot.key]).filter(
      (id): id is string => Boolean(id),
    ),
  )
  const out: EventMediaAsset[] = []
  const seen = new Set<string>()
  for (const event of events) {
    if (!linkedIds.has(event.id)) continue
    for (const asset of event.media ?? []) {
      if (asset.kind !== 'image' && asset.kind !== 'video') continue
      const key = `${event.id}:${asset.fileName}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(asset)
    }
  }
  return out
}

function fileNameFromUrl(url: string | null | undefined) {
  if (!url) return ''
  const clean = url.split('?')[0]
  try {
    return decodeURIComponent(clean.split('/').pop() || '')
  } catch {
    return clean.split('/').pop() || ''
  }
}

function isVideoUrl(url: string) {
  const clean = url.split('?')[0].toLowerCase()
  return (
    clean.startsWith('data:video') ||
    /\.(mp4|webm|ogv|ogg|mov|mkv|m4v)$/.test(clean)
  )
}

export function CharacterAuditEditorModal({ character, events, onSave, onClose }: Props) {
  const [auditMedia, setAuditMedia] = useState<CharacterAuditMedia>(() =>
    normalizeAuditMedia(character.auditMedia),
  )
  const [pickerSlot, setPickerSlot] = useState<AuditSlot | null>(null)

  const vnMedia = useMemo(() => collectLinkedVnMedia(character, events), [character, events])

  const updateSlot = (key: AuditSlot, next: CharacterAuditMediaSlot) => {
    setAuditMedia((prev) => ({ ...prev, [key]: next }))
  }

  const handleSave = () => {
    onSave(auditMedia)
    onClose()
  }

  const selectedName = pickerSlot ? fileNameFromUrl(auditMedia[pickerSlot]?.url) : ''

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="game-panel relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-purple-500/40 bg-slate-950 p-6 shadow-[0_0_60px_rgba(168,85,247,0.3)]">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-purple-400/40 bg-purple-900/60 px-3 py-1 text-xs font-black text-purple-200">
              ⚖️ 캐릭터 승급심사 미디어 세팅
            </span>
            <h3 className="text-lg font-black text-slate-100">
              [{character.name}] 심사관 만족도별 퍼포먼스 영상 (A / B / C)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-white"
          >
            닫기 ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-950/20 p-3.5 text-xs text-slate-300">
          <p className="font-bold text-purple-200">💡 승급심사 퍼포먼스 영상 시스템</p>
          <p className="mt-1 text-[11px] text-slate-400">
            이 캐릭터에 연결된 VN 이벤트 영상을 갤러리에서 고르면 만족도 구간별로 무대에 재생됩니다.
            연결된 VN이 없으면 이벤트 링크를 먼저 지정하세요.
          </p>
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-auto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AuditMediaDropbox
              badge="🌟 A 영상 (고만족도 80%↑)"
              description="심사관 만족도가 80% 이상일 때 재생"
              badgeColor="border-amber-400/40 bg-amber-950/70 text-amber-200"
              slot={auditMedia.A}
              vnCount={vnMedia.length}
              onPickFromVn={() => setPickerSlot('A')}
              onUpdate={(next) => updateSlot('A', next)}
            />
            <AuditMediaDropbox
              badge="⚡ B 영상 (중만족도 30~79%)"
              description="심사관 만족도가 30~79%일 때 재생"
              badgeColor="border-cyan-400/40 bg-cyan-950/70 text-cyan-200"
              slot={auditMedia.B}
              vnCount={vnMedia.length}
              onPickFromVn={() => setPickerSlot('B')}
              onUpdate={(next) => updateSlot('B', next)}
            />
            <AuditMediaDropbox
              badge="💧 C 영상 (저만족도 0~29%)"
              description="심사관 만족도가 0~29%일 때 재생"
              badgeColor="border-rose-400/40 bg-rose-950/70 text-rose-200"
              slot={auditMedia.C}
              vnCount={vnMedia.length}
              onPickFromVn={() => setPickerSlot('C')}
              onUpdate={(next) => updateSlot('C', next)}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-purple-500/20 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-xs font-bold text-slate-400 hover:bg-black/70 hover:text-white"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="game-btn game-btn-primary rounded-xl px-5 py-2 text-xs font-bold"
          >
            미디어 저장 및 적용
          </button>
        </div>
      </div>

      {pickerSlot ? (
        <MediaGalleryPickerModal
          media={vnMedia}
          selectedFileName={selectedName}
          title="연결된 VN 미디어 선택"
          hint="이 캐릭터에 등록된 이벤트 영상을 미리보고 클릭하세요"
          onSelect={(fileName) => {
            if (!fileName) {
              updateSlot(pickerSlot, emptyAuditMediaSlot())
              return
            }
            const asset = vnMedia.find((row) => row.fileName === fileName)
            updateSlot(pickerSlot, {
              url: asset?.url ?? null,
              blurRegions: blurRegionsForVnFile(events, fileName),
            })
          }}
          onClose={() => setPickerSlot(null)}
        />
      ) : null}
    </div>
  )
}

function AuditMediaDropbox({
  badge,
  description,
  badgeColor,
  slot,
  vnCount,
  onPickFromVn,
  onUpdate,
}: {
  badge: string
  description: string
  badgeColor: string
  slot: CharacterAuditMediaSlot
  vnCount: number
  onPickFromVn: () => void
  onUpdate: (next: CharacterAuditMediaSlot) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const url = slot.url

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (dataUrl) onUpdate({ url: dataUrl, blurRegions: [] })
    }
    reader.readAsDataURL(file)
  }

  const video = Boolean(url && isVideoUrl(url))

  return (
    <div className="flex flex-col space-y-2 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3.5">
      <span className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-black ${badgeColor}`}>
        {badge}
      </span>
      <p className="text-[10px] text-slate-400 min-h-[28px]">{description}</p>

      <button
        type="button"
        onClick={onPickFromVn}
        className="text-[10px] font-bold text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded-lg px-2 py-1.5 hover:bg-amber-500/25"
      >
        🖼 갤러리에서 미리보고 선택
        <span className="ml-1 font-semibold text-amber-100/70">({vnCount})</span>
      </button>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) processFile(file)
        }}
        className={`relative aspect-[16/9] w-full overflow-hidden rounded-xl border-2 transition-all ${
          isDragging
            ? 'border-purple-400 bg-purple-950/70 scale-[1.02]'
            : 'border-dashed border-white/20 bg-black/60 hover:border-purple-400/50'
        } group`}
      >
        {url ? (
          <>
            {video ? (
              <video
                src={resolveMediaSrc(url)}
                className="h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img src={resolveMediaSrc(url)} alt="" className="h-full w-full object-cover" />
            )}
            {slot.blurRegions.length > 0 ? <BlurRegionOverlay regions={slot.blurRegions} /> : null}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
            <span className="text-2xl mb-1">🎬</span>
            <span className="text-[10px] font-bold text-slate-300">VN 갤러리 또는 드롭</span>
            <span className="text-[9px] text-slate-500 mt-0.5">16:9 영상 또는 이미지</span>
          </div>
        )}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-black/75 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-xs p-2">
          <button
            type="button"
            className="game-btn game-btn-primary rounded-lg px-3 py-1.5 text-[10px] font-bold"
            onClick={onPickFromVn}
          >
            🖼 VN에서 선택
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-slate-200"
            onClick={() => fileInputRef.current?.click()}
          >
            📷 파일 선택
          </button>
          {url ? (
            <button
              type="button"
              className="rounded-lg border border-rose-500/40 bg-rose-950/80 px-2.5 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-900"
              onClick={() => onUpdate(emptyAuditMediaSlot())}
            >
              삭제
            </button>
          ) : null}
        </div>
      </div>

      {url ? (
        <p className="truncate text-[10px] text-slate-500" title={url}>
          {fileNameFromUrl(url)}
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) processFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
