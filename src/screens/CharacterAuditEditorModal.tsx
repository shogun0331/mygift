import { useState, useRef } from 'react'
import type { RegisteredCharacter, CharacterAuditMedia } from '../game/characters'
import { resolveMediaSrc } from '../game/mediaUrl'

type Props = {
  character: RegisteredCharacter
  onSave: (auditMedia: CharacterAuditMedia) => void
  onClose: () => void
}

export function CharacterAuditEditorModal({ character, onSave, onClose }: Props) {
  const [auditMedia, setAuditMedia] = useState<CharacterAuditMedia>({
    A: character.auditMedia?.A ?? null,
    B: character.auditMedia?.B ?? null,
    C: character.auditMedia?.C ?? null,
  })

  const updateMedia = (key: 'A' | 'B' | 'C', url: string | null) => {
    setAuditMedia((prev) => ({ ...prev, [key]: url }))
  }

  const handleSave = () => {
    onSave(auditMedia)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="game-panel relative flex flex-col w-full max-w-4xl overflow-hidden rounded-3xl border border-purple-500/40 bg-slate-950 p-6 shadow-[0_0_60px_rgba(168,85,247,0.3)]">
        {/* 모달 헤더 */}
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

        {/* 안내문 */}
        <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-950/20 p-3.5 text-xs text-slate-300">
          <p className="font-bold text-purple-200">💡 승급심사 퍼포먼스 영상 시스템</p>
          <p className="mt-1 text-[11px] text-slate-400">
            승급심사 진행 시 심사관 만족도 구간에 따라 각 단계별 퍼포먼스 영상이 자동으로 선택되어 무대에 재생됩니다.
          </p>
        </div>

        {/* 3가지 구간별 16:9 미디어 드롭박스 카드 */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AuditMediaDropbox
            badge="🌟 A 영상 (고만족도 80%↑)"
            description="심사관 만족도가 80% 이상일 때 재생"
            badgeColor="border-amber-400/40 bg-amber-950/70 text-amber-200"
            url={auditMedia.A}
            onUpdate={(nextUrl) => updateMedia('A', nextUrl)}
          />
          <AuditMediaDropbox
            badge="⚡ B 영상 (중만족도 30~79%)"
            description="심사관 만족도가 30~79%일 때 재생"
            badgeColor="border-cyan-400/40 bg-cyan-950/70 text-cyan-200"
            url={auditMedia.B}
            onUpdate={(nextUrl) => updateMedia('B', nextUrl)}
          />
          <AuditMediaDropbox
            badge="💧 C 영상 (저만족도 0~29%)"
            description="심사관 만족도가 0~29%일 때 재생"
            badgeColor="border-rose-400/40 bg-rose-950/70 text-rose-200"
            url={auditMedia.C}
            onUpdate={(nextUrl) => updateMedia('C', nextUrl)}
          />
        </div>

        {/* 하단 푸터 버튼 */}
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
    </div>
  )
}

function AuditMediaDropbox({
  badge,
  description,
  badgeColor,
  url,
  onUpdate,
}: {
  badge: string
  description: string
  badgeColor: string
  url?: string | null
  onUpdate: (nextUrl: string | null) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (dataUrl) onUpdate(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const isVideo =
    url?.startsWith('data:video') ||
    url?.endsWith('.mp4') ||
    url?.endsWith('.webm') ||
    url?.endsWith('.ogv')

  return (
    <div className="flex flex-col space-y-2 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3.5">
      <span className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-black ${badgeColor}`}>
        {badge}
      </span>
      <p className="text-[10px] text-slate-400 min-h-[28px]">{description}</p>

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
          isVideo ? (
            <video
              src={resolveMediaSrc(url)}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={resolveMediaSrc(url)}
              alt=""
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
            <span className="text-2xl mb-1">🎬</span>
            <span className="text-[10px] font-bold text-slate-300">드래그 앤 드롭</span>
            <span className="text-[9px] text-slate-500 mt-0.5">16:9 영상 또는 이미지</span>
          </div>
        )}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-black/75 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-xs p-2">
          <button
            type="button"
            className="game-btn game-btn-primary rounded-lg px-3 py-1.5 text-[10px] font-bold"
            onClick={() => fileInputRef.current?.click()}
          >
            📷 파일 선택
          </button>
          {url ? (
            <button
              type="button"
              className="rounded-lg border border-rose-500/40 bg-rose-950/80 px-2.5 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-900"
              onClick={() => onUpdate(null)}
            >
              삭제
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
