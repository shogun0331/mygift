import { useEffect, useState, type DragEvent } from 'react'
import { useTranslation, type Locale } from '../locales/i18n'
import {
  normalizeCreatorStatType,
  type CreatorStatType,
} from '../game/characters'
import {
  canBroadcastByStamina,
} from '../game/condition'
import { formatMoney } from '../game/money'
import {
  assignCreatorToSlot,
  clearStudioSlot,
  countUnlockedSlots,
  findNextUnlockableSlot,
  moveCreatorBetweenSlots,
  type StudioHandCard,
  type StudioSlot,
} from '../game/studioSlots'
import { UnlockSlotModal } from './UnlockSlotModal'
import { resolveMediaSrc } from '../game/mediaUrl'
import {
  STAFF_GENDER_LABEL_KEY,
  STAFF_KIND_LABEL_KEY,
  staffCardUrl,
  staffDisplayName,
  staffIconUrl,
  type RegisteredStaff,
} from '../game/staff'
import {
  findSlotIdForStaff,
  STAFF_HIRE_COST,
  STAFF_SLOT_KINDS,
  type SlotManagerState,
  type StaffKind,
} from '../game/slotManagers'
import { KIND_TONE, StaffKindIcon, StaffSlotIcons } from './StaffManagerUi'
import { companyTierLabelKey } from '../game/ranking'
import {
  meetsSlotUnlockByRank,
  slotUnlockMinGradeOf,
  slotUnlockPriceOf,
  type StationGradeConfig,
} from '../game/stationGradeConfig'

const SLOT_DRAG_MIME = 'application/x-studio-slot'
const STAFF_DRAG_MIME = 'application/x-studio-staff'

const GRADE_BADGE: Record<string, string> = {
  S: 'border-amber-400/55 bg-gradient-to-br from-amber-400/35 to-amber-600/20 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.35)]',
  A: 'border-indigo-400/50 bg-gradient-to-br from-indigo-400/30 to-indigo-700/20 text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.3)]',
  B: 'border-slate-400/45 bg-gradient-to-br from-slate-400/25 to-slate-700/30 text-slate-100',
  C: 'border-slate-500/40 bg-gradient-to-br from-slate-600/30 to-slate-900/40 text-slate-200',
}

const STAT_TYPE_STYLE: Record<
  CreatorStatType,
  { labelKey: string; frame: string; card: string; badge: string; text: string }
> = {
  sexy: {
    labelKey: 'creator.typeSexy',
    frame: 'border-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.45)]',
    card: '!border-2 !border-rose-400 hover:!border-rose-300 !shadow-[0_0_16px_rgba(244,63,94,0.5)]',
    badge: 'border-rose-400/55 bg-rose-500/30 text-rose-100',
    text: 'text-rose-200',
  },
  communication: {
    labelKey: 'creator.typeCommunication',
    frame: 'border-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.45)]',
    card: '!border-2 !border-cyan-400 hover:!border-cyan-300 !shadow-[0_0_16px_rgba(34,211,238,0.5)]',
    badge: 'border-cyan-400/55 bg-cyan-500/30 text-cyan-100',
    text: 'text-cyan-200',
  },
  elegance: {
    labelKey: 'creator.typeElegance',
    frame: 'border-violet-300 shadow-[0_0_18px_rgba(167,139,250,0.5)]',
    card: '!border-2 !border-violet-300 hover:!border-violet-200 !shadow-[0_0_16px_rgba(167,139,250,0.5)]',
    badge: 'border-violet-300/55 bg-violet-500/30 text-violet-100',
    text: 'text-violet-200',
  },
  performance: {
    labelKey: 'creator.typePerformance',
    frame: 'border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]',
    card: '!border-2 !border-amber-400 hover:!border-amber-300 !shadow-[0_0_16px_rgba(251,191,36,0.5)]',
    badge: 'border-amber-400/55 bg-amber-500/30 text-amber-100',
    text: 'text-amber-200',
  },
}

function typeStyleOf(raw?: string) {
  return STAT_TYPE_STYLE[normalizeCreatorStatType(raw)]
}

function GradeCornerBadge({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' }) {
  const style = GRADE_BADGE[grade] ?? GRADE_BADGE.C
  const sizeClass =
    size === 'sm'
      ? 'h-5 min-w-5 px-1 text-[9px]'
      : 'h-6 min-w-6 px-1.5 text-[10px] sm:h-7 sm:min-w-7 sm:text-[11px]'
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-black tracking-wide backdrop-blur-sm ${sizeClass} ${style}`}
    >
      {grade}
    </span>
  )
}

function parseSlotDragPayload(raw: string) {
  if (!raw.startsWith('slot:')) return null
  return raw.slice('slot:'.length) || null
}

interface SchedulePanelProps {
  slots: StudioSlot[]
  handCards: StudioHandCard[]
  onSlotsChange: (slots: StudioSlot[]) => void
  /** 영입 연출 중 — 해당 핸드 카드는 도착 전까지 숨김 */
  pendingHandCreatorId?: string | null
  /** 연출 직후 하이라이트 */
  spotlightCreatorId?: string | null
  /** 방송 중 — 배치 변경 불가 */
  placementLocked?: boolean
  registeredStaff?: RegisteredStaff[]
  managerState?: SlotManagerState
  onEquipStaff?: (slotId: string, kind: StaffKind, staffId: string) => void
  onUnequipStaff?: (slotId: string, kind: StaffKind) => void
  defaultStudioMode?: 'creator' | 'staff'
  defaultSelectedStaffId?: string | null
  onResetDefaultMode?: () => void
  /** 다음으로 해금 가능한 잠긴 슬롯 (등급·가격 조건 충족) — config+rank 있으면 무시되고 재계산 */
  unlockableSlotId?: string | null
  unlockPrice?: number | null
  /** 다음 슬롯이지만 방송국 등급 부족으로 잠긴 경우 */
  unlockGradeBlockedSlotId?: string | null
  unlockRequiredGradeLabel?: string | null
  assets?: number
  onUnlockSlot?: () => void
  /** 랭킹 순위 — 슬롯 해금 기업 등급 판정에 사용 */
  currentRank?: number
  stationGradeConfig?: StationGradeConfig
}

export function SchedulePanel({
  slots,
  handCards,
  onSlotsChange,
  pendingHandCreatorId = null,
  spotlightCreatorId = null,
  placementLocked = false,
  registeredStaff = [],
  managerState,
  onEquipStaff,
  onUnequipStaff,
  defaultStudioMode,
  defaultSelectedStaffId,
  onResetDefaultMode,
  unlockableSlotId = null,
  unlockPrice = null,
  unlockGradeBlockedSlotId = null,
  unlockRequiredGradeLabel = null,
  assets = 0,
  onUnlockSlot,
  currentRank,
  stationGradeConfig,
}: SchedulePanelProps) {
  const { t, locale } = useTranslation()
  const [studioMode, setStudioMode] = useState<'creator' | 'staff'>('creator')
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null)
  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null)
  const [draggingStaffId, setDraggingStaffId] = useState<string | null>(null)
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false)

  // 슬롯 해금은 랭킹 기업 등급으로 SchedulePanel에서 직접 판정 (부모 props와 어긋나도 안전)
  const unlockedSlotCount = countUnlockedSlots(slots)
  const nextLockedSlot = findNextUnlockableSlot(slots)
  const rankGateActive = currentRank != null && stationGradeConfig != null
  const rankMeetsUnlock =
    rankGateActive &&
    meetsSlotUnlockByRank(stationGradeConfig, currentRank, unlockedSlotCount)
  const resolvedUnlockableSlotId = rankGateActive
    ? rankMeetsUnlock
      ? (nextLockedSlot?.id ?? null)
      : null
    : unlockableSlotId
  const resolvedUnlockPrice = rankGateActive
    ? rankMeetsUnlock
      ? slotUnlockPriceOf(stationGradeConfig, unlockedSlotCount)
      : null
    : unlockPrice
  const resolvedGradeBlockedSlotId = rankGateActive
    ? !rankMeetsUnlock && unlockedSlotCount < 6
      ? (nextLockedSlot?.id ?? null)
      : null
    : unlockGradeBlockedSlotId
  const resolvedRequiredGradeLabel = rankGateActive
    ? !rankMeetsUnlock && unlockedSlotCount < 6
      ? (() => {
          const required = slotUnlockMinGradeOf(stationGradeConfig, unlockedSlotCount)
          return required ? t(companyTierLabelKey(required)) : null
        })()
      : null
    : unlockRequiredGradeLabel

  useEffect(() => {
    if (defaultStudioMode) {
      setStudioMode(defaultStudioMode)
      onResetDefaultMode?.()
    }
  }, [defaultStudioMode, onResetDefaultMode])

  useEffect(() => {
    if (defaultSelectedStaffId) {
      setSelectedStaffId(defaultSelectedStaffId)
      onResetDefaultMode?.()
    }
  }, [defaultSelectedStaffId, onResetDefaultMode])

  const hiredStaff = registeredStaff.filter((row) => managerState?.hiredStaffIds.includes(row.id))
  const placeableStaff = hiredStaff.filter(
    (row) => !managerState || !findSlotIdForStaff(managerState, row.id),
  )
  const placeableHandCards = handCards.filter(
    (card) => !slots.some((slot) => slot.assignment?.creatorId === card.id),
  )
  const staffMode = studioMode === 'staff'

  useEffect(() => {
    if (!placementLocked) return
    setSelectedCard(null)
    setSelectedStaffId(null)
    setDragOverSlotId(null)
    setDraggingSlotId(null)
    setDraggingStaffId(null)
  }, [placementLocked])

  function switchStudioMode(next: 'creator' | 'staff') {
    setStudioMode(next)
    setSelectedCard(null)
    setSelectedStaffId(null)
    setDragOverSlotId(null)
    setDraggingSlotId(null)
    setDraggingStaffId(null)
  }

  function assignToSlot(slotId: string) {
    if (staffMode || placementLocked) return
    if (!selectedCard) return
    const card = handCards.find((item) => item.id === selectedCard)
    if (!card) return
    if (!canBroadcastByStamina(card.stamina)) return
    onSlotsChange(assignCreatorToSlot(slots, slotId, card))
    setSelectedCard(null)
  }

  function clearSlot(slotId: string) {
    if (staffMode || placementLocked) return
    onSlotsChange(clearStudioSlot(slots, slotId))
  }

  function assignStaffToSlot(slotId: string, staffId: string) {
    if (placementLocked || !managerState || !onEquipStaff) return
    const staff = hiredStaff.find((row) => row.id === staffId)
    const slot = slots.find((row) => row.id === slotId)
    if (!staff || !slot || slot.status === 'locked') return
    onEquipStaff(slotId, staff.kind, staff.id)
    setSelectedStaffId(null)
  }

  function handleStaffDragStart(event: DragEvent, staffId: string) {
    if (placementLocked) {
      event.preventDefault()
      return
    }
    event.dataTransfer.setData(STAFF_DRAG_MIME, staffId)
    event.dataTransfer.setData('text/plain', staffId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingStaffId(staffId)
    setSelectedStaffId(staffId)
  }

  function handleStaffDragEnd() {
    setDraggingStaffId(null)
    setDragOverSlotId(null)
  }

  const canAffordUnlock =
    resolvedUnlockPrice != null &&
    Number.isFinite(resolvedUnlockPrice) &&
    assets >= resolvedUnlockPrice

  return (
    <>
    <div className="grid h-full min-h-0 w-full grid-cols-1 gap-2 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] lg:gap-2.5">
      {/* 왼쪽: Placement Bay — 슬롯은 카드(3:4) 비율 */}
      <section className="game-panel-strong relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.16),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-indigo-400/15 sm:inset-2" />

        <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-indigo-400/15 bg-black/25 px-3 py-2">
          <div className="min-w-0">
            <p className="game-kicker">{staffMode ? 'Staff Bay' : 'Placement Bay'}</p>
            <h2 className="truncate text-sm font-semibold tracking-wide text-slate-100">
              {staffMode ? t('studio.staffBayTitle') : 'Studio Slots'}
              <span className="ml-2 text-[11px] font-medium text-slate-500">
                {placementLocked
                  ? t('studio.placementLockedHint')
                  : staffMode
                    ? t('studio.staffBayHint')
                    : t('studio.dragHint')}
              </span>
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => switchStudioMode(staffMode ? 'creator' : 'staff')}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-black tracking-wide ${
                staffMode
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                  : 'border-indigo-400/40 bg-indigo-500/20 text-indigo-100'
              }`}
            >
              {staffMode ? t('studio.creatorPlace') : t('studio.staffManage')}
            </button>
            <div className="text-right">
              <p className="text-[10px] font-semibold tracking-wide text-slate-500">GRID</p>
              <p className="text-xs font-bold text-indigo-300">3 × 2</p>
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden p-2 sm:p-2.5">
          {/* size 컨테이너: 가용 영역에 맞춰 3×2 카드 그리드가 스크롤 없이 스케일 */}
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ containerType: 'size' }}
          >
            <div
              className="grid grid-cols-3 grid-rows-2 gap-1.5 sm:gap-2"
              style={{
                width: 'min(100cqw, calc(100cqh * 9 / 8))',
                aspectRatio: '9 / 8',
              }}
            >
            {slots.map((slot) => {
              const locked = slot.status === 'locked'
              const canUnlock =
                locked &&
                !placementLocked &&
                !staffMode &&
                resolvedUnlockableSlotId === slot.id &&
                resolvedUnlockPrice != null &&
                Boolean(onUnlockSlot)
              const gradeBlocked =
                locked &&
                !canUnlock &&
                resolvedGradeBlockedSlotId === slot.id &&
                Boolean(resolvedRequiredGradeLabel)
              const filled = slot.status === 'assigned' && Boolean(slot.assignment)
              const handForSlot = filled
                ? handCards.find((card) => card.id === slot.assignment!.creatorId)
                : undefined
              const needsRemove =
                Boolean(handForSlot) && !canBroadcastByStamina(handForSlot!.stamina)
              const typeStyle = filled
                ? typeStyleOf(slot.assignment?.statType ?? handForSlot?.statType)
                : null
              const canPlace = staffMode
                ? Boolean(selectedStaffId) && !locked && !placementLocked
                : Boolean(selectedCard) && !locked && !placementLocked
              const isDragSource = !staffMode && !placementLocked && draggingSlotId === slot.id
              const canDropFromSlot =
                !staffMode &&
                !placementLocked &&
                Boolean(draggingSlotId) &&
                draggingSlotId !== slot.id &&
                !locked
              const isDragOver = dragOverSlotId === slot.id && !isDragSource

              return (
                <div
                  key={slot.id}
                  className={`relative min-h-0 min-w-0 rounded-lg border p-0.5 transition sm:rounded-xl sm:p-1 ${
                    placementLocked
                      ? filled
                        ? needsRemove
                          ? 'border-rose-400/55 bg-rose-950/25'
                          : `${typeStyle?.frame ?? 'border-white/12'} bg-black/30`
                        : locked
                          ? 'border-rose-950/30 bg-slate-950/80 opacity-40'
                          : 'border-dashed border-indigo-500/20 bg-indigo-950/5 opacity-80'
                      : canUnlock
                        ? 'border-dashed border-emerald-400/45 bg-emerald-950/15 shadow-[0_0_14px_rgba(16,185,129,0.18)] hover:border-emerald-300/60'
                        : locked
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
                                    ? needsRemove
                                      ? 'studio-slot-needs-remove border-rose-400/70 bg-rose-950/30 shadow-[0_0_16px_rgba(244,63,94,0.28)]'
                                      : `${typeStyle?.frame ?? 'border-white/12'} bg-black/30`
                                    : 'border-dashed border-indigo-500/25 bg-indigo-950/5 shadow-[0_0_10px_rgba(99,102,241,0.03)] hover:border-indigo-400/50 hover:bg-indigo-500/5 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  }`}
                  onDragOver={(e) => {
                    if (placementLocked || locked) return
                    if (!staffMode && draggingSlotId === slot.id) return
                    if (staffMode && !draggingStaffId && !e.dataTransfer.types.includes(STAFF_DRAG_MIME)) {
                      return
                    }
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
                    if (placementLocked || locked) return
                    e.preventDefault()
                    if (staffMode) {
                      const staffId =
                        draggingStaffId ||
                        e.dataTransfer.getData(STAFF_DRAG_MIME) ||
                        e.dataTransfer.getData('text/plain')
                      setDragOverSlotId(null)
                      setDraggingStaffId(null)
                      if (staffId) assignStaffToSlot(slot.id, staffId)
                      return
                    }
                    const sourceSlotId =
                      draggingSlotId ||
                      e.dataTransfer.getData(SLOT_DRAG_MIME) ||
                      parseSlotDragPayload(e.dataTransfer.getData('text/plain'))
                    setDragOverSlotId(null)
                    setDraggingSlotId(null)

                    if (sourceSlotId) {
                      onSlotsChange(moveCreatorBetweenSlots(slots, sourceSlotId, slot.id))
                      return
                    }

                    const cardId = e.dataTransfer.getData('text/plain')
                    if (!cardId || cardId.startsWith('slot:')) return
                    const card = handCards.find((item) => item.id === cardId)
                    if (!card || !canBroadcastByStamina(card.stamina)) return
                    onSlotsChange(assignCreatorToSlot(slots, slot.id, card))
                  }}
                >
                  <button
                    type="button"
                    disabled={(locked && !canUnlock) || (placementLocked && !canUnlock)}
                    draggable={!staffMode && filled && !placementLocked}
                    onDragStart={(e) => {
                      if (staffMode || placementLocked || !filled || !slot.assignment) {
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
                      setDraggingStaffId(null)
                      setDragOverSlotId(null)
                    }}
                    onClick={() => {
                      if (canUnlock && resolvedUnlockPrice != null && onUnlockSlot) {
                        setUnlockConfirmOpen(true)
                        return
                      }
                      if (locked || placementLocked) return
                      if (staffMode) {
                        if (selectedStaffId) assignStaffToSlot(slot.id, selectedStaffId)
                        return
                      }
                      if (selectedCard) {
                        assignToSlot(slot.id)
                        return
                      }

                      if (!filled) {
                        const unassignedCard = handCards.find(
                          (card) =>
                            canBroadcastByStamina(card.stamina) &&
                            !slots.some((s) => s.assignment?.creatorId === card.id),
                        )
                        if (unassignedCard) {
                          setSelectedCard(unassignedCard.id)
                        }
                      } else {
                        clearSlot(slot.id)
                      }
                    }}
                    className={`game-card relative h-full w-full min-h-0 text-left transition ${
                      canUnlock
                        ? 'cursor-pointer border-emerald-400/40 hover:border-emerald-300/60'
                        : locked
                          ? 'cursor-default border-rose-950/30'
                          : placementLocked
                            ? `cursor-not-allowed ${staffMode ? '' : typeStyle?.card ?? 'border-rose-950/30'}`
                            : staffMode
                              ? canPlace
                                ? 'hover:border-indigo-400/55 hover:ring-1 hover:ring-indigo-400/35'
                                : 'hover:border-indigo-400/40'
                              : filled
                                ? `cursor-grab active:cursor-grabbing ${typeStyle?.card ?? 'hover:border-white/20'}`
                                : canPlace
                                  ? 'hover:border-indigo-400/55 hover:ring-1 hover:ring-indigo-400/35'
                                  : 'border-dashed border-indigo-500/30 hover:border-indigo-400/60 hover:bg-indigo-500/5'
                    }`}
                  >
                    <div className="relative flex h-full min-h-0 flex-col">
                      {staffMode && !locked && managerState ? (
                        <StaffSlotFace
                          slotId={slot.id}
                          slotLabel={slot.label}
                          managerState={managerState}
                          registeredStaff={registeredStaff}
                          placementLocked={placementLocked}
                          selectedStaffId={selectedStaffId}
                          onPlaceSelected={() => {
                            if (selectedStaffId) assignStaffToSlot(slot.id, selectedStaffId)
                          }}
                          onUnequip={(kind) => onUnequipStaff?.(slot.id, kind)}
                        />
                      ) : (
                      <>
                      <div className="absolute top-1 right-1 left-1 z-10 flex items-start justify-between gap-1">
                        {filled && slot.assignment ? (
                          <GradeCornerBadge grade={slot.assignment.grade} />
                        ) : (
                          <span className="rounded-md border border-white/10 bg-black/50 px-1 py-0.5 text-[8px] font-bold tracking-[0.1em] text-slate-300 backdrop-blur-sm">
                            {slot.label.replace('SLOT ', '')}
                          </span>
                        )}
                        {locked ? null : filled ? (
                          needsRemove ? (
                            <span className="studio-slot-remove-badge rounded-md border border-rose-300/50 bg-rose-500/90 px-1 py-0.5 text-[8px] font-black tracking-wide text-white shadow-[0_0_10px_rgba(244,63,94,0.55)]">
                              {t('studio.removeFromSlot')}
                            </span>
                          ) : (
                            <span className="rounded-md border border-emerald-400/30 bg-emerald-500/20 px-1 py-0.5 text-[8px] font-bold text-emerald-200">
                              {t('dashboard.studioPlaced')}
                            </span>
                          )
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
                              className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-top ${
                                needsRemove ? 'brightness-75 saturate-50' : ''
                              }`}
                            />
                            <div
                              className={`absolute inset-0 bg-gradient-to-t ${
                                needsRemove
                                  ? 'from-rose-950/95 via-rose-950/45 to-rose-900/20'
                                  : 'from-black/95 via-black/40 to-transparent'
                              }`}
                            />
                          </>
                        )}

                        {needsRemove ? (
                          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-rose-950/35 px-1.5 text-center backdrop-blur-[1px]">
                            <span className="studio-slot-remove-pulse rounded-full border border-rose-300/45 bg-rose-500/85 px-2 py-0.5 text-[9px] font-black tracking-wider text-white shadow-[0_0_14px_rgba(244,63,94,0.55)] sm:text-[10px]">
                              {t('studio.removeFromSlot')}
                            </span>
                            <span className="text-[8px] font-bold text-rose-100/95 sm:text-[9px]">
                              {t('studio.removeFromSlotHint')}
                            </span>
                          </div>
                        ) : null}

                        <div
                          className={`relative z-10 flex w-full flex-col items-center px-1.5 ${
                            locked ? 'pb-2' : 'pb-8'
                          } pt-6 ${
                            locked || !slot.assignment?.profileImageUrl
                              ? `h-full bg-gradient-to-b ${
                                  locked
                                    ? 'from-slate-950 via-slate-950 to-rose-950/10 justify-center'
                                    : filled
                                      ? 'from-slate-700/70 to-slate-950 justify-end'
                                      : 'from-slate-800/40 to-slate-950 justify-end'
                                }`
                              : 'justify-end'
                          }`}
                        >
                          {locked ? (
                            <>
                              <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
                                {canUnlock ? (
                                  <>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/45 bg-emerald-500/15 text-lg font-black text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)] sm:h-9.5 sm:w-9.5">
                                      ＋
                                    </div>
                                    <p className="text-[9px] font-bold tracking-wide text-emerald-300/90 uppercase sm:text-[10px]">
                                      {formatMoney(resolvedUnlockPrice ?? 0)}
                                    </p>
                                  </>
                                ) : gradeBlocked ? (
                                  <>
                                    <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/15 text-amber-300/80 sm:h-9.5 sm:w-9.5">
                                      <IconLockTiny />
                                    </div>
                                    <p className="px-1 text-center text-[8px] font-bold leading-tight tracking-wide text-amber-200/90 sm:text-[9px]">
                                      {resolvedRequiredGradeLabel}
                                    </p>
                                    <p className="text-[8px] font-semibold text-amber-500/70 sm:text-[9px]">
                                      {t('studio.gradeRequired')}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/30 text-rose-500/60 sm:h-9.5 sm:w-9.5">
                                      <IconLockTiny />
                                    </div>
                                    <p className="text-[9px] font-bold tracking-wide text-rose-600/70 uppercase sm:text-[10px]">
                                      {t('dashboard.lockedChannel')}
                                    </p>
                                  </>
                                )}
                              </div>
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
                              {typeStyle ? (
                                <p
                                  className={`mt-0.5 w-full truncate text-center text-[8px] font-bold tracking-wide sm:text-[9px] ${typeStyle.text}`}
                                >
                                  {t(typeStyle.labelKey)}
                                </p>
                              ) : null}
                              {handForSlot ? (
                                <div className="mt-1 w-full">
                                  <div className="mb-0.5 flex items-center justify-between gap-1">
                                    <span className="truncate text-[8px] font-semibold tracking-wide text-slate-300">
                                      Stamina
                                    </span>
                                    <span className="shrink-0 text-[8px] font-bold tabular-nums text-slate-100">
                                      {handForSlot.stamina}
                                    </span>
                                  </div>
                                  <div className="h-1 overflow-hidden rounded-full bg-black/50">
                                    <div
                                      className={`h-full rounded-full ${
                                        canBroadcastByStamina(handForSlot.stamina)
                                          ? 'bg-cyan-400'
                                          : 'bg-rose-400'
                                      }`}
                                      style={{
                                        width: `${Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            (handForSlot.stamina /
                                              Math.max(1, handForSlot.staminaMax)) *
                                              100,
                                          ),
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <div
                                className="mb-2 flex h-8 w-8 animate-bounce items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/10 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)] sm:h-9.5 sm:w-9.5"
                                style={{ animationDuration: '2.5s' }}
                              >
                                ＋
                              </div>
                              <p className="animate-pulse text-[9px] font-bold tracking-wider text-indigo-300 sm:text-[10px]">
                                {t('dashboard.standby')}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      </>
                      )}
                    </div>
                  </button>
                    {staffMode || locked || !managerState ? null : (
                      <div className="absolute inset-x-1 bottom-1 z-20 flex items-center justify-center rounded-md bg-black/55 px-1 py-0.5 backdrop-blur-sm">
                        <StaffSlotIcons
                          slotId={slot.id}
                          managerState={managerState}
                          registeredStaff={registeredStaff}
                          size="sm"
                        />
                      </div>
                    )}
                </div>
              )
            })}
            </div>
          </div>
        </div>
      </section>

      {/* 오른쪽: 배치할 크리에이터 / 매니저 */}
      <section
        data-studio-hand-target
        className="game-panel flex min-h-0 min-w-0 flex-col rounded-2xl p-2.5 sm:p-3"
      >
        <div className="mb-2.5 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-slate-400">
                {staffMode
                  ? t('studio.managerHandTitle')
                  : t('studio.placementTitle')}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                {staffMode
                  ? placementLocked
                    ? t('studio.managerHandLockedDesc')
                    : t('studio.managerHandDesc')
                  : placementLocked
                    ? t('studio.placementLockedDesc')
                    : t('studio.placementDesc')}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
          {staffMode ? (
            placeableStaff.length === 0 ? (
              <div className="flex h-full min-h-[8rem] items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-3">
                <p className="text-center text-[10px] leading-relaxed text-slate-500">
                  {t(hiredStaff.length === 0 ? 'studio.noManagers' : 'studio.noIdleManagers')}
                </p>
              </div>
            ) : (
              <div data-studio-staff-bay-target className="grid grid-cols-2 content-start items-start gap-2">
                {placeableStaff.map((staff) => (
                  <StaffHandCard
                    key={staff.id}
                    staff={staff}
                    locale={locale}
                    selected={selectedStaffId === staff.id}
                    dragging={draggingStaffId === staff.id}
                    placementLocked={placementLocked}
                    onSelect={() =>
                      setSelectedStaffId((prev) => (prev === staff.id ? null : staff.id))
                    }
                    onDragStart={(event) => handleStaffDragStart(event, staff.id)}
                    onDragEnd={handleStaffDragEnd}
                  />
                ))}
              </div>
            )
          ) : placeableHandCards.length === 0 ? (
            <div className="flex h-full min-h-[8rem] items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-3">
              <p className="text-center text-[10px] leading-relaxed text-slate-500">
                {t(handCards.length === 0 ? 'studio.noCreators' : 'studio.noIdleCreators')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 content-start items-start gap-2">
              {placeableHandCards.map((card) => {
                const isSelected = selectedCard === card.id
                const isPending = pendingHandCreatorId === card.id
                const isSpotlight = spotlightCreatorId === card.id
                const blocked = !canBroadcastByStamina(card.stamina)
                const typeStyle = typeStyleOf(card.statType)
                const staminaPct = Math.max(
                  0,
                  Math.min(100, (card.stamina / Math.max(1, card.staminaMax)) * 100),
                )
                return (
                  <button
                    key={card.id}
                    type="button"
                    data-studio-hand-card={card.id}
                    draggable={!isPending && !blocked && !placementLocked}
                    onDragStart={(e) => {
                      if (isPending || blocked || placementLocked) {
                        e.preventDefault()
                        return
                      }
                      e.dataTransfer.setData('text/plain', card.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDraggingSlotId(null)
                    }}
                    onClick={() => {
                      if (isPending || blocked || placementLocked) return
                      setSelectedCard((prev) => (prev === card.id ? null : card.id))
                    }}
                    className={`game-card relative aspect-[3/4] w-full self-start text-left transition-all duration-500 ${
                      isPending
                        ? 'pointer-events-none scale-75 opacity-0'
                        : blocked || placementLocked
                          ? 'cursor-not-allowed opacity-45'
                          : 'cursor-grab active:cursor-grabbing'
                    } ${
                      isPending
                        ? ''
                        : isSpotlight
                          ? `${typeStyle.card} ring-2 ring-indigo-400/50 scale-[1.03] z-10`
                          : isSelected && !placementLocked
                            ? `${typeStyle.card} ring-2 ring-indigo-400/40 scale-[1.02] animate-pulse z-10`
                            : blocked
                              ? 'border-rose-400/30'
                              : `${typeStyle.card} hover:scale-[1.01]`
                    }`}
                  >
                    <div className="relative flex h-full w-full flex-col items-center justify-end overflow-hidden rounded-md">
                      {card.profileImageUrl && (
                        <>
                          <img
                            src={card.profileImageUrl}
                            alt=""
                            draggable={false}
                            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />
                        </>
                      )}

                      {blocked ? (
                        <span className="absolute top-1 right-1 z-20 rounded border border-rose-400/40 bg-rose-500/20 px-1 py-0.5 text-[7px] font-bold text-rose-200">
                          REST
                        </span>
                      ) : null}

                      <div className="absolute top-1 left-1 z-20">
                        <GradeCornerBadge grade={card.grade} size="sm" />
                      </div>

                      <div
                        className={`relative z-10 flex w-full flex-col justify-end gap-1 px-1.5 pb-1.5 pt-4 ${
                          !card.profileImageUrl
                            ? 'h-full justify-end bg-gradient-to-b from-slate-700/70 to-slate-950'
                            : ''
                        }`}
                      >
                        {!card.profileImageUrl && (
                          <div className="mb-auto flex h-8 w-8 items-center justify-center self-center rounded-full border border-indigo-300/25 bg-indigo-500/10 text-xs font-bold text-indigo-50">
                            {card.name.slice(0, 1)}
                          </div>
                        )}
                        {blocked ? (
                          <p className="truncate text-center text-[8px] font-bold text-rose-300">
                            {t('dashboard.broadcastBlocked')}
                          </p>
                        ) : null}
                        <p
                          className={`truncate text-center text-[8px] font-bold tracking-wide ${typeStyle.text}`}
                        >
                          {t(typeStyle.labelKey)}
                        </p>
                        <HandStatRow
                          label="Stamina"
                          value={`${card.stamina}`}
                          percent={staminaPct}
                          barClass={blocked ? 'bg-rose-400' : 'bg-cyan-400'}
                        />
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
    {unlockConfirmOpen && resolvedUnlockPrice != null ? (
      <UnlockSlotModal
        price={resolvedUnlockPrice}
        canAfford={canAffordUnlock}
        onCancel={() => setUnlockConfirmOpen(false)}
        onConfirm={() => {
          setUnlockConfirmOpen(false)
          onUnlockSlot?.()
        }}
      />
    ) : null}
    </>
  )
}

function HandStatRow({
  label,
  icon,
  value,
  percent,
  barClass,
}: {
  label: string
  icon?: string
  value: string
  percent: number
  barClass: string
}) {
  const width = Math.max(0, Math.min(100, percent))
  return (
    <div className="w-full">
      <div className="mb-0.5 flex items-center justify-between gap-1">
        <span className="truncate text-[8px] font-semibold tracking-wide text-slate-300">
          {icon ? <span className="mr-0.5">{icon}</span> : null}
          {label}
        </span>
        <span className="shrink-0 text-[8px] font-bold tabular-nums text-slate-100">{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-black/50">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function StaffSlotFace({
  slotId,
  slotLabel,
  managerState,
  registeredStaff,
  placementLocked,
  selectedStaffId,
  onPlaceSelected,
  onUnequip,
}: {
  slotId: string
  slotLabel: string
  managerState: SlotManagerState
  registeredStaff: RegisteredStaff[]
  placementLocked: boolean
  selectedStaffId: string | null
  onPlaceSelected: () => void
  onUnequip: (kind: StaffKind) => void
}) {
  const { t, locale } = useTranslation()
  const selectedStaff = selectedStaffId
    ? registeredStaff.find((row) => row.id === selectedStaffId) ?? null
    : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="absolute top-1 right-1 left-1 z-10 flex items-start justify-between gap-1">
        <span className="rounded-md border border-white/10 bg-black/50 px-1 py-0.5 text-[8px] font-bold tracking-[0.1em] text-slate-300 backdrop-blur-sm">
          {slotLabel.replace('SLOT ', '')}
        </span>
        <span className="rounded-md border border-indigo-400/25 bg-indigo-500/10 px-1 py-0.5 text-[8px] font-bold text-indigo-300">
          {t('studio.managersTitle')}
        </span>
      </div>
      <div data-studio-staff-target className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-1 p-1 pt-6">
        {STAFF_SLOT_KINDS.map((kind) => {
          const equippedId = managerState.equippedBySlotId[slotId]?.[kind] ?? null
          const staff = equippedId
            ? registeredStaff.find((row) => row.id === equippedId) ?? null
            : null
          const icon = staffIconUrl(staff)
          const card = staffCardUrl(staff)
          const image = icon || card
          const canReceive = Boolean(selectedStaff && selectedStaff.kind === kind)
          const displayName = staffDisplayName(staff, locale)
          return (
            <button
              key={kind}
              type="button"
              disabled={placementLocked}
              onClick={(event) => {
                event.stopPropagation()
                if (placementLocked) return
                if (staff) {
                  onUnequip(kind)
                  return
                }
                if (selectedStaffId) onPlaceSelected()
              }}
              className={`relative min-h-0 overflow-hidden rounded-md border text-left transition ${
                staff
                  ? KIND_TONE[kind]
                  : canReceive
                    ? 'border-indigo-400/80 bg-indigo-500/15 shadow-[0_0_10px_rgba(99,102,241,0.35)]'
                    : 'border-dashed border-white/15 bg-black/25 text-slate-500'
              } ${placementLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {image ? (
                <img
                  src={resolveMediaSrc(image, staff?.mediaRevision)}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div
                className={`absolute inset-0 ${
                  image ? 'bg-gradient-to-t from-black/85 via-black/25 to-black/10' : ''
                }`}
              />
              {staff ? (
                <div className="relative z-10 flex h-full flex-col justify-between p-1">
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-md border ${KIND_TONE[kind]}`}
                  >
                    <StaffKindIcon kind={kind} className="h-2.5 w-2.5" />
                  </span>
                  <p className="truncate text-[8px] font-bold text-slate-100">{displayName}</p>
                </div>
              ) : (
                <div className="relative z-10 flex h-full flex-col items-center justify-center gap-1 p-1">
                  <StaffKindIcon
                    kind={kind}
                    className={`h-6 w-6 ${canReceive ? 'text-indigo-200' : 'text-slate-500'}`}
                  />
                  <p
                    className={`truncate text-[8px] font-bold ${
                      canReceive ? 'text-indigo-300' : 'text-slate-400'
                    }`}
                  >
                    {t(STAFF_KIND_LABEL_KEY[kind])}
                  </p>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StaffHandCard({
  staff,
  locale,
  assignedSlotLabel,
  selected = false,
  dragging = false,
  hireable = false,
  assets = 0,
  placementLocked,
  onSelect,
  onHire,
  onDragStart,
  onDragEnd,
}: {
  staff: RegisteredStaff
  locale: Locale
  assignedSlotLabel?: string
  selected?: boolean
  dragging?: boolean
  hireable?: boolean
  assets?: number
  placementLocked: boolean
  onSelect?: () => void
  onHire?: () => boolean | void
  onDragStart?: (event: DragEvent) => void
  onDragEnd?: () => void
}) {
  const { t } = useTranslation()
  const card = staffCardUrl(staff)
  const displayName = staffDisplayName(staff, locale)
  const canHire = assets >= STAFF_HIRE_COST

  return (
    <button
      type="button"
      data-studio-staff-bay-card={staff.id}
      draggable={!hireable && !placementLocked}
      onDragStart={(event) => {
        if (hireable || placementLocked) {
          event.preventDefault()
          return
        }
        onDragStart?.(event)
      }}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (hireable) {
          if (!placementLocked && canHire) onHire?.()
          return
        }
        if (!placementLocked) onSelect?.()
      }}
      className={`game-card relative aspect-[3/4] w-full self-start text-left transition-all ${
        hireable
          ? placementLocked || !canHire
            ? 'cursor-not-allowed opacity-55'
            : 'cursor-pointer hover:scale-[1.01]'
          : placementLocked
            ? 'cursor-not-allowed'
            : 'cursor-grab active:cursor-grabbing'
      } ${
        selected && !hireable
          ? 'border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.25)] ring-2 ring-cyan-400/40 scale-[1.02]'
          : hireable
            ? 'border-dashed border-white/20'
            : 'border-white/10 hover:border-white/25'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="relative flex h-full w-full flex-col items-center justify-end overflow-hidden rounded-md">
        {card ? (
          <>
            <img
              src={resolveMediaSrc(card, staff.mediaRevision)}
              alt=""
              draggable={false}
              className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-top ${
                assignedSlotLabel ? 'brightness-[0.55] saturate-[0.7]' : ''
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-700/70 to-slate-950" />
        )}

        <div className="absolute top-1 left-1 z-20">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-md border ${KIND_TONE[staff.kind]}`}
          >
            <StaffKindIcon kind={staff.kind} className="h-3 w-3" />
          </span>
        </div>

        {assignedSlotLabel ? (
          <span className="absolute top-1 right-1 z-20 rounded border border-slate-400/40 bg-black/75 px-1 py-0.5 text-[7px] font-bold text-slate-200">
            IN
          </span>
        ) : hireable ? (
          <span className="absolute top-1 right-1 z-20 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 text-[7px] font-bold text-indigo-100">
            {t('studio.managerHire')}
          </span>
        ) : null}

        <div className="relative z-10 flex w-full flex-col justify-end gap-1 px-1.5 pb-1.5 pt-4">
          {!card ? (
            <div className="mb-auto flex h-8 w-8 items-center justify-center self-center rounded-full border border-indigo-300/25 bg-indigo-500/10 text-xs font-bold text-indigo-50">
              {displayName.slice(0, 1)}
            </div>
          ) : null}
          <p className="truncate text-center text-[10px] font-semibold text-slate-100">{displayName}</p>
          <p className="truncate text-center text-[8px] font-bold tracking-wide text-indigo-200">
            {t(STAFF_KIND_LABEL_KEY[staff.kind])}
          </p>
          {hireable ? (
            <p
              className={`truncate text-center text-[8px] font-black tabular-nums ${
                canHire ? 'text-emerald-200' : 'text-rose-300'
              }`}
            >
              ${STAFF_HIRE_COST.toLocaleString()}
            </p>
          ) : assignedSlotLabel ? (
            <span className="mx-auto inline-flex max-w-full truncate rounded-md border border-indigo-400/30 bg-indigo-500/15 px-1.5 py-0.5 text-[8px] font-black text-indigo-100">
              {assignedSlotLabel}
            </span>
          ) : (
            <p className="truncate text-center text-[8px] font-semibold text-slate-400">
              {t(STAFF_GENDER_LABEL_KEY[staff.gender])}
            </p>
          )}
        </div>
      </div>
    </button>
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
