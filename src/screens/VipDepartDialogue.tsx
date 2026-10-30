import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  findCharacterIconUrl,
  findCharacterProfileUrl,
  type OwnedCreator,
} from '../game/characters'
import { characterDisplayName } from '../game/characterLocales'
import { pickVipDepartLine } from '../game/vipLines'
import { resolveMediaSrc } from '../game/mediaUrl'
import { getSeVolumePercent } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'
import { SHELL_UI_ASSETS } from '../ui/shellAssets'
import '../ui/shellFrames.css'

export type VipDepartPlay = {
  creator: OwnedCreator
}

type Props = {
  play: VipDepartPlay
  onClose: () => void
}

const AUTO_CLOSE_FALLBACK_MS = 4200

/** VIP 수락 직후 — 방송 중 대사창과 같은 하단 카드 + 음성, 종료 후 VN/숏으로 이어짐 */
export function VipDepartDialogue({ play, onClose }: Props) {
  const { t, locale } = useTranslation()
  const { creator } = play
  const name = characterDisplayName(creator, locale)

  const [picked] = useState(() => {
    return pickVipDepartLine(creator.name, locale) || pickVipDepartLine(creator.id, locale)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      aria-label={t('vip.departTitle').replace('{name}', name)}
    >
      <button
        type="button"
        onClick={requestClose}
        className={`vn-dialogue-strip donation-thanks-card pointer-events-auto w-full max-w-xl text-left ${
          visible ? 'is-visible' : ''
        }`}
      >
        <img
          src={SHELL_UI_ASSETS.vnDialogueStrip}
          alt=""
          draggable={false}
          className="vn-dialogue-strip__bezel"
        />
        <div className="vn-dialogue-strip__avatar">
          {iconSrc ? (
            <img src={iconSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-violet-950/60 text-sm font-black text-violet-200">
              {name.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="vn-dialogue-strip__body">
          <div className="vn-nameplate donation-thanks-name inline-flex max-w-full items-center gap-2 !border-l-violet-300 truncate">
            <span className="truncate">{name}</span>
            <span className="shrink-0 rounded-full border border-violet-200/50 bg-violet-500/95 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white">
              VIP
            </span>
          </div>
          <p className="text-[11px] font-bold text-violet-200/95 sm:text-[12px]">
            {t('vip.departSubtitle')}
          </p>
          <p className="vn-line donation-thanks-line whitespace-pre-wrap text-[12px] font-semibold leading-snug text-white sm:text-[13px]">
            {line || t('vip.departFallback')}
          </p>
          <p className="pt-0.5 text-[9px] font-semibold text-white/45">{t('vip.departTap')}</p>
        </div>
      </button>
    </div>,
    document.body,
  )
}
