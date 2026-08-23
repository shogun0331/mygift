import { useEffect, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { BlurRegionOverlay, readBlurRegions } from '../events/BlurRegionEditor'
import type { BlurRegion } from '../events/types'
import { resolveMediaSrc } from '../game/mediaUrl'
import { useTranslation } from '../locales/i18n'

type SnsMediaWithBlurProps = {
  url: string
  kind: 'image' | 'video'
  regions?: BlurRegion[] | null
  className?: string
  mediaClassName?: string
  onClick?: () => void
}

export function SnsMediaWithBlur({
  url,
  kind,
  regions,
  className,
  mediaClassName,
  onClick,
}: SnsMediaWithBlurProps) {
  const src = resolveMediaSrc(url)
  const blurRegions = readBlurRegions({ blurRegions: regions ?? [] })
  return (
    <div
      className={`relative overflow-hidden ${onClick ? 'cursor-zoom-in' : ''} ${className ?? ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {kind === 'video' ? (
        <video src={src} muted loop playsInline autoPlay className={mediaClassName ?? 'block h-auto w-full'} />
      ) : (
        <img src={src} alt="" className={mediaClassName ?? 'block h-auto w-full'} />
      )}
      {blurRegions.length > 0 ? <BlurRegionOverlay regions={blurRegions} /> : null}
    </div>
  )
}

type SnsMediaLightboxProps = {
  url: string
  kind: 'image' | 'video'
  regions?: BlurRegion[] | null
  onClose: () => void
}

export function SnsMediaLightbox({ url, kind, regions, onClose }: SnsMediaLightboxProps) {
  const { t } = useTranslation()
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  function stop(event: MouseEvent) {
    event.stopPropagation()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/82 p-4 backdrop-blur-[4px]"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="game-btn absolute right-4 top-4 rounded-lg px-3 py-1.5 text-xs"
      >
        {t('sns.close')}
      </button>
      <div onClick={stop} className="max-h-[90vh] max-w-[min(92vw,56rem)]">
        <SnsMediaWithBlur
          url={url}
          kind={kind}
          regions={regions}
          className="overflow-hidden rounded-3xl border border-white/15 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          mediaClassName={
            kind === 'video'
              ? 'block max-h-[86vh] max-w-[min(92vw,56rem)]'
              : 'block max-h-[86vh] max-w-[min(92vw,56rem)] object-contain'
          }
        />
      </div>
    </div>,
    document.body,
  )
}
