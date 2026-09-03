import { useMemo, useState } from 'react'
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
  resolveShortsBeatCaption,
} from '../game/shortsVnDialogue'
import { useTranslation } from '../locales/i18n'
import type { AddCharacterPayload } from './EditorScreen'
import { ShortsVnPlayer } from './ShortsVnPlayer'

type Props = {
  registeredCharacters: RegisteredCharacter[]
  events: GameEvent[]
  onUpdateCharacter: (id: string, payload: AddCharacterPayload) => void | Promise<void>
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

function collectSlotVnMedia(
  character: RegisteredCharacter,
  events: GameEvent[],
  slot: ShortsVnSlotKey,
): EventMediaAsset[] {
  const linkedId = character.eventLinks?.[slot]
  if (!linkedId) return []
  const out: EventMediaAsset[] = []
  const seen = new Set<string>()
  for (const event of events) {
    if (event.id !== linkedId) continue
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

export function ShortsVnEditorPanel({
  registeredCharacters,
  events,
  onUpdateCharacter,
}: Props) {
  const { t, locale } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(
    registeredCharacters[0]?.id ?? null,
  )
  const [slot, setSlot] = useState<ShortsVnSlotKey>('vip')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [draftById, setDraftById] = useState<Record<string, CharacterShortsVn>>({})

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
    () => (character ? collectSlotVnMedia(character, events, slot) : []),
    [character, events, slot],
  )
  const linkedEventId = character?.eventLinks?.[slot] ?? null
  const linkedEvent = linkedEventId
    ? events.find((event) => event.id === linkedEventId) ?? null
    : null

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
                disabled={!linkedEvent || vnMedia.length === 0}
                onClick={() => setPickerOpen(true)}
                className="rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/25 disabled:opacity-40"
              >
                {t('shortsVn.addFromGallery')} ({vnMedia.length})
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
                  return (
                    <div
                      key={beat.id}
                      className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 sm:grid-cols-[180px_1fr_auto]"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                        {isVideoUrl(beat.mediaUrl) ? (
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
                          <BlurRegionOverlay regions={beat.blurRegions} />
                        ) : null}
                      </div>

                      <div className="min-w-0 space-y-2">
                        <p className="truncate text-[10px] text-slate-500" title={beat.mediaUrl}>
                          #{index + 1} · {fileNameFromUrl(beat.mediaUrl)}
                        </p>
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
          title={t('shortsVn.galleryTitle')}
          hint={t('shortsVn.galleryHint')}
          onSelect={(fileName) => {
            if (!fileName) {
              setPickerOpen(false)
              return
            }
            const asset = vnMedia.find((row) => row.fileName === fileName)
            if (!asset?.url) {
              setPickerOpen(false)
              return
            }
            const beat: ShortsVnBeat = {
              id: createBeatId(),
              mediaUrl: asset.url,
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
        />
      ) : null}
    </div>
  )
}
