import { useEffect, useRef, useState } from 'react'
import { clampBlur, readBlurRegions } from '../events/BlurRegionEditor'
import type { BlurRegion } from '../events/types'
import { useMosaicStrength } from '../game/visualFx'

type MosaicMediaFrameProps = {
  src: string
  kind: 'image' | 'video'
  regions: BlurRegion[]
  className?: string
}

export function MosaicMediaFrame({ src, kind, regions, className }: MosaicMediaFrameProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const strength = useMosaicStrength()
  const scale = strength / 50
  const blurRegions = readBlurRegions({ blurRegions: regions })

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
  }, [src])

  return (
    <div ref={boxRef} className={`relative overflow-hidden bg-black ${className ?? ''}`}>
      {kind === 'video' ? (
        <video
          key={src}
          src={src}
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <img src={src} alt="" className="h-full w-full object-cover" />
      )}
      {blurRegions.length > 0 && box.w > 0 ? (
        <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
          {blurRegions.map((region) => {
            const blurPx = clampBlur(region.blur * scale)
            if (blurPx <= 0) return null
            return (
              <div
                key={region.id}
                className="absolute overflow-hidden"
                style={{
                  left: `${region.x * 100}%`,
                  top: `${region.y * 100}%`,
                  width: `${region.w * 100}%`,
                  height: `${region.h * 100}%`,
                }}
              >
                {kind === 'video' ? (
                  <video
                    src={src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-hidden
                    className="absolute max-w-none object-cover"
                    style={{
                      width: box.w,
                      height: box.h,
                      left: -region.x * box.w,
                      top: -region.y * box.h,
                      filter: `blur(${blurPx}px)`,
                    }}
                  />
                ) : (
                  <img
                    src={src}
                    alt=""
                    aria-hidden
                    className="absolute max-w-none object-cover"
                    style={{
                      width: box.w,
                      height: box.h,
                      left: -region.x * box.w,
                      top: -region.y * box.h,
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
