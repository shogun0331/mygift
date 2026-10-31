import { useEffect, useRef } from 'react'

const READY_TIMEOUT_MS = 700
const HOLD_MAX_EDGE = 480

type SmoothVideoSwapProps = {
  src: string | null
  playing: boolean
  className?: string
}

/**
 * Single-decoder stream feed. On src change, freezes a downscaled last frame
 * on a canvas until the next clip can play.
 */
export function SmoothVideoSwap({ src, playing, className = '' }: SmoothVideoSwapProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const holdRef = useRef<HTMLCanvasElement>(null)
  const displayedSrcRef = useRef<string | null>(null)
  const playingRef = useRef(playing)
  const swapGenRef = useRef(0)

  playingRef.current = playing

  useEffect(() => {
    const video = videoRef.current
    if (!video || !video.getAttribute('src')) return
    video.preload = playing ? 'auto' : 'metadata'
    if (playing) void video.play().catch(() => {})
    else video.pause()
  }, [playing])

  useEffect(() => {
    const video = videoRef.current
    const hold = holdRef.current
    if (!video) return

    if (!src) {
      swapGenRef.current += 1
      displayedSrcRef.current = null
      try {
        video.pause()
        video.removeAttribute('src')
        video.load()
      } catch {
        /* ignore */
      }
      if (hold) hold.style.opacity = '0'
      return
    }

    if (displayedSrcRef.current === src) return

    const gen = ++swapGenRef.current

    // Freeze last frame (downscaled) so the monitor doesn't go black while loading
    if (hold && video.getAttribute('src') && video.readyState >= 2 && video.videoWidth > 0) {
      const vw = video.videoWidth
      const vh = video.videoHeight
      const scale = Math.min(1, HOLD_MAX_EDGE / Math.max(vw, vh))
      const w = Math.max(1, Math.round(vw * scale))
      const h = Math.max(1, Math.round(vh * scale))
      if (hold.width !== w || hold.height !== h) {
        hold.width = w
        hold.height = h
      }
      try {
        const ctx = hold.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h)
          hold.style.opacity = '1'
        }
      } catch {
        /* tainted / decode race — skip hold */
      }
    }

    video.pause()
    video.preload = playingRef.current ? 'auto' : 'metadata'
    video.src = src
    try {
      video.currentTime = 0
    } catch {
      /* ignore */
    }

    let settled = false
    const reveal = () => {
      if (settled || swapGenRef.current !== gen) return
      settled = true
      displayedSrcRef.current = src
      if (playingRef.current) void video.play().catch(() => {})
      if (hold) hold.style.opacity = '0'
    }

    video.addEventListener('canplay', reveal, { once: true })
    if (video.readyState >= 3) reveal()
    const timeoutId = window.setTimeout(reveal, READY_TIMEOUT_MS)

    return () => {
      video.removeEventListener('canplay', reveal)
      window.clearTimeout(timeoutId)
    }
  }, [src])

  useEffect(() => {
    return () => {
      swapGenRef.current += 1
      const video = videoRef.current
      if (!video) return
      try {
        video.pause()
        video.removeAttribute('src')
        video.load()
      } catch {
        /* ignore */
      }
    }
  }, [])

  if (!src) return null

  return (
    <>
      <video
        ref={videoRef}
        className={`absolute inset-0 z-0 h-full w-full object-cover ${className}`}
        autoPlay={false}
        loop
        muted
        playsInline
        preload={playing ? 'auto' : 'metadata'}
      />
      <canvas
        ref={holdRef}
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover"
        style={{ opacity: 0, transition: 'opacity 120ms ease-out' }}
        aria-hidden
      />
    </>
  )
}
