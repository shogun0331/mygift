import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RegisteredCharacter, ShortsVnBeat } from '../game/characters'
import type { EventMediaAsset, GameEvent } from '../events/types'
import { loadCommonSounds } from '../events/db'
import { resolveMediaSrc } from '../game/mediaUrl'
import { BlurRegionOverlay } from '../events/BlurRegionEditor'
import {
  resolveShortsBeatCaption,
  resolveShortsBeatVoiceFileName,
  resolveShortsBeatVnStage,
  resolveShortsVoiceAsset,
  resolveShortsVoiceSrc,
  standingLayoutClass,
} from '../game/shortsVnDialogue'
import { loadVnCharactersFromDisk, type VnCharacter } from '../game/vnCharacters'
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
  registeredCharacters?: RegisteredCharacter[]
  vnCharacters?: VnCharacter[]
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
  registeredCharacters = [],
  vnCharacters: propVnCharacters,
}: Props) {
  const { t, locale } = useTranslation()
  const [index, setIndex] = useState(0)
  const [canAdvance, setCanAdvance] = useState(false)
  const [commonSounds, setCommonSounds] = useState<EventMediaAsset[]>([])
  const [loadedVnChars, setLoadedVnChars] = useState<VnCharacter[]>([])
  const holdRef = useRef<number | null>(null)
  const voiceRef = useRef<HTMLAudioElement | null>(null)
  const isPopup = presentation === 'popup'

  useEffect(() => {
    if (propVnCharacters && propVnCharacters.length > 0) return
    void loadVnCharactersFromDisk().then((list) => {
      if (Array.isArray(list) && list.length > 0) setLoadedVnChars(list)
    })
  }, [propVnCharacters])

  const vnCharacters = propVnCharacters ?? loadedVnChars

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

  const vnStage = useMemo(
    () => resolveShortsBeatVnStage(beat, event, registeredCharacters, vnCharacters),
    [beat, event, registeredCharacters, vnCharacters],
  )

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
      {vnStage.isVn ? (
        <div key={beat.id} className="pointer-events-none relative h-full w-full overflow-hidden bg-black">
          {/* VN 배경 */}
          {vnStage.backgroundSrc ? (
            isVideoUrl(vnStage.backgroundSrc) ? (
              <video
                src={vnStage.backgroundSrc}
                className="h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={vnStage.backgroundSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            )
          ) : null}

          {/* VN 캐릭터 플레이트 */}
          {vnStage.plateSrc ? (
            <div className="absolute bottom-0 left-1/2 h-[82%] w-[82%] -translate-x-1/2">
              <img
                src={vnStage.plateSrc}
                alt=""
                className="vn-standing-live h-full w-full object-contain object-bottom"
              />
            </div>
          ) : null}

          {/* VN 캐릭터 스탠딩 / 비디오 */}
          {vnStage.standings.length > 0 ? (
            vnStage.standings.map((standing) => {
              const aloneCenter =
                vnStage.standings.length === 1 &&
                (standing.position === 'center' || !standing.position)
              const frameClass = standingLayoutClass(
                standing.position || 'center',
                aloneCenter,
              )
              return (
                <div key={standing.key} className={frameClass}>
                  {standing.media === 'video' ? (
                    <video
                      src={standing.src}
                      className="vn-standing-live h-full w-full object-contain object-bottom"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={standing.src}
                      alt=""
                      className="vn-standing-live h-full w-full object-contain object-bottom"
                    />
                  )}
                </div>
              )
            })
          ) : vnStage.characterSrc ? (
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-[84%] w-[48%] -translate-x-1/2">
              {vnStage.isCharacterVideo ? (
                <video
                  src={vnStage.characterSrc}
                  className="vn-standing-live h-full w-full object-contain object-bottom"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={vnStage.characterSrc}
                  alt=""
                  className="vn-standing-live h-full w-full object-contain object-bottom"
                />
              )}
            </div>
          ) : null}

          {/* 모자이크 오버레이 */}
          {beat.blurRegions.length > 0 ? (
            <BlurRegionOverlay
              regions={beat.blurRegions}
              src={vnStage.backgroundSrc || beat.mediaUrl}
              kind="image"
            />
          ) : null}
        </div>
      ) : (
        <MosaicMediaFrame
          key={beat.id}
          src={resolveMediaSrc(beat.mediaUrl)}
          kind={isVideoUrl(beat.mediaUrl) ? 'video' : 'image'}
          regions={beat.blurRegions}
          className="pointer-events-none h-full w-full"
        />
      )}

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
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 z-[210] flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-black/80 px-4 py-2 text-xs font-bold text-amber-200 shadow-lg backdrop-blur transition hover:border-amber-400 hover:bg-amber-500/20 active:scale-95"
      >
        <span>SKIP ⏩</span>
      </button>

      {frame}
    </div>,
    document.body,
  )
}
