import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { clampBlur, readBlurRegions } from '../events/BlurRegionEditor'
import type { BlurRegion } from '../events/types'
import { resolveMediaSrc } from '../game/mediaUrl'
import { useMosaicStrength } from '../game/visualFx'
import { useTranslation } from '../locales/i18n'

type ObjectFitMode = 'contain' | 'cover' | 'fill'

type SnsMediaWithBlurProps = {
  url: string
  kind: 'image' | 'video'
  regions?: BlurRegion[] | null
  className?: string
  mediaClassName?: string
  /** SNS 모자이크는 에디터 fit(원본 비율) 기준. cover면 크롭 좌표계로 맞춤 */
  objectFit?: ObjectFitMode
  onClick?: () => void
}

function contentBox(
  elW: number,
  elH: number,
  natW: number,
  natH: number,
  fit: ObjectFitMode,
): { x: number; y: number; w: number; h: number } {
  if (elW <= 0 || elH <= 0) return { x: 0, y: 0, w: 0, h: 0 }
  if (fit === 'fill' || natW <= 0 || natH <= 0) {
    return { x: 0, y: 0, w: elW, h: elH }
  }
  const scale =
    fit === 'contain' ? Math.min(elW / natW, elH / natH) : Math.max(elW / natW, elH / natH)
  const w = natW * scale
  const h = natH * scale
  return { x: (elW - w) / 2, y: (elH - h) / 2, w, h }
}

export function SnsMediaWithBlur({
  url,
  kind,
  regions,
  className,
  mediaClassName,
  objectFit = 'contain',
  onClick,
}: SnsMediaWithBlurProps) {
  const src = resolveMediaSrc(url)
  const blurRegions = readBlurRegions({ blurRegions: regions ?? [] })
  const boxRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const strength = useMosaicStrength()
  const scale = strength / 50

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => {
      const next = { w: el.clientWidth, h: el.clientHeight }
      setBox((prev) => (prev.w === next.w && prev.h === next.h ? prev : next))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [src, mediaClassName])

  useEffect(() => {
    setNatural({ w: 0, h: 0 })
  }, [src])

  function readNatural(media: HTMLImageElement | HTMLVideoElement | null) {
    if (!media) return { w: 0, h: 0 }
    if (media instanceof HTMLVideoElement) {
      return media.videoWidth > 0 && media.videoHeight > 0
        ? { w: media.videoWidth, h: media.videoHeight }
        : { w: 0, h: 0 }
    }
    return media.naturalWidth > 0 && media.naturalHeight > 0
      ? { w: media.naturalWidth, h: media.naturalHeight }
      : { w: 0, h: 0 }
  }

  function syncNatural() {
    const next = readNatural(mediaRef.current)
    if (next.w <= 0 || next.h <= 0) return
    setNatural((prev) => (prev.w === next.w && prev.h === next.h ? prev : next))
  }

  useEffect(() => {
    syncNatural()
  }, [src, box.w, box.h])

  const content = contentBox(box.w, box.h, natural.w, natural.h, objectFit)

  return (
    <div
      ref={boxRef}
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
        <video
          ref={(node) => {
            mediaRef.current = node
          }}
          key={src}
          src={src}
          muted
          loop
          playsInline
          autoPlay
          className={mediaClassName ?? 'block h-auto w-full'}
          onLoadedMetadata={syncNatural}
        />
      ) : (
        <img
          ref={(node) => {
            mediaRef.current = node
          }}
          src={src}
          alt=""
          className={mediaClassName ?? 'block h-auto w-full'}
          onLoad={syncNatural}
        />
      )}
      {blurRegions.length > 0 && content.w > 0 && content.h > 0 ? (
        <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
          {blurRegions.map((region) => {
            const blurPx = clampBlur(region.blur * scale)
            if (blurPx <= 0) return null
            const left = content.x + region.x * content.w
            const top = content.y + region.y * content.h
            const width = region.w * content.w
            const height = region.h * content.h
            return (
              <div
                key={region.id}
                className="absolute overflow-hidden"
                style={{ left, top, width, height }}
              >
                {kind === 'video' ? (
                  <video
                    src={src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-hidden
                    className="absolute max-w-none"
                    style={{
                      width: content.w,
                      height: content.h,
                      left: -region.x * content.w,
                      top: -region.y * content.h,
                      objectFit: 'fill',
                      filter: `blur(${blurPx}px)`,
                    }}
                  />
                ) : (
                  <img
                    src={src}
                    alt=""
                    aria-hidden
                    className="absolute max-w-none"
                    style={{
                      width: content.w,
                      height: content.h,
                      left: -region.x * content.w,
                      top: -region.y * content.h,
                      objectFit: 'fill',
                      filter: `blur(${blurPx}px)`,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      ) : null}
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
        className="game-btn absolute right-4 top-4 rounded-lg px-3 py-1.5 text-xs"
        onClick={onClose}
      >
        {t('sns.close')}
      </button>
      <div onClick={stop} className="max-h-[90vh] max-w-[min(92vw,56rem)]">
        <SnsMediaWithBlur
          url={url}
          kind={kind}
          regions={regions}
          objectFit="contain"
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
