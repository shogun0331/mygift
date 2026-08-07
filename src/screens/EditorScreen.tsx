import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type ReactNode, type RefObject } from 'react'

type EditorTab = 'character'
type CharacterView = 'list' | 'add'

type EditorScreenProps = {
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

export function EditorScreen({ onBack }: EditorScreenProps) {
  const [tab, setTab] = useState<EditorTab>('character')
  const [characterView, setCharacterView] = useState<CharacterView>('list')

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
              setCharacterView('list')
            }}
            className={`game-btn-tab flex w-full items-center justify-start rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
              tab === 'character' ? 'is-active' : ''
            }`}
          >
            캐릭터 관리
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
                      캐릭터 편집 기능을 여기에 구성합니다.
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
              </div>
            ) : (
              <AddCharacterPanel
                onCancel={() => setCharacterView('list')}
                onSubmit={() => setCharacterView('list')}
              />
            )
          ) : null}
        </section>
      </div>
    </main>
  )
}

type MediaItem = {
  id: string
  file: File
  url: string
  keys: string[]
}

type AddCharacterPayload = {
  name: string
  age: string
  job: string
  bust: string
  weight: string
  profileImageId: string | null
  profileVideoId: string | null
  images: Array<{ id: string; file: File; keys: string[] }>
  videos: Array<{ id: string; file: File; keys: string[] }>
}

type AddCharacterPanelProps = {
  onCancel: () => void
  onSubmit: (payload: AddCharacterPayload) => void
}

const fieldClassName =
  'mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/40'

function AddCharacterPanel({ onCancel, onSubmit }: AddCharacterPanelProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [job, setJob] = useState('')
  const [bust, setBust] = useState('')
  const [weight, setWeight] = useState('')

  const [images, setImages] = useState<MediaItem[]>([])
  const [profileImageId, setProfileImageId] = useState<string | null>(null)
  const [imageDragging, setImageDragging] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageKeyDrafts, setImageKeyDrafts] = useState<Record<string, string>>({})

  const [videos, setVideos] = useState<MediaItem[]>([])
  const [profileVideoId, setProfileVideoId] = useState<string | null>(null)
  const [videoDragging, setVideoDragging] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoKeyDrafts, setVideoKeyDrafts] = useState<Record<string, string>>({})

  const imagesRef = useRef(images)
  imagesRef.current = images
  const videosRef = useRef(videos)
  videosRef.current = videos

  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) URL.revokeObjectURL(image.url)
      for (const video of videosRef.current) URL.revokeObjectURL(video.url)
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
        url: URL.createObjectURL(file),
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
    setVideos((prev) => [
      ...prev,
      ...videoFiles.map((file) => ({
        id: createId(),
        file,
        url: URL.createObjectURL(file),
        keys: [] as string[],
      })),
    ])
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((item) => item.id !== id)
    })
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
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((item) => item.id !== id)
    })
    setProfileVideoId((current) => (current === id ? null : current))
    setVideoKeyDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit({
      name: trimmed,
      age: age.trim(),
      job: job.trim(),
      bust: bust.trim(),
      weight: weight.trim(),
      profileImageId,
      profileVideoId,
      images: images.map((image) => ({ id: image.id, file: image.file, keys: image.keys })),
      videos: videos.map((video) => ({ id: video.id, file: video.file, keys: video.keys })),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="game-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="game-kicker">CHARACTER</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">캐릭터 추가</h2>
          <p className="mt-2 text-sm text-slate-400">프로필, 기본 정보, 이미지·영상을 등록합니다.</p>
        </div>
        <button type="button" onClick={onCancel} className="game-btn shrink-0 rounded-xl px-4 py-2 text-sm">
          목록으로
        </button>
      </div>

      <div className="mt-6 max-w-3xl space-y-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 gap-4">
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
          description="이미지를 등록한 뒤 키를 연결하고, 그중 하나를 프로필 이미지로 지정할 수 있습니다."
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
              alt={item.file.name}
              className="h-28 w-full rounded-xl bg-black object-cover sm:w-44"
            />
          )}
        />

        <MediaRegisterSection
          title="영상 등록"
          description="영상을 등록한 뒤 키를 연결하고, 그중 하나를 프로필 영상으로 지정할 수 있습니다."
          dropLabel="영상을 드래그 앤 드롭"
          dropHint="또는 클릭해서 파일 선택 (MP4, WEBM, MOV 등) · 여러 개 가능"
          accept={VIDEO_ACCEPT}
          inputRef={videoInputRef}
          dragging={videoDragging}
          setDragging={setVideoDragging}
          error={videoError}
          onAddFiles={addVideos}
          items={videos}
          profileId={profileVideoId}
          drafts={videoKeyDrafts}
          profileBadge="프로필 영상"
          onDraftChange={(id, value) =>
            setVideoKeyDrafts((prev) => ({ ...prev, [id]: value }))
          }
          onAddKey={(id) => addKey(id, videoKeyDrafts, setVideoKeyDrafts, setVideos)}
          onRemoveKey={(id, key) => removeKey(id, key, setVideos)}
          onSetProfile={(id) =>
            setProfileVideoId((current) => (current === id ? null : id))
          }
          onRemove={removeVideo}
          renderPreview={(item) => (
            <video
              src={item.url}
              controls
              preload="metadata"
              className="h-28 w-full shrink-0 rounded-xl bg-black object-cover sm:w-44"
            />
          )}
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="game-btn rounded-xl px-4 py-2 text-sm">
            취소
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="game-btn-primary rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            추가
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
}

function ProfilePickPreview({
  label,
  selectedId,
  options,
  onSelect,
  kind,
}: ProfilePickPreviewProps) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const selected = options.find((item) => item.id === selectedId) ?? null
  const mediaLabel = kind === 'image' ? '이미지' : '영상'

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
          className="mt-2 flex h-36 w-36 flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/20 text-left transition hover:border-indigo-400/40"
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
            <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
              <span className="text-xl text-indigo-300" aria-hidden>
                ＋
              </span>
              <p className="text-[11px] leading-snug text-slate-400">클릭해서 선택</p>
            </div>
          )}
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
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
                                alt={item.file.name}
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
                              {item.file.name}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {formatFileSize(item.file.size)}
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
        </div>
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
                <p className="truncate text-sm font-medium text-slate-100">{item.file.name}</p>
                {isProfile ? <span className="game-chip-gold">{profileBadge}</span> : null}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(item.file.size)}</p>
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
