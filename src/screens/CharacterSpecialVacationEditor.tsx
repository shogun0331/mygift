import { useMemo, useRef, useState, type DragEvent } from 'react'
import {
  SPECIAL_VACATION_IMAGE_KEY,
  SPECIAL_VACATION_IMAGE_MAX,
  normalizeSpecialVacation,
  type CharacterImage,
  type CharacterSpecialVacation,
  type RegisteredCharacter,
  type SpecialVacationVoice,
} from '../game/characters'
import {
  CHARACTER_LOCALE_LABELS,
  CHARACTER_LOCALES,
  type CharacterLocale,
} from '../game/characterLocales'
import { resolveMediaSrc } from '../game/mediaUrl'
import { pickSpecialVacationCaption } from '../game/specialVacationLines'
import { useTranslation } from '../locales/i18n'
import type { AddCharacterPayload } from './EditorScreen'

type Props = {
  character: RegisteredCharacter
  onCancel: () => void
  onSave: (payload: AddCharacterPayload) => void | Promise<void>
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)
}

function isAudioFile(file: File) {
  return file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)
}

function isVacationImage(image: CharacterImage) {
  return (image.keys ?? []).includes(SPECIAL_VACATION_IMAGE_KEY)
}

function characterToPayload(
  character: RegisteredCharacter,
  images: CharacterImage[],
  specialVacation: CharacterSpecialVacation,
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
    images: images.map((img) => ({
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
    snsPosts: character.snsPosts,
    auditMedia: character.auditMedia,
    shortsVn: character.shortsVn,
    specialVacation,
  }
}

export function CharacterSpecialVacationEditor({ character, onCancel, onSave }: Props) {
  const { locale } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const voiceInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [captionLocale, setCaptionLocale] = useState<CharacterLocale>('ja')
  const [images, setImages] = useState<CharacterImage[]>(() => character.images ?? [])
  const [imageDragging, setImageDragging] = useState(false)
  const [draft, setDraft] = useState<CharacterSpecialVacation>(() => {
    const base = normalizeSpecialVacation(character.specialVacation, character.name)
    if (base.imageIds.length > 0) return base
    const fromKeys = (character.images ?? [])
      .filter((img) => (img.keys ?? []).includes(SPECIAL_VACATION_IMAGE_KEY))
      .map((img) => img.id)
      .slice(0, SPECIAL_VACATION_IMAGE_MAX)
    return { ...base, imageIds: fromKeys }
  })

  const vacationImages = useMemo(() => {
    const byId = new Map(images.map((img) => [img.id, img]))
    const ordered = draft.imageIds
      .map((id) => byId.get(id))
      .filter((img): img is CharacterImage => Boolean(img))
    for (const img of images) {
      if (!isVacationImage(img)) continue
      if (ordered.some((row) => row.id === img.id)) continue
      if (ordered.length >= SPECIAL_VACATION_IMAGE_MAX) break
      ordered.push(img)
    }
    return ordered.slice(0, SPECIAL_VACATION_IMAGE_MAX)
  }, [images, draft.imageIds])

  const previewCaption = pickSpecialVacationCaption(draft.captions, locale, character.name)

  const syncImageIds = (nextVacation: CharacterImage[]) => {
    setDraft((prev) => ({
      ...prev,
      imageIds: nextVacation.map((img) => img.id).slice(0, SPECIAL_VACATION_IMAGE_MAX),
    }))
  }

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter(isImageFile)
    if (list.length === 0) return
    const room = SPECIAL_VACATION_IMAGE_MAX - vacationImages.length
    if (room <= 0) return
    const accepted = list.slice(0, room)
    const created: CharacterImage[] = accepted.map((file) => ({
      id: createId(),
      file,
      fileName: file.name,
      fileSize: file.size,
      url: URL.createObjectURL(file),
      keys: [SPECIAL_VACATION_IMAGE_KEY],
    }))
    setImages((prev) => [...prev, ...created])
    syncImageIds([...vacationImages, ...created])
  }

  const removeImage = (imageId: string) => {
    const target = images.find((img) => img.id === imageId)
    if (target?.url?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(target.url)
      } catch {
        // ignore
      }
    }
    setImages((prev) => prev.filter((img) => img.id !== imageId))
    syncImageIds(vacationImages.filter((img) => img.id !== imageId))
  }

  const moveImage = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= vacationImages.length) return
    const next = vacationImages.slice()
    const [row] = next.splice(index, 1)
    next.splice(target, 0, row)
    syncImageIds(next)
  }

  const setVoiceFile = (file: File | null) => {
    if (!file) {
      setDraft((prev) => ({ ...prev, voice: null }))
      return
    }
    if (!isAudioFile(file)) return
    const next: SpecialVacationVoice = {
      id: draft.voice?.id || createId(),
      file,
      fileName: file.name,
      fileSize: file.size,
      url: URL.createObjectURL(file),
    }
    if (draft.voice?.url?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(draft.voice.url)
      } catch {
        // ignore
      }
    }
    setDraft((prev) => ({ ...prev, voice: next }))
  }

  const playVoice = () => {
    const src = draft.voice?.url ? resolveMediaSrc(draft.voice.url) : ''
    if (!src) return
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    const audio = new Audio(src)
    audioRef.current = audio
    void audio.play().catch(() => {})
  }

  const handleImageDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setImageDragging(true)
  }

  const handleImageDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setImageDragging(true)
  }

  const handleImageDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setImageDragging(false)
  }

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setImageDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const ids = vacationImages.map((img) => img.id)
      const keepIds = new Set(ids)
      const nextImages = images.filter((img) => {
        if (!isVacationImage(img)) return true
        return keepIds.has(img.id)
      })
      await onSave(
        characterToPayload(character, nextImages, {
          ...draft,
          imageIds: ids,
        }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="game-panel rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">
            특별휴가
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-100">
            [{character.name}] 특별휴가 세팅
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            다국어 대본 · 음성 1개 · 이미지 최대 {SPECIAL_VACATION_IMAGE_MAX}장
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
          >
            목록으로
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="game-btn game-btn-primary rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <section className="rounded-2xl border border-amber-500/20 bg-amber-950/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-amber-100">감사 대본 (국가별)</h3>
            <div className="flex flex-wrap gap-1">
              {CHARACTER_LOCALES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setCaptionLocale(lang)}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
                    captionLocale === lang
                      ? 'border-amber-400/50 bg-amber-500/20 text-amber-50'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {CHARACTER_LOCALE_LABELS[lang]}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={draft.captions[captionLocale] ?? ''}
            onChange={(e) => {
              const value = e.target.value
              setDraft((prev) => ({
                ...prev,
                captions: { ...prev.captions, [captionLocale]: value },
              }))
            }}
            rows={4}
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs leading-relaxed text-slate-100 outline-none focus:border-amber-400/40"
          />
          <p className="mt-2 text-[10px] text-slate-500">
            현재 UI 언어 미리보기: {previewCaption || '(비어 있음)'}
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <h3 className="text-xs font-bold text-slate-200">음성 (1개)</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            다국어 음성이 아닙니다. 캐릭터당 음성 파일 하나만 등록합니다.
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const file = Array.from(e.dataTransfer.files || []).find(isAudioFile) ?? null
              if (file) setVoiceFile(file)
            }}
            onClick={() => voiceInputRef.current?.click()}
            className="mt-3 cursor-pointer rounded-2xl border border-dashed border-amber-500/30 bg-amber-950/10 px-4 py-6 text-center transition hover:border-amber-400/50 hover:bg-amber-950/20"
          >
            <p className="text-xs font-bold text-amber-100">
              {draft.voice ? '음성을 여기에 드롭하거나 클릭해서 교체' : '음성을 여기에 드롭하거나 클릭해서 등록'}
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-400">
              {draft.voice?.fileName || draft.voice?.url || 'mp3 / wav / ogg / m4a'}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!draft.voice?.url}
              onClick={playVoice}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] font-bold text-slate-200 disabled:opacity-40"
            >
              미리듣기
            </button>
            <button
              type="button"
              disabled={!draft.voice}
              onClick={() => setVoiceFile(null)}
              className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-[11px] font-bold text-rose-200 disabled:opacity-40"
            >
              음성 삭제
            </button>
          </div>
          <input
            ref={voiceInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setVoiceFile(file)
              e.target.value = ''
            }}
          />
        </section>

        <section>
          <h3 className="text-xs font-bold text-slate-200">
            이미지 ({vacationImages.length}/{SPECIAL_VACATION_IMAGE_MAX})
          </h3>

          <div
            onDragEnter={handleImageDragEnter}
            onDragOver={handleImageDragOver}
            onDragLeave={handleImageDragLeave}
            onDrop={handleImageDrop}
            onClick={() => {
              if (vacationImages.length >= SPECIAL_VACATION_IMAGE_MAX) return
              fileInputRef.current?.click()
            }}
            className={`mt-3 cursor-pointer rounded-2xl border border-dashed p-4 transition ${
              imageDragging
                ? 'border-amber-400/60 bg-amber-950/25'
                : 'border-white/15 bg-black/25 hover:border-amber-400/40 hover:bg-amber-950/10'
            }`}
          >
            {vacationImages.length === 0 ? (
              <div className="flex w-full flex-col items-center justify-center gap-1 py-10 text-center pointer-events-none">
                <span className="text-xs font-bold text-amber-100">
                  {imageDragging ? '여기에 놓기' : '이미지를 드래그하거나 클릭해서 등록'}
                </span>
                <span className="text-[10px] text-slate-500">
                  최대 {SPECIAL_VACATION_IMAGE_MAX}장 · PNG / JPG / WEBP / GIF
                </span>
              </div>
            ) : (
              <>
                <ul
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {vacationImages.map((img, index) => (
                    <li
                      key={img.id}
                      className="overflow-hidden rounded-xl border border-white/10 bg-black/40"
                    >
                      <div className="relative aspect-square">
                        {img.url ? (
                          <img
                            src={resolveMediaSrc(img.url)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                            no image
                          </div>
                        )}
                        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex gap-1 p-1.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveImage(index, -1)}
                          className="flex-1 rounded-lg border border-white/10 bg-black/40 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={index >= vacationImages.length - 1}
                          onClick={() => moveImage(index, 1)}
                          className="flex-1 rounded-lg border border-white/10 bg-black/40 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-30"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="flex-1 rounded-lg border border-rose-500/30 bg-rose-950/50 py-1 text-[10px] font-bold text-rose-200"
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {vacationImages.length < SPECIAL_VACATION_IMAGE_MAX ? (
                  <p className="mt-3 text-center text-[11px] font-bold text-amber-100/90 pointer-events-none">
                    {imageDragging
                      ? '여기에 놓아서 추가'
                      : '이미지를 더 드래그하거나 빈 곳을 클릭해서 추가'}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </section>
      </div>
    </div>
  )
}
