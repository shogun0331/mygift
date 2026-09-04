import { useRef, useState, type DragEvent } from 'react'
import {
  BLUR_DEFAULT,
  BlurRegionEditor,
  clampBlur,
  readBlurRegions,
} from '../events/BlurRegionEditor'
import type { CharacterImage, CharacterVideo, RegisteredCharacter } from '../game/characters'
import {
  emptySnsCaptions,
  normalizeSnsHeat,
  normalizeSnsPosts,
  type SnsHeat,
  type SnsPostDef,
} from '../game/sns'
import { pickSnsCaptionLine } from '../game/snsLines'
import { resolveMediaSrc } from '../game/mediaUrl'
import { SnsMediaWithBlur } from './SnsMediaWithBlur'

type CharacterSnsEditorProps = {
  character: RegisteredCharacter
  onCancel: () => void
  onSave: (next: {
    images: CharacterImage[]
    videos: CharacterVideo[]
    snsPosts: SnsPostDef[]
  }) => void | Promise<void>
}

type DraftMedia = {
  id: string
  file: File
  url: string
}

const HEAT_LABEL: Record<SnsHeat, string> = {
  2: '수위 2 · 어필',
  3: '수위 3 · 화보',
}

const MEDIA_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name)
}

function emptyPost(heat: SnsHeat, captions = emptySnsCaptions()): SnsPostDef {
  return {
    id: createId(),
    heat,
    imageId: null,
    videoId: null,
    captions,
    blurRegions: [],
    blurDefault: BLUR_DEFAULT,
  }
}

function reservedMediaIds(character: RegisteredCharacter) {
  return new Set(
    [
      character.characterIconId,
      character.characterIllustrationId,
      character.profileImageId,
      character.profileVideoId,
    ].filter((id): id is string => Boolean(id)),
  )
}

function referencedSnsMediaIds(posts: SnsPostDef[]) {
  const ids = new Set<string>()
  for (const post of posts) {
    if (post.imageId) ids.add(post.imageId)
    if (post.videoId) ids.add(post.videoId)
  }
  return ids
}

function isSnsOwnedMedia(item: { keys?: string[] }) {
  const keys = item.keys ?? []
  return keys.includes('sns') && keys.every((key) => key === 'sns')
}

function dropUnusedSnsMedia<T extends { id: string; keys?: string[] }>(
  items: T[],
  posts: SnsPostDef[],
  character: RegisteredCharacter,
) {
  const reserved = reservedMediaIds(character)
  const referenced = referencedSnsMediaIds(posts)
  return items.filter(
    (item) => reserved.has(item.id) || referenced.has(item.id) || !isSnsOwnedMedia(item),
  )
}

export function CharacterSnsEditor({ character, onCancel, onSave }: CharacterSnsEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [images, setImages] = useState(() => [...(character.images ?? [])])
  const [videos, setVideos] = useState(() => [...(character.videos ?? [])])
  const [posts, setPosts] = useState<SnsPostDef[]>(() => normalizeSnsPosts(character.snsPosts))
  const [heat, setHeat] = useState<SnsHeat>(2)
  const [drafts, setDrafts] = useState<DraftMedia[]>([])
  const [blurPostId, setBlurPostId] = useState<string | null>(null)
  const blurPost = posts.find((row) => row.id === blurPostId) ?? null
  const blurImage = blurPost ? images.find((row) => row.id === blurPost.imageId) : undefined
  const blurVideo = blurPost ? videos.find((row) => row.id === blurPost.videoId) : undefined
  const canAdd = drafts.length > 0

  function attachFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter(isImageFile)
    if (files.length === 0) return
    setDrafts((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: createId(),
        file,
        url: URL.createObjectURL(file),
      })),
    ])
  }

  function removeDraft(id: string) {
    setDrafts((prev) => {
      const target = prev.find((row) => row.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((row) => row.id !== id)
    })
  }

  function clearDrafts() {
    setDrafts((prev) => {
      for (const row of prev) URL.revokeObjectURL(row.url)
      return []
    })
  }

  function addPosts() {
    if (drafts.length === 0) return
    for (const draft of drafts) {
      const mediaId = createId()
      setImages((prev) => [
        ...prev,
        {
          id: mediaId,
          file: draft.file,
          fileName: undefined,
          fileSize: draft.file.size,
          url: draft.url,
          keys: ['sns'],
        },
      ])
      setPosts((prev) => [
        ...prev,
        {
          ...emptyPost(heat),
          imageId: mediaId,
          captionLine: pickSnsCaptionLine(heat),
        },
      ])
    }
    setDrafts([])
  }

  function updatePost(id: string, patch: Partial<SnsPostDef>) {
    setPosts((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function movePost(index: number, dir: -1 | 1) {
    setPosts((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      const swap = next[index]!
      next[index] = next[target]!
      next[target] = swap
      return next
    })
  }

  function removePost(id: string) {
    const nextPosts = posts.filter((row) => row.id !== id)
    setPosts(nextPosts)
    setImages((prev) => dropUnusedSnsMedia(prev, nextPosts, character))
    setVideos((prev) => dropUnusedSnsMedia(prev, nextPosts, character))
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    if (event.dataTransfer.files?.length) attachFiles(event.dataTransfer.files)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        images: dropUnusedSnsMedia(images, posts, character),
        videos: dropUnusedSnsMedia(videos, posts, character),
        snsPosts: posts.map((post) => ({
          ...post,
          captions: emptySnsCaptions(),
          captionLine: post.captionLine ?? pickSnsCaptionLine(normalizeSnsHeat(post.heat)),
        })),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-1 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500">SNS 관리</p>
          <h2 className="mt-1 text-lg font-bold text-slate-100">{character.name}</h2>
          <p className="mt-1 text-xs text-slate-500">
            수위 고르고 사진만 넣으면 됩니다. 캡션은 게임 언어에 맞춰 캐릭터 한마디가 랜덤으로 붙습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="game-btn rounded-lg px-3 py-2 text-sm" onClick={onCancel}>
            뒤로
          </button>
          <button
            type="button"
            className="game-btn game-btn-primary rounded-lg px-3 py-2 text-sm"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            저장
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto py-4">
        <section className="game-panel rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-300">1. 수위</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {([2, 3] as SnsHeat[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setHeat(value)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                  heat === value
                    ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-100'
                    : 'border-white/10 text-slate-400'
                }`}
              >
                {HEAT_LABEL[value]}
              </button>
            ))}
          </div>

          <p className="mt-5 text-xs font-semibold text-slate-300">2. 사진</p>
          <input
            ref={fileRef}
            type="file"
            accept={MEDIA_ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) attachFiles(event.target.files)
              event.target.value = ''
            }}
          />
          {drafts.length === 0 ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  fileRef.current?.click()
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'copy'
                setDragging(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                if (event.currentTarget.contains(event.relatedTarget as Node)) return
                setDragging(false)
              }}
              onDrop={handleDrop}
              className={`mt-3 flex min-h-[8.5rem] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center transition ${
                dragging
                  ? 'border-indigo-400/70 bg-indigo-500/15 text-indigo-100'
                  : 'border-white/15 bg-black/20 text-slate-400 hover:border-indigo-400/40'
              }`}
            >
              <p className="text-sm font-semibold">{dragging ? '여기에 놓기' : '끌어다 놓거나 클릭해서 고르기'}</p>
              <p className="mt-1 text-[11px] text-slate-500">PNG / JPG / WEBP / GIF</p>
            </div>
          ) : (
            <div
              onDragEnter={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'copy'
                setDragging(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                if (event.currentTarget.contains(event.relatedTarget as Node)) return
                setDragging(false)
              }}
              onDrop={handleDrop}
              className={`mt-3 rounded-2xl border border-dashed p-3 ${
                dragging ? 'border-indigo-400/70 bg-indigo-500/10' : 'border-white/15 bg-black/20'
              }`}
            >
              <div className="flex flex-wrap gap-2">
                {drafts.map((draft) => (
                  <div key={draft.id} className="relative">
                    <img src={draft.url} alt="" className="h-24 w-24 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removeDraft(draft.id)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="game-btn rounded-lg px-3 py-1.5 text-[11px]"
                  onClick={() => fileRef.current?.click()}
                >
                  파일 더 넣기
                </button>
                <button type="button" className="game-btn rounded-lg px-3 py-1.5 text-[11px]" onClick={clearDrafts}>
                  비우기
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={!canAdd}
              className="game-btn game-btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-40"
              onClick={addPosts}
            >
              {drafts.length > 1 ? `${drafts.length}장 추가` : '사진 추가'}
            </button>
          </div>
        </section>

        <p className="mt-5 text-xs font-semibold text-slate-400">등록된 게시물 {posts.length}</p>
        <ul className="mt-2 space-y-2">
          {posts.length === 0 ? (
            <li className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
              아직 없습니다. 위에서 추가한 뒤 저장하세요. 수위별로 3~5장부터 넣으면 됩니다.
            </li>
          ) : (
            posts.map((post, index) => {
              const image = images.find((row) => row.id === post.imageId)
              const video = videos.find((row) => row.id === post.videoId)
              const preview = image?.url || video?.url
              const blurCount = readBlurRegions(post).length
              return (
                <li
                  key={post.id}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  {preview && image ? (
                    <SnsMediaWithBlur
                      url={preview}
                      kind="image"
                      regions={post.blurRegions}
                      objectFit="cover"
                      className="h-16 w-16 shrink-0 rounded-lg"
                      mediaClassName="h-16 w-16 object-cover"
                    />
                  ) : preview && video ? (
                    <SnsMediaWithBlur
                      url={preview}
                      kind="video"
                      regions={post.blurRegions}
                      objectFit="cover"
                      className="h-16 w-16 shrink-0 rounded-lg"
                      mediaClassName="h-16 w-16 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[10px] text-slate-500">
                      글만
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-500">#{index + 1}</span>
                      {([2, 3] as SnsHeat[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            updatePost(post.id, {
                              heat: value,
                              captions: emptySnsCaptions(),
                              captionLine: pickSnsCaptionLine(value),
                            })
                          }
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                            normalizeSnsHeat(post.heat) === value
                              ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-100'
                              : 'border-white/10 text-slate-500'
                          }`}
                        >
                          {HEAT_LABEL[value]}
                        </button>
                      ))}
                      {blurCount > 0 ? (
                        <span className="text-[10px] text-amber-300/80">모자이크 {blurCount}</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">캡션은 게임에서 캐릭터 한마디가 랜덤으로 나갑니다.</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={!preview}
                        className="game-btn rounded-md px-2 py-1 text-[10px] disabled:opacity-40"
                        onClick={() => setBlurPostId(post.id)}
                      >
                        모자이크
                      </button>
                      <button
                        type="button"
                        className="game-btn rounded-md px-2 py-1 text-[10px]"
                        onClick={() => movePost(index, -1)}
                      >
                        위
                      </button>
                      <button
                        type="button"
                        className="game-btn rounded-md px-2 py-1 text-[10px]"
                        onClick={() => movePost(index, 1)}
                      >
                        아래
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-200"
                        onClick={() => removePost(post.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </div>
      {blurPost ? (
        <BlurRegionEditor
          layout="fit"
          asset={
            blurImage?.url
              ? { kind: 'image', url: resolveMediaSrc(blurImage.url) }
              : blurVideo?.url
                ? { kind: 'video', url: resolveMediaSrc(blurVideo.url) }
                : null
          }
          regions={readBlurRegions(blurPost)}
          blurDefault={clampBlur(blurPost.blurDefault)}
          onChange={({ blurRegions, blurDefault }) => {
            updatePost(blurPost.id, { blurRegions, blurDefault })
          }}
          onClose={() => setBlurPostId(null)}
        />
      ) : null}
    </div>
  )
}
