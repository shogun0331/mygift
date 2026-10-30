import { useEffect, useMemo, useState, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  findCharacterIconUrl,
  findCharacterLevelThumbnailUrl,
  findCharacterProfileUrl,
  normalizeCreatorStatType,
  type CreatorStatType,
  type Grade,
  type OwnedCreator,
  type RegisteredCharacter,
} from '../game/characters'
import {
  canHireScoutOffer,
  type ScoutOffer,
  type ScoutSystemState,
} from '../game/scout'
import {
  calcConditionFullCareCost,
  calcVacationCost,
  canBroadcastByStamina,
  isStaminaDepleted,
  CONDITION_ICON,
  CONDITION_LABEL_KEY,
  conditionFromScore,
  scoreOf,
} from '../game/condition'
import { formatMoney, formatMoneySigned } from '../game/money'
import { calcMonthRevenueWon } from '../game/economy'
import { isPromotionExamReady } from '../game/promotionExam'
import {
  TRAINING_MAIN_GAIN,
  TRAINING_OFF_GAIN,
  calcPromotionExamCost,
  calcTrainingCost,
  canTrainCreator,
  getRequiredTrainingTurns,
  mainStatValueOf,
  nextGradeBreak,
} from '../game/training'
import {
  characterDisplayJob,
  characterDisplayName,
} from '../game/characterLocales'
import { isHUnlocked } from '../game/social'
import { useTranslation } from '../locales/i18n'
import {
  maxScoutCreatorsForGrade,
  type StationGrade,
  type StationGradeConfig,
} from '../game/stationGradeConfig'
import { SnsFeedModal } from './SnsFeedModal'
import { RedDot } from './RedDot'
import { SnsBulkComposeModal } from './SnsBulkComposeModal'
import { SnsBulkPostRevealModal } from './SnsBulkPostRevealModal'
import {
  previewBulkSnsCompose,
  canComposeSnsCreator,
  canAffordBulkSnsCompose,
  type BulkSnsComposePlan,
  type BulkSnsRevealEntry,
  type BulkSnsComposeResult,
  type SnsComposeRoll,
  type SnsHeat,
} from '../game/sns'
import type { RegisteredStaff, StaffKind } from '../game/staff'
import { STAFF_KINDS, staffDisplayName, staffIconUrl, staffCardUrl, STAFF_KIND_LABEL_KEY } from '../game/staff'
import type { SlotManagerState } from '../game/slotManagers'
import { findSlotIdForStaff, staffOfferBase } from '../game/slotManagers'
import { KIND_TONE, StaffKindIcon } from './StaffManagerUi'
import { resolveMediaSrc } from '../game/mediaUrl'
import type { ScoutedStaffCandidate } from '../game/characters'
import type { StudioSlot } from '../game/studioSlots'
import { isStatTutorialStep, type TutorialStep } from '../components/TutorialGuideOverlay'
import { HUD_UI_ASSETS } from '../ui/hudAssets'
import {
  GradePlate,
  STAT_TYPE_CHIP_TONE,
  STAT_TYPE_LABEL_KEY,
  TypeStatIcon,
} from '../ui/creatorMarks'

type CreatorPanelProps = {
  companyViewers?: number
  ownedCreators: OwnedCreator[]
  registeredCharacters: RegisteredCharacter[]
  scoutState: ScoutSystemState
  assets: number
  broadcastMonthNumber: number
  stationGrade: StationGrade
  stationGradeConfig?: StationGradeConfig
  tutorialStep?: TutorialStep | null
  onTutorialStepChange?: (step: TutorialStep | null) => void
  /** 명세서 종료 후 스카우트 강제 오픈 */
  openScout?: boolean
  onScoutClosed?: () => void
  /** 스탭 영입 제안 대기 중일 때 탭 레드닷 액션으로 강제 오픈 */
  openStaffScout?: boolean
  onStaffScoutClosed?: () => void
  onScoutViewed: () => void
  onScoutPass: () => void
  onScoutHire: (offer: ScoutOffer) => void
  onConditionCare: (creatorId: string) => void
  onVacation: (creatorId: string) => void
  onProductionTraining: (creatorId: string) => void
  onSnsCompose: (creatorId: string, roll: SnsComposeRoll) => SnsHeat | null
  onBulkSnsCompose: (plan: BulkSnsComposePlan) => BulkSnsRevealEntry[] | BulkSnsComposeResult
  onBulkRevealDone?: () => void
  registeredStaff: RegisteredStaff[]
  managerState: SlotManagerState
  onHireStaff: (staffId: string, hireCost: number, salary: number) => boolean
  onStaffScoutPass: () => void
  hiredStaffSalaries: Record<string, number>
  hiredStaffStartMonths: Record<string, number>
  staffScoutAvailable: boolean
  scoutedStaffCandidate: ScoutedStaffCandidate | null
  onScoutStaff: () => void
  creatorScoutAvailable: boolean
  onScoutCreator: () => void
  studioSlots: StudioSlot[]
  onAssignStaffPlacement: (staffId: string) => void
  onHDirect?: (creatorId: string) => void
  lastHActionMonth?: number
  onSelectSkin?: (creatorId: string, skin: 1 | 2 | 3) => void
  stationRank?: number
  onConfess?: (creatorId: string) => void
}

function StatTypeIcon({
  type,
  label,
  showLabel = false,
  size = 'md',
}: {
  type: CreatorStatType
  label: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  const chip = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-1 py-0.5 ${STAT_TYPE_CHIP_TONE[type]}`}
    >
      <TypeStatIcon type={type} className={dim} />
      {showLabel ? (
        <span className="pr-1 text-[10px] font-bold tracking-wide text-slate-200">{label}</span>
      ) : null}
    </span>
  )
  return (
    <HoverTip text={label}>
      <span tabIndex={0} aria-label={label} className="inline-flex cursor-help outline-none">
        {chip}
      </span>
    </HoverTip>
  )
}

type CreatorMarkKind = 'promo' | 'hVip' | 'posted'

function CreatorMark({ kind, label }: { kind: CreatorMarkKind; label: string }) {
  const tone =
    kind === 'promo'
      ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
      : kind === 'hVip'
        ? 'border-pink-500/40 bg-pink-500/10 text-pink-300'
        : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
  return (
    <HoverTip text={label}>
      <span
        tabIndex={0}
        aria-label={label}
        className={`inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${tone}`}
      >
        {kind === 'promo' ? (
          <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
            <path d="M6 1.5L10.5 8.5H1.5L6 1.5z" />
          </svg>
        ) : kind === 'hVip' ? (
          <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
            <path d="M6 10.2S1.8 7.4 1.8 4.6A2.2 2.2 0 0 1 6 3.4a2.2 2.2 0 0 1 4.2 1.2C10.2 7.4 6 10.2 6 10.2z" />
          </svg>
        ) : (
          <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2.5 6.2l2.4 2.4 4.6-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </HoverTip>
  )
}

function StudioAssignIcon({ assigned, label }: { assigned: boolean; label: string }) {
  if (!assigned) {
    return <span className="text-slate-600 text-xs font-semibold">-</span>
  }
  return (
    <span
      title={label}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.35)]"
    >
      <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="2" y="4.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 4.5l1-2h3l1 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function HeaderGlyph({ kind }: { kind: 'bolt' | 'coin' | 'fan' | 'up' }) {
  if (kind === 'coin') {
    return <img src={HUD_UI_ASSETS.coin} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
  }
  if (kind === 'fan') {
    return <img src={HUD_UI_ASSETS.fan} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
  }
  if (kind === 'up') {
    return (
      <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
        <path d="M6 2L10 7H7.5v3h-3V7H2L6 2z" />
      </svg>
    )
  }
  return (
    <svg className="h-3 w-3 text-cyan-400" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M6.8 1L3 7h2.6L5 11l4.2-7H6.8L8.2 1H6.8z" />
    </svg>
  )
}

function PhoneGlyph({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="4" y="1.5" width="8" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 12.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function DetailGlyph({
  kind,
  className = 'h-3.5 w-3.5',
}: {
  kind: 'heart' | 'pulse' | 'care' | 'vacation' | 'hLove' | 'calendar' | 'trophy'
  className?: string
}) {
  if (kind === 'heart') {
    return (
      <svg className={`${className} text-pink-400`} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 13.2S2.8 9.8 2.8 6.2A2.9 2.9 0 0 1 8 4.6a2.9 2.9 0 0 1 5.2 1.6C13.2 9.8 8 13.2 8 13.2z" />
      </svg>
    )
  }
  if (kind === 'pulse') {
    return (
      <svg className={`${className} text-emerald-400`} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M1.5 8h2.2l1.3-3.2L7.5 12l2-5.5L11 8h3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (kind === 'care') {
    return (
      <svg className={`${className} text-slate-200`} viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'vacation') {
    return (
      <svg className={`${className} text-amber-300`} viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M8 2.2v1.4M8 12.4v1.4M2.2 8h1.4M12.4 8h1.4M3.9 3.9l1 1M11.1 11.1l1 1M12.1 3.9l-1 1M4.9 11.1l-1 1"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (kind === 'hLove') {
    return (
      <svg className={`${className} text-pink-300`} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M5.2 11.5S1.8 9.2 1.8 6.8A2 2 0 0 1 5.2 5.6a2 2 0 0 1 3.4 1.2C8.6 9.2 5.2 11.5 5.2 11.5z" />
        <path d="M10.8 12.2S7.8 10.2 7.8 8.1A1.7 1.7 0 0 1 10.8 7a1.7 1.7 0 0 1 3 1.1c0 2.1-3 4.1-3 4.1z" opacity="0.85" />
      </svg>
    )
  }
  if (kind === 'calendar') {
    return (
      <svg className={`${className} text-slate-400`} viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg className={`${className} text-amber-300`} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4.5 12.5h7v-1.2l-1.4-1V7.2A2.1 2.1 0 0 0 8.8 5.2V4.8a.8.8 0 1 0-1.6 0v.4A2.1 2.1 0 0 0 5.9 7.2v3.1l-1.4 1v1.2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.2 12.5v.8a1.8 1.8 0 0 0 3.6 0v-.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

const STAT_VALUE_LABEL_KEY: Record<CreatorStatType, string> = {
  sexy: 'creator.statSexy',
  communication: 'creator.statCommunication',
  mental: 'creator.statMental',
  performance: 'creator.statPerformance',
}

function formatSalary(value: number) {
  return formatMoney(value)
}

const STAFF_ROLE_EFFECT_KEY: Record<StaffKind, string> = {
  security: 'staff.dutySecurityBonus',
  repair: 'staff.dutyRepairBonus',
  care: 'staff.dutyCareBonus',
  production: 'staff.dutyProductionBonus',
}

function staffRoleTooltip(
  t: (key: string) => string,
  kind: StaffKind,
  grade: string,
  salary?: number,
) {
  const base = staffOfferBase(grade)
  const annual = salary ?? base.salary
  const cost = t(salary != null ? 'staff.roleCostHired' : 'staff.roleCost')
    .replace('{hire}', formatMoney(base.hire))
    .replace('{salary}', formatMoney(annual))
    .replace('{monthly}', formatMoney(Math.round(annual / 12)))
  return `${t(STAFF_ROLE_EFFECT_KEY[kind])} ${cost}`
}

function HoverTip({ text, children }: { text: string; children: ReactNode }) {
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null)

  const place = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom > 128
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - 296)
    setPos({
      top: below ? rect.bottom + 6 : rect.top - 6,
      left,
      below,
    })
  }

  return (
    <span
      className="inline-flex"
      onMouseEnter={(event) => place(event.currentTarget)}
      onMouseLeave={() => setPos(null)}
      onFocus={(event) => place(event.currentTarget)}
      onBlur={() => setPos(null)}
    >
      {children}
      {pos
        ? createPortal(
            <span
              role="tooltip"
              style={{
                position: 'fixed',
                left: pos.left,
                top: pos.below ? pos.top : undefined,
                bottom: pos.below ? undefined : window.innerHeight - pos.top,
              }}
              className="pointer-events-none z-[80] w-72 rounded-lg border border-white/10 bg-slate-950/95 px-2.5 py-2 text-left text-[11px] font-medium leading-4 text-slate-200 shadow-lg"
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}

function StaffRoleChip({ kind, label, hint }: { kind: StaffKind; label: string; hint: string }) {
  return (
    <HoverTip text={hint}>
      <span
        tabIndex={0}
        aria-label={`${label}. ${hint}`}
        className={`inline-flex cursor-help items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${KIND_TONE[kind]}`}
      >
        <StaffKindIcon kind={kind} className="h-3 w-3" />
        {label}
      </span>
    </HoverTip>
  )
}

/** CCTV 스테미나 바와 동일 톤 — 리스트용 축소 게이지 */
function listStaminaTone(pct: number, blocked: boolean) {
  if (blocked || pct <= 0) {
    return {
      track: 'border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse',
      fill: 'bg-gradient-to-r from-rose-700 via-rose-500 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)]',
      text: 'text-rose-50',
    }
  }
  if (pct < 30) {
    return {
      track: 'border-rose-400/50',
      fill: 'bg-gradient-to-r from-rose-600 to-orange-400 shadow-[0_0_10px_rgba(244,63,94,0.45)]',
      text: 'text-rose-50',
    }
  }
  if (pct < 60) {
    return {
      track: 'border-amber-400/40',
      fill: 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.4)]',
      text: 'text-amber-50',
    }
  }
  return {
    track: 'border-cyan-400/25',
    fill: 'bg-gradient-to-r from-cyan-500 to-teal-300 shadow-[0_0_10px_rgba(34,211,238,0.45)]',
    text: 'text-white',
  }
}

function formatContract(weeks: number, t: (key: string) => string) {
  const key = weeks >= 48 ? 'creator.weeksYearFormat' : 'creator.weeksFormat'
  return t(key).replace('{weeks}', String(weeks))
}



export function CreatorPanel({
  companyViewers = 0,
  ownedCreators,
  registeredCharacters,
  scoutState,
  assets,
  broadcastMonthNumber,
  stationGrade,
  stationGradeConfig,
  openScout = false,
  onScoutClosed,
  openStaffScout = false,
  onStaffScoutClosed,
  tutorialStep,
  onTutorialStepChange,
  onScoutViewed,
  onScoutPass,
  onScoutHire,
  onConditionCare,
  onVacation,
  onProductionTraining,
  onSnsCompose,
  onBulkSnsCompose,
  onBulkRevealDone,
  registeredStaff,
  managerState,
  onHireStaff,
  onStaffScoutPass,
  hiredStaffSalaries,
  hiredStaffStartMonths,
  staffScoutAvailable,
  scoutedStaffCandidate,
  onScoutStaff,
  creatorScoutAvailable,
  onScoutCreator,
  studioSlots,
  onAssignStaffPlacement,
  onHDirect,
  lastHActionMonth,
  onSelectSkin,
  stationRank = 0,
  onConfess,
}: CreatorPanelProps) {
  const { t, locale } = useTranslation()
  const [view, setView] = useState<'roster' | 'scout' | 'staffScout'>('roster')

  const maxScout = stationGradeConfig
    ? maxScoutCreatorsForGrade(stationGradeConfig, stationGrade)
    : 2
  const canScoutMore = ownedCreators.length < maxScout

  type SortField = 'grade' | 'stamina' | 'salary' | 'revenue' | 'sns'
  type SortOrder = 'asc' | 'desc'

  const [sortField, setSortField] = useState<SortField>('salary')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const statTutorial = isStatTutorialStep(tutorialStep ?? null)

  useEffect(() => {
    if (!statTutorial) return
    const first = ownedCreators[0]
    if (first && selectedId !== first.id) setSelectedId(first.id)
  }, [statTutorial, ownedCreators, selectedId])

  useEffect(() => {
    if (!tutorialStep || !statTutorial) return
    const selector = `[data-tutorial="${tutorialStep.replace('_', '-')}"]`
    const timer = window.setTimeout(() => {
      document.querySelector(selector)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [tutorialStep, statTutorial, selectedId])
  const [snsCreatorId, setSnsCreatorId] = useState<string | null>(null)
  const [bulkSnsOpen, setBulkSnsOpen] = useState(false)
  const [bulkRevealState, setBulkRevealState] = useState<BulkSnsComposeResult | null>(null)

  const bulkSnsEligible = useMemo(
    () => previewBulkSnsCompose(ownedCreators).eligibleIds.length > 0,
    [ownedCreators],
  )
  const bulkSnsAffordable = useMemo(
    () => canAffordBulkSnsCompose(ownedCreators, assets),
    [ownedCreators, assets],
  )
  const canAffordActiveScoutOffer = Boolean(
    scoutState.activeOffer &&
      canHireScoutOffer(scoutState.activeOffer, assets, ownedCreators.length <= 0).ok,
  )
  const showCreatorScoutDot =
    canAffordActiveScoutOffer || (!scoutState.activeOffer && creatorScoutAvailable)

  useEffect(() => {
    if (!openScout) return
    if (ownedCreators.length > 0) return
    setSelectedId(null)
    setView('scout')
  }, [openScout, ownedCreators.length])

  useEffect(() => {
    if (!openStaffScout) return
    if (ownedCreators.length > 0) return
    setSelectedId(null)
    setView('staffScout')
  }, [openStaffScout, ownedCreators.length])

  const isScoutingRef = useRef(false)
  const isCreatorScoutingRef = useRef(false)

  useEffect(() => {
    if (scoutedStaffCandidate && isScoutingRef.current) {
      isScoutingRef.current = false
      setView('staffScout')
    }
  }, [scoutedStaffCandidate])

  useEffect(() => {
    if (scoutState.activeOffer && isCreatorScoutingRef.current) {
      isCreatorScoutingRef.current = false
      setView('scout')
    }
  }, [scoutState.activeOffer])

  const handleScoutStaffClick = () => {
    isScoutingRef.current = true
    onScoutStaff()
    if (tutorialStep === 'staff_scout_open') {
      onTutorialStepChange?.('staff_hire')
    }
  }

  const handleScoutCreatorClick = () => {
    isCreatorScoutingRef.current = true
    if (scoutState.activeOffer) {
      setView('scout')
    } else {
      onScoutCreator()
      setView('scout')
    }
  }

  function leaveScout() {
    setView('roster')
    onScoutClosed?.()
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedBySalary = useMemo(() => {
    const list = [...ownedCreators]
    const GRADE_WEIGHT: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 }

    list.sort((a, b) => {
      let diff = 0
      if (sortField === 'grade') {
        diff = (GRADE_WEIGHT[a.grade] ?? 0) - (GRADE_WEIGHT[b.grade] ?? 0)
      } else if (sortField === 'stamina') {
        const aPct = a.stamina / Math.max(1, a.staminaMax)
        const bPct = b.stamina / Math.max(1, b.staminaMax)
        diff = aPct - bPct
      } else if (sortField === 'salary') {
        diff = a.salary - b.salary
      } else if (sortField === 'revenue') {
        const aRev = calcMonthRevenueWon(a, 0, 1, companyViewers)
        const bRev = calcMonthRevenueWon(b, 0, 1, companyViewers)
        diff = aRev - bRev
      } else if (sortField === 'sns') {
        diff = (a.snsSubscribers ?? 0) - (b.snsSubscribers ?? 0)
      }

      if (diff !== 0) {
        return sortOrder === 'desc' ? -diff : diff
      }
      return b.salary - a.salary
    })

    return list
  }, [ownedCreators, sortField, sortOrder, companyViewers])

  const selected = ownedCreators.find((creator) => creator.id === selectedId) ?? null
  const snsCreator = ownedCreators.find((creator) => creator.id === snsCreatorId) ?? null

  if (view === 'scout') {
    return (
      <ScoutView
        offer={scoutState.activeOffer}
        assets={assets}
        ownedCount={ownedCreators.length}
        registeredCount={registeredCharacters.length}
        onBack={leaveScout}
        onViewed={onScoutViewed}
        onPass={() => {
          onScoutPass()
          leaveScout()
        }}
        onHire={(offer) => {
          onScoutHire(offer)
          leaveScout()
        }}
      />
    )
  }

  if (view === 'staffScout') {
    return (
      <StaffScoutView
        candidate={scoutedStaffCandidate}
        assets={assets}
        onBack={() => {
          setView('roster')
          onStaffScoutClosed?.()
        }}
        onPass={() => {
          onStaffScoutPass()
          setView('roster')
          onStaffScoutClosed?.()
        }}
        onHire={(staffId, hireCost, salary) => {
          onHireStaff(staffId, hireCost, salary)
          setView('roster')
          onStaffScoutClosed?.()
        }}
      />
    )
  }

  if (selected) {
    return (
      <CreatorDetailView
        companyViewers={companyViewers}
        creator={selected}
        assets={assets}
        broadcastMonthNumber={broadcastMonthNumber}
        ownedCreators={ownedCreators}
        studioSlots={studioSlots}
        onBack={() => {
          if (statTutorial) return
          setSelectedId(null)
        }}
        backLocked={statTutorial}
        registeredCharacters={registeredCharacters}
        onConditionCare={onConditionCare}
        onVacation={onVacation}
        onProductionTraining={onProductionTraining}
        onHDirect={onHDirect}
        lastHActionMonth={lastHActionMonth}
        onSelectSkin={onSelectSkin}
        stationRank={stationRank}
        onConfess={onConfess}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-hidden">
      <section className="game-panel flex min-h-0 flex-[1.15] flex-col overflow-hidden rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5 sm:px-4">
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-wide text-slate-100">{t('creator.manageTitle')}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">
              {t('creator.manageSubtitle').replace('{count}', String(ownedCreators.length))}
              <span className="mx-1.5 text-slate-700">·</span>
              {t('creator.manageDesc')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {ownedCreators.length > 0 ? (
              <button
                type="button"
                disabled={!bulkSnsEligible}
                onClick={() => setBulkSnsOpen(true)}
                className="game-btn relative rounded-lg px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                title={!bulkSnsEligible ? t('sns.bulkComposeNone') : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  <PhoneGlyph className="h-3 w-3" />
                  {t('sns.bulkCompose')}
                </span>
                {bulkSnsAffordable ? <RedDot label={t('sns.composeAvailable')} /> : null}
              </button>
            ) : null}
            {!canScoutMore ? (
              <button
                type="button"
                disabled
                className="game-btn rounded-lg px-3 py-1 text-xs opacity-50 cursor-not-allowed border border-white/10 text-slate-400 font-semibold"
              >
                🔒 {t('creator.scout')} ({sortedBySalary.length}/{maxScout}명)
              </button>
            ) : (
              <button
                type="button"
                disabled={!scoutState.activeOffer && !creatorScoutAvailable}
                onClick={handleScoutCreatorClick}
                className={`game-btn game-btn-primary relative rounded-lg px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                  scoutState.activeOffer || creatorScoutAvailable
                    ? 'border border-indigo-400/40 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 transition'
                    : ''
                }`}
              >
                {t('creator.scout')}
                {showCreatorScoutDot ? (
                  <RedDot label={t('creator.scoutAvailable')} />
                ) : null}
              </button>
            )}
            <span className="game-chip text-[10px]">
              {t('common.countUnit').replace('{count}', String(sortedBySalary.length))}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {sortedBySalary.length === 0 ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-sm text-slate-400">{t('creator.noCreators')}</p>
              <p className="text-xs text-slate-500">{t('creator.noCreatorsDesc')}</p>
            </div>
          ) : (
            <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
                <tr className="border-b border-white/10 text-[10px] tracking-wide text-slate-500 uppercase select-none">
                  <th className="px-3 py-2.5 font-semibold sm:px-4">{t('common.name')}</th>
                  <th className="px-3 py-2.5 font-semibold text-center">{t('menu.studio')}</th>
                  <th className="px-3 py-2.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('grade')}
                      className={`group inline-flex items-center gap-1 transition-colors cursor-pointer hover:text-amber-300 ${
                        sortField === 'grade' ? 'text-amber-300 font-bold' : ''
                      }`}
                    >
                      <span>{t('common.grade')}</span>
                      <span className="text-[10px] text-amber-400 font-bold">
                        {sortField === 'grade' ? (sortOrder === 'desc' ? '▼' : '▲') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('stamina')}
                      className={`group inline-flex items-center gap-1 transition-colors cursor-pointer hover:text-cyan-300 ${
                        sortField === 'stamina' ? 'text-cyan-300 font-bold' : ''
                      }`}
                    >
                      <HeaderGlyph kind="bolt" />
                      <span>{t('creator.statStamina')}</span>
                      <span className="text-[10px] text-cyan-400 font-bold">
                        {sortField === 'stamina' ? (sortOrder === 'desc' ? '▼' : '▲') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-semibold">{t('creator.statType')}</th>
                  <th className="px-3 py-2.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('salary')}
                      className={`group inline-flex items-center gap-1 transition-colors cursor-pointer hover:text-amber-300 ${
                        sortField === 'salary' ? 'text-amber-300 font-bold' : ''
                      }`}
                    >
                      <HeaderGlyph kind="coin" />
                      <span>{t('creator.currentSalary')}</span>
                      <span className="text-[10px] text-amber-400 font-bold">
                        {sortField === 'salary' ? (sortOrder === 'desc' ? '▼' : '▲') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('revenue')}
                      className={`group inline-flex items-center gap-1 transition-colors cursor-pointer text-emerald-400 hover:text-emerald-200 ${
                        sortField === 'revenue' ? 'text-emerald-300 font-bold' : ''
                      }`}
                    >
                      <HeaderGlyph kind="up" />
                      <span>{t('creator.expectedRevenue')}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {sortField === 'revenue' ? (sortOrder === 'desc' ? '▼' : '▲') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('sns')}
                      className={`group inline-flex items-center gap-1 transition-colors cursor-pointer text-cyan-300 hover:text-cyan-100 ${
                        sortField === 'sns' ? 'text-cyan-200 font-bold' : ''
                      }`}
                    >
                      <HeaderGlyph kind="fan" />
                      <span>{t('sns.subscribers')}</span>
                      <span className="text-[10px] text-cyan-300 font-bold">
                        {sortField === 'sns' ? (sortOrder === 'desc' ? '▼' : '▲') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-semibold sm:px-4">{t('common.action')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedBySalary.map((creator, index) => {
                  const expectedRev = calcMonthRevenueWon(creator, 0, 1, companyViewers)
                  const displayName = characterDisplayName(creator, locale)
                  const displayJob = characterDisplayJob(creator, locale)
                  const snsSubs = creator.snsSubscribers ?? 0
                  const snsPosted = Boolean(creator.snsPending)
                  const snsComposable = canComposeSnsCreator(creator, assets)
                  const staminaMax = Math.max(1, creator.staminaMax)
                  const staminaPct = Math.max(
                    0,
                    Math.min(100, Math.round((creator.stamina / staminaMax) * 100)),
                  )
                  const staminaBlocked = !canBroadcastByStamina(creator.stamina)
                  const staminaTone = listStaminaTone(staminaPct, staminaBlocked)
                  const examReady = isPromotionExamReady(creator)
                  const trainingCost = examReady
                    ? calcPromotionExamCost(creator)
                    : calcTrainingCost(creator)
                  const trainAvailable =
                    canTrainCreator(creator) && assets >= trainingCost
                  const assignedSlot = studioSlots?.find(
                    (slot) => slot.status === 'assigned' && slot.assignment?.creatorId === creator.id,
                  )
                  return (
                    <tr
                      key={creator.id}
                      className={`border-b border-white/6 transition hover:bg-indigo-500/8 ${
                        index % 2 === 0 ? 'bg-black/10' : 'bg-transparent'
                      }`}
                    >
                      <td className="px-3 py-2.5 sm:px-4">
                        <div className="flex items-center gap-2">
                          {findCharacterIconUrl(creator) || creator.profileImageUrl ? (
                            <img
                              src={resolveMediaSrc(
                                findCharacterIconUrl(creator) || creator.profileImageUrl,
                                creator.mediaRevision,
                              )}
                              alt={displayName}
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-slate-950 ${creator.avatarTone}`}
                            >
                              {displayName.slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <p className="truncate font-semibold text-slate-100">{displayName}</p>
                              {examReady ? (
                                <CreatorMark
                                  kind="promo"
                                  label={t('creator.promotionPendingTooltip')}
                                />
                              ) : null}
                              {isHUnlocked(creator) ? (
                                <CreatorMark kind="hVip" label={t('social.hUnlockedTooltip')} />
                              ) : null}
                              {snsPosted ? (
                                <CreatorMark kind="posted" label={t('sns.alreadyPosted')} />
                              ) : null}
                            </div>
                            <p className="truncate text-[10px] text-slate-500">{displayJob}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <StudioAssignIcon assigned={Boolean(assignedSlot)} label={t('menu.studio')} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="inline-flex items-center gap-1">
                          <GradePlate grade={creator.grade} size="sm" />
                          {examReady ? (
                            <span
                              title={t('creator.promotionPendingTooltip')}
                              className="text-[10px] font-black text-amber-300 animate-bounce"
                            >
                              ▲
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div
                          className={`relative h-6 w-28 overflow-hidden rounded-md bg-slate-900 shadow-inner border transition-all duration-300 ${staminaTone.track}`}
                          title={`${t('creator.statStamina')} ${Math.round(creator.stamina)}/${creator.staminaMax}`}
                        >
                          <div
                            className={`h-6 rounded-sm transition-[width] duration-150 ease-linear ${staminaTone.fill}`}
                            style={{ width: `${staminaPct}%` }}
                          />
                          <div
                            className={`pointer-events-none absolute inset-0 flex items-center justify-end px-2 text-[10px] font-black tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)] ${staminaTone.text}`}
                          >
                            <span className="tabular-nums">
                              {Math.round(creator.stamina)}/{creator.staminaMax}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatTypeIcon
                          type={normalizeCreatorStatType(creator.statType)}
                          label={t(STAT_TYPE_LABEL_KEY[normalizeCreatorStatType(creator.statType)])}
                          size="sm"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-200">
                        {formatSalary(creator.salary)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-emerald-300/90">
                        {formatMoney(expectedRev)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-300">
                        {t('sns.countUnit', { count: snsSubs.toLocaleString() })}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            data-tutorial={index === 0 ? 'sns-compose-btn' : undefined}
                            onClick={() => {
                              setSnsCreatorId(creator.id)
                              if (tutorialStep === 'sns_open_compose') {
                                onTutorialStepChange?.('sns_post')
                              }
                            }}
                            className={`game-btn relative inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs ${
                              snsPosted
                                ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
                                : ''
                            }`}
                          >
                            <PhoneGlyph className="h-3 w-3" />
                            {t('sns.action')}
                            {snsPosted ? (
                              <span className="ml-0.5 text-[9px] font-black text-emerald-300">
                                ✓
                              </span>
                            ) : null}
                            {snsComposable ? <RedDot label={t('sns.composeAvailable')} /> : null}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedId(creator.id)}
                            className="game-btn relative rounded-lg px-2.5 py-1 text-xs"
                          >
                            {t('creator.detailView')}
                            {trainAvailable ? (
                              <RedDot label={t('creator.trainingAvailable')} />
                            ) : null}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {(() => {
        const displayStaffs = registeredStaff.filter((s) => managerState.hiredStaffIds.includes(s.id))

        return (
          <section className="game-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
            <div className="flex shrink-0 flex-col gap-2 border-b border-white/8 px-3 py-2.5 sm:px-4">
              <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-200">{t('creator.staffManageTitle')}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{t('creator.staffManageDesc')}</p>
              </div>
              <div className="flex items-center gap-2">
                {scoutedStaffCandidate ? (
                  <button
                    type="button"
                    data-tutorial="staff-scout-btn"
                    onClick={() => {
                      setView('staffScout')
                      if (tutorialStep === 'staff_scout_open') {
                        onTutorialStepChange?.('staff_hire')
                      }
                    }}
                    className="game-btn game-btn-primary relative rounded-lg px-3 py-1 text-xs border border-indigo-400/40 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 transition"
                  >
                    {t('creator.staffOfferCheck')}
                    {assets >= scoutedStaffCandidate.proposedHireCost ? (
                      <RedDot label={t('creator.staffScoutNewArrival')} />
                    ) : null}
                  </button>
                ) : (() => {
                  const hasAvailableStaffToScout = registeredStaff.some(
                    (s) => !managerState.hiredStaffIds.includes(s.id)
                  )
                  const canScout = staffScoutAvailable && hasAvailableStaffToScout
                  const scoutLabel = !hasAvailableStaffToScout
                    ? t('creator.staffScoutDone')
                    : t('creator.staffOffer')
                  return (
                    <button
                      type="button"
                      data-tutorial="staff-scout-btn"
                      disabled={!canScout}
                      onClick={handleScoutStaffClick}
                      className={`game-btn game-btn-primary relative rounded-lg px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                        canScout
                          ? 'border border-indigo-400/40 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 transition'
                          : ''
                      }`}
                    >
                      {scoutLabel}
                      {canScout ? (
                        <RedDot label={t('creator.staffScoutAvailable')} />
                      ) : null}
                    </button>
                  )
                })()}
                <span className="game-chip text-[10px]">
                  {t('common.countUnit').replace('{count}', String(displayStaffs.length))}
                </span>
              </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500">{t('staff.roleMenu')}</span>
                {STAFF_KINDS.map((kind) => (
                  <StaffRoleChip
                    key={kind}
                    kind={kind}
                    label={t(STAFF_KIND_LABEL_KEY[kind])}
                    hint={staffRoleTooltip(t, kind, stationGrade)}
                  />
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {displayStaffs.length === 0 ? (
                <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 text-center">
                  <p className="text-sm text-slate-400">{t('creator.noStaff')}</p>
                  <p className="text-xs text-slate-500">{t('creator.noStaffDesc')}</p>
                </div>
              ) : (
                <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
                    <tr className="border-b border-white/10 text-[10px] tracking-wide text-slate-500 uppercase">
                      <th className="px-3 py-2.5 font-semibold sm:px-4">{t('common.name')}</th>
                      <th className="px-3 py-2.5 font-semibold">{t('creator.colField')}</th>
                      <th className="px-3 py-2.5 font-semibold">{t('creator.colJoinDate')}</th>
                      <th className="px-3 py-2.5 font-semibold">{t('creator.colSalary')}</th>
                      <th className="px-3 py-2.5 font-semibold">{t('creator.colDeploy')}</th>
                      <th className="px-3 py-2.5 font-semibold sm:px-4">{t('creator.colWorkDeploy')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayStaffs.map((staff, index) => {
                      const displayName = staffDisplayName(staff, locale)
                      const icon = staffIconUrl(staff)
                      const genderLabel = staff.gender === 'male' ? t('common.male') : t('common.female')
                      const rawSalary = hiredStaffSalaries[staff.id] ?? 24000
                      const salary = Math.min(rawSalary, 1000000)

                      const slotId = findSlotIdForStaff(managerState, staff.id)
                      const slot = slotId ? studioSlots.find((s) => s.id === slotId) : null
                      const locationLabel = slot ? slot.label : t('creator.notDeployed')

                      return (
                        <tr
                          key={staff.id}
                          className={`border-b border-white/6 transition hover:bg-indigo-500/8 ${
                            index % 2 === 0 ? 'bg-black/10' : 'bg-transparent'
                          }`}
                        >
                          <td className="px-3 py-2.5 sm:px-4">
                            <div className="flex items-center gap-2">
                              {icon ? (
                                <img
                                  src={resolveMediaSrc(icon, staff.mediaRevision)}
                                  alt={displayName}
                                  className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
                                />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white">
                                  {displayName.slice(0, 1)}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-100">{displayName}</p>
                                <p className="text-[10px] text-slate-500">{genderLabel}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <StaffRoleChip
                              kind={staff.kind}
                              label={t(STAFF_KIND_LABEL_KEY[staff.kind])}
                              hint={staffRoleTooltip(t, staff.kind, stationGrade, salary)}
                            />
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-300">
                            {(() => {
                              const startMonth = hiredStaffStartMonths[staff.id] ?? 0
                              const totalMonths = 2026 * 12 + 8 + startMonth
                              const y = Math.floor(totalMonths / 12)
                              const m = (totalMonths % 12) + 1
                              const mm = String(m).padStart(2, '0')
                              return `${y}.${mm}`
                            })()}
                          </td>
                          <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-200">
                            {salary > 0 ? formatSalary(salary) : '-'}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-300">
                            {locationLabel}
                          </td>
                          <td className="px-3 py-2.5 sm:px-4">
                            <button
                              type="button"
                              onClick={() => onAssignStaffPlacement(staff.id)}
                              className="game-btn game-btn-primary rounded-lg px-2.5 py-1 text-xs hover:bg-slate-800 transition"
                            >
                              {t('creator.colWorkDeploy')}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )
      })()}
      {snsCreator ? (
        <SnsFeedModal
          creator={snsCreator}
          assets={assets}
          broadcastMonthNumber={broadcastMonthNumber}
          onClose={() => setSnsCreatorId(null)}
          onCompose={(roll) => onSnsCompose(snsCreator.id, roll)}
        />
      ) : null}
      {bulkSnsOpen ? (
        <SnsBulkComposeModal
          creators={ownedCreators}
          assets={assets}
          onClose={() => setBulkSnsOpen(false)}
          onCompose={(plan) => {
            const raw = onBulkSnsCompose(plan)
            const result: BulkSnsComposeResult = Array.isArray(raw)
              ? { entries: raw, skippedNoFunds: 0 }
              : raw
            if (result.entries.length > 0) {
              setBulkSnsOpen(false)
              setBulkRevealState(result)
            }
            return result
          }}
        />
      ) : null}
      {bulkRevealState && bulkRevealState.entries.length > 0 ? (
        <SnsBulkPostRevealModal
          entries={bulkRevealState.entries}
          skippedNoFunds={bulkRevealState.skippedNoFunds}
          onDone={() => {
            setBulkRevealState(null)
            onBulkRevealDone?.()
          }}
        />
      ) : null}
    </div>
  )
}

function ScoutView({
  offer,
  assets,
  ownedCount,
  registeredCount,
  onBack,
  onViewed,
  onPass,
  onHire,
}: {
  offer: ScoutOffer | null
  assets: number
  ownedCount: number
  registeredCount: number
  onBack: () => void
  onViewed: () => void
  onPass: () => void
  onHire: (offer: ScoutOffer) => void
}) {
  const { t, locale } = useTranslation()
  const stats = offer?.stats
  const mustHire = ownedCount <= 0
  const hireCheck = offer ? canHireScoutOffer(offer, assets, mustHire) : null

  useEffect(() => {
    onViewed()
    // 진입 시 1회만 레드닷 해제
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="game-panel-strong flex shrink-0 flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        {mustHire ? null : (
          <button type="button" onClick={onBack} className="game-btn rounded-xl px-3 py-2 text-sm">
            {t('common.back')}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="game-kicker">SCOUT</p>
          <h2 className="truncate text-base font-semibold text-slate-100">{t('creator.scout')}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t('creator.scoutDesc')}</p>
        </div>
      </header>

      {offer ? (
        <div className="shrink-0 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-center text-sm font-semibold text-indigo-200">
          {t('creator.scoutNewArrival')}
        </div>
      ) : null}

      <section className="game-panel flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-2xl p-4 sm:p-6">
        {!offer || !stats ? (
          <div className="flex max-w-md flex-col items-center gap-2 text-center">
            {registeredCount === 0 ? (
              <>
                <p className="text-sm text-slate-300">{t('creator.noRegistered')}</p>
                <p className="text-xs text-slate-500">
                  {t('creator.noRegisteredDesc')}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-300">{t('creator.scoutWaiting')}</p>
                <p className="text-xs text-slate-500">{t('creator.scoutEmpty')}</p>
              </>
            )}
          </div>
        ) : (
          <article className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <div className="game-card relative aspect-[3/4] overflow-hidden sm:aspect-auto sm:min-h-[22rem]">
              {offer.template.profileImageUrl ? (
                <img
                  src={offer.template.profileImageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-700 to-slate-950">
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-slate-950 ${offer.template.avatarTone}`}
                  >
                    {characterDisplayName(offer.template, locale).slice(0, 1)}
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1">
                <GradePlate grade={offer.grade} size="md" />
                <StatTypeIcon
                  type={normalizeCreatorStatType(offer.template.statType)}
                  label={t(
                    STAT_TYPE_LABEL_KEY[normalizeCreatorStatType(offer.template.statType)],
                  )}
                  showLabel
                  size="sm"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="text-lg font-bold text-slate-50">
                  {characterDisplayName(offer.template, locale)}
                </h3>
                <p className="text-xs text-slate-300">
                  {characterDisplayJob(offer.template, locale)}
                  {offer.template.age
                    ? ` · ${t('creator.ageFormat').replace('{age}', String(offer.template.age))}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/25 p-4">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold tracking-wide text-slate-500">{t('creator.proposedSalary')}</p>
                  {mustHire ? (
                    <div>
                      <p className="text-xl font-black text-emerald-300">{t('creator.scoutFirstHireFree')}</p>
                      <p className="text-[11px] font-semibold tabular-nums text-slate-500 line-through">
                        {formatSalary(offer.salary)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xl font-black tabular-nums text-amber-400">
                      {formatSalary(offer.salary)}
                    </p>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  {t('creator.statCommunication')} {stats.statCommunication}
                </p>
              </div>

              <div className="space-y-2.5">
                <PersonalityStatBars stats={stats} t={t} />
              </div>

              {hireCheck && !hireCheck.ok ? (
                <p className="text-center text-[11px] font-semibold text-rose-300">
                  {t('creator.scoutHireBlockedAssets')}
                </p>
              ) : null}

              <div
                className={`mt-auto grid gap-2 pt-2 ${mustHire ? 'grid-cols-1' : 'grid-cols-2'}`}
              >
                {mustHire ? null : (
                  <button
                    type="button"
                    onClick={onPass}
                    className="game-btn rounded-xl px-4 py-3 text-sm font-semibold"
                  >
                    {t('creator.scoutPass')}
                  </button>
                )}
                <button
                  type="button"
                  data-tutorial="scout-hire-btn"
                  disabled={!hireCheck?.ok}
                  onClick={() => onHire(offer)}
                  className="game-btn-pink rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('creator.scoutHire')}
                </button>
              </div>
            </div>
          </article>
        )}
      </section>
    </div>
  )
}

function fillLocale(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template)
}

function isSkinUnlocked(grade: Grade, skin: 1 | 2 | 3): boolean {
  if (skin === 1) return true
  if (skin === 2) return grade === 'A' || grade === 'S'
  if (skin === 3) return grade === 'S'
  return false
}

function getSkinThumbnailUrl(
  creator: OwnedCreator,
  skin: 1 | 2 | 3,
  registeredCharacters?: RegisteredCharacter[],
): string | null | undefined {
  const regChar = registeredCharacters?.find((c) => c.id === creator.id)
  const mergedLevelThumbnails = creator.levelThumbnailImageIds || regChar?.levelThumbnailImageIds
  const mergedImages = (creator.images && creator.images.length > 0) ? creator.images : (regChar?.images ?? [])
  const mergedCreator = {
    ...creator,
    levelThumbnailImageIds: mergedLevelThumbnails,
    images: mergedImages,
  }

  if (skin === 1) {
    return creator.profileImageUrl || regChar?.profileImageUrl || findCharacterProfileUrl(mergedCreator)
  }
  return (
    findCharacterLevelThumbnailUrl(mergedCreator, skin) ||
    creator.profileImageUrl ||
    regChar?.profileImageUrl ||
    findCharacterProfileUrl(mergedCreator)
  )
}

function CreatorDetailView({
  companyViewers = 0,
  creator,
  assets,
  broadcastMonthNumber,
  ownedCreators = [],
  studioSlots,
  onBack,
  backLocked = false,
  onConditionCare,
  onVacation,
  onProductionTraining,
  onHDirect,
  lastHActionMonth,
  onSelectSkin,
  registeredCharacters,
  stationRank = 0,
  onConfess,
}: {
  companyViewers?: number
  creator: OwnedCreator
  assets: number
  broadcastMonthNumber: number
  ownedCreators?: OwnedCreator[]
  studioSlots?: StudioSlot[]
  registeredCharacters?: RegisteredCharacter[]
  onBack: () => void
  backLocked?: boolean
  onConditionCare: (creatorId: string) => void
  onVacation: (creatorId: string) => void
  onProductionTraining: (creatorId: string) => void
  onHDirect?: (creatorId: string) => void
  lastHActionMonth?: number
  onSelectSkin?: (creatorId: string, skin: 1 | 2 | 3) => void
  stationRank?: number
  onConfess?: (creatorId: string) => void
}) {
  const { t, locale } = useTranslation()
  const assignedSlot = studioSlots?.find(
    (s) => s.status === 'assigned' && s.assignment?.creatorId === creator.id,
  )
  const displayName = characterDisplayName(creator, locale)
  const displayJob = characterDisplayJob(creator, locale)
  const staminaPct = Math.round((creator.stamina / Math.max(1, creator.staminaMax)) * 100)
  const conditionScore = scoreOf(creator)
  const condition = conditionFromScore(conditionScore)
  const isAllBroadcastBlocked =
    (ownedCreators?.length ?? 0) > 0 &&
    Boolean(ownedCreators?.every((c) => !canBroadcastByStamina(c.stamina)))
  const vacationCost = isAllBroadcastBlocked ? 0 : calcVacationCost(creator.salary, creator.grade)
  const vacationUsed = Boolean(
    ownedCreators?.some((c) => c.lastVacationMonth === broadcastMonthNumber),
  )
  const staminaDepleted = isStaminaDepleted(creator.stamina)
  const canAffordVacation = assets >= vacationCost
  const canVacation = !staminaDepleted && !vacationUsed && canAffordVacation
  const broadcastBlocked = !canBroadcastByStamina(creator.stamina)
  const careCost = calcConditionFullCareCost(creator.grade)
  const conditionFull = conditionScore >= 100
  const canAffordCare = assets >= careCost
  const canCare = !conditionFull && canAffordCare
  const statType = normalizeCreatorStatType(creator.statType)
  const mainStatLabel = t(STAT_VALUE_LABEL_KEY[statType])
  const mainStatValue = mainStatValueOf(creator)
  const nextBreak = nextGradeBreak(creator.grade)
  const breakNeed = nextBreak ? Math.max(0, nextBreak.need - mainStatValue) : 0
  const examReady = isPromotionExamReady(creator)
  const trainingTurns = creator.trainingTurns ?? 0
  const reqTrainingTurns = getRequiredTrainingTurns(creator.grade)
  const trainingCost = examReady
    ? calcPromotionExamCost(creator)
    : calcTrainingCost(creator)
  const canAffordTraining = assets >= trainingCost
  const trainingMaxed = mainStatValue >= 100
  const canTrain = examReady
    ? canAffordTraining
    : !trainingMaxed && canAffordTraining
  const trainButtonLabel = examReady
    ? !canAffordTraining
      ? t('creator.trainingNeedAssets')
      : t('creator.trainingExamAction')
    : trainingMaxed
      ? t('creator.trainingMaxed')
      : !canAffordTraining
        ? t('creator.trainingNeedAssets')
        : t('creator.trainingAction')
  const [trainFxKey, setTrainFxKey] = useState(0)
  const [trainHot, setTrainHot] = useState(false)

  const regChar = registeredCharacters?.find((c) => c.id === creator.id)
  const mergedLevelThumbnails = creator.levelThumbnailImageIds || regChar?.levelThumbnailImageIds
  const mergedImages = (creator.images && creator.images.length > 0) ? creator.images : (regChar?.images ?? [])
  const mergedCreator = useMemo(
    () => ({
      ...creator,
      levelThumbnailImageIds: mergedLevelThumbnails,
      images: mergedImages,
    }),
    [creator, mergedLevelThumbnails, mergedImages],
  )

  const activeSkin: 1 | 2 | 3 =
    creator.selectedSkin && isSkinUnlocked(creator.grade, creator.selectedSkin)
      ? creator.selectedSkin
      : 1
  const activeSkinUrl = getSkinThumbnailUrl(mergedCreator, activeSkin, registeredCharacters)

  useEffect(() => {
    if (trainFxKey === 0) return
    const timer = window.setTimeout(() => setTrainHot(false), 720)
    return () => window.clearTimeout(timer)
  }, [trainFxKey])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="game-panel-strong flex shrink-0 flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        {backLocked ? null : (
          <button type="button" onClick={onBack} className="game-btn rounded-xl px-3 py-2 text-sm">
            {t('common.back')}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="game-kicker">CREATOR PROFILE</p>
          <h2 className="flex items-center gap-2 truncate text-base font-semibold text-slate-100 flex-wrap">
            <span>{displayName}</span>
            <GradePlate grade={creator.grade} size="sm" />
            {assignedSlot ? (
              <span
                title={t('menu.studio')}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
              >
                <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <rect x="2" y="4.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="8" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 4.5l1-2h3l1 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                {t('menu.studio')}
              </span>
            ) : null}
          </h2>
        </div>
        <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold tracking-wide text-cyan-400/80">{t('creator.payDay')}</p>
          <p className="text-sm font-bold text-cyan-300">
            {t('creator.payTurns').replace('{count}', String(creator.nextPayTurns))}
          </p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto lg:grid-cols-[minmax(15rem,17.5rem)_minmax(0,1fr)] lg:overflow-hidden">
        <section className="mx-auto flex w-full max-w-[17.5rem] flex-col gap-2.5 lg:mx-0">
          <article className="game-card relative aspect-[3/4] w-full overflow-hidden">
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-slate-700/80 to-slate-950">
              <div
                className={`mb-16 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-slate-950 ${creator.avatarTone}`}
              >
                {creator.name.slice(0, 1)}
              </div>
            </div>
            {activeSkinUrl ? (
              <img
                key={`${creator.id}-${activeSkin}`}
                src={resolveMediaSrc(activeSkinUrl, creator.mediaRevision)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top transition-all duration-300"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1">
              <GradePlate grade={creator.grade} size="md" />
              <span className="rounded border border-indigo-400/50 bg-indigo-950/80 px-2 py-0.5 text-xs font-black tracking-wider text-indigo-300 shadow">
                SKIN{activeSkin}
              </span>
              <StatTypeIcon
                type={normalizeCreatorStatType(creator.statType)}
                label={t(STAT_TYPE_LABEL_KEY[normalizeCreatorStatType(creator.statType)])}
                showLabel
                size="sm"
              />
              {assignedSlot ? (
                <span
                  title={t('menu.studio')}
                  className="inline-flex items-center gap-1 rounded border border-emerald-400/50 bg-emerald-950/70 px-2 py-0.5 text-xs font-bold text-emerald-300 shadow"
                >
                  <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <rect x="2" y="4.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="8" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5.5 4.5l1-2h3l1 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  {t('menu.studio')}
                </span>
              ) : null}
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400">{displayJob}</p>
              <h3 className="text-lg font-bold text-slate-50">{displayName}</h3>
              <p className="mt-0.5 text-xs text-slate-300">
                {displayJob}
                {creator.age
                  ? ` · ${t('creator.ageFormat').replace('{age}', String(creator.age))}`
                  : ''}
              </p>
            </div>
          </article>

          {/* 스킨 셀렉터 카드 (3:4 미니 카드 3장) */}
          <div className="w-full shrink-0">
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((skin) => {
                const unlocked = isSkinUnlocked(creator.grade, skin)
                const isSelected = activeSkin === skin
                const thumbUrl = getSkinThumbnailUrl(mergedCreator, skin, registeredCharacters)
                const lockGrade = skin === 2 ? 'A GRADE' : 'S GRADE'

                return (
                  <button
                    key={skin}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onSelectSkin?.(creator.id, skin)}
                    className={`group relative flex flex-col items-center overflow-hidden rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-400 ring-2 ring-indigo-400/60 shadow-[0_0_14px_rgba(99,102,241,0.65)] scale-[1.03]'
                        : unlocked
                          ? 'border-white/15 bg-slate-900/80 hover:border-indigo-400/50 hover:bg-slate-800/80'
                          : 'cursor-not-allowed border-white/5 bg-slate-950/60 opacity-60'
                    }`}
                  >
                    <div className="relative h-[4.75rem] w-full overflow-hidden bg-slate-900 flex items-center justify-center sm:h-[5.5rem]">
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                        <span className="text-xs font-black tracking-wider opacity-40">SKIN{skin}</span>
                      </div>
                      {thumbUrl ? (
                        <img
                          src={resolveMediaSrc(thumbUrl, creator.mediaRevision)}
                          alt={`SKIN${skin}`}
                          className={`relative z-[1] h-full w-full object-contain object-bottom transition-transform duration-300 ${
                            unlocked ? 'group-hover:scale-105' : 'grayscale brightness-50'
                          }`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : null}

                      {!unlocked && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/75 p-1 text-center backdrop-blur-[1px]">
                          <span className="text-base">🔒</span>
                          <span className="mt-1 text-[9px] font-black tracking-wider text-amber-300">
                            {lockGrade}
                          </span>
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-1 right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white shadow-md">
                          ✓
                        </div>
                      )}

                      {unlocked && !isSelected && skin > 1 && (
                        <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5 rounded-full bg-emerald-500/90 border border-emerald-300/80 px-1.5 py-0.5 text-[8px] font-black text-white shadow-md animate-pulse">
                          <span>🔓</span>
                          <span>OPEN</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full bg-slate-950/90 py-1 text-center border-t border-white/5">
                      <span className={`text-[11px] font-black tracking-wider ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                        SKIN{skin}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="game-panel flex min-h-0 flex-col overflow-auto rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold tracking-wide text-slate-100">{t('creator.statsTitle')}</h3>

          {broadcastBlocked ? (
            <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
              {t('creator.broadcastBlocked')}
            </p>
          ) : null}

          <div
            className={`mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2 ${
              trainHot ? 'training-fx-stat-hot' : ''
            }`}
          >
            <PersonalityStatBars stats={creator} t={t} />
            <StatBar
              icon={<HeaderGlyph kind="bolt" />}
              label={t('creator.statStamina')}
              hint={t('creator.statHintStamina')}
              valueLabel={`${creator.stamina}/${creator.staminaMax}`}
              percent={staminaPct}
              barClass="from-cyan-400 to-teal-300"
              tutorialAttr="stat-stamina"
            />
            <StatBar
              icon={<DetailGlyph kind="pulse" />}
              label={t('condition.title')}
              hint={t('creator.statHintCondition')}
              valueLabel={`${CONDITION_ICON[condition]} ${t(CONDITION_LABEL_KEY[condition])} (${conditionScore})`}
              percent={conditionScore}
              barClass="from-emerald-400 to-lime-300"
            />
            <StatBar
              icon={<DetailGlyph kind="heart" />}
              label={t('affection.label')}
              hint={t('affection.confessLocked')}
              valueLabel={`${Math.max(0, Math.min(100, Math.round(creator.affection ?? 0)))}`}
              percent={Math.max(0, Math.min(100, Math.round(creator.affection ?? 0)))}
              barClass="from-pink-400 to-rose-300"
            />
            <StatBar
              icon={<HeaderGlyph kind="up" />}
              label={t('creator.expectedRevenue')}
              hint={t('creator.statHintRevenue')}
              valueLabel={formatMoney(calcMonthRevenueWon(creator, 0, 1, companyViewers))}
              percent={100}
              barClass="from-emerald-400 to-teal-300"
            />
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-500">
                <HeaderGlyph kind="coin" />
                {t('creator.currentSalary')}
              </p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-amber-400">
                {formatSalary(creator.salary)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <DetailGlyph kind="calendar" className="h-3 w-3" />
                {t('creator.contractLeft').replace('{weeks}', formatContract(creator.contractWeeks, t))}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 items-stretch gap-3">
            <article className="flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="shrink-0 text-[11px] font-semibold tracking-wide text-slate-300">
                {t('creator.careTitle')}
              </h3>
              <div className="mt-3 flex flex-1 flex-col justify-center gap-2">
                <button
                  type="button"
                  disabled={!canCare}
                  onClick={() => onConditionCare(creator.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/16 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
                      <DetailGlyph kind="care" className="h-4 w-4" />
                      {t('creator.careOption')}
                    </span>
                    <span className="mt-1 block text-[10px] leading-4 text-slate-400">
                      {t('creator.careFullDesc')}
                    </span>
                    {conditionFull ? (
                      <span className="mt-1 block text-[10px] font-semibold text-emerald-300/80">
                        {t('creator.careAlreadyBest')}
                      </span>
                    ) : !canAffordCare ? (
                      <span className="mt-1 block text-[10px] font-semibold text-rose-300/80">
                        {t('creator.careNeedAssets')}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm font-black tabular-nums text-amber-300">
                    {formatMoneySigned(-careCost)}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!canVacation}
                  onClick={() => onVacation(creator.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/16 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
                      <DetailGlyph kind="vacation" className="h-4 w-4" />
                      {t('creator.vacationTitle')}
                    </span>
                    <span className="mt-1 block text-[10px] leading-4 text-slate-400">
                      {t('creator.vacationDesc')}
                    </span>
                    {staminaDepleted ? (
                      <span className="mt-1 block text-[10px] font-semibold text-rose-400">
                        {t('creator.vacationStaminaZero')}
                      </span>
                    ) : vacationUsed ? (
                      <span className="mt-1 block text-[10px] font-semibold text-amber-300/80">
                        {t('creator.vacationUsed')}
                      </span>
                    ) : isAllBroadcastBlocked ? (
                      <span className="mt-1 block text-[10px] font-semibold text-emerald-400">
                        {t('creator.vacationFreeEmergency')}
                      </span>
                    ) : !canAffordVacation ? (
                      <span className="mt-1 block text-[10px] font-semibold text-rose-300/80">
                        {t('creator.careNeedAssets')}
                      </span>
                    ) : null}
                  </span>
                  <span className={`shrink-0 text-sm font-black tabular-nums ${isAllBroadcastBlocked ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {vacationCost === 0 ? '$0 (FREE)' : formatMoneySigned(-vacationCost)}
                  </span>
                </button>

                {isHUnlocked(creator) ? (
                  <>
                    {(() => {
                      const isStaminaZero = isStaminaDepleted(creator.stamina)
                      const isTurnUsed = lastHActionMonth === broadcastMonthNumber
                      const isHDisabled = isTurnUsed || isStaminaZero
                      return (
                        <button
                          type="button"
                          disabled={isHDisabled}
                          onClick={() => onHDirect?.(creator.id)}
                          className="flex w-full items-start justify-between gap-3 rounded-xl border border-pink-500/40 bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-pink-950/40 px-3 py-2.5 text-left transition hover:border-pink-400/60 hover:bg-pink-900/30 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-sm font-bold text-pink-200">
                              <DetailGlyph kind="hLove" className="h-4 w-4" />
                              {t('social.hActionTitle')}
                            </span>
                            <span className="mt-1 block text-[10px] leading-4 text-pink-300/80">
                              {t('social.hActionDesc')}
                            </span>
                            {isStaminaZero ? (
                              <span className="mt-1 block text-[10px] font-semibold text-rose-400">
                                {t('social.hStaminaZero')}
                              </span>
                            ) : isTurnUsed ? (
                              <span className="mt-1 block text-[10px] font-semibold text-amber-300/80">
                                {t('social.hAlreadyUsedThisTurn')}
                              </span>
                            ) : (
                              <span className="mt-1 block text-[10px] font-semibold text-emerald-400">
                                {t('social.hReady')}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-xs font-black text-pink-300 rounded-lg border border-pink-500/40 bg-pink-500/20 px-2 py-1 shadow">
                            {t('social.hActionTag')}
                          </span>
                        </button>
                      )
                    })()}
                  </>
                ) : null}
              </div>
            </article>

            <article className="relative flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4">
              {trainFxKey > 0 ? <TrainingBurstFx key={trainFxKey} /> : null}

              <div className="relative z-10 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-amber-200/90">
                    <HeaderGlyph kind="bolt" />
                    {t('creator.trainingTitle')}
                  </h3>
                  <p className="truncate text-right text-[10px] font-semibold text-slate-500">
                    {fillLocale(t('creator.trainingStatus'), {
                      grade: creator.grade,
                      stat: mainStatLabel,
                    })}
                  </p>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">
                      {fillLocale(t('creator.trainingMainProgress'), {
                        stat: mainStatLabel,
                        value: String(mainStatValue),
                      })}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500">
                      {trainingMaxed
                        ? t('creator.trainingMaxed')
                        : nextBreak
                          ? fillLocale(
                              t(
                                breakNeed <= 0
                                  ? 'creator.trainingBreakReady'
                                  : 'creator.trainingBreakNeed',
                              ),
                              {
                                current: creator.grade,
                                next: nextBreak.grade,
                                need: String(breakNeed),
                              },
                            )
                          : t('creator.trainingBreakMax')}
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200"
                      style={{ width: `${mainStatValue}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                    {fillLocale(t('creator.trainingForecast'), {
                      main: `${TRAINING_MAIN_GAIN.min}~${TRAINING_MAIN_GAIN.max}`,
                      off: `${TRAINING_OFF_GAIN.min}~${TRAINING_OFF_GAIN.max}`,
                    })}
                  </p>
                  {examReady ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-300">
                      <DetailGlyph kind="trophy" className="h-3.5 w-3.5" />
                      {t('creator.promotionPendingTooltip')}
                    </p>
                  ) : (
                    <p className="mt-1.5 inline-flex items-start gap-1 text-[10px] leading-4 text-slate-400">
                      <HeaderGlyph kind="bolt" />
                      <span>
                        {fillLocale(t('creator.trainingIntervalHint'), {
                          grade: creator.grade,
                          turns: String(reqTrainingTurns),
                          current: String(trainingTurns),
                          required: String(reqTrainingTurns),
                        })}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={!canTrain}
                onClick={() => {
                  if (!examReady) {
                    setTrainHot(true)
                    setTrainFxKey((n) => n + 1)
                  }
                  onProductionTraining(creator.id)
                }}
                className={`relative z-10 mt-4 flex min-h-[5rem] w-full flex-col items-center justify-center rounded-xl border px-4 py-3 text-center transition disabled:cursor-not-allowed ${
                  canTrain
                    ? 'border-amber-300/50 bg-gradient-to-b from-amber-400/22 to-black/30 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.16)] hover:-translate-y-0.5 hover:border-amber-200/80 hover:from-amber-300/28'
                    : 'border-white/10 bg-slate-950/70 text-slate-400 opacity-50'
                } ${trainHot ? 'training-fx-btn-hot' : ''}`}
              >
                {canTrain ? <RedDot label={t('creator.trainingAvailable')} /> : null}
                <span className="inline-flex items-center gap-1.5 text-base font-bold tracking-wide text-current">
                  <HeaderGlyph kind="bolt" />
                  {trainButtonLabel}
                </span>
                {trainingMaxed ? null : (
                  <span
                    className={`mt-1 text-lg font-black tabular-nums ${
                      canTrain ? 'text-amber-300' : 'text-slate-500'
                    }`}
                  >
                    {formatMoneySigned(-trainingCost)}
                  </span>
                )}
              </button>
            </article>
          </div>
        </section>
      </div>
      {stationRank === 1 ? (
        (() => {
          const affection = Math.max(0, Math.min(100, Math.round(creator.affection ?? 0)))
          const replay = creator.proposalState === 'accepted'
          const canConfess = replay || (affection >= 100 && (creator.dateArcStep ?? 0) >= 3)
          return (
            <div className="flex shrink-0 justify-center pb-1">
              <button
                type="button"
                disabled={!canConfess}
                onClick={() => onConfess?.(creator.id)}
                className={`group relative inline-flex min-w-[14rem] items-center justify-center gap-2 overflow-hidden rounded-full border px-8 py-3 text-sm font-black tracking-[0.18em] transition ${
                  canConfess
                    ? 'border-rose-200/80 bg-gradient-to-r from-rose-500 via-pink-400 to-amber-300 text-slate-950 shadow-[0_0_28px_rgba(244,114,182,0.45)] hover:brightness-110'
                    : 'cursor-not-allowed border-rose-300/25 bg-gradient-to-r from-slate-900 via-rose-950/80 to-slate-900 text-rose-200/70'
                }`}
              >
                <span aria-hidden className={canConfess ? 'text-base' : 'text-sm opacity-70'}>
                  ♥
                </span>
                {replay ? t('affection.replayEnding') : t('affection.confess')}
                {canConfess ? null : (
                  <span className="text-[10px] font-bold tracking-normal text-rose-200/60">{affection}/100</span>
                )}
              </button>
            </div>
          )
        })()
      ) : null}
    </div>
  )
}

const TRAINING_SPARKS = ['✦', '✧', '★', '•', '✦', '✧', '★', '✦', '✧', '•', '★', '✦'] as const

function TrainingBurstFx() {
  return (
    <div className="training-fx-layer" aria-hidden>
      <div className="training-fx-flash" />
      <div className="training-fx-ring" />
      <div className="training-fx-ring is-late" />
      {TRAINING_SPARKS.map((mark, index) => (
        <span
          key={index}
          className="training-fx-spark"
          style={
            {
              ['--ang' as string]: `${index * (360 / TRAINING_SPARKS.length)}deg`,
              ['--fx-delay' as string]: `${(index % 4) * 28}ms`,
              ['--fx-dur' as string]: `${680 + (index % 3) * 80}ms`,
            } as CSSProperties
          }
        >
          {mark}
        </span>
      ))}
    </div>
  )
}

const PERSONALITY_STAT_BARS = [
  {
    key: 'statSexy',
    type: 'sexy' as const,
    labelKey: 'creator.statSexy',
    hintKey: 'creator.statHintSexy',
    barClass: 'from-rose-500 to-pink-300',
    tutorialAttr: 'stat-sexy',
  },
  {
    key: 'statCommunication',
    type: 'communication' as const,
    labelKey: 'creator.statCommunication',
    hintKey: 'creator.statHintCommunication',
    barClass: 'from-sky-400 to-cyan-300',
    tutorialAttr: 'stat-communication',
  },
  {
    key: 'statMental',
    type: 'mental' as const,
    labelKey: 'creator.statMental',
    hintKey: 'creator.statHintMental',
    barClass: 'from-violet-300 to-slate-200',
    tutorialAttr: 'stat-mental',
  },
  {
    key: 'statPerformance',
    type: 'performance' as const,
    labelKey: 'creator.statPerformance',
    hintKey: 'creator.statHintPerformance',
    barClass: 'from-amber-400 to-orange-300',
    tutorialAttr: 'stat-performance',
  },
] as const

function PersonalityStatBars({
  stats,
  t,
}: {
  stats: {
    statSexy?: number
    statMental?: number
    statCommunication?: number
    statPerformance?: number
  }
  t: (key: string) => string
}) {
  return (
    <>
      {PERSONALITY_STAT_BARS.map((row) => {
        const value = Math.max(0, Math.min(100, Number(stats[row.key]) || 0))
        return (
          <StatBar
            key={row.key}
            icon={<TypeStatIcon type={row.type} />}
            label={t(row.labelKey)}
            valueLabel={`${value}`}
            percent={value}
            barClass={row.barClass}
            hint={t(row.hintKey)}
            tutorialAttr={row.tutorialAttr}
          />
        )
      })}
    </>
  )
}

function StatHint({ text }: { text: string }) {
  const [below, setBelow] = useState(true)
  return (
    <span
      className="group/hint relative inline-flex"
      onMouseEnter={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setBelow(window.innerHeight - rect.bottom > 96)
      }}
    >
      <button
        type="button"
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/15 text-[9px] font-black leading-none text-slate-500 hover:border-white/30 hover:text-slate-200"
        aria-label={text}
      >
        ?
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-0 z-30 hidden w-64 rounded-lg border border-white/10 bg-slate-950/95 px-2.5 py-2 text-left text-[11px] font-medium leading-4 text-slate-200 shadow-lg group-hover/hint:block group-focus-within/hint:block ${
          below ? 'top-full mt-1' : 'bottom-full mb-1'
        }`}
      >
        {text}
      </span>
    </span>
  )
}

function StatBar({
  icon,
  label,
  hint,
  valueLabel,
  note,
  percent,
  barClass,
  tutorialAttr,
}: {
  icon?: ReactNode
  label: string
  hint?: string
  valueLabel: string
  note?: string
  percent: number
  barClass: string
  tutorialAttr?: string
}) {
  const width = Math.max(0, Math.min(100, percent))
  return (
    <div data-tutorial={tutorialAttr}>
      <div className="mb-1 flex items-end justify-between gap-2">
        <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-slate-400">
          {icon ? <span className="inline-flex shrink-0 items-center">{icon}</span> : null}
          <span>{label}</span>
          {hint ? <StatHint text={hint} /> : null}
        </p>
        <p className="text-xs font-bold tabular-nums text-slate-200">{valueLabel}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {note ? <p className="mt-1 text-[10px] text-slate-500">{note}</p> : null}
    </div>
  )
}

function StaffScoutView({
  candidate,
  assets,
  onBack,
  onPass,
  onHire,
}: {
  candidate: ScoutedStaffCandidate | null
  assets: number
  onBack: () => void
  onPass: () => void
  onHire: (staffId: string, hireCost: number, salary: number) => void
}) {
  const { t, locale } = useTranslation()
  if (!candidate) return null

  const displayName = staffDisplayName(candidate, locale)
  const cardUrl = staffCardUrl(candidate)
  const genderLabel = candidate.gender === 'male' ? t('common.male') : t('common.female')

  const canAfford = assets >= candidate.proposedHireCost

  const staffKindKeys: Record<StaffKind, { title: string; bonus: string; desc: string }> = {
    security: { title: 'staff.dutySecurityTitle', bonus: 'staff.dutySecurityBonus', desc: 'staff.dutySecurityDesc' },
    repair: { title: 'staff.dutyRepairTitle', bonus: 'staff.dutyRepairBonus', desc: 'staff.dutyRepairDesc' },
    care: { title: 'staff.dutyCareTitle', bonus: 'staff.dutyCareBonus', desc: 'staff.dutyCareDesc' },
    production: {
      title: 'staff.dutyProductionTitle',
      bonus: 'staff.dutyProductionBonus',
      desc: 'staff.dutyProductionDesc',
    },
  }

  const kindInfo = staffKindKeys[candidate.kind]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="game-panel-strong flex shrink-0 flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <button type="button" onClick={onBack} className="game-btn rounded-xl px-3 py-2 text-sm">
          {t('common.back')}
        </button>
        <div className="min-w-0 flex-1">
          <p className="game-kicker">STAFF SCOUT</p>
          <h2 className="truncate text-base font-semibold text-slate-100">{t('creator.staffScoutTitle')}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t('creator.staffScoutDesc')}</p>
        </div>
      </header>

      <div className="shrink-0 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-center text-sm font-semibold text-indigo-200">
        {t('creator.staffScoutNewArrival')}
      </div>

      <section className="game-panel flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-2xl p-4 sm:p-6">
        <article className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div className="game-card relative aspect-[3/4] overflow-hidden sm:aspect-auto sm:min-h-[22rem]">
            {cardUrl ? (
              <img
                src={resolveMediaSrc(cardUrl, candidate.mediaRevision)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-700 to-slate-950">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-600 text-2xl font-bold text-white">
                  {displayName.slice(0, 1)}
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              <span className="rounded border border-indigo-400/40 bg-indigo-500/15 text-indigo-300 px-2 py-0.5 text-xs font-bold">
                {t(STAFF_KIND_LABEL_KEY[candidate.kind])}
              </span>
              <span className="rounded border border-white/15 bg-black/40 px-2 py-0.5 text-xs font-bold text-slate-200">
                {genderLabel}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3">
              <h3 className="text-lg font-bold text-slate-50">{displayName}</h3>
              <p className="text-xs text-slate-300">
                {t('creator.staffKindFormat').replace(
                  '{kind}',
                  t(STAFF_KIND_LABEL_KEY[candidate.kind]),
                )}{' '}
                · {genderLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/25 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-[10px] font-semibold tracking-wide text-slate-500">{t('creator.hireCost')}</p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-amber-400">
                  ${candidate.proposedHireCost.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-[10px] font-semibold tracking-wide text-slate-500">{t('creator.requiredSalary')}</p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-amber-400">
                  ${candidate.proposedSalary.toLocaleString()}/yr
                </p>
              </div>
            </div>

            <div className="flex-1 rounded-xl bg-black/30 p-4 border border-white/5 space-y-2">
              <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">
                {t('creator.staffDutyTitle')}
              </p>
              <h4 className="text-sm font-black text-slate-100">{t(kindInfo.title)}</h4>
              <p className="text-xs text-slate-300 font-semibold text-emerald-400">
                ★ {t(kindInfo.bonus)}
              </p>
              <p className="text-[11px] leading-5 text-slate-400 pt-1">
                {t(kindInfo.desc)}
              </p>
            </div>

            {!canAfford ? (
              <p className="text-center text-[11px] font-semibold text-rose-300">
                {t('creator.hireBlockedAssets')}
              </p>
            ) : null}

            <div className="mt-auto grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="game-btn rounded-xl px-3 py-3 text-sm font-semibold"
              >
                {t('creator.staffHold')}
              </button>
              <button
                type="button"
                onClick={onPass}
                className="game-btn rounded-xl px-3 py-3 text-sm font-semibold"
              >
                {t('creator.staffPass')}
              </button>
              <button
                type="button"
                data-tutorial="staff-hire-btn"
                disabled={!canAfford}
                onClick={() => onHire(candidate.id, candidate.proposedHireCost, candidate.proposedSalary)}
                className="game-btn-pink rounded-xl px-3 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('creator.staffHire')}
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
