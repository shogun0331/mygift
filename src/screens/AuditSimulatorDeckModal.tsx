import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from '../locales/i18n'
import type { Grade, RegisteredCharacter } from '../game/characters'
import { normalizeCreatorStatType } from '../game/characters'
import { type StationTierId } from '../game/stationGradeConfig'
import { getCreatorTypeDisplayName } from '../game/auditEngine'
import { resolveMediaSrc } from '../game/mediaUrl'
import { characterDisplayName } from '../game/characterLocales'
import { companyTierLabelKey } from '../game/ranking'
import { DECK_UI_ASSETS } from '../ui/deckAssets'
import {
  BoltGlyph,
  GradePlate,
  STAT_TYPE_CHIP_TONE,
  STAT_TYPE_LABEL_KEY,
  TypeStatIcon,
} from '../ui/creatorMarks'

type Props = {
  tierKey: Exclude<StationTierId, 'black' | 'tiny'>
  registeredCharacters: any[]
  isSimulator?: boolean
  titleKey?: string
  startLabelKey?: string
  onStartSimulation: (selectedCharacters: any[]) => void
  onClose?: () => void
  /** 출전 가능한 크리에이터가 없을 때 이번 팬미팅을 넘긴다 */
  onPass?: () => void
  forceTutorial?: boolean
  onReplayTutorial?: () => void
}

/** 등급별(S, A, B, C) 뱃지 스타일 — 타 화면 호환용 */
export function getGradeBadgeStyle(grade: string = 'B') {
  const g = (grade || 'B').toUpperCase()
  switch (g) {
    case 'S':
      return 'border-amber-400 text-amber-200 bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.85)] ring-1 ring-amber-400/50'
    case 'A':
      return 'border-purple-400 text-purple-200 bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 shadow-[0_0_15px_rgba(168,85,247,0.85)] ring-1 ring-purple-400/50'
    case 'B':
      return 'border-cyan-400 text-cyan-200 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 shadow-[0_0_15px_rgba(6,182,212,0.8)] ring-1 ring-cyan-400/50'
    case 'C':
    default:
      return 'border-slate-400 text-slate-200 bg-slate-900 shadow-[0_0_10px_rgba(148,163,184,0.5)]'
  }
}

function asGrade(raw: unknown): Grade {
  const g = String(raw || 'B').toUpperCase()
  if (g === 'S' || g === 'A' || g === 'B' || g === 'C') return g
  return 'B'
}

function DeckCard({
  character,
  size,
  showBezel,
  t,
  locale,
  isDragging,
  lowStamina,
  staminaLabel,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  character: RegisteredCharacter & { stamina?: number; profileImageUrl?: string }
  size: 'lg' | 'sm'
  showBezel: boolean
  t: (key: string, vars?: Record<string, string | number>) => string
  locale: string
  isDragging?: boolean
  lowStamina?: boolean
  staminaLabel: string
  onClick?: () => void
  draggable?: boolean
  onDragStart?: (e: DragEvent) => void
  onDragEnd?: () => void
}) {
  const rawType =
    (character as any).statType ||
    (character as any).type ||
    (character as any).primaryStat ||
    'performance'
  const cType = normalizeCreatorStatType(rawType)
  const typeLabel = t(STAT_TYPE_LABEL_KEY[cType]) || getCreatorTypeDisplayName(cType, t)
  const stamina = (character as any).stamina ?? 100
  const name = characterDisplayName(character, locale)
  const tall = size === 'lg'

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title={typeLabel}
      className={`group relative aspect-[3/4] flex flex-col justify-between overflow-hidden rounded-2xl transition-all ${
        tall ? 'h-[210px] sm:h-[250px]' : 'h-[160px] sm:h-[190px]'
      } ${
        lowStamina
          ? 'cursor-not-allowed border border-white/10 bg-slate-950/90 opacity-50 grayscale-[40%]'
          : isDragging
            ? 'scale-95 border border-dashed border-white/30 opacity-30'
            : 'cursor-pointer border border-white/15 bg-slate-950 hover:border-amber-200/50 hover:shadow-[0_0_18px_rgba(251,191,36,0.18)]'
      }`}
    >
      {lowStamina ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 p-1 text-center backdrop-blur-xs">
          <span className="text-[10px] font-black uppercase tracking-wider leading-tight text-rose-300">
            {t('audit.staminaDepleted')}
          </span>
          <span className="mt-0.5 text-[8.5px] font-semibold text-rose-200/80">
            {t('audit.lowStaminaHint')}
          </span>
        </div>
      ) : null}

      {character.profileImageUrl ? (
        <img
          src={resolveMediaSrc(character.profileImageUrl)}
          alt={name}
          className={`absolute object-cover transition-transform duration-300 group-hover:scale-105 ${
            showBezel ? 'inset-[4%] rounded-[18px]' : 'inset-0'
          }`}
        />
      ) : (
        <div
          className={`absolute flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-xs font-bold text-slate-400 ${
            showBezel ? 'inset-[4%] rounded-[18px]' : 'inset-0'
          }`}
        >
          <span>NO IMAGE</span>
        </div>
      )}

      {showBezel ? (
        <img
          src={DECK_UI_ASSETS.cardBezel}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[5] h-full w-full object-fill"
        />
      ) : null}

      <div className="relative z-10 flex items-start justify-between gap-1 bg-gradient-to-b from-black/80 to-transparent p-1.5 sm:p-2">
        <GradePlate grade={asGrade(character.grade)} size={tall ? 'md' : 'sm'} />
        <span
          className={`inline-flex items-center rounded-md border p-0.5 ${STAT_TYPE_CHIP_TONE[cType]}`}
          aria-label={typeLabel}
        >
          <TypeStatIcon type={cType} className={tall ? 'h-5 w-5' : 'h-4 w-4'} />
        </span>
      </div>

      <div className="relative z-10 space-y-1 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent p-1.5 pt-3 sm:p-2.5">
        <h5
          className={`truncate font-black text-white drop-shadow ${
            tall ? 'text-sm sm:text-base' : 'text-center text-[11px]'
          }`}
        >
          {name}
        </h5>
        <div
          className="flex flex-col space-y-0.5 border-t border-white/10 pt-0.5"
          title={`${staminaLabel} ${stamina}`}
        >
          <div className="flex items-center justify-between px-0.5 text-[9px] font-black text-slate-200">
            <BoltGlyph className="h-2.5 w-2.5 text-amber-300" />
            <span className="tabular-nums">{stamina}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full border border-white/15 bg-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
              style={{ width: `${Math.min(100, Math.max(0, stamina))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function AuditSimulatorDeckModal({
  tierKey,
  registeredCharacters,
  isSimulator = false,
  titleKey = 'audit.deckModalTitle',
  startLabelKey = 'audit.startPromotionExamBtn',
  onStartSimulation,
  onClose,
  onPass,
  forceTutorial = false,
  onReplayTutorial,
}: Props) {
  const replayRef = useRef(onReplayTutorial)
  replayRef.current = onReplayTutorial
  useEffect(() => {
    if (!forceTutorial) return
    replayRef.current?.()
  }, [forceTutorial])
  const { t, locale } = useTranslation()
  const boostedCharacters: any[] = registeredCharacters.map((c) => ({
    ...c,
    grade: isSimulator ? 'S' : c.grade || 'B',
  }))

  const [deckSlots, setDeckSlots] = useState<(string | null)[]>(() => {
    const initial: (string | null)[] = [null, null, null, null]
    const validEligible = boostedCharacters.filter((c) => ((c as any).stamina ?? 100) > 30)
    validEligible.slice(0, 4).forEach((c, idx) => {
      initial[idx] = c.id
    })
    return initial
  })

  const [draggedId, setDraggedId] = useState<string | null>(null)

  const activeSelectedIds = deckSlots.filter(Boolean) as string[]
  const canField = boostedCharacters.some((character) => ((character as any).stamina ?? 100) > 30)
  const staminaLabel = t('creator.statStamina')

  const toggleSelect = (id: string) => {
    const char = boostedCharacters.find((c) => c.id === id)
    if (char && ((char as any).stamina ?? 100) <= 30) return

    setDeckSlots((prev) => {
      const next = [...prev]
      const existingIdx = next.indexOf(id)
      if (existingIdx !== -1) {
        next[existingIdx] = null
      } else {
        const emptyIdx = next.indexOf(null)
        if (emptyIdx === -1) {
          return prev
        }
        next[emptyIdx] = id
      }
      return next
    })
  }

  const assignToSlot = (slotIdx: number, charId: string) => {
    const char = boostedCharacters.find((c) => c.id === charId)
    if (char && ((char as any).stamina ?? 100) <= 30) return

    setDeckSlots((prev) => {
      const next = [...prev]
      const existingIdx = next.indexOf(charId)
      if (existingIdx !== -1) {
        next[existingIdx] = null
      }
      next[slotIdx] = charId
      return next
    })
  }

  const clearSlot = (slotIdx: number) => {
    setDeckSlots((prev) => {
      const next = [...prev]
      next[slotIdx] = null
      return next
    })
  }

  const handleStart = () => {
    const selected = deckSlots
      .map((id) => (id ? boostedCharacters.find((c) => c.id === id) ?? null : null))
      .filter((c): c is NonNullable<typeof c> => c != null)
    if (selected.length === 0) {
      alert(t('audit.deckModalSelectAlert'))
      return
    }
    onStartSimulation(selected)
  }

  const slots: (RegisteredCharacter | null)[] = [0, 1, 2, 3].map((slotIdx) => {
    const id = deckSlots[slotIdx]
    return id ? boostedCharacters.find((c) => c.id === id) || null : null
  })

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/88 p-2 sm:p-4 backdrop-blur-md transition-all animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="game-panel relative flex h-[93vh] max-h-[96vh] w-[98vw] max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/12 bg-slate-950/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:p-6">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="min-w-0">
            <p className="game-kicker">
              {t(companyTierLabelKey(tierKey))} · {t(titleKey)}
            </p>
            <h3 className="truncate text-base font-semibold text-slate-100 sm:text-lg">
              {t('audit.deckModalSubtitle')}
            </h3>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-black/30 text-slate-400 transition hover:border-white/25 hover:bg-white/5 hover:text-white active:scale-95"
              aria-label="Close modal"
            >
              ✕
            </button>
          ) : null}
        </header>

        <div className="my-3 flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
          <section
            className="relative shrink-0 overflow-hidden rounded-2xl border border-white/10 p-4 shadow-inner"
            style={{
              backgroundImage: `url('${DECK_UI_ASSETS.stage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/55 via-transparent to-slate-950/70" />
            <div className="relative mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-slate-200 sm:text-sm">
                {t('audit.deckModalSlotsHeader', { count: activeSelectedIds.length })}
              </span>
              <span className="text-[11px] font-medium text-slate-400 sm:text-xs">
                {t('audit.deckModalSlotHint')}
              </span>
            </div>

            <div className="relative mx-auto grid max-w-4xl grid-cols-4 gap-3 sm:gap-4">
              {slots.map((char, slotIdx) => (
                <div
                  key={slotIdx}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedId) {
                      assignToSlot(slotIdx, draggedId)
                      setDraggedId(null)
                    }
                  }}
                  onClick={() => {
                    if (char) clearSlot(slotIdx)
                  }}
                  className={
                    char
                      ? 'rounded-2xl outline outline-1 outline-amber-200/45 drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]'
                      : undefined
                  }
                >
                  {char ? (
                    <DeckCard
                      character={char as any}
                      size="lg"
                      showBezel
                      t={t}
                      locale={locale}
                      staminaLabel={staminaLabel}
                    />
                  ) : (
                    <div
                      className="relative mx-auto aspect-[3/4] h-[210px] overflow-hidden rounded-2xl sm:h-[250px]"
                      style={{
                        backgroundImage: `url('${DECK_UI_ASSETS.slotEmpty}')`,
                        backgroundSize: '100% 100%',
                      }}
                    >
                      <div className="absolute inset-[5%_6%] flex flex-col items-center justify-center text-center text-slate-400/80">
                        <span className="text-xs font-bold tracking-wide text-slate-300/70">
                          {t('audit.slotFormat', { slot: slotIdx + 1 })}
                        </span>
                        <span className="mt-1 text-[10px] font-medium text-slate-500">
                          {t('audit.emptySlot')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-3.5">
            {(() => {
              const availableCharacters = boostedCharacters.filter(
                (c) => !activeSelectedIds.includes(c.id),
              )
              return (
                <>
                  <div className="mb-2 flex shrink-0 items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 sm:text-sm">
                      {t('audit.unplacedCreators', { count: availableCharacters.length })}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 sm:text-xs">
                      {t('audit.unplacedHint')}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1">
                    {availableCharacters.length > 0 ? (
                      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2 md:grid-cols-6 lg:grid-cols-7">
                        {availableCharacters.map((character) => {
                          const stamina = (character as any).stamina ?? 100
                          const isLowStamina = stamina <= 30
                          const isBeingDragged = draggedId === character.id
                          return (
                            <DeckCard
                              key={character.id}
                              character={character}
                              size="sm"
                              showBezel={false}
                              t={t}
                              locale={locale}
                              staminaLabel={staminaLabel}
                              lowStamina={isLowStamina}
                              isDragging={isBeingDragged}
                              draggable={!isLowStamina}
                              onDragStart={(e) => {
                                if (isLowStamina) {
                                  e.preventDefault()
                                  return
                                }
                                setDraggedId(character.id)
                                e.dataTransfer.effectAllowed = 'move'
                              }}
                              onDragEnd={() => setDraggedId(null)}
                              onClick={() => {
                                if (isLowStamina) return
                                toggleSelect(character.id)
                              }}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-xl border border-white/8 bg-black/20 p-6 text-xs font-semibold text-slate-400">
                        {t('audit.allCreatorsPlaced')}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </section>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 pt-3">
          {onReplayTutorial ? (
            <button
              type="button"
              onClick={onReplayTutorial}
              className="game-btn cursor-pointer rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-500/15"
            >
              {t('audit.replayTutorial')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-2">
            {onPass && !canField ? (
              <button
                type="button"
                onClick={onPass}
                className="cursor-pointer rounded-xl border border-rose-300/40 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-100 transition hover:border-rose-200/60 hover:bg-rose-500/20"
              >
                {t('audit.passFanMeeting')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleStart}
              disabled={!canField}
              className="game-btn game-btn-primary flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>{t(startLabelKey, { count: activeSelectedIds.length })}</span>
              <span className="text-xs font-bold">➔</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
