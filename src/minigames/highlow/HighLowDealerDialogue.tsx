import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getSeVolumePercent } from '../../game/uiSfx'
import { resolveMediaSrc } from '../../game/mediaUrl'
import type { Locale } from '../../locales/i18n'

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
  const [text, setText] = useState<string>('')
  const [visible, setVisible] = useState(false)
  const voiceRef = useRef<HTMLAudioElement | null>(null)
  const closingRef = useRef(false)

  const voiceNum = (tier - 1) * 5 + index + 1
  const voiceFileName = String(voiceNum).padStart(2, '0') + '.wav'
  const voiceUrl = `/casino/voice/${voiceFileName}`
  const jsonUrl = `/casino/dialogues/casino_dealer_tier${tier}_${locale}.json`

  useEffect(() => {
    let isMounted = true

    // Load JSON dialogue file directly from public assets
    fetch(jsonUrl)
      .then((res) => {
        if (!res.ok && locale !== 'KO') {
          return fetch(`/casino/dialogues/casino_dealer_tier${tier}_KO.json`)
        }
        return res
      })
      .then((res) => res.json())
      .then((data: string[]) => {
        if (isMounted && Array.isArray(data) && data[index]) {
          setText(data[index])
        }
      })
      .catch(() => {
        // Ignore fetch errors
      })

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
      isMounted = false
      window.clearTimeout(playTimer)
      window.clearTimeout(closeTimer)
      window.cancelAnimationFrame(raf)
      stopAudio()
    }
  }, [tier, index, locale, voiceUrl, jsonUrl])

  const requestClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    window.setTimeout(() => onClose(), 200)
  }

  if (typeof document === 'undefined' || !text) return null

  return createPortal(
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-4 sm:bottom-6 z-[120] flex justify-center px-4 transition-all duration-300 select-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        onClick={requestClose}
        className="pointer-events-auto flex w-full max-w-xl items-start gap-3 sm:gap-4 rounded-2xl border border-amber-400/60 bg-slate-950/95 p-3.5 sm:p-4 text-left shadow-[0_0_35px_rgba(245,158,11,0.35)] backdrop-blur-xl cursor-pointer hover:border-amber-300 transition-all group"
      >
        <div className="relative shrink-0">
          {dealerMediaUrl ? (
            <img
              src={resolveMediaSrc(dealerMediaUrl)}
              alt={dealerName}
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border border-amber-400/70 object-cover shadow-md group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border border-amber-400/50 bg-amber-950/60 text-xl font-black text-amber-300">
              🎩
            </div>
          )}
          <span className="absolute -right-1 -top-1 rounded-full border border-amber-300/60 bg-amber-400 px-1.5 py-0.5 text-[9px] font-black tracking-wider text-slate-950 shadow">
            DEALER
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-amber-400/30 pb-1">
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
              {dealerName}
            </span>
            <span className="text-[10px] font-bold text-amber-400/70 animate-pulse">
              🔊 PLAYING VOICE
            </span>
          </div>

          <p className="mt-1.5 text-xs sm:text-sm font-semibold leading-relaxed text-slate-100 font-sans tracking-tight">
            "{text}"
          </p>

          <p className="mt-1 text-[9px] text-slate-400 font-mono">
            (클릭하여 대사 닫기)
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
