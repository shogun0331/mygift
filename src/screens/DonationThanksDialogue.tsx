import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  findCharacterIconUrl,
  findCharacterProfileUrl,
  type OwnedCreator,
} from '../game/characters'
import { characterDisplayName } from '../game/characterLocales'
import { pickRandomDonationThanks } from '../game/donationLines'
import { formatMoney } from '../game/money'
import { resolveMediaSrc } from '../game/mediaUrl'
import { getSeVolumePercent } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'

export type DonationThanksPlay = {
  creator: OwnedCreator
  amount: number
}

type Props = {
  play: DonationThanksPlay
  onClose: () => void
}

const AUTO_CLOSE_FALLBACK_MS = 4200

export function DonationThanksDialogue({ play, onClose }: Props) {
  const { t, locale } = useTranslation()
  const { creator, amount } = play
  const name = characterDisplayName(creator, locale)

  // 마운트 시 1회만 랜덤 픽 — 리렌더해도 대사/음성 짝이 바뀌지 않음
  const [picked] = useState(() => {
    return (
      pickRandomDonationThanks(creator.name, locale) ||
      pickRandomDonationThanks(creator.id, locale)
    )
  })
  const line = picked?.text ?? ''
  const voiceSrc = picked?.voiceUrl ?? ''

  const iconSrc = useMemo(() => {
    const raw = findCharacterIconUrl(creator) || findCharacterProfileUrl(creator)
    return raw ? resolveMediaSrc(raw, creator.mediaRevision) : ''
  }, [creator])

  const [visible, setVisible] = useState(false)
  const voiceRef = useRef<HTMLAudioElement | null>(null)
  const closingRef = useRef(false)

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setVisible(true))
    return () => window.cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const stop = () => {
      const audio = voiceRef.current
      if (!audio) return
      try {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      } catch {
        // ignore
      }
      voiceRef.current = null
    }
    stop()

    let closeTimer = 0
    const scheduleClose = (ms: number) => {
      window.clearTimeout(closeTimer)
      closeTimer = window.setTimeout(() => requestClose(), ms)
    }

    if (!voiceSrc) {
      scheduleClose(AUTO_CLOSE_FALLBACK_MS)
      return () => {
        window.clearTimeout(closeTimer)
        stop()
      }
    }

    const audio = new Audio(voiceSrc)
    audio.volume = Math.max(0.25, Math.min(1, (getSeVolumePercent() || 80) / 100))
    voiceRef.current = audio
    audio.onended = () => scheduleClose(650)
    audio.onerror = () => scheduleClose(AUTO_CLOSE_FALLBACK_MS)

    const playTimer = window.setTimeout(() => {
      void audio.play().catch(() => scheduleClose(AUTO_CLOSE_FALLBACK_MS))
    }, 120)

    scheduleClose(AUTO_CLOSE_FALLBACK_MS + 1800)

    return () => {
      window.clearTimeout(playTimer)
      window.clearTimeout(closeTimer)
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close via requestClose closure
  }, [voiceSrc])

  const requestClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    window.setTimeout(() => onClose(), 220)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`donation-thanks-layer pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex justify-center px-4 pb-6 sm:pb-8 ${
        visible ? 'is-visible' : ''
      }`}
      role="status"
      aria-live="polite"
      aria-label={t('dashboard.donationThanksTitle').replace('{name}', name)}
    >
      <button
        type="button"
        onClick={requestClose}
        className={`donation-thanks-card pointer-events-auto flex w-full max-w-xl items-start gap-3 rounded-2xl border border-fuchsia-400/40 bg-slate-950/92 px-3.5 py-3 text-left shadow-[0_0_28px_rgba(232,121,249,0.28)] backdrop-blur-md sm:gap-4 sm:px-4 sm:py-3.5 ${
          visible ? 'is-visible' : ''
        }`}
      >
        <div className="relative shrink-0">
          {iconSrc ? (
            <img
              src={iconSrc}
              alt=""
              className="h-14 w-14 rounded-xl border border-fuchsia-300/50 object-cover shadow-md sm:h-16 sm:w-16"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-fuchsia-300/40 bg-fuchsia-950/60 text-lg font-black text-fuchsia-200 sm:h-16 sm:w-16">
              {name.slice(0, 1)}
            </div>
          )}
          <span className="absolute -right-1 -top-1 rounded-full border border-amber-300/50 bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-black shadow">
            SUPER
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="vn-nameplate donation-thanks-name inline-flex items-center gap-2 !border-l-fuchsia-300">
            <span>{name}</span>
          </div>
          <p className="mt-1.5 text-[12px] font-bold tabular-nums text-amber-200/95 sm:text-[13px]">
            {t('dashboard.donationThanksAmount').replace('{amount}', formatMoney(amount))}
          </p>
          <p className="vn-line donation-thanks-line mt-1.5 whitespace-pre-wrap text-[13px] font-semibold leading-relaxed text-white sm:text-sm">
            {line || t('dashboard.donationThanksFallback')}
          </p>
          <p className="mt-2 text-[10px] font-semibold text-white/40">
            {t('dashboard.donationThanksTap')}
          </p>
        </div>
      </button>
    </div>,
    document.body,
  )
}
