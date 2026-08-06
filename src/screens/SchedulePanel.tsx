import { useState } from 'react'

type DaySlot = {
  day: string
  date: string
  creator: string | null
  concept: string | null
  affection: number | null
  resting?: boolean
}

const WEEK_SLOTS: DaySlot[] = [
  { day: '월', date: '3/7', creator: '이지현', concept: '일반', affection: 75 },
  { day: '화', date: '3/8', creator: '한소희', concept: '섹시', affection: 60 },
  { day: '수', date: '3/9', creator: '개쉐이', concept: null, affection: null, resting: true },
  { day: '목', date: '3/10', creator: '김미래', concept: '성인', affection: 45 },
  { day: '금', date: '3/11', creator: '서아람', concept: '일반', affection: 80 },
  { day: '토', date: '3/12', creator: '한소희', concept: '하드', affection: 40 },
  { day: '일', date: '3/13', creator: '개쉐이', concept: null, affection: null, resting: true },
]

const HAND_CARDS = [
  { id: '1', name: '이지현', grade: 'B', popularity: 40 },
  { id: '2', name: '한소희', grade: 'A', popularity: 55 },
  { id: '3', name: '김미래', grade: 'A', popularity: 50 },
  { id: '4', name: '서아람', grade: 'B', popularity: 45 },
  { id: '5', name: '정유진', grade: 'B', popularity: 35 },
  { id: '6', name: '박순정', grade: 'C', popularity: 20 },
]

const SPEED_OPTIONS = ['1x', '2x', '3x'] as const

export function SchedulePanel() {
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>('1x')
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  return (
    <div className="flex min-h-full flex-col gap-4">
      {/* Action bar */}
      <div className="game-panel-strong flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3">
        <button type="button" className="game-btn rounded-xl px-3 py-2 text-sm">
          프리셋
        </button>

        <div className="game-panel flex items-center gap-1 rounded-xl p-1">
          <span className="px-2 text-xs text-slate-400">배속</span>
          {SPEED_OPTIONS.map((option) => {
            const isActive = speed === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => setSpeed(option)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
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
          className="game-btn-primary ml-auto rounded-xl px-4 py-2 text-sm"
        >
          ▶ 자동 진행
        </button>
      </div>

      {/* Week label */}
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">
          3월 2주차{' '}
          <span className="font-medium text-slate-400">(3/7 ~ 3/13)</span>
        </h2>
      </div>

      {/* Weekly schedule grid */}
      <div className="game-panel overflow-x-auto rounded-2xl">
        <div className="grid min-w-[640px] grid-cols-7">
          {WEEK_SLOTS.map((slot) => (
            <div
              key={slot.day}
              className="border-r border-white/8 last:border-r-0"
            >
              <div className="border-b border-white/8 bg-black/20 px-2 py-2 text-center">
                <p className="text-xs font-semibold text-slate-300">{slot.day}</p>
                <p className="text-[10px] text-slate-500">{slot.date}</p>
              </div>

              <button
                type="button"
                className={`flex min-h-[7.5rem] w-full flex-col items-center justify-center gap-1 px-2 py-3 text-center transition hover:bg-indigo-500/10 ${
                  selectedCard ? 'ring-inset hover:ring-1 hover:ring-indigo-400/40' : ''
                }`}
              >
                {slot.resting ? (
                  <>
                    <p className="text-xs font-semibold text-slate-400">
                      {slot.creator}
                    </p>
                    <p className="text-lg leading-none opacity-80">😴</p>
                    <p className="text-[10px] text-slate-500">휴식</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-slate-100">
                      {slot.creator}
                    </p>
                    <p className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] text-slate-300">
                      {slot.concept}
                    </p>
                    <p className="text-[11px] font-semibold text-amber-400">
                      AFF {slot.affection}
                    </p>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Hand / creator cards - horizontal scroll */}
      <section className="game-panel rounded-2xl p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide text-slate-400">
            배치할 크리에이터
          </p>
          <p className="text-[10px] text-slate-500">
            카드를 선택해 슬롯에 배치
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {HAND_CARDS.map((card) => {
            const isSelected = selectedCard === card.id
            return (
              <button
                key={card.id}
                type="button"
                onClick={() =>
                  setSelectedCard((prev) => (prev === card.id ? null : card.id))
                }
                className={`game-card w-[5.75rem] shrink-0 text-left ${
                  isSelected ? 'border-indigo-400/50 ring-1 ring-indigo-400/40' : ''
                }`}
              >
                <div className="flex aspect-[3/4] items-end justify-center bg-gradient-to-b from-slate-700/70 to-slate-950">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-indigo-300/25 bg-indigo-500/10 text-xs font-bold text-indigo-50">
                    {card.name.slice(0, 1)}
                  </div>
                </div>
                <div className="border-t border-white/8 px-1.5 py-1.5">
                  <p className="truncate text-[11px] font-semibold text-slate-100">
                    {card.name}
                  </p>
                  <p className="mt-0.5 text-[9px] font-semibold text-amber-400">
                    {card.grade} · {card.popularity}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
