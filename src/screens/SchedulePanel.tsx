import { useState } from 'react'
import {
  assignCreatorToSlot,
  clearStudioSlot,
  type StudioHandCard,
  type StudioSlot,
} from '../game/studioSlots'

type SchedulePanelProps = {
  slots: StudioSlot[]
  handCards: StudioHandCard[]
  onSlotsChange: (slots: StudioSlot[]) => void
}

export function SchedulePanel({ slots, handCards, onSlotsChange }: SchedulePanelProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  function assignToSlot(slotId: string) {
    if (!selectedCard) return
    const card = handCards.find((item) => item.id === selectedCard)
    if (!card) return
    onSlotsChange(assignCreatorToSlot(slots, slotId, card))
    setSelectedCard(null)
  }

  function clearSlot(slotId: string) {
    onSlotsChange(clearStudioSlot(slots, slotId))
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-hidden">
      <section className="game-panel-strong relative mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.16),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-2 rounded-xl border border-indigo-400/15 sm:inset-3" />
        <div className="pointer-events-none absolute top-2 left-2 h-2.5 w-2.5 border-t border-l border-indigo-300/45 sm:top-3 sm:left-3 sm:h-3 sm:w-3" />
        <div className="pointer-events-none absolute top-2 right-2 h-2.5 w-2.5 border-t border-r border-indigo-300/45 sm:top-3 sm:right-3 sm:h-3 sm:w-3" />
        <div className="pointer-events-none absolute bottom-2 left-2 h-2.5 w-2.5 border-b border-l border-indigo-300/45 sm:bottom-3 sm:left-3 sm:h-3 sm:w-3" />
        <div className="pointer-events-none absolute right-2 bottom-2 h-2.5 w-2.5 border-b border-r border-indigo-300/45 sm:right-3 sm:bottom-3 sm:h-3 sm:w-3" />

        <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-indigo-400/15 bg-black/25 px-3 py-2 sm:px-4">
          <div className="min-w-0">
            <p className="game-kicker">Placement Bay</p>
            <h2 className="truncate text-sm font-semibold tracking-wide text-slate-100">
              Studio Slots
              <span className="ml-2 text-[11px] font-medium text-slate-500">
                카드 선택 후 슬롯 배치 · 대시보드와 연동
              </span>
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold tracking-wide text-slate-500">GRID</p>
            <p className="text-xs font-bold text-indigo-300">3 × 2</p>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-3 md:p-4"
          style={{ containerType: 'size' }}
        >
          <div className="pointer-events-none absolute inset-2 rounded-xl border border-dashed border-white/10 bg-black/15 sm:inset-3 md:inset-4" />
          <div
            className="pointer-events-none absolute inset-2 opacity-[0.3] sm:inset-3 md:inset-4"
            style={{
              backgroundImage:
                'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 85%)',
            }}
          />

          <div
            className="relative mx-auto grid max-h-full max-w-full grid-cols-3 grid-rows-2 gap-1.5 sm:gap-2 md:gap-2.5"
            style={{
              aspectRatio: '9 / 8',
              width: 'min(100%, calc(100cqh * 9 / 8))',
              height: 'min(100%, calc(100cqw * 8 / 9))',
            }}
          >
            {slots.map((slot) => {
              const locked = slot.status === 'locked'
              const filled = slot.status === 'assigned' && Boolean(slot.assignment)
              const canPlace = Boolean(selectedCard) && !locked

              return (
                <div
                  key={slot.id}
                  className={`min-h-0 min-w-0 rounded-lg border p-1 transition sm:rounded-xl sm:p-1.5 ${
                    locked
                      ? 'border-white/8 bg-black/40 opacity-70'
                      : canPlace
                        ? 'border-indigo-400/35 bg-indigo-500/10 shadow-[0_0_14px_rgba(99,102,241,0.16)]'
                        : filled
                          ? 'border-white/12 bg-black/30'
                          : 'border-dashed border-white/12 bg-black/20'
                  }`}
                >
                  <button
                    type="button"
                    disabled={locked && !selectedCard}
                    onClick={() => {
                      if (locked) return
                      if (selectedCard) {
                        assignToSlot(slot.id)
                        return
                      }
                      if (filled) clearSlot(slot.id)
                    }}
                    className={`game-card h-full w-full min-h-0 text-left transition ${
                      locked
                        ? 'cursor-not-allowed border-white/8'
                        : canPlace
                          ? 'hover:border-indigo-400/55 hover:ring-1 hover:ring-indigo-400/35'
                          : filled
                            ? 'hover:border-white/20'
                            : 'border-dashed border-white/15'
                    }`}
                  >
                    <div className="relative flex h-full min-h-0 flex-col">
                      <div className="absolute top-1 right-1 left-1 z-10 flex items-center justify-between gap-1">
                        <span className="rounded-md border border-white/10 bg-black/50 px-1 py-0.5 text-[8px] font-bold tracking-[0.1em] text-slate-300 backdrop-blur-sm">
                          {slot.label.replace('SLOT ', '')}
                        </span>
                        {locked ? (
                          <span className="rounded-md border border-white/10 bg-black/50 px-1 py-0.5 text-[8px] font-bold text-slate-500">
                            LOCK
                          </span>
                        ) : filled ? (
                          <span className="rounded-md border border-emerald-400/30 bg-emerald-500/20 px-1 py-0.5 text-[8px] font-bold text-emerald-200">
                            배정
                          </span>
                        ) : (
                          <span className="rounded-md border border-slate-400/25 bg-slate-500/15 px-1 py-0.5 text-[8px] font-bold text-slate-400">
                            미배정
                          </span>
                        )}
                      </div>

                      <div
                        className={`flex min-h-0 flex-1 flex-col items-center justify-end bg-gradient-to-b px-1.5 pb-2 pt-6 ${
                          locked
                            ? 'from-slate-900/80 to-slate-950'
                            : filled
                              ? 'from-slate-700/70 to-slate-950'
                              : 'from-slate-800/40 to-slate-950'
                        }`}
                      >
                        {locked ? (
                          <>
                            <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-slate-600 sm:h-9 sm:w-9">
                              <IconLockTiny />
                            </div>
                            <p className="text-[9px] font-semibold text-slate-500 sm:text-[10px]">잠금</p>
                          </>
                        ) : filled && slot.assignment ? (
                          <>
                            <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-full border border-indigo-300/25 bg-indigo-500/10 text-[11px] font-bold text-indigo-50 sm:h-9 sm:w-9 sm:text-sm">
                              {slot.assignment.creatorName.slice(0, 1)}
                            </div>
                            <p className="w-full truncate text-center text-[10px] font-semibold text-slate-100 sm:text-[11px]">
                              {slot.assignment.creatorName}
                            </p>
                            <p className="mt-0.5 text-[8px] font-semibold text-amber-400 sm:text-[9px]">
                              {slot.assignment.grade} · {slot.assignment.popularity}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-white/15 text-base text-slate-500 sm:h-9 sm:w-9">
                              ＋
                            </div>
                            <p className="text-[9px] font-semibold text-slate-400 sm:text-[10px]">
                              비어 있음
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="game-panel mx-auto w-full max-w-4xl shrink-0 rounded-2xl px-2.5 py-2 sm:px-3 sm:py-2.5">
        <div className="mb-1 flex items-center justify-between gap-2 sm:mb-1.5">
          <p className="text-[11px] font-semibold tracking-wide text-slate-400">
            배치할 크리에이터
          </p>
          <p className="text-[10px] text-slate-500">카드를 선택해 해금된 슬롯에 배치</p>
        </div>

        {handCards.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            보유 캐릭터가 없습니다. 캐릭터를 확보하면 여기에 나타납니다.
          </p>
        ) : (
          <div className="flex justify-center gap-1.5 overflow-x-auto pb-0.5 sm:gap-2">
            {handCards.map((card) => {
              const isSelected = selectedCard === card.id
              const assigned = slots.some((slot) => slot.assignment?.creatorId === card.id)
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() =>
                    setSelectedCard((prev) => (prev === card.id ? null : card.id))
                  }
                  className={`game-card aspect-[3/4] h-[clamp(4.25rem,12vh,6.5rem)] w-auto shrink-0 text-left ${
                    isSelected ? 'border-indigo-400/50 ring-1 ring-indigo-400/40' : ''
                  } ${assigned ? 'opacity-70' : ''}`}
                >
                  <div className="relative flex h-full flex-col items-center justify-end bg-gradient-to-b from-slate-700/70 to-slate-950 px-1.5 pb-1.5 pt-5">
                    {assigned ? (
                      <span className="absolute top-1 right-1 rounded-md border border-indigo-400/30 bg-indigo-500/20 px-1 py-0.5 text-[7px] font-bold text-indigo-200">
                        IN
                      </span>
                    ) : null}
                    <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-full border border-indigo-300/25 bg-indigo-500/10 text-[10px] font-bold text-indigo-50 sm:h-7 sm:w-7">
                      {card.name.slice(0, 1)}
                    </div>
                    <p className="w-full truncate text-center text-[9px] font-semibold text-slate-100 sm:text-[10px]">
                      {card.name}
                    </p>
                    <p className="text-[8px] font-semibold text-amber-400">
                      {card.grade} · {card.popularity}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function IconLockTiny() {
  return (
    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 10V8a4 4 0 0 1 8 0v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
