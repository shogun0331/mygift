import { useRef, useState, type DragEvent } from 'react'
import { OPENING_VIDEO_SLOTS, openingVideoMediaPath, type OpeningVideoConfig } from '../game/openingVideos'
import { openOpeningFolder as openProjectOpeningFolder } from '../events/db'
import { resolveMediaSrc } from '../game/mediaUrl'

type OpeningEditorPanelProps = {
  config: OpeningVideoConfig
  onUpload: (index: number, file: File) => Promise<void>
  onClear: (index: number) => Promise<void>
}

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)$/i

function isVideoFile(file: File) {
  return file.type.startsWith('video/') || VIDEO_EXT.test(file.name)
}

function pickVideoFiles(files: FileList | null | undefined) {
  if (!files?.length) return []
  return Array.from(files).filter(isVideoFile)
}

export function OpeningEditorPanel({ config, onUpload, onClear }: OpeningEditorPanelProps) {
  const [busyIndex, setBusyIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  async function handleFiles(startIndex: number, files: File[]) {
    const videos = files.filter(isVideoFile)
    if (!videos.length) {
      alert('영상 파일을 놓아 주세요.')
      return
    }
    for (let offset = 0; offset < videos.length; offset += 1) {
      const index = startIndex + offset
      if (index >= OPENING_VIDEO_SLOTS) break
      setBusyIndex(index)
      try {
        await onUpload(index, videos[offset])
      } catch (err) {
        alert(err instanceof Error ? err.message : '오프닝 영상 저장에 실패했습니다.')
        break
      } finally {
        setBusyIndex(null)
      }
    }
  }

  async function handleClear(index: number) {
    setBusyIndex(index)
    try {
      await onClear(index)
    } catch (err) {
      alert(err instanceof Error ? err.message : '오프닝 영상 삭제에 실패했습니다.')
    } finally {
      setBusyIndex(null)
    }
  }

  function onDragOver(index: number, e: DragEvent<HTMLElement>) {
    if (![...e.dataTransfer.types].includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    if (dragOverIndex !== index) setDragOverIndex(index)
  }

  function onDragLeave(index: number, e: DragEvent<HTMLElement>) {
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    if (dragOverIndex === index) setDragOverIndex(null)
  }

  function onDrop(index: number, e: DragEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIndex(null)
    void handleFiles(index, pickVideoFiles(e.dataTransfer.files))
  }

  async function openFolder(fileName?: string | null) {
    const res = await openProjectOpeningFolder(fileName)
    if (!res.success) alert(res.error || '오프닝 영상 폴더를 열 수 없습니다.')
  }

  const filled = config.videos.filter(Boolean).length

  return (
    <div className="game-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="game-kicker">OPENING</p>
          <h2 className="mt-1 text-xl font-bold text-white">메인 화면 오프닝 영상</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            메인 메뉴 왼쪽 배경에 이 영상 하나만 반복 재생됩니다. 끌어다 놓거나 클릭해서 등록하세요.
            {filled > 0 ? '' : ' 아직 등록된 영상이 없으면 기존 이미지 슬라이드가 나옵니다.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void openFolder()}
          className="game-btn shrink-0 rounded-xl px-3 py-2 text-xs font-semibold"
        >
          폴더 열기
        </button>
      </div>

      <div className="mt-6 max-w-xl">
        {config.videos.slice(0, OPENING_VIDEO_SLOTS).map((fileName, index) => {
          const busy = busyIndex === index
          const src = fileName ? resolveMediaSrc(openingVideoMediaPath(fileName)) : ''
          return (
            <div
              key={index}
              onDragOver={(e) => onDragOver(index, e)}
              onDragLeave={(e) => onDragLeave(index, e)}
              onDrop={(e) => onDrop(index, e)}
              className={`rounded-2xl border p-3 transition ${
                dragOverIndex === index
                  ? 'border-amber-300 bg-amber-400/10'
                  : 'border-white/10 bg-slate-950/40'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">오프닝 영상</p>
                {fileName ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void openFolder(fileName)}
                    className="text-[11px] text-slate-400 underline-offset-2 hover:text-white hover:underline"
                  >
                    파일 위치
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRefs.current[index]?.click()}
                className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/40 text-xs text-slate-400"
              >
                {src ? (
                  <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <span>영상을 끌어다 놓거나 클릭</span>
                )}
                {busy ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                    저장 중
                  </span>
                ) : null}
              </button>
              <input
                ref={(node) => {
                  inputRefs.current[index] = node
                }}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov,.m4v"
                className="hidden"
                onChange={(e) => {
                  const files = pickVideoFiles(e.target.files)
                  e.target.value = ''
                  void handleFiles(index, files)
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="truncate text-[11px] text-slate-500" title={fileName ?? ''}>
                  {fileName ?? '비어 있음'}
                </p>
                {fileName ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleClear(index)}
                    className="shrink-0 text-[11px] font-semibold text-rose-300 hover:text-rose-200"
                  >
                    비우기
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
