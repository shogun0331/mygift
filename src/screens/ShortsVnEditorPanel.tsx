import { useEffect, useMemo, useState } from 'react'
import { blurRegionsForVnFile } from './CharacterAuditEditorModal'
import { MediaGalleryPickerModal } from '../events/EventManagePanel'
import { BlurRegionOverlay } from '../events/BlurRegionEditor'
import type { GameEvent, EventMediaAsset } from '../events/types'
import {
  findCharacterIconUrl,
  normalizeShortsVn,
  type CharacterShortsVn,
  type RegisteredCharacter,
  type ShortsVnBeat,
  type ShortsVnSlotKey,
} from '../game/characters'
import { resolveMediaSrc } from '../game/mediaUrl'
import {
  listShortsDialogueOptions,
  listShortsVnNodes,
  resolveShortsBeatCaption,
  resolveShortsBeatVnStage,
  standingLayoutClass,
  type ShortsVnNodeOption,
} from '../game/shortsVnDialogue'
import { loadVnCharactersFromDisk, vnStandingStorageUrl, type VnCharacter } from '../game/vnCharacters'
import { useTranslation } from '../locales/i18n'
import type { AddCharacterPayload } from './EditorScreen'
import { ShortsVnPlayer } from './ShortsVnPlayer'

type Props = {
  registeredCharacters: RegisteredCharacter[]
  events: GameEvent[]
  onUpdateCharacter: (id: string, payload: AddCharacterPayload) => void | Promise<void>
  vnCharacters?: VnCharacter[]
}

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

function createBeatId() {
  return `shorts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function sourceNodeIdForVnFile(events: GameEvent[], fileName: string): string | null {
  const target = baseName(fileName)
  if (!target) return null
  for (const event of events) {
    let found: string | null = null
    walkEventNodes(event.nodes ?? [], (node) => {
      if (found) return
      if (baseName(String(node.image || '')) !== target) return
      if (typeof node.id === 'string' && node.id.trim()) found = node.id.trim()
    })
    if (found) return found
  }
  return null
}

export function collectCharacterAllMedia(
  character: RegisteredCharacter,
  events: GameEvent[],
  slot?: ShortsVnSlotKey,
): EventMediaAsset[] {
  const out: EventMediaAsset[] = []
  const seenUrls = new Set<string>()
  const seenFileNames = new Set<string>()

  const addAsset = (asset: {
    id?: string
    fileName?: string
    url?: string
    kind?: 'image' | 'video'
    size?: number
    fileSize?: number
    sourcePath?: string
  }) => {
    if (!asset.url || typeof asset.url !== 'string') return
    const rawUrl = asset.url.trim()
    if (!rawUrl || rawUrl.startsWith('blob:')) return
    if (seenUrls.has(rawUrl)) return
    seenUrls.add(rawUrl)

    let fn = (asset.fileName && asset.fileName.trim()) || baseName(rawUrl) || `media-${out.length + 1}`
    if (seenFileNames.has(fn)) {
      fn = `${out.length + 1}_${fn}`
    }
    seenFileNames.add(fn)

    const kind: 'image' | 'video' = asset.kind ?? (isVideoUrl(rawUrl) ? 'video' : 'image')
    out.push({
      id: asset.id || `char-media-${out.length + 1}-${fn}`,
      fileName: fn,
      url: rawUrl,
      kind,
      size: asset.size ?? asset.fileSize ?? 0,
      sourcePath: asset.sourcePath || '',
    })
  }

  // 1. Current slot event media (prioritized)
  const currentSlotEventId = slot ? character.eventLinks?.[slot] : null
  const currentSlotEvent = currentSlotEventId ? events.find((e) => e.id === currentSlotEventId) : null
  if (currentSlotEvent) {
    const slotLabel = slot === 'vip' ? 'VIP 이벤트' : 'H 이벤트'
    for (const asset of currentSlotEvent.media ?? []) {
      if (asset.kind !== 'image' && asset.kind !== 'video') continue
      addAsset({
        id: asset.id,
        fileName: asset.fileName,
        url: asset.url,
        kind: asset.kind,
        size: asset.size,
        sourcePath: `${slotLabel}: ${currentSlotEvent.title || currentSlotEvent.id}`,
      })
    }
  }

  // 2. Character's registered videos (라이브 영상 / 수위 영상 등)
  for (const vid of character.videos ?? []) {
    addAsset({
      id: vid.id,
      fileName: vid.fileName,
      url: vid.url,
      kind: 'video',
      fileSize: vid.fileSize,
      sourcePath: '캐릭터 영상 갤러리',
    })
  }

  // 3. Character's registered images (일러스트 / 갤러리 사진 등)
  for (const img of character.images ?? []) {
    addAsset({
      id: img.id,
      fileName: img.fileName,
      url: img.url,
      kind: 'image',
      fileSize: img.fileSize,
      sourcePath: '캐릭터 이미지 갤러리',
    })
  }

  // 4. Character's audit performance media (승급심사 A, B, C)
  for (const key of ['A', 'B', 'C'] as const) {
    const slotMedia = character.auditMedia?.[key]
    if (slotMedia?.url) {
      addAsset({
        id: `audit-${key}`,
        url: slotMedia.url,
        sourcePath: `승급 심사 (${key})`,
      })
    }
  }

  // 5. Character's VN standing images
  for (const vnImg of character.vnImages ?? []) {
    const url = vnImg.fileName
      ? vnStandingStorageUrl(character.id, vnImg.fileName, 'characters')
      : vnImg.url
    if (url) {
      addAsset({
        id: vnImg.id,
        fileName: vnImg.fileName,
        url,
        kind: 'image',
        fileSize: vnImg.fileSize,
        sourcePath: 'VN 스탠딩',
      })
    }
  }

  // 6. Character's profile image
  if (character.profileImageUrl) {
    addAsset({
      id: 'profile-image',
      url: character.profileImageUrl,
      kind: 'image',
      sourcePath: '프로필 이미지',
    })
  }

  // 7. All other linked events for this character
  const linkedEventIds = new Set<string>()
  if (character.eventLinks) {
    for (const [, evId] of Object.entries(character.eventLinks)) {
      if (evId && evId !== currentSlotEventId) {
        linkedEventIds.add(evId)
      }
    }
  }

  for (const event of events) {
    if (!linkedEventIds.has(event.id)) continue
    for (const asset of event.media ?? []) {
      if (asset.kind !== 'image' && asset.kind !== 'video') continue
      addAsset({
        id: asset.id,
        fileName: asset.fileName,
        url: asset.url,
        kind: asset.kind,
        size: asset.size,
        sourcePath: `이벤트: ${event.title || event.id}`,
      })
    }
  }

  // 8. Any other events mentioning this character
  for (const event of events) {
    if (event.id === currentSlotEventId || linkedEventIds.has(event.id)) continue
    const isCharProject = event.projectId === character.id
    let mentionsChar = false
    if (!isCharProject) {
      walkEventNodes(event.nodes ?? [], (node) => {
        if (mentionsChar) return
        if (node.speaker === character.id) mentionsChar = true
        if (Array.isArray(node.stageSlots) && node.stageSlots.some((s: any) => s.characterId === character.id)) {
          mentionsChar = true
        }
      })
    }
    if (isCharProject || mentionsChar) {
      for (const asset of event.media ?? []) {
        if (asset.kind !== 'image' && asset.kind !== 'video') continue
        addAsset({
          id: asset.id,
          fileName: asset.fileName,
          url: asset.url,
          kind: asset.kind,
          size: asset.size,
          sourcePath: `관련 이벤트: ${event.title || event.id}`,
        })
      }
    }
  }

  return out
}

function characterToPayload(
  character: RegisteredCharacter,
  patch: Partial<Pick<AddCharacterPayload, 'auditMedia' | 'shortsVn' | 'snsPosts'>>,
): AddCharacterPayload {
  return {
    name: character.name,
    names: character.names,
    age: character.age,
    job: character.job,
    jobs: character.jobs,
    bust: character.bust,
    weight: character.weight,
    statType: character.statType,
    characterIconId: character.characterIconId ?? null,
    characterIllustrationId: character.characterIllustrationId ?? null,
    profileImageId: character.profileImageId ?? null,
    profileVideoId: character.profileVideoId ?? null,
    eventLinks: character.eventLinks,
    images: (character.images || []).map((img) => ({
      id: img.id,
      file: img.file,
      fileName: img.fileName,
      fileSize: img.fileSize,
      url: img.url,
      keys: img.keys,
    })),
    videos: (character.videos || []).map((vid) => ({
      id: vid.id,
      file: vid.file,
      fileName: vid.fileName,
      fileSize: vid.fileSize,
      url: vid.url,
      keys: vid.keys,
      level: vid.level,
      stage: vid.stage,
    })),
    snsPosts: patch.snsPosts ?? character.snsPosts,
    auditMedia: patch.auditMedia ?? character.auditMedia,
    shortsVn: patch.shortsVn ?? character.shortsVn,
  }
}

function VnNodePickerModal({
  nodes,
  title,
  hint,
  onSelect,
  onClose,
}: {
  nodes: ShortsVnNodeOption[]
  title?: string
  hint?: string
  onSelect: (node: ShortsVnNodeOption) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="game-panel flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-sky-400/30 p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-sky-200">{title || 'VN 노드 선택'}</h3>
            <p className="mt-1 text-xs text-slate-400">{hint || '숏츠 비트로 추가할 VN 무대 노드를 선택하세요'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            닫기 ✕
          </button>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 gap-3 overflow-y-auto sm:grid-cols-2 md:grid-cols-3">
          {nodes.length === 0 ? (
            <p className="col-span-full py-12 text-center text-xs text-slate-500">
              연결된 이벤트에 VN 노드가 없습니다.
            </p>
          ) : (
            nodes.map((item, idx) => {
              const bgSrc = item.backgroundUrl ? resolveMediaSrc(item.backgroundUrl) : ''
              const charSrc = item.characterUrl ? resolveMediaSrc(item.characterUrl) : ''
              const plateSrc = item.plateUrl ? resolveMediaSrc(item.plateUrl) : ''

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/40 text-left transition hover:border-sky-400/60 hover:bg-sky-950/20"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    {bgSrc ? (
                      <img src={bgSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-600">
                        (배경 없음)
                      </div>
                    )}
                    {plateSrc ? (
                      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[82%] w-[82%] -translate-x-1/2">
                        <img src={plateSrc} alt="" className="h-full w-full object-contain object-bottom" />
                      </div>
                    ) : null}
                    {item.standings && item.standings.length > 0 ? (
                      item.standings.map((st) => {
                        const frame = standingLayoutClass(st.position, item.standings.length === 1)
                        const src = resolveMediaSrc(st.src)
                        return (
                          <div key={st.key} className={frame}>
                            {st.media === 'video' ? (
                              <video src={src} autoPlay loop muted playsInline className="h-full w-full object-contain object-bottom" />
                            ) : (
                              <img src={src} alt="" className="h-full w-full object-contain object-bottom" />
                            )}
                          </div>
                        )
                      })
                    ) : charSrc ? (
                      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[84%] w-[48%] -translate-x-1/2">
                        {item.isCharacterVideo ? (
                          <video src={charSrc} autoPlay loop muted playsInline className="h-full w-full object-contain object-bottom" />
                        ) : (
                          <img src={charSrc} alt="" className="h-full w-full object-contain object-bottom" />
                        )}
                      </div>
                    ) : null}
                    <div className="absolute top-1.5 left-1.5 rounded bg-sky-950/80 px-1.5 py-0.5 text-[9px] font-bold text-sky-200 border border-sky-400/40">
                      VN #{idx + 1}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col p-2.5">
                    <p className="truncate text-xs font-bold text-sky-100 group-hover:text-sky-300">
                      [{item.id}]
                    </p>
                    <p className="mt-1 truncate text-[10px] text-slate-400">
                      배경: {item.backgroundName || '(없음)'}
                    </p>
                    {(item.characterName || item.plateName) ? (
                      <p className="truncate text-[10px] text-slate-400">
                        캐릭터: {item.characterName || item.plateName}
                      </p>
                    ) : null}
                    {item.dialoguePreview ? (
                      <div className="mt-2 rounded bg-black/40 p-1.5 text-[10px] text-slate-300 line-clamp-2">
                        {item.hasVoice ? '🔊 ' : ''}💬 {item.dialoguePreview}
                      </div>
                    ) : null}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export function ShortsVnEditorPanel({
  registeredCharacters,
  events,
  onUpdateCharacter,
  vnCharacters: propVnCharacters,
}: Props) {
  const { t, locale } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(
    registeredCharacters[0]?.id ?? null,
  )
  const [slot, setSlot] = useState<ShortsVnSlotKey>('vip')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [vnPickerOpen, setVnPickerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [draftById, setDraftById] = useState<Record<string, CharacterShortsVn>>({})
  const [loadedVnChars, setLoadedVnChars] = useState<VnCharacter[]>([])

  useEffect(() => {
    if (propVnCharacters && propVnCharacters.length > 0) return
    void loadVnCharactersFromDisk().then((list) => {
      if (Array.isArray(list) && list.length > 0) setLoadedVnChars(list)
    })
  }, [propVnCharacters])

  const vnCharacters = propVnCharacters ?? loadedVnChars

  const character =
    registeredCharacters.find((row) => row.id === selectedId) ??
    registeredCharacters[0] ??
    null

  const draft = useMemo(() => {
    if (!character) return normalizeShortsVn(null)
    return draftById[character.id] ?? normalizeShortsVn(character.shortsVn)
  }, [character, draftById])

  const beats = draft[slot]
  const vnMedia = useMemo(
    () => (character ? collectCharacterAllMedia(character, events, slot) : []),
    [character, events, slot],
  )
  const linkedEventId = character?.eventLinks?.[slot] ?? null
  const linkedEvent = linkedEventId
    ? events.find((event) => event.id === linkedEventId) ?? null
    : null

  const vnNodes = useMemo(
    () => listShortsVnNodes(linkedEvent, locale, registeredCharacters, vnCharacters),
    [linkedEvent, locale, registeredCharacters, vnCharacters],
  )

  const dialogueOptions = useMemo(
    () => listShortsDialogueOptions(linkedEvent, locale),
    [linkedEvent, locale],
  )

  const setDraft = (next: CharacterShortsVn) => {
    if (!character) return
    setDraftById((prev) => ({ ...prev, [character.id]: next }))
  }

  const updateBeats = (nextBeats: ShortsVnBeat[]) => {
    setDraft({ ...draft, [slot]: nextBeats })
  }

  const moveBeat = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= beats.length) return
    const next = beats.slice()
    const [row] = next.splice(index, 1)
    next.splice(target, 0, row)
    updateBeats(next)
  }

  const handleSave = () => {
    if (!character) return
    void onUpdateCharacter(character.id, characterToPayload(character, { shortsVn: draft }))
  }

  return (
    <div className="game-panel flex min-h-0 flex-col rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{t('shortsVn.editorTitle')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('shortsVn.editorHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!character || beats.length === 0}
            onClick={() => setPreviewOpen(true)}
            className="rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-2 text-xs font-bold text-fuchsia-100 hover:bg-fuchsia-500/25 disabled:opacity-40"
          >
            {t('shortsVn.preview')}
          </button>
          <button
            type="button"
            disabled={!character}
            onClick={handleSave}
            className="game-btn game-btn-primary rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40"
          >
            {t('shortsVn.save')}
          </button>
        </div>
      </div>

      <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[240px_1fr]">
        <div className="max-h-[70vh] space-y-2 overflow-auto rounded-xl border border-white/10 bg-black/25 p-2">
          {registeredCharacters.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-slate-500">
              {t('shortsVn.noCharacters')}
            </p>
          ) : (
            registeredCharacters.map((row) => {
              const active = character?.id === row.id
              const icon = findCharacterIconUrl(row)
              const counts = normalizeShortsVn(draftById[row.id] ?? row.shortsVn)
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                    active
                      ? 'border-amber-400/40 bg-amber-500/15 text-amber-50'
                      : 'border-transparent bg-black/20 text-slate-300 hover:border-white/10 hover:bg-black/40'
                  }`}
                >
                  <div className="h-9 w-9 overflow-hidden rounded-lg bg-black/50">
                    {icon ? (
                      <img src={resolveMediaSrc(icon)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{row.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      VIP {counts.vip.length} · H {counts.h.length}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {!character ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-sm text-slate-500">
            {t('shortsVn.pickCharacter')}
          </div>
        ) : (
          <div className="min-h-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(['vip', 'h'] as ShortsVnSlotKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSlot(key)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    slot === key
                      ? 'border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-100'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {key === 'vip' ? t('shortsVn.slotVip') : t('shortsVn.slotH')}
                  <span className="ml-1 opacity-70">({draft[key].length})</span>
                </button>
              ))}
              <span className="ml-auto text-[11px] text-slate-500">
                {linkedEvent
                  ? t('shortsVn.linkedEvent').replace(
                      '{title}',
                      linkedEvent.title || linkedEvent.id,
                    )
                  : t('shortsVn.noLinkedEvent')}
              </span>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-3 text-[11px] text-slate-300">
              {t('shortsVn.curationHint')}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={vnMedia.length === 0}
                onClick={() => setPickerOpen(true)}
                className="rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/25 disabled:opacity-40"
              >
                + {t('shortsVn.addFromGallery')} ({vnMedia.length})
              </button>
              <button
                type="button"
                disabled={!linkedEvent || vnNodes.length === 0}
                onClick={() => setVnPickerOpen(true)}
                className="rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-100 hover:bg-sky-500/25 disabled:opacity-40"
              >
                + {t('shortsVn.addFromVnNodes') || 'VN 노드에서 추가'} ({vnNodes.length})
              </button>
              <button
                type="button"
                disabled={beats.length === 0}
                onClick={() => setPreviewOpen(true)}
                className="rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-3 py-2 text-xs font-bold text-fuchsia-100 hover:bg-fuchsia-500/25 disabled:opacity-40"
              >
                {t('shortsVn.previewSlot')}
              </button>
              <button
                type="button"
                disabled={beats.length === 0}
                onClick={() => updateBeats([])}
                className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-900/50 disabled:opacity-40"
              >
                {t('shortsVn.clearAll')}
              </button>
            </div>

            {beats.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center text-sm text-slate-500">
                {t('shortsVn.emptyBeats')}
              </div>
            ) : (
              <div className="space-y-3">
                {beats.map((beat, index) => {
                  const preview = resolveShortsBeatCaption(beat, linkedEvent, locale)
                  const vnStage = resolveShortsBeatVnStage(beat, linkedEvent, registeredCharacters, vnCharacters)
                  return (
                    <div
                      key={beat.id}
                      className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 sm:grid-cols-[180px_1fr_auto]"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                        {vnStage.isVn ? (
                          <>
                            {vnStage.backgroundSrc ? (
                              isVideoUrl(vnStage.backgroundSrc) ? (
                                <video
                                  src={vnStage.backgroundSrc}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                  loop
                                  autoPlay
                                />
                              ) : (
                                <img
                                  src={vnStage.backgroundSrc}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              )
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-600">
                                (배경 없음)
                              </div>
                            )}

                            {vnStage.plateSrc ? (
                              <div className="pointer-events-none absolute bottom-0 left-1/2 h-[82%] w-[82%] -translate-x-1/2">
                                <img
                                  src={vnStage.plateSrc}
                                  alt=""
                                  className="h-full w-full object-contain object-bottom"
                                />
                              </div>
                            ) : null}

                            {vnStage.standings.length > 0 ? (
                              vnStage.standings.map((st) => {
                                const frame = standingLayoutClass(st.position, vnStage.standings.length === 1)
                                return (
                                  <div key={st.key} className={frame}>
                                    {st.media === 'video' ? (
                                      <video
                                        src={st.src}
                                        className="h-full w-full object-contain object-bottom"
                                        muted
                                        playsInline
                                        loop
                                        autoPlay
                                      />
                                    ) : (
                                      <img
                                        src={st.src}
                                        alt=""
                                        className="h-full w-full object-contain object-bottom"
                                      />
                                    )}
                                  </div>
                                )
                              })
                            ) : vnStage.characterSrc ? (
                              <div className="pointer-events-none absolute bottom-0 left-1/2 h-[84%] w-[48%] -translate-x-1/2">
                                {vnStage.isCharacterVideo ? (
                                  <video
                                    src={vnStage.characterSrc}
                                    className="h-full w-full object-contain object-bottom"
                                    muted
                                    playsInline
                                    loop
                                    autoPlay
                                  />
                                ) : (
                                  <img
                                    src={vnStage.characterSrc}
                                    alt=""
                                    className="h-full w-full object-contain object-bottom"
                                  />
                                )}
                              </div>
                            ) : null}

                            <div className="absolute top-1.5 left-1.5 z-10 rounded bg-sky-950/80 px-1.5 py-0.5 text-[9px] font-bold text-sky-200 border border-sky-400/40">
                              VN 노드
                            </div>
                          </>
                        ) : isVideoUrl(beat.mediaUrl) ? (
                          <video
                            src={resolveMediaSrc(beat.mediaUrl)}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            loop
                            autoPlay
                          />
                        ) : (
                          <img
                            src={resolveMediaSrc(beat.mediaUrl)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                        {beat.blurRegions.length > 0 ? (
                          <BlurRegionOverlay
                            regions={beat.blurRegions}
                            src={resolveMediaSrc(vnStage.isVn ? (vnStage.backgroundSrc || beat.mediaUrl) : beat.mediaUrl)}
                            kind={isVideoUrl(vnStage.isVn ? (vnStage.backgroundSrc || beat.mediaUrl) : beat.mediaUrl) ? 'video' : 'image'}
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-300">
                            #{index + 1}
                            {vnStage.isVn ? (
                              <span className="ml-1.5 rounded bg-sky-950/70 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300 border border-sky-500/30">
                                VN [{vnStage.nodeId || '노드'}]
                              </span>
                            ) : null}
                          </span>
                          <span className="truncate max-w-[200px]" title={beat.mediaUrl}>
                            {fileNameFromUrl(beat.mediaUrl)}
                          </span>
                        </div>

                        {/* VN 노드 선택/연결 드롭다운 */}
                        {vnNodes.length > 0 ? (
                          <label className="block">
                            <span className="text-[10px] font-bold text-sky-300">
                              {t('shortsVn.changeVnNode') || 'VN 노드 선택/연결'}
                            </span>
                            <select
                              value={vnStage.nodeId ?? ''}
                              onChange={(e) => {
                                const targetNodeId = e.target.value.trim() || null
                                const nodeOpt = vnNodes.find((row) => row.id === targetNodeId)
                                const next = beats.slice()
                                if (nodeOpt) {
                                  next[index] = {
                                    ...beat,
                                    sourceNodeId: nodeOpt.id,
                                    mediaUrl: nodeOpt.backgroundUrl || nodeOpt.plateUrl || (nodeOpt.standings[0]?.src) || beat.mediaUrl,
                                    plateUrl: nodeOpt.plateUrl || null,
                                    characterUrl: nodeOpt.characterUrl || null,
                                    standings: nodeOpt.standings.length > 0 ? nodeOpt.standings : undefined,
                                    captionNodeId: beat.captionNodeId || nodeOpt.nextDialogueNodeId || null,
                                    caption: beat.caption || nodeOpt.dialoguePreview || '',
                                  }
                                } else {
                                  next[index] = {
                                    ...beat,
                                    sourceNodeId: null,
                                    plateUrl: null,
                                    characterUrl: null,
                                    standings: undefined,
                                  }
                                }
                                updateBeats(next)
                              }}
                              className="mt-1 w-full rounded-xl border border-sky-500/20 bg-black/40 px-3 py-1.5 text-xs text-sky-100 outline-none focus:border-sky-400"
                            >
                              <option value="">(일반 미디어 비트)</option>
                              {vnNodes.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  [VN #{opt.id}] {opt.backgroundName ? `배경: ${opt.backgroundName}` : ''} {opt.characterName ? `/ 캐릭터: ${opt.characterName}` : ''}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}

                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-400">
                            {t('shortsVn.captionNode')}
                          </span>
                          <select
                            value={beat.captionNodeId ?? ''}
                            disabled={dialogueOptions.length === 0}
                            onChange={(e) => {
                              const captionNodeId = e.target.value.trim() || null
                              const option = dialogueOptions.find((row) => row.id === captionNodeId)
                              const next = beats.slice()
                              next[index] = {
                                ...beat,
                                captionNodeId,
                                caption: option?.preview ?? '',
                              }
                              updateBeats(next)
                            }}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-fuchsia-400/40 disabled:opacity-40"
                          >
                            <option value="">{t('shortsVn.captionNone')}</option>
                            {dialogueOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.hasVoice ? '🔊 ' : ''}
                                [{option.id}] {option.preview.slice(0, 80)}
                                {option.preview.length > 80 ? '…' : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                        {preview ? (
                          <p className="rounded-lg border border-white/5 bg-black/30 px-2.5 py-2 text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                            {preview}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-500">{t('shortsVn.captionHint')}</p>
                        )}
                        <label className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-bold">{t('shortsVn.duration')}</span>
                          <input
                            type="number"
                            min={0.5}
                            max={30}
                            step={0.5}
                            value={beat.durationSec}
                            onChange={(e) => {
                              const value = Number(e.target.value)
                              const durationSec =
                                Number.isFinite(value) && value > 0
                                  ? Math.min(30, Math.max(0.5, value))
                                  : 2
                              const next = beats.slice()
                              next[index] = { ...beat, durationSec }
                              updateBeats(next)
                            }}
                            className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-slate-100"
                          />
                          <span>sec</span>
                        </label>
                      </div>

                      <div className="flex flex-row gap-1 sm:flex-col">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveBeat(index, -1)}
                          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index >= beats.length - 1}
                          onClick={() => moveBeat(index, 1)}
                          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBeats(beats.filter((row) => row.id !== beat.id))}
                          className="rounded-lg border border-rose-500/30 bg-rose-950/50 px-2 py-1 text-[10px] font-bold text-rose-200"
                        >
                          {t('shortsVn.remove')}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {pickerOpen && character ? (
        <MediaGalleryPickerModal
          media={vnMedia}
          selectedFileName=""
          title={`${character.name} - ${t('shortsVn.galleryTitle') || '캐릭터 그래픽 & 영상 갤러리'}`}
          hint={t('shortsVn.galleryHint') || '캐릭터의 모든 그래픽(이미지)과 영상 중 숏츠 비트로 추가할 미디어를 선택하세요'}
          onSelect={(fileName, asset) => {
            if (!fileName) {
              setPickerOpen(false)
              return
            }
            const selectedAsset = asset || vnMedia.find((row) => row.fileName === fileName)
            if (!selectedAsset?.url) {
              setPickerOpen(false)
              return
            }
            const beat: ShortsVnBeat = {
              id: createBeatId(),
              mediaUrl: selectedAsset.url,
              caption: '',
              durationSec: 2,
              blurRegions: blurRegionsForVnFile(events, fileName),
              sourceNodeId: sourceNodeIdForVnFile(events, fileName),
              captionNodeId: null,
            }
            updateBeats([...beats, beat])
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}

      {vnPickerOpen && character && linkedEvent ? (
        <VnNodePickerModal
          nodes={vnNodes}
          title={t('shortsVn.vnNodePickerTitle') || '숏츠 비트용 VN 노드 선택'}
          hint={t('shortsVn.vnNodePickerHint') || '연결된 VN의 무대(배경+캐릭터) 노드를 선택하세요'}
          onSelect={(nodeOpt) => {
            const beat: ShortsVnBeat = {
              id: createBeatId(),
              mediaUrl: nodeOpt.backgroundUrl || nodeOpt.plateUrl || (nodeOpt.standings[0]?.src) || '',
              caption: nodeOpt.dialoguePreview || '',
              durationSec: 2,
              blurRegions: nodeOpt.backgroundName ? blurRegionsForVnFile(events, nodeOpt.backgroundName) : [],
              sourceNodeId: nodeOpt.id,
              captionNodeId: nodeOpt.nextDialogueNodeId || null,
              plateUrl: nodeOpt.plateUrl || null,
              characterUrl: nodeOpt.characterUrl || null,
              standings: nodeOpt.standings.length > 0 ? nodeOpt.standings : undefined,
            }
            updateBeats([...beats, beat])
            setVnPickerOpen(false)
          }}
          onClose={() => setVnPickerOpen(false)}
        />
      ) : null}

      {previewOpen && character && beats.length > 0 ? (
        <ShortsVnPlayer
          key={`shorts-preview-${character.id}-${slot}-${beats.map((b) => b.id).join('-')}`}
          beats={beats}
          event={linkedEvent}
          presentation="popup"
          title={t(
            slot === 'vip' ? 'shortsVn.playerVipTitle' : 'shortsVn.playerHTitle',
          ).replace('{name}', character.name)}
          onClose={() => setPreviewOpen(false)}
          registeredCharacters={registeredCharacters}
          vnCharacters={vnCharacters}
        />
      ) : null}
    </div>
  )
}
