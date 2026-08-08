import { useState } from 'react'
import { useTranslation } from '../locales/i18n'
import {
  assignCreatorToSlot,
  clearStudioSlot,
  moveCreatorBetweenSlots,
  type StudioHandCard,
  type StudioSlot,
} from '../game/studioSlots'

const SLOT_DRAG_MIME = 'application/x-studio-slot'

function parseSlotDragPayload(raw: string) {
  if (!raw.startsWith('slot:')) return null
  return raw.slice('slot:'.length) || null
}

type SchedulePanelProps = {
  slots: StudioSlot[]
  handCards: StudioHandCard[]
  onSlotsChange: (slots: StudioSlot[]) => void
}

export function SchedulePanel({ slots, handCards, onSlotsChange }: SchedulePanelProps) {
  const { t } = useTranslation()
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null)
  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null)

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
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden lg:flex-row">
      {/* 왼쪽: Placement Bay (스튜디오 배치 슬롯 영역) */}
      <section className="game-panel-strong relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
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
                드래그로 슬롯 이동 · 대시보드와 연동
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
              const isDragSource = draggingSlotId === slot.id
              const canDropFromSlot =
                Boolean(draggingSlotId) && draggingSlotId !== slot.id && !locked
              const isDragOver = dragOverSlotId === slot.id && !isDragSource

              return (
                <div
                  key={slot.id}
                  className={`min-h-0 min-w-0 rounded-lg border p-1 transition sm:rounded-xl sm:p-1.5 ${
                    locked
                      ? 'border-rose-950/30 bg-slate-950/80 opacity-40 shadow-[0_0_10px_rgba(255,42,116,0.03)]'
                      : isDragOver
                        ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_14px_rgba(16,185,129,0.2)] scale-[1.02]'
                        : isDragSource
                          ? 'border-amber-400/50 bg-amber-500/10 opacity-60'
                          : canDropFromSlot
                            ? 'border-indigo-400/50 bg-indigo-500/10'
                            : canPlace
                              ? 'border-indigo-400/80 bg-indigo-500/15 shadow-[0_0_16px_rgba(99,102,241,0.35)] scale-[1.01] animate-pulse'
                              : filled
                                ? 'border-white/12 bg-black/30'
                                : 'border-dashed border-indigo-500/25 bg-indigo-950/5 shadow-[0_0_10px_rgba(99,102,241,0.03)] hover:border-indigo-400/50 hover:bg-indigo-500/5 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  }`}
                  onDragOver={(e) => {
                    if (locked) return
                    if (draggingSlotId === slot.id) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverSlotId !== slot.id) {
                      setDragOverSlotId(slot.id)
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverSlotId === slot.id) {
                      setDragOverSlotId(null)
                    }
                  }}
                  onDrop={(e) => {
                    if (locked) return
                    e.preventDefault()
                    const sourceSlotId =
                      draggingSlotId ||
                      e.dataTransfer.getData(SLOT_DRAG_MIME) ||
                      parseSlotDragPayload(e.dataTransfer.getData('text/plain'))
                    setDragOverSlotId(null)
                    setDraggingSlotId(null)

                    // 슬롯 → 슬롯: 빈 자리면 이동, 차 있으면 서로 교체
                    if (sourceSlotId) {
                      onSlotsChange(moveCreatorBetweenSlots(slots, sourceSlotId, slot.id))
                      return
                    }

                    const cardId = e.dataTransfer.getData('text/plain')
                    if (!cardId || cardId.startsWith('slot:')) return
                    const card = handCards.find((item) => item.id === cardId)
                    if (!card) return
                    onSlotsChange(assignCreatorToSlot(slots, slot.id, card))
                  }}
                >
                  <button
                    type="button"
                    disabled={locked}
                    draggable={filled}
                    onDragStart={(e) => {
                      if (!filled || !slot.assignment) {
                        e.preventDefault()
                        return
                      }
                      e.dataTransfer.setData(SLOT_DRAG_MIME, slot.id)
                      e.dataTransfer.setData('text/plain', `slot:${slot.id}`)
                      e.dataTransfer.effectAllowed = 'move'
                      setDraggingSlotId(slot.id)
                      setSelectedCard(null)
                    }}
                    onDragEnd={() => {
                      setDraggingSlotId(null)
                      setDragOverSlotId(null)
                    }}
                    onClick={() => {
                      if (locked) return
                      if (selectedCard) {
                        assignToSlot(slot.id)
                        return
                      }

                      if (!filled) {
                        const unassignedCard = handCards.find(
                          (card) => !slots.some((s) => s.assignment?.creatorId === card.id),
                        )
                        if (unassignedCard) {
                          setSelectedCard(unassignedCard.id)
                        }
                      } else {
                        clearSlot(slot.id)
                      }
                    }}
                    className={`game-card h-full w-full min-h-0 text-left transition ${
                      locked
                        ? 'cursor-not-allowed border-rose-950/30 pointer-events-none'
                        : filled
                          ? 'cursor-grab active:cursor-grabbing hover:border-white/20'
                          : canPlace
                            ? 'hover:border-indigo-400/55 hover:ring-1 hover:ring-indigo-400/35'
                            : 'border-dashed border-indigo-500/30 hover:border-indigo-400/60 hover:bg-indigo-500/5'
                    }`}
                  >
                    <div className="relative flex h-full min-h-0 flex-col">
                      <div className="absolute top-1 right-1 left-1 z-10 flex items-center justify-between gap-1">
                        <span className="rounded-md border border-white/10 bg-black/50 px-1 py-0.5 text-[8px] font-bold tracking-[0.1em] text-slate-300 backdrop-blur-sm">
                          {slot.label.replace('SLOT ', '')}
                        </span>
                        {locked ? null : filled ? (
                          <span className="rounded-md border border-emerald-400/30 bg-emerald-500/20 px-1 py-0.5 text-[8px] font-bold text-emerald-200">
                            {t('dashboard.studioPlaced')}
                          </span>
                        ) : (
                          <span className="rounded-md border border-indigo-400/25 bg-indigo-500/10 px-1 py-0.5 text-[8px] font-bold text-indigo-300">
                            {t('dashboard.unassigned')}
                          </span>
                        )}
                      </div>

                      <div className="relative flex h-full w-full min-h-0 flex-1 flex-col items-center justify-end overflow-hidden rounded-md sm:rounded-lg">
                        {filled && slot.assignment?.profileImageUrl && (
                          <>
                            <img
                              src={slot.assignment.profileImageUrl}
                              alt=""
                              draggable={false}
                              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                          </>
                        )}

                        <div
                          className={`relative z-10 flex w-full flex-col items-center justify-end px-1.5 pb-2 pt-6 ${
                            !slot.assignment?.profileImageUrl
                              ? `h-full bg-gradient-to-b ${
                                  locked
                                    ? 'from-slate-950 via-slate-950 to-rose-950/10'
                                    : filled
                                      ? 'from-slate-700/70 to-slate-950'
                                      : 'from-slate-800/40 to-slate-950'
                                }`
                              : ''
                          }`}
                        >
                          {locked ? (
                            <>
                              <div className="mb-1.5 flex h-7.5 w-7.5 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/30 text-rose-500/60 sm:h-9.5 sm:w-9.5">
                                <IconLockTiny />
                              </div>
                              <p className="text-[9px] font-bold text-rose-600/70 sm:text-[10px] tracking-wide uppercase">
                                {t('dashboard.lockedChannel')}
                              </p>
                            </>
                          ) : filled && slot.assignment ? (
                            <>
                              {!slot.assignment.profileImageUrl && (
                                <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-full border border-indigo-300/25 bg-indigo-500/10 text-[11px] font-bold text-indigo-50 sm:h-9 sm:w-9 sm:text-sm">
                                  {slot.assignment.creatorName.slice(0, 1)}
                                </div>
                              )}
                              <p className="w-full truncate text-center text-[10px] font-semibold text-slate-100 sm:text-[11px]">
                                {slot.assignment.creatorName}
                              </p>
                              <p className="mt-0.5 text-[8px] font-semibold text-amber-400 sm:text-[9px]">
                                {slot.assignment.grade} · {slot.assignment.popularity}
                              </p>
                            </>
                          ) : (
                            <>
                              <div
                                className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/10 text-indigo-300 sm:h-9.5 sm:w-9.5 shadow-[0_0_12px_rgba(99,102,241,0.25)] animate-bounce"
                                style={{ animationDuration: '2.5s' }}
                              >
                                ＋
                              </div>
                              <p className="text-[9px] font-bold tracking-wider text-indigo-300 sm:text-[10px] animate-pulse">
                                {t('dashboard.standby')}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 오른쪽: 배치할 크리에이터 */}
      <section className="game-panel flex min-h-0 w-full flex-col rounded-2xl p-3 sm:p-4 lg:w-60 xl:w-64 shrink-0">
        <div className="mb-2 shrink-0">
          <p className="text-xs font-semibold tracking-wide text-slate-400">
            {t('studio.placementTitle')}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">{t('studio.placementDesc')}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1.5">
          {handCards.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">{t('studio.noCreators')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {handCards.map((card) => {
                const isSelected = selectedCard === card.id
                const assigned = slots.some((slot) => slot.assignment?.creatorId === card.id)
                return (
                  <button
                    key={card.id}
                    type="button"
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', card.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDraggingSlotId(null)
                    }}
                    onClick={() =>
                      setSelectedCard((prev) => (prev === card.id ? null : card.id))
                    }
                    className={`game-card relative aspect-[3/4] w-full shrink-0 text-left transition cursor-grab active:cursor-grabbing ${
                      isSelected
                        ? 'border-indigo-400 ring-2 ring-indigo-400/40 shadow-[0_0_18px_rgba(99,102,241,0.5)] scale-[1.04] animate-pulse z-10'
                        : 'hover:scale-[1.01] hover:border-white/20'
                    } ${assigned ? 'opacity-70' : ''}`}
                  >
                    <div className="relative flex h-full w-full flex-col items-center justify-end overflow-hidden rounded-md sm:rounded-lg">
                      {card.profileImageUrl && (
                        <>
                          <img
                            src={card.profileImageUrl}
                            alt=""
                            draggable={false}
                            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />
                        </>
                      )}

                      {assigned ? (
                        <span className="absolute top-1 right-1 z-20 rounded-md border border-indigo-400/30 bg-indigo-500/20 px-1 py-0.5 text-[7px] font-bold text-indigo-200">
                          IN
                        </span>
                      ) : null}

                      <div
                        className={`relative z-10 flex w-full flex-col items-center justify-end px-1.5 pb-1.5 pt-5 ${
                          !card.profileImageUrl
                            ? 'h-full bg-gradient-to-b from-slate-700/70 to-slate-950'
                            : ''
                        }`}
                      >
                        {!card.profileImageUrl && (
                          <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-full border border-indigo-300/25 bg-indigo-500/10 text-[10px] font-bold text-indigo-50 sm:h-7 sm:w-7">
                            {card.name.slice(0, 1)}
                          </div>
                        )}
                        <p className="w-full truncate text-center text-[9px] font-semibold text-slate-100 sm:text-[10px]">
                          {card.name}
                        </p>
                        <p className="text-[8px] font-semibold text-amber-400">
                          {card.grade} · {card.popularity}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
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
