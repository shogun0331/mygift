import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { resolveMediaSrc } from '../game/mediaUrl'
import {
  PLAYER_VN_CHARACTER_ID,
  persistVnOnlyCharacter,
  type VnCharacter,
  type VnStandingImage,
} from '../game/vnCharacters'

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isImageFile(file: File | undefined | null): file is File {
  if (!file) return false
  if (file.type.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)
}

export function VnStandingRegister({
  images,
  onAddFiles,
  onRemove,
  error,
}: {
  images: VnStandingImage[]
  onAddFiles: (files: File[]) => void
  onRemove: (id: string) => void
  error?: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function takeFiles(fileList: FileList | File[] | null) {
    const files = Array.from(fileList ?? []).filter(isImageFile)
    if (files.length === 0) return
    onAddFiles(files)
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragging(false)
    takeFiles(event.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">VN 스탠딩 이미지</h3>
        <p className="mt-1 text-xs text-slate-500">
          비주얼 노벨에 세우는 이미지입니다. PNG, JPG, WEBP, GIF를 여러 장 등록할 수 있습니다.
        </p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center transition ${
          dragging
            ? 'border-indigo-400 bg-indigo-500/10 text-indigo-100'
            : 'border-white/15 bg-black/20 text-slate-400 hover:border-white/30 hover:text-slate-200'
        }`}
      >
        <span className="text-sm font-semibold">이미지를 드래그 앤 드롭</span>
        <span className="mt-1 text-[11px]">또는 클릭해서 파일 선택 · 여러 개 가능</span>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            takeFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      {images.length === 0 ? (
        <p className="text-xs text-slate-500">등록된 스탠딩 이미지가 없습니다.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <li key={image.id} className="rounded-xl border border-white/10 bg-black/30 p-2">
              {image.url ? (
                <img
                  src={resolveMediaSrc(image.url)}
                  alt={image.fileName || 'VN 스탠딩'}
                  className="h-36 w-full rounded-lg bg-black object-contain object-bottom"
                />
              ) : (
                <div className="flex h-36 items-center justify-center rounded-lg bg-black text-[11px] text-slate-500">
                  미리보기 없음
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="truncate text-[10px] text-slate-400">{image.fileName || image.file?.name || image.id}</p>
                <button
                  type="button"
                  onClick={() => onRemove(image.id)}
                  className="shrink-0 text-[10px] font-semibold text-rose-300 hover:text-rose-200"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type Props = {
  characters: VnCharacter[]
  onChange: (next: VnCharacter[]) => void
}

export function VnCharacterEditorPanel({ characters, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const editing = characters.find((character) => character.id === editingId) ?? null

  return (
    <div className="game-panel rounded-2xl p-6">
      {creating || editing ? (
        <VnCharacterForm
          key={editing?.id ?? 'new'}
          character={editing}
          onCancel={() => {
            setCreating(false)
            setEditingId(null)
          }}
          onSubmit={async (next) => {
            const saved = await persistVnOnlyCharacter(next)
            if (editing) {
              onChange(characters.map((character) => (character.id === saved.id ? saved : character)))
            } else {
              onChange([...characters, saved])
            }
            setCreating(false)
            setEditingId(null)
          }}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">VN 캐릭터</h2>
              <p className="mt-2 text-sm text-slate-400">
                비주얼 노벨에만 등장합니다. 스카우트와 방송에는 쓰이지 않습니다. 플레이어 스탠딩도 여기서 등록합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="game-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm"
            >
              <span aria-hidden>＋</span>
              VN 캐릭터 추가
            </button>
          </div>
          <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((character) => {
              const thumb = character.vnImages[0]
              const isPlayer = character.id === PLAYER_VN_CHARACTER_ID
              return (
                <li
                  key={character.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  {thumb?.url ? (
                    <img
                      src={resolveMediaSrc(thumb.url, character.mediaRevision)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg bg-black object-contain object-bottom"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[10px] text-slate-500">
                      VN
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {character.name}
                      {isPlayer ? <span className="ml-1 text-[10px] text-amber-300">고정</span> : null}
                    </p>
                    <p className="text-[11px] text-slate-500">스탠딩 {character.vnImages.length}장</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingId(character.id)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5"
                  >
                    수정
                  </button>
                  {isPlayer ? null : (
                    <button
                      type="button"
                      onClick={() => {
                        void persistVnOnlyCharacter({ ...character, vnImages: [] }).finally(() => {
                          onChange(characters.filter((item) => item.id !== character.id))
                        })
                      }}
                      className="rounded-lg border border-rose-500/30 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/10"
                    >
                      삭제
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

function VnCharacterForm({
  character,
  onCancel,
  onSubmit,
}: {
  character: VnCharacter | null
  onCancel: () => void
  onSubmit: (next: VnCharacter) => Promise<void>
}) {
  const isPlayer = character?.id === PLAYER_VN_CHARACTER_ID
  const createdObjectUrls = useRef(new Set<string>())
  const [name, setName] = useState(character?.name ?? '')
  const [images, setImages] = useState<VnStandingImage[]>(() => character?.vnImages ?? [])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function trackUrl(url: string) {
    createdObjectUrls.current.add(url)
    return url
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = isPlayer ? character?.name || '플레이어' : name.trim()
    if (!trimmed || saving) {
      setError('이름을 입력하세요.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const id = character?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      await onSubmit({
        id,
        name: trimmed,
        names: {
          ...(character?.names ?? {
            ko: '',
            en: '',
            ja: '',
            'zh-cn': '',
            'zh-tw': '',
            ru: '',
            es: '',
            de: '',
          }),
          ko: trimmed,
        },
        vnImages: images,
        mediaRevision: character?.mediaRevision,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했습니다.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            {character ? `${character.name} 수정` : 'VN 캐릭터 추가'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">이름과 스탠딩 이미지만 등록합니다.</p>
        </div>
        <button type="button" onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-200">
          목록으로
        </button>
      </div>
      <label className="block max-w-sm">
        <span className="game-stat-label">이름</span>
        <input
          value={isPlayer ? character?.name || '플레이어' : name}
          disabled={isPlayer}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 이모"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40 disabled:opacity-60"
        />
      </label>
      <VnStandingRegister
        images={images}
        error={error}
        onAddFiles={(files) => {
          setError(null)
          setImages((prev) => [
            ...prev,
            ...files.map((file) => ({
              id: createId(),
              file,
              fileName: file.name,
              fileSize: file.size,
              url: trackUrl(URL.createObjectURL(file)),
            })),
          ])
        }}
        onRemove={(id) => {
          setImages((prev) => {
            const target = prev.find((image) => image.id === id)
            if (target?.url && createdObjectUrls.current.has(target.url)) {
              URL.revokeObjectURL(target.url)
              createdObjectUrls.current.delete(target.url)
            }
            return prev.filter((image) => image.id !== id)
          })
        }}
      />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="game-btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50">
          {saving ? '저장 중' : '저장'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300">
          취소
        </button>
      </div>
    </form>
  )
}
