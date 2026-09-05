import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  SPECIAL_VACATION_IMAGE_KEY,
  normalizeSpecialVacation,
  type OwnedCreator,
} from '../game/characters'
import { characterSoundUrl, resolveMediaSrc } from '../game/mediaUrl'
import { pickSpecialVacationCaption } from '../game/specialVacationLines'
import { getPromotionVoiceUrl } from '../game/promotionLines'
import { getSeVolumePercent } from '../game/uiSfx'
import { useBgmSilence } from '../game/bgm'
import { characterDisplayName } from '../game/characterLocales'
import { useTranslation } from '../locales/i18n'

type Props = {
  creator: OwnedCreator
  onClose: () => void
}

type Phase = 'enter' | 'shown' | 'leave'

const FADE_MS = 700

function resolveVacationImageUrls(creator: OwnedCreator): string[] {
  const vac = normalizeSpecialVacation(creator.specialVacation, creator.name)
  const images = creator.images ?? []
  const byId = new Map(images.map((img) => [img.id, img]))
  const ordered = vac.imageIds
    .map((id) => byId.get(id))
    .filter((img): img is NonNullable<typeof img> => Boolean(img?.url))
  if (ordered.length > 0) {
    return ordered.map((img) => resolveMediaSrc(img.url!))
  }
  return images
    .filter((img) => (img.keys ?? []).includes(SPECIAL_VACATION_IMAGE_KEY) && img.url)
    .map((img) => resolveMediaSrc(img.url!))
}

function pickOne<T>(list: T[]): T | null {
  if (list.length === 0) return null
  return list[Math.floor(Math.random() * list.length)] ?? null
}

export function SpecialVacationPlayer({ creator, onClose }: Props) {
  const { t, locale } = useTranslation()
  const caption = pickSpecialVacationCaption(
    creator.specialVacation?.captions,
    locale,
    creator.name,
  )

  const voiceSrc = useMemo(() => {
    const voice = creator.specialVacation?.voice
    if (voice?.url) {
      const resolved = resolveMediaSrc(voice.url, voice.fileSize)
      if (resolved) return resolved
    }
    if (voice?.fileName) {
      const soundUrl = characterSoundUrl(creator.id, voice.fileName)
      if (soundUrl) return soundUrl
    }
    const promoVoice = getPromotionVoiceUrl(creator.name) || getPromotionVoiceUrl(creator.id)
    if (promoVoice) return promoVoice
    return ''
  }, [creator])
  const name = characterDisplayName(creator, locale)

  const imageSrc = useMemo(() => {
    const urls = resolveVacationImageUrls(creator)
    const picked = pickOne(urls)
    if (picked) return picked
    return creator.profileImageUrl ? resolveMediaSrc(creator.profileImageUrl) : ''
  }, [creator])

  const [phase, setPhase] = useState<Phase>('enter')
  const [visible, setVisible] = useState(false)
  const voiceRef = useRef<HTMLAudioElement | null>(null)
  const closingRef = useRef(false)

  useBgmSilence(true)

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setVisible(true))
    const shownTimer = window.setTimeout(() => setPhase('shown'), FADE_MS)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(shownTimer)
    }
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
    if (!voiceSrc) return

    let currentSrc = voiceSrc
    const audio = new Audio(currentSrc)
    audio.volume = Math.max(0.2, Math.min(1, (getSeVolumePercent() || 80) / 100))
    voiceRef.current = audio

    const fallbackSrc = getPromotionVoiceUrl(creator.name) || getPromotionVoiceUrl(creator.id)

    audio.onerror = () => {
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        currentSrc = fallbackSrc
        audio.src = fallbackSrc
        audio.load()
        void audio.play().catch(() => {})
      }
    }

    const playTimer = window.setTimeout(() => {
      void audio.play().catch((err) => {
        console.warn('SpecialVacation voice play error:', err)
      })
    }, 150)

    return () => {
      window.clearTimeout(playTimer)
      stop()
    }
  }, [voiceSrc, creator])

  const requestClose = () => {
    if (closingRef.current || phase === 'enter') return
    closingRef.current = true
    setPhase('leave')
    setVisible(false)
    window.setTimeout(() => onClose(), FADE_MS)
  }

  if (typeof document === 'undefined') return null

  const canClose = phase === 'shown'

  return createPortal(
    <div
      className={`vacation-play-overlay fixed inset-0 z-[200] flex items-center justify-center p-4 ${
        visible ? 'is-visible' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={t('creator.vacationPlayerTitle').replace('{name}', name)}
    >
      <button
        type="button"
        onClick={requestClose}
        className={`vacation-play-frame relative aspect-[16/9] w-full max-w-3xl overflow-hidden rounded-3xl border-2 border-amber-400/45 bg-black text-left shadow-[0_0_80px_rgba(245,158,11,0.28)] ${
          visible ? 'is-visible' : ''
        } ${canClose ? 'cursor-pointer' : 'cursor-wait'}`}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="pointer-events-none h-full w-full object-cover"
          />
        ) : (
          <div className="pointer-events-none flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-950/40 to-black">
            <span className="text-sm font-bold text-amber-100/70">{name}</span>
          </div>
        )}

        <div
          className={`vacation-play-caption pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-5 pb-5 pt-16 ${
            visible ? 'is-visible' : ''
          }`}
        >
          {caption ? (
            <p className="whitespace-pre-wrap text-center text-sm font-semibold leading-relaxed text-white drop-shadow sm:text-base">
              {caption}
            </p>
          ) : (
            <p className="text-center text-sm font-semibold text-amber-100/80">
              {t('creator.vacationTitle')}
            </p>
          )}
          <p className="mt-2 text-center text-[10px] font-semibold text-white/45">
            {t('creator.vacationTapClose')}
          </p>
        </div>
      </button>
    </div>,
    document.body,
  )
}
