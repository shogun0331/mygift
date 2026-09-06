import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getSeVolumePercent } from '../../game/uiSfx'
import { resolveMediaSrc } from '../../game/mediaUrl'
import type { Locale } from '../../locales/i18n'

// Vite eager import for synchronous dialogue loading (zero fetch lag / zero 404 errors)
const dialogueModules = import.meta.glob<string[]>('./dialogues/*.json', {
  eager: true,
  import: 'default',
})

function getDialogueText(tier: 1 | 2 | 3, locale: string, index: number): string {
  const key = `./dialogues/casino_dealer_tier${tier}_${locale}.json`
  const fallbackKey = `./dialogues/casino_dealer_tier${tier}_KO.json`
  const lines = dialogueModules[key] || dialogueModules[fallbackKey] || []
  return lines[index] || lines[0] || '...'
}

export type DealerDialoguePlay = {
  tier: 1 | 2 | 3
  index: number // 0 ~ 4
  dealerName: string
  dealerMediaUrl?: string
}

type Props = {
  play: DealerDialoguePlay
  locale: Locale
  onClose: () => void
}

export function HighLowDealerDialogue({ play, locale, onClose }: Props) {
  const { tier, index, dealerName, dealerMediaUrl } = play
  const [visible, setVisible] = useState(false)
  const voiceRef = useRef<HTMLAudioElement | null>(null)
  const closingRef = useRef(false)

  // Synchronous text retrieval - guaranteed non-empty on first render frame
  const text = getDialogueText(tier, locale, index)

  const voiceNum = (tier - 1) * 5 + index + 1
  const voiceFileName = String(voiceNum).padStart(2, '0') + '.wav'
  const voiceUrl = `/casino/voice/${voiceFileName}`

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setVisible(true))

    // Voice Audio Playback
    const stopAudio = () => {
      if (voiceRef.current) {
        try {
          voiceRef.current.pause()
          voiceRef.current.removeAttribute('src')
          voiceRef.current.load()
        } catch {
          // ignore
        }
        voiceRef.current = null
      }
    }

    stopAudio()

    const audio = new Audio(voiceUrl)
    audio.volume = Math.max(0.3, Math.min(1, (getSeVolumePercent() || 80) / 100))
    voiceRef.current = audio

    let closeTimer = 0
    const scheduleClose = (ms: number) => {
      window.clearTimeout(closeTimer)
      closeTimer = window.setTimeout(() => requestClose(), ms)
    }

    audio.onended = () => scheduleClose(800)
    audio.onerror = () => scheduleClose(5000)

    const playTimer = window.setTimeout(() => {
      void audio.play().catch(() => scheduleClose(5000))
    }, 150)

    scheduleClose(7000) // Fallback max duration

    return () => {
      window.clearTimeout(playTimer)
      window.clearTimeout(closeTimer)
      window.cancelAnimationFrame(raf)
      stopAudio()
    }
  }, [tier, index, locale, voiceUrl])

  const requestClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    window.setTimeout(() => onClose(), 200)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-6 sm:bottom-10 z-[99999] flex justify-center px-4 transition-all duration-300 select-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        onClick={requestClose}
        className="pointer-events-auto flex w-full max-w-xl items-start gap-3.5 sm:gap-4 rounded-2xl border-2 border-amber-400/80 bg-slate-950/95 p-4 sm:p-5 text-left shadow-[0_0_50px_rgba(245,158,11,0.6)] backdrop-blur-2xl cursor-pointer hover:border-amber-300 transition-all group"
      >
        <div className="relative shrink-0">
          {dealerMediaUrl ? (
            <img
              src={resolveMediaSrc(dealerMediaUrl)}
              alt={dealerName}
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl border border-amber-400/80 object-cover shadow-lg group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl border border-amber-400/60 bg-amber-950/80 text-2xl font-black text-amber-300">
              🎩
            </div>
          )}
          <span className="absolute -right-1 -top-1 rounded-full border border-amber-300/80 bg-amber-400 px-2 py-0.5 text-[9px] font-black tracking-wider text-slate-950 shadow-md">
            DEALER
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-amber-400/40 pb-1.5">
            <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider font-mono">
              {dealerName}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-amber-400 animate-pulse flex items-center gap-1">
              <span>🔊</span> <span>VOICE PLAYING</span>
            </span>
          </div>

          <p className="mt-2 text-sm sm:text-base font-bold leading-snug text-amber-50 font-sans tracking-tight drop-shadow">
            "{text}"
          </p>

          <p className="mt-1.5 text-[10px] text-slate-400 font-mono">
            (클릭하여 대사 닫기)
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
