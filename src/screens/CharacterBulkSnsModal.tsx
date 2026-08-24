import { useRef, useState, type DragEvent } from 'react'
import { normalizeSnsPosts, type SnsHeat } from '../game/sns'
import type { RegisteredCharacter } from '../game/characters'
import type { BulkSnsMode } from '../game/snsBulkRegister'

type CharacterBulkSnsModalProps = {
  characters: RegisteredCharacter[]
  onClose: () => void
  onApply: (options: {
    heat: SnsHeat
    files: File[]
    target: 'all' | 'empty'
    mode: BulkSnsMode
  }) => Promise<void>
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

type DraftMedia = {
  id: string
  file: File
  url: string
}

export function CharacterBulkSnsModal({ characters, onClose, onApply }: CharacterBulkSnsModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [heat, setHeat] = useState<SnsHeat>(2)
  const [target, setTarget] = useState<'all' | 'empty'>('empty')
  const [mode, setMode] = useState<BulkSnsMode>('append')
  const [dragging, setDragging] = useState(false)
  const [drafts, setDrafts] = useState<DraftMedia[]>([])
  const [applying, setApplying] = useState(false)

  const emptyCount = characters.filter((row) => normalizeSnsPosts(row.snsPosts).length === 0).length
  const targetCount = target === 'all' ? characters.length : emptyCount

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
      const targetRow = prev.find((row) => row.id === id)
      if (targetRow) URL.revokeObjectURL(targetRow.url)
      return prev.filter((row) => row.id !== id)
    })
  }

  function clearDrafts() {
    setDrafts((prev) => {
      for (const row of prev) URL.revokeObjectURL(row.url)
      return []
    })
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    if (event.dataTransfer.files?.length) attachFiles(event.dataTransfer.files)
  }

  async function handleApply() {
    if (drafts.length === 0 || targetCount === 0) return
    if (
      mode === 'replace' &&
      !window.confirm(
        `선택한 ${targetCount}명의 기존 SNS 게시물을 지우고 새 사진으로 교체합니다. 계속할까요?`,
      )
    ) {
      return
    }
    setApplying(true)
    try {
      await onApply({
        heat,
        files: drafts.map((row) => row.file),
        target,
        mode,
      })
      clearDrafts()
      onClose()
    } finally {
      setApplying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-sns-title"
    >
      <div className="game-panel max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl p-5 sm:p-6">
        <h2 id="bulk-sns-title" className="text-lg font-bold text-slate-100">
          일괄 SNS 등록
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          사진을 한 번 고르면 선택한 캐릭터 전원에게 같은 SNS 게시물이 등록됩니다. 캡션은 게임에서
          캐릭터별로 랜덤 한마디가 붙습니다.
        </p>

        <div className="mt-5">
          <p className="text-xs font-semibold text-slate-300">대상</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTarget('empty')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                target === 'empty'
                  ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-100'
                  : 'border-white/10 text-slate-400'
              }`}
            >
              SNS 없는 캐릭터 ({emptyCount}명)
            </button>
            <button
              type="button"
              onClick={() => setTarget('all')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                target === 'all'
                  ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-100'
                  : 'border-white/10 text-slate-400'
              }`}
            >
              전체 ({characters.length}명)
            </button>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-300">등록 방식</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('append')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                mode === 'append'
                  ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-100'
                  : 'border-white/10 text-slate-400'
              }`}
            >
              기존에 추가
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                mode === 'replace'
                  ? 'border-amber-400/50 bg-amber-500/15 text-amber-100'
                  : 'border-white/10 text-slate-400'
              }`}
            >
              기존 SNS 교체
            </button>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-300">수위</p>
          <div className="mt-2 flex flex-wrap gap-2">
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
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-300">사진</p>
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
            className={`mt-2 flex min-h-[7rem] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center ${
              dragging
                ? 'border-indigo-400/70 bg-indigo-500/15 text-indigo-100'
                : 'border-white/15 bg-black/20 text-slate-400 hover:border-indigo-400/40'
            }`}
          >
            <p className="text-sm font-semibold">
              {drafts.length > 0 ? `${drafts.length}장 선택됨 · 클릭해서 더 넣기` : '끌어다 놓거나 클릭'}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">PNG / JPG / WEBP / GIF</p>
          </div>
          {drafts.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {drafts.map((draft) => (
                <div key={draft.id} className="relative">
                  <img src={draft.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => removeDraft(draft.id)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="game-btn rounded-lg px-2 py-1 text-[11px]"
                onClick={clearDrafts}
              >
                전부 제거
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          {targetCount > 0
            ? `${targetCount}명 × ${drafts.length || 0}장 = ${targetCount * Math.max(drafts.length, 0)}개 게시물 등록 예정`
            : '등록할 캐릭터가 없습니다. 대상을 바꿔 보세요.'}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="game-btn rounded-lg px-4 py-2 text-sm"
            disabled={applying}
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            className="game-btn game-btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-40"
            disabled={applying || drafts.length === 0 || targetCount === 0}
            onClick={() => void handleApply()}
          >
            {applying ? '등록 중…' : '일괄 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}
