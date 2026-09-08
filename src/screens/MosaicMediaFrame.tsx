import { useEffect, useRef, useState } from 'react'
import { MosaicRegionLayer, readBlurRegions } from '../events/BlurRegionEditor'
import type { BlurRegion } from '../events/types'

type MosaicMediaFrameProps = {
  src: string
  kind: 'image' | 'video'
  regions: BlurRegion[]
  className?: string
}

export function MosaicMediaFrame({ src, kind, regions, className }: MosaicMediaFrameProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
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
        <MosaicRegionLayer src={src} kind={kind} regions={blurRegions} box={box} objectFit="cover" />
      ) : null}
    </div>
  )
}
