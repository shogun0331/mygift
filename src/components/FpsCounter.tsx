import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getShowFps, subscribeShowFps } from '../game/fpsHud'

export function FpsCounter() {
  const [enabled, setEnabled] = useState(() => getShowFps())
  const [fps, setFps] = useState(60)
  const [frameTime, setFrameTime] = useState(16.7)
  const [minFps, setMinFps] = useState(60)
  const minRef = useRef(60)

  useEffect(() => subscribeShowFps(setEnabled), [])

  useEffect(() => {
    if (!enabled) return

    let frameCount = 0
    let lastTime = performance.now()
    let animationFrameId = 0
    minRef.current = 60
    setMinFps(60)

    const loop = (now: number) => {
      frameCount += 1
      const delta = now - lastTime

      if (delta >= 500) {
        const rawFps = Math.round((frameCount * 1000) / delta)
        const avgFrameTime = Number((delta / frameCount).toFixed(1))
        // 58+ → 60 표기 안정화, 실제 저하(≤57)는 즉시 반영
        const stabilizedFps = rawFps >= 58 ? 60 : rawFps
        if (rawFps < minRef.current) minRef.current = rawFps
        setFps(stabilizedFps)
        setFrameTime(avgFrameTime)
        setMinFps(minRef.current)
        frameCount = 0
        lastTime = now
      }

      animationFrameId = requestAnimationFrame(loop)
    }

    animationFrameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationFrameId)
  }, [enabled])

  if (!enabled) return null

  const toneClass =
    fps >= 55
      ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-200'
      : fps >= 30
        ? 'border-amber-500/50 bg-amber-950/90 text-amber-200'
        : 'border-rose-500/50 bg-rose-950/90 text-rose-200'

  const dotColor = fps >= 55 ? 'bg-emerald-400' : fps >= 30 ? 'bg-amber-400' : 'bg-rose-400'

  const resetMin = () => {
    minRef.current = 60
    setMinFps(60)
  }

  return createPortal(
    <button
      type="button"
      onClick={resetMin}
      className={`game-fps-hud pointer-events-auto fixed left-3 top-3 z-[2147483646] inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold tracking-tight shadow-lg select-none ${toneClass}`}
      title={`클릭하면 Min FPS 리셋 · now ${fps} · ${frameTime}ms · min ${minFps}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{fps} FPS</span>
      <span className="text-[9px] opacity-70">{frameTime}ms</span>
      <span className="text-[9px] opacity-55">min {minFps}</span>
    </button>,
    document.body,
  )
}
