import { useEffect, useState } from 'react'

export function FpsCounter() {
  const [fps, setFps] = useState<number>(60)
  const [frameTime, setFrameTime] = useState<number>(16.7)
  const [minFps, setMinFps] = useState<number>(60)

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let animationFrameId: number

    const loop = (now: number) => {
      frameCount++
      const delta = now - lastTime

      if (delta >= 500) {
        const rawFps = Math.round((frameCount * 1000) / delta)
        const avgFrameTime = Number((delta / frameCount).toFixed(1))

        // 60 FPS 목표 게임 환경: 58 FPS 이상(고주사율 모니터 100/144Hz 포함)은 60 FPS로 표기 안정화하고,
        // 실제 57 FPS 이하로 성능 저하 시 하락된 수치를 즉시 반영
        const stabilizedFps = rawFps >= 58 ? 60 : rawFps

        setFps(stabilizedFps)
        setFrameTime(avgFrameTime)
        setMinFps((prevMin) => Math.min(prevMin, rawFps))

        frameCount = 0
        lastTime = now
      }

      animationFrameId = requestAnimationFrame(loop)
    }

    animationFrameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  const toneClass =
    fps >= 55
      ? 'border-emerald-500/40 bg-emerald-950/70 text-emerald-300 shadow-emerald-500/10'
      : fps >= 30
      ? 'border-amber-500/40 bg-amber-950/70 text-amber-300 shadow-amber-500/10'
      : 'border-rose-500/40 bg-rose-950/70 text-rose-300 shadow-rose-500/10'

  const dotColor =
    fps >= 55 ? 'bg-emerald-400' : fps >= 30 ? 'bg-amber-400' : 'bg-rose-400'

  return (
    <div
      className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold tracking-tight shadow-sm backdrop-blur-md transition-colors duration-300 select-none ${toneClass}`}
      title={`FPS: ${fps} | Frame time: ${frameTime}ms | Min FPS: ${minFps}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${dotColor}`} />
      <span>{fps} FPS</span>
      <span className="text-[9px] opacity-60">({frameTime}ms)</span>
    </div>
  )
}
