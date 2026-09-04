import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ShortsVnBeat } from '../game/characters'
import type { EventMediaAsset, GameEvent } from '../events/types'
import { loadCommonSounds } from '../events/db'
import { resolveMediaSrc } from '../game/mediaUrl'
import {
  resolveShortsBeatCaption,
  resolveShortsBeatVoiceFileName,
  resolveShortsVoiceAsset,
  resolveShortsVoiceSrc,
} from '../game/shortsVnDialogue'
import { getSeVolumePercent } from '../game/uiSfx'
import { useBgmSilence } from '../game/bgm'
import { useTranslation } from '../locales/i18n'
import { MosaicMediaFrame } from './MosaicMediaFrame'

type Props = {
  beats: ShortsVnBeat[]
  event?: GameEvent | null
  title?: string
  /** editor: popup modal / ingame: full overlay */
  presentation?: 'overlay' | 'popup'
  onClose: () => void
}

function isVideoUrl(url: string) {
  const clean = url.split('?')[0].toLowerCase()
  return (
    clean.startsWith('data:video') ||
    /\.(mp4|webm|ogv|ogg|mov|mkv|m4v)$/.test(clean)
  )
}

export function ShortsVnPlayer({
  beats,
  event = null,
  title,
  presentation = 'overlay',
  onClose,
}: Props) {
  const { t, locale } = useTranslation()
  const [index, setIndex] = useState(0)
  const [canAdvance, setCanAdvance] = useState(false)
  const [commonSounds, setCommonSounds] = useState<EventMediaAsset[]>([])
  const holdRef = useRef<number | null>(null)
  const voiceRef = useRef<HTMLAudioElement | null>(null)
  const isPopup = presentation === 'popup'

  const beat = beats[index] ?? null
  const isLast = index >= beats.length - 1
  const caption = beat ? resolveShortsBeatCaption(beat, event, locale) : ''

  useEffect(() => {
    void loadCommonSounds().then((sounds) => {
      if (Array.isArray(sounds)) setCommonSounds(sounds)
    })
  }, [])

  useBgmSilence(presentation === 'overlay')

  useEffect(() => {
    if (beats.length === 0) onClose()
  }, [beats.length, onClose])

  useEffect(() => {
    if (!beat) return
    setCanAdvance(false)
    if (holdRef.current != null) window.clearTimeout(holdRef.current)
    const holdMs = Math.max(500, Math.round(beat.durationSec * 1000))
    holdRef.current = window.setTimeout(() => {
      holdRef.current = null
      setCanAdvance(true)
    }, holdMs)
    return () => {
      if (holdRef.current != null) {
        window.clearTimeout(holdRef.current)
        holdRef.current = null
      }
    }
  }, [beat, index])

  useEffect(() => {
    const stopVoice = () => {
      const audio = voiceRef.current
      if (!audio) return
      try {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      } catch {
        // ignore cleanup errors
      }
      voiceRef.current = null
    }

    stopVoice()
    if (!beat || !event) return

    const voiceName = resolveShortsBeatVoiceFileName(beat, event, locale)
    if (!voiceName) return

    const asset = resolveShortsVoiceAsset(voiceName, event.media, commonSounds)
    const src = resolveShortsVoiceSrc(asset)
    if (!src) return

    const audio = new Audio(src)
    audio.volume = Math.max(0, Math.min(1, getSeVolumePercent() / 100))
    voiceRef.current = audio
    void audio.play().catch(() => {})

    return () => {
      stopVoice()
    }
  }, [beat, index, event, locale, commonSounds])

  if (!beat || typeof document === 'undefined') return null

  const handleAdvance = () => {
    if (!canAdvance) return
    if (isLast) {
      onClose()
      return
    }
    setIndex((prev) => prev + 1)
  }

  const frame = (
    <button
      type="button"
      onClick={handleAdvance}
      className={`relative aspect-[16/9] w-full max-w-3xl overflow-hidden bg-black text-left ${
        isPopup
          ? 'rounded-2xl border border-fuchsia-400/40 shadow-[0_0_50px_rgba(217,70,239,0.25)]'
          : 'rounded-3xl border-2 border-fuchsia-400/50 shadow-[0_0_80px_rgba(217,70,239,0.35)]'
      } ${canAdvance ? 'cursor-pointer' : 'cursor-wait'}`}
      aria-label={title || t('shortsVn.playerTitle')}
    >
      <MosaicMediaFrame
        key={beat.id}
        src={resolveMediaSrc(beat.mediaUrl)}
        kind={isVideoUrl(beat.mediaUrl) ? 'video' : 'image'}
        regions={beat.blurRegions}
        className="pointer-events-none h-full w-full"
      />

      {caption ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-5 pb-5 pt-16">
          <p className="whitespace-pre-wrap text-center text-sm font-semibold leading-relaxed text-white drop-shadow sm:text-base">
            {caption}
          </p>
        </div>
      ) : null}
    </button>
  )

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md ${
        isPopup ? 'bg-black/75' : 'bg-black/92'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={title || t('shortsVn.playerTitle')}
    >
      {frame}
    </div>,
    document.body,
  )
}
