import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'

interface HighLowDealerSlotProps {
  dealerName: string
  dealerTitle: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  editable?: boolean
  onMediaChange?: (url: string, type: 'image' | 'video') => void
  statusMessage?: string
}

export function HighLowDealerSlot({
  dealerName,
  dealerTitle,
  mediaUrl,
  mediaType = 'image',
  editable = false,
  onMediaChange,
  statusMessage,
}: HighLowDealerSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!editable) return
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!editable) return
    e.preventDefault()
    setIsDragOver(false)
  }

  const processFile = (file: File) => {
    const isVideo = file.type.startsWith('video/')
    const url = URL.createObjectURL(file)
    onMediaChange?.(url, isVideo ? 'video' : 'image')
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!editable) return
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* 숨겨진 파일 선택 Input */}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      )}

      {/* 딜러 아바타 미디어 박스 */}
      <div
        onClick={() => editable && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 transition-all duration-300 overflow-hidden shadow-[0_0_25px_rgba(236,72,153,0.35)] ${
          editable ? 'cursor-pointer group' : ''
        } ${
          isDragOver
            ? 'border-pink-400 scale-105 bg-pink-950/40 ring-4 ring-pink-500/50'
            : 'border-pink-500/60 bg-slate-900/90 hover:border-pink-400'
        }`}
      >
        {mediaUrl ? (
          mediaType === 'video' ? (
            <video
              src={mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={dealerName}
              className="w-full h-full object-cover rounded-full"
            />
          )
        ) : (
          /* 기본 SVG 딜러 사이보그 아이콘 */
          <div className="flex flex-col items-center justify-center text-pink-400 p-2">
            <svg
              className="w-14 h-14 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="text-[10px] text-pink-300 font-mono mt-1">CYBER DEALER</span>
          </div>
        )}

        {/* 편집 가능 시 오버레이 가이드 */}
        {editable && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center p-2 text-xs font-semibold text-pink-200">
            <span className="text-base">📁</span>
            <span>클릭 또는 드롭</span>
            <span className="text-[9px] text-pink-300 font-mono">이미지 / GIF / 동영상</span>
          </div>
        )}
      </div>

      {/* 딜러 이름 & 타이틀 */}
      <div className="mt-2 text-center">
        <span className="inline-block px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-widest text-pink-400 bg-pink-950/60 border border-pink-500/30 rounded-full mb-0.5">
          {dealerTitle}
        </span>
        <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
          DEALER: <span className="text-pink-400">{dealerName}</span>
        </h3>
      </div>

      {/* 딜러 대사/상태 박스 */}
      {statusMessage && (
        <div className="mt-1.5 px-3 py-1 bg-slate-900/90 border border-pink-500/20 rounded-md shadow-lg text-[11px] font-mono text-cyan-300 animate-pulse">
          💬 {statusMessage}
        </div>
      )}
    </div>
  )
}
