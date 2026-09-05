import { useEffect, useRef, useState } from 'react'
import { pickRandomDateOfferLine } from '../game/dateLines'
import { getSeVolumePercent } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'

/** 데이트/H 신청 팝업용 — 마운트 시 3종 중 랜덤 픽 + 음성 재생 */
export function useDateOfferSpeech(creatorName: string, creatorId?: string | null) {
  const { locale } = useTranslation()
  const [picked] = useState(() => {
    return (
      pickRandomDateOfferLine(creatorName, locale) ||
      pickRandomDateOfferLine(creatorId, locale)
    )
  })
  const voiceRef = useRef<HTMLAudioElement | null>(null)

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

    const voiceSrc = picked?.voiceUrl
    if (!voiceSrc) return stop

    const audio = new Audio(voiceSrc)
    audio.volume = Math.max(0.25, Math.min(1, (getSeVolumePercent() || 80) / 100))
    voiceRef.current = audio
    const playTimer = window.setTimeout(() => {
      void audio.play().catch(() => {})
    }, 140)

    return () => {
      window.clearTimeout(playTimer)
      stop()
    }
  }, [picked?.voiceUrl])

  return picked
}
