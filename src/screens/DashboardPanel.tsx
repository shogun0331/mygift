import { useState } from 'react'

const SPEED_OPTIONS = ['1x', '2x', '3x'] as const

type DashboardPanelProps = {
  onStartBroadcast: () => void
}

export function DashboardPanel({ onStartBroadcast }: DashboardPanelProps) {
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>('1x')

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="game-panel-strong flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <div className="min-w-[10rem] flex-1">
          <p className="game-stat-label">방송국명</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-100">
            STAR BROADCASTING CO.
          </p>
        </div>

        <div className="hidden h-8 w-px bg-white/10 sm:block" />

        <div className="min-w-[7rem]">
          <p className="game-stat-label">자산</p>
          <p className="mt-0.5 text-sm font-semibold text-amber-400">
            ₩12,500,000
          </p>
        </div>

        <div className="hidden h-8 w-px bg-white/10 sm:block" />

        <div className="min-w-[5rem]">
          <p className="game-stat-label">주차</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-100">Week 3</p>
        </div>

        <div className="hidden h-8 w-px bg-white/10 sm:block" />

        <div className="ml-auto">
          <p className="game-stat-label mb-1">배속 조절</p>
          <div className="flex gap-1">
            {SPEED_OPTIONS.map((option) => {
              const isActive = speed === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSpeed(option)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    isActive
                      ? 'game-btn-primary'
                      : 'game-btn'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: '자산', value: '12,500,000', note: '₩ KRW', noteClass: 'text-amber-400' },
          { label: '오늘 수익', value: '850,000', note: '+12.4% vs 어제', noteClass: 'text-indigo-300' },
          { label: '크리에이터', value: '4명', note: '소속 멤버', noteClass: 'text-slate-500' },
        ].map((stat) => (
          <article key={stat.label} className="game-panel rounded-2xl p-4">
            <p className="game-stat-label">{stat.label}</p>
            <p className="game-stat-value mt-2 text-2xl tracking-tight">{stat.value}</p>
            <p className={`mt-1 text-xs ${stat.noteClass}`}>{stat.note}</p>
          </article>
        ))}
      </div>

      <section className="game-panel rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">
            오늘의 방송
          </h2>
          <span className="game-chip-accent game-chip">
            <span className="game-live-dot h-1.5 w-1.5 rounded-full bg-rose-400" />
            LIVE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-sm font-bold text-indigo-100">
            한
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">
              한소희 <span className="font-medium text-amber-400">(섹시)</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">메인 스튜디오 · CAM 01</p>
          </div>
          <p className="text-xs font-medium text-slate-400">진행 중...</p>
        </div>
      </section>

      <section className="game-panel rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-100">
          최근 이벤트
        </h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-sm text-slate-300">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>한소희 인기 상승!</span>
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-sm text-slate-300">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
            <span>세금 납부 기간입니다.</span>
          </li>
        </ul>
      </section>

      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={onStartBroadcast}
          className="game-btn-primary rounded-xl px-14 py-3 text-[15px] font-bold tracking-wide"
        >
          ▶ 방송시작
        </button>
      </div>
    </div>
  )
}
