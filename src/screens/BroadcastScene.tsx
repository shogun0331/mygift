import { useEffect, useMemo, useState } from 'react'

const CHAT_MESSAGES = [
  '벗어라!',
  '예뻐요~',
  '춤춰줘!',
  '대박!',
  '오늘도 예쁘다',
  '댄스 춰줘!',
  '사랑해요~',
  '오늘 컨셉 최고',
  '구독했습니다!',
  '한소희 최고!',
]

const SPEED_OPTIONS = ['1x', '2x', '3x'] as const

type BroadcastSceneProps = {
  onEnd: () => void
}

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function BroadcastScene({ onEnd }: BroadcastSceneProps) {
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>('1x')
  const [elapsed, setElapsed] = useState(12 * 60 + 34)

  const speedMultiplier = useMemo(() => {
    if (speed === '2x') return 2
    if (speed === '3x') return 3
    return 1
  }, [speed])

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed((prev) => prev + speedMultiplier)
    }, 1000)
    return () => window.clearInterval(id)
  }, [speedMultiplier])

  return (
    <main className="game-stage fixed inset-0 grid grid-rows-[auto_auto_1fr_auto] overflow-hidden">
      {/* Header */}
      <header className="game-hud flex flex-wrap items-center gap-4 px-6 py-3">
        <div className="min-w-[10rem]">
          <p className="game-stat-label">방송국명</p>
          <p className="text-sm font-semibold text-slate-100">
            STAR BROADCASTING CO.
          </p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div>
          <p className="game-stat-label">자산</p>
          <p className="text-sm font-bold text-amber-400">$12,500</p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div>
          <p className="game-stat-label">주차</p>
          <p className="text-sm font-semibold text-slate-100">3주차</p>
        </div>
        <button
          type="button"
          onClick={onEnd}
          className="game-btn ml-auto px-4 py-2 text-sm"
        >
          방송 종료
        </button>
      </header>

      {/* Creator info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-indigo-500/15 bg-slate-950/50 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-sm font-bold text-indigo-100">
            한
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">
              한소희 <span className="text-indigo-300">(A)</span>
            </p>
            <p className="text-xs text-amber-400">Lv.2 · 섹시</p>
          </div>
        </div>
        <span className="game-chip">
          AFF <span className="font-semibold text-slate-100">60</span>
          <span className="text-slate-500">/100</span>
        </span>
        <span className="game-chip">
          POP <span className="font-semibold text-slate-100">55</span>
          <span className="text-slate-500">/80</span>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
          <span className="game-chip-gold game-chip">+$850</span>
          <span className="game-chip font-mono">{formatTime(elapsed)}</span>
        </div>
      </div>

      {/* Stage: tablet wrapping video + chat */}
      <section className="flex min-h-0 items-center justify-center overflow-hidden p-2 md:p-3">
        <div className="flex h-[70%] w-[70%] min-h-0">
          <div className="game-tablet relative flex h-full w-full min-h-0 flex-col rounded-[1.75rem] p-2.5 sm:rounded-[2.25rem] sm:p-4">
            {/* Camera / sensor */}
            <div className="mb-2 flex shrink-0 items-center justify-center gap-2 sm:mb-3">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400/80 shadow-[0_0_8px_rgba(165,180,252,0.55)]" />
              <div className="h-1 w-24 rounded-full bg-slate-950/80 sm:w-32" />
              <div className="h-1.5 w-1.5 rounded-full bg-slate-900/70" />
            </div>

            {/* Screen */}
            <div className="game-tablet-screen relative min-h-0 flex-1 overflow-hidden rounded-[1.2rem] sm:rounded-[1.6rem]">
              <div className="relative h-full w-full min-h-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(99,102,241,0.28),transparent_55%),linear-gradient(180deg,#1a2338_0%,#050814_100%)]" />

                <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold tracking-wider text-rose-200">
                  <span className="game-live-dot h-1.5 w-1.5 rounded-full bg-rose-400" />
                  LIVE
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pr-[240px]">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-indigo-300/30 bg-indigo-500/10 text-4xl font-bold text-indigo-50 shadow-[0_0_40px_rgba(99,102,241,0.25)] sm:h-32 sm:w-32 sm:text-5xl">
                    한
                  </div>
                  <p className="text-lg font-semibold text-slate-100">한소희</p>
                  <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">
                    16 : 9
                  </p>
                </div>

                <div className="absolute bottom-3 left-3 z-10 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[10px] tracking-wider text-slate-400">
                  CAM 01
                </div>

                <div className="pointer-events-none absolute inset-y-3 right-3 z-20 flex w-[210px] flex-col justify-end sm:w-[230px]">
                  <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-white/60 uppercase">
                    Viewer Chat
                  </p>
                  <div className="flex max-h-full flex-col justify-end gap-1.5 overflow-hidden">
                    {CHAT_MESSAGES.map((message, index) => (
                      <p
                        key={`${message}-${index}`}
                        className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-[11px] leading-snug text-white/95 shadow-lg backdrop-blur-[2px]"
                      >
                        {message}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 flex shrink-0 justify-center sm:mt-3">
              <div className="h-1.5 w-32 rounded-full bg-slate-500/45 sm:w-36" />
            </div>
          </div>
        </div>
      </section>

      <footer className="game-dock px-6 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <div className="game-panel flex items-center gap-1 rounded-xl p-1">
            <span className="px-2 text-xs text-slate-400">배속</span>
            {SPEED_OPTIONS.map((option) => {
              const isActive = speed === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSpeed(option)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    isActive ? 'game-btn-primary' : 'game-btn'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={onEnd}
            className="game-btn px-4 py-2 text-sm"
          >
            스킵
          </button>

          <span className="game-chip ml-auto font-mono">
            {formatTime(elapsed)}
          </span>
        </div>
      </footer>
    </main>
  )
}
