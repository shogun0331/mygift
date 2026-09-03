import { useRef, useState, type DragEvent } from 'react'
import {
  BGM_TRACK_META,
  BGM_TRACKS,
  bgmMediaPath,
  type BgmTrack,
  type GameBgmConfig,
} from '../game/bgm'
import { openBgmFolder as openProjectBgmFolder } from '../events/db'
import { resolveMediaSrc } from '../game/mediaUrl'

type BgmEditorPanelProps = {
  config: GameBgmConfig
  onConfigChange: (next: GameBgmConfig) => void
  onUpload: (track: BgmTrack, file: File) => Promise<void>
  onClear: (track: BgmTrack) => Promise<void>
}

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)$/i

function pickAudioFile(files: FileList | null | undefined): File | null {
  if (!files?.length) return null
  return Array.from(files).find((file) => file.type.startsWith('audio/') || AUDIO_EXT.test(file.name)) ?? null
}

export function BgmEditorPanel({ config, onConfigChange, onUpload, onClear }: BgmEditorPanelProps) {
  const [busyTrack, setBusyTrack] = useState<BgmTrack | null>(null)
  const [previewTrack, setPreviewTrack] = useState<BgmTrack | null>(null)
  const [dragOverTrack, setDragOverTrack] = useState<BgmTrack | null>(null)
  const previewRef = useRef<HTMLAudioElement | null>(null)

  function stopPreview() {
    previewRef.current?.pause()
    previewRef.current = null
    setPreviewTrack(null)
  }

  async function handleFile(track: BgmTrack, file: File | undefined | null) {
    if (!file) return
    if (!file.type.startsWith('audio/') && !AUDIO_EXT.test(file.name)) {
      alert('오디오 파일만 등록할 수 있습니다.')
      return
    }
    setBusyTrack(track)
    try {
      await onUpload(track, file)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'BGM 저장에 실패했습니다.')
    } finally {
      setBusyTrack(null)
    }
  }

  async function handleClear(track: BgmTrack) {
    if (previewTrack === track) stopPreview()
    setBusyTrack(track)
    try {
      await onClear(track)
      onConfigChange({ ...config, [track]: { fileName: null } })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'BGM 삭제에 실패했습니다.')
    } finally {
      setBusyTrack(null)
    }
  }

  function togglePreview(track: BgmTrack) {
    const fileName = config[track].fileName
    if (!fileName) return
    if (previewTrack === track) {
      stopPreview()
      return
    }
    stopPreview()
    const audio = new Audio(resolveMediaSrc(bgmMediaPath(fileName)))
    audio.loop = true
    audio.volume = 0.7
    previewRef.current = audio
    setPreviewTrack(track)
    void audio.play().catch(() => {})
  }

  async function openBgmFolder(fileName?: string | null) {
    const res = await openProjectBgmFolder(fileName)
    if (!res.success) {
      alert(res.error || 'BGM 폴더를 열 수 없습니다.')
    }
  }

  function onDragOver(track: BgmTrack, e: DragEvent<HTMLElement>) {
    if (![...e.dataTransfer.types].includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    if (dragOverTrack !== track) setDragOverTrack(track)
  }

  function onDragLeave(track: BgmTrack, e: DragEvent<HTMLElement>) {
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    if (dragOverTrack === track) setDragOverTrack(null)
  }

  function onDrop(track: BgmTrack, e: DragEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTrack(null)
    const file = pickAudioFile(e.dataTransfer.files)
    if (!file) {
      alert('오디오 파일을 놓아 주세요.')
      return
    }
    void handleFile(track, file)
  }

  return (
    <div className="game-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="game-kicker">BGM</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">BGM 설정</h2>
          <p className="mt-2 text-sm text-slate-400">
            파일을 끌어다 놓거나 등록하면 `public/chapter_assets/bgm`에 복사됩니다. 교체·제거 시 이전 파일은 삭제됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void openBgmFolder()}
          className="game-btn shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          BGM 폴더 열기
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {BGM_TRACKS.map((track) => {
          const meta = BGM_TRACK_META[track]
          const fileName = config[track].fileName
          const busy = busyTrack === track
          const over = dragOverTrack === track
          return (
            <article
              key={track}
              onDragOver={(e) => onDragOver(track, e)}
              onDragLeave={(e) => onDragLeave(track, e)}
              onDrop={(e) => onDrop(track, e)}
              className={`rounded-2xl border p-4 transition-colors ${
                over
                  ? 'border-emerald-400/70 bg-emerald-950/30 ring-2 ring-emerald-400/30'
                  : 'border-white/10 bg-black/25'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{meta.title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{meta.desc}</p>
                </div>
                {fileName ? (
                  <button
                    type="button"
                    onClick={() => togglePreview(track)}
                    className="game-btn shrink-0 rounded-lg px-2.5 py-1 text-[11px]"
                  >
                    {previewTrack === track ? '미리듣기 정지' : '미리듣기'}
                  </button>
                ) : null}
              </div>

              <p className="mt-3 truncate text-[11px] text-slate-400" title={fileName ?? ''}>
                {over
                  ? '여기에 놓으면 등록됩니다'
                  : fileName
                    ? fileName
                    : '오디오를 끌어다 놓거나 파일 등록'}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <label className="game-btn game-btn-primary cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold">
                  {busy ? '저장 중…' : fileName ? '파일 교체' : '파일 등록'}
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      void handleFile(track, e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </label>
                {fileName ? (
                  <button
                    type="button"
                    onClick={() => void openBgmFolder(fileName)}
                    className="game-btn rounded-lg px-3 py-1.5 text-xs font-semibold"
                  >
                    파일 위치
                  </button>
                ) : null}
                {fileName ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleClear(track)}
                    className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-900/70 disabled:opacity-40"
                  >
                    제거
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
