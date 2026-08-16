import { useEffect, useRef, useState } from 'react'
import { CONDITION_CRASH_QTE_MS } from '../game/condition'

export type ToxicWhackQteItem = {
  id: string
  creatorId: string
  creatorName: string
  drop: number
  staminaDrop: number
}

type ToxicWhackQteProps = {
  item: ToxicWhackQteItem
  onResolve: (success: boolean) => void
}

/** 해당 CCTV 화면 클릭으로 진상 대응 (제한 시간 내) */
export function ToxicWhackQte({ item, onResolve }: ToxicWhackQteProps) {
  const resolvedRef = useRef(false)
  const [progress, setProgress] = useState(1)

  useEffect(() => {
    resolvedRef.current = false
    setProgress(1)
    const started = performance.now()
    const tick = window.setInterval(() => {
      const left = Math.max(0, 1 - (performance.now() - started) / CONDITION_CRASH_QTE_MS)
      setProgress(left)
      if (left <= 0) {
        window.clearInterval(tick)
        finish(false)
      }
    }, 40)
    return () => window.clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  function finish(success: boolean) {
    if (resolvedRef.current) return
    resolvedRef.current = true
    onResolve(success)
  }

  return (
    <button
      type="button"
      onClick={() => finish(true)}
      className="absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-[inherit] border-0 bg-rose-950/50 p-2 text-center transition hover:bg-rose-900/55 active:bg-rose-800/60"
      aria-label={`${item.creatorName} 진상 시청자 — 화면을 클릭하세요`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-slate-950/50"
        aria-hidden
      >
        <div
          className="h-full bg-rose-400 transition-[width] duration-75 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <p className="pointer-events-none text-[10px] font-black tracking-wide text-rose-100 drop-shadow sm:text-[11px]">
        ⚠ 진상 출현
      </p>
      <p className="pointer-events-none text-[9px] font-bold text-rose-50/95 sm:text-[10px]">
        화면을 클릭!
      </p>
      <p className="pointer-events-none text-[8px] font-semibold tabular-nums text-rose-200/85">
        실패 시 스테미나 −{item.staminaDrop}
      </p>
    </button>
  )
}
