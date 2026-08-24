import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from '../locales/i18n'
import {
  toStudioHandCard,
  pickRandomBroadcastVideoUrl,
  type Grade,
  type OwnedCreator,
  type RegisteredCharacter,
} from '../game/characters'
import type { StudioSlot } from '../game/studioSlots'
import {
  calcSlotUnlockCost,
  countUnlockedSlots,
  findNextUnlockableSlot,
  unlockNextStudioSlot,
} from '../game/studioSlots'
import {
  applyWeeklySlotGear,
  createSlotGearMapFromSlots,
  ensureUnlockedSlotGear,
  findSlotIdForCreator,
  gearFailChance,
  isCreatorSlotBroken,
  repairSlotGear,
  tryBreakSlotGear,
  type SlotGear,
} from '../game/slotGear'
import {
  staffDisplayName,
  staffCardUrl,
  staffIconUrl,
  STAFF_KIND_LABEL_KEY,
  type RegisteredStaff,
} from '../game/staff'
import {
  CARE_STAMINA_MULT,
  ensureUnlockedSlotManagers,
  equipStaff,
  hireStaff,
  productionViewerBonus,
  removeStaffFromState,
  staffBonusOf,
  unequipStaff,
  type SlotManagerState,
  type StaffKind,
} from '../game/slotManagers'
import type { BroadcastPhase } from '../game/broadcast'
import {
  GAME_EPOCH,
  MS_PER_EMPTY_BROADCAST_WEEK,
  MS_PER_GAME_WEEK,
  WEEKS_PER_MONTH,
  monthToCalendarDate,
} from '../game/broadcast'
import {
  applyConditionFullCare,
  applyStaminaMaxPenalty,
  applyVitalsDelta,
  applyToxicStaminaPenalty,
  applyWeeklyStaminaAndCondition,
  applyVacationRecovery,
  calcConditionCrashChance,
  CONDITION_CRASH_DROP,
  CONDITION_CRASH_STAMINA_DROP,
  clampConditionScore,
  calcConditionFullCareCost,
  calcVacationCost,
  calcWeeklyBroadcastStaminaCost,
  canBroadcastByStamina,
  isCreatorBroadcastBlockedLive,
  CONDITION_SCORE_RANGE,
  scoreOf,
} from '../game/condition'
import { rollInt } from '../game/stats'
import {
  buildStudioDayPlan,
  scaleDayPlanTimes,
  applyBroadcastBlockToCreatorPlan,
  type DayEvent,
  type StudioDayPlan,
} from '../game/economy'
import { formatMoney } from '../game/money'
import { rollNegotiatedSalary } from '../game/salary'
import {
  applyPromotionExamResult,
  isPromotionExamReady,
  resolvePromotionExam,
  type PromotionExamResult,
} from '../game/promotionExam'
import { characterDisplayName } from '../game/characterLocales'
import { applyProductionTraining, calcPromotionExamCost, calcTrainingCost } from '../game/training'
import {
  SNS_HEAT_COST,
  nextSnsPost,
  previewBulkSnsCompose,
  resolveSnsPending,
  snsCaptionOf,
  snsPostMedia,
  type BulkSnsRevealEntry,
  type SnsHeat,
  type SnsResult,
} from '../game/sns'
import {
  allocateViewersGained,
  applyAudiencePenalty,
  companyTierLabelKey,
  companyTierOf,
  createInitialLeagueState,
  creatorViewerWeight,
  formatViewers,
  growLeagueBetweenRefresh,
  RANK_REFRESH_TURNS,
  reapplyLeagueGate,
  settleLeagueRank,
  type LeagueState,
  type RankCreator,
  type RankSettlementResult,
} from '../game/ranking'
import {
  canHireScoutOffer,
  clearFirstHireGuarantee,
  clearScoutOfferAfterHire,
  createInitialScoutState,
  createRandomScoutOffer,
  ensureOpeningScout,
  hireScoutOffer,
  markScoutViewed,
  passScoutOffer,
  type ScoutOffer,
  type ScoutSystemState,
} from '../game/scout'
import {
  calcProgressiveAnnualTax,
  createTaxUpcomingEvent,
  isFebruaryCalendarMonth,
  isMarchCalendarMonth,
} from '../game/tax'
import {
  buildWeeklyStatement,
  createWeekAccumulator,
  recordCareExpense,
  recordDayIntoWeek,
  type WeekAccumulator,
  type WeeklyStatement,
} from '../game/weeklyReport'
import { type ConditionCrashFxItem } from './ConditionCrashFx'
import { type GearFailBurstItem } from './GearFailBurstFx'
import { type StaffActionFxItem } from './StaffActionFx'
import { type ToxicWhackQteItem } from './ToxicWhackQte'
import { CreatorPanel } from './CreatorPanel'
import { RedDot } from './RedDot'
import { DashboardPanel } from './DashboardPanel'
import { StaffSalaryRaiseModal } from './StaffSalaryRaiseModal'
import { type ScoutedStaffCandidate } from '../game/characters'
import { RecruitCardFlyFx, type RecruitFlyCard } from './RecruitCardFlyFx'
import { RestRequiredModal } from './RestRequiredModal'
import { PromotionSlotModal } from './PromotionSlotModal'
import { SnsResultModal } from './SnsResultModal'
import { SalaryNegotiateModal } from './SalaryNegotiateModal'
import { SchedulePanel } from './SchedulePanel'
import { GameClearModal } from './GameClearModal'
import {
  applyStationReview,
  capStationViewers,
  isAnnualReviewMonth,
  nextJanuaryAfter,
  setStationGradeConfig,
  stationRankForGrade,
  stationSpec,
  type StationGrade,
  type StationReviewStatus,
} from '../game/station'
import type { StationGradeConfig } from '../game/stationGradeConfig'
import {
  maxScoutCreatorsForGrade,
  meetsSlotUnlockByRank,
  slotUnlockMinGradeOf,
  slotUnlockPriceOf,
} from '../game/stationGradeConfig'
import {
  rollVipRejectViewers,
  VIP_ACCEPT_BY_GRADE,
  type VipOffer,
} from '../game/vip'
import {
  advanceAndPickSocialEvent,
  createSocialSpawnState,
  dateArcAfter,
  H_RETRY_BY_GRADE,
  rollGiftAcceptVitals,
  rollRejectConditionLoss,
  type DatePending,
  type GiftPending,
  type HRetryPending,
  type SocialPending,
} from '../game/social'
import { RankChangeModal } from './RankChangeModal'
import { RankingPanel } from './RankingPanel'
import { StationReviewModal } from './StationReviewModal'
import { StationPromotionFx } from './StationPromotionFx'
import { DateOfferModal, DateResultModal } from './DateEventModal'
import { GiftOfferModal, GiftResultModal } from './GiftEventModal'
import { HRetryOfferModal, HRetryResultModal } from './HRetryEventModal'
import { VipOfferModal } from './VipOfferModal'
import { VipResultModal, type VipResult } from './VipResultModal'
import { WeeklySettlementModal } from './WeeklySettlementModal'
import { EventSimulator } from '../events/EventSimulator'
import type { GameEvent } from '../events/types'

export type GameTab =
  | 'dashboard'
  | 'creator'
  | 'schedule'
  | 'ranking'
  | 'settings'


const SPEED_OPTIONS = ['1x', '2x', '3x'] as const
type SpeedOption = (typeof SPEED_OPTIONS)[number]

const INITIAL_ASSETS = 100_000
const MAX_RECENT_EVENTS = 40
/** 이 인원 이상이면 후원을 모아 1명일 때와 비슷한 속도로 로그에 냄 */
const FEED_BATCH_MIN_CREATORS = 2
const SOLO_FEED_EVENTS_PER_WEEK = 10

type WeekInspection = {
  creatorId: string
  slotId: string
  atMs: number
  done: boolean
}

function pickInspectionTimes(count: number, weekMs: number): number[] {
  if (count <= 0 || weekMs <= 0) return []
  const lo = weekMs * 0.16
  const hi = weekMs * 0.86
  const span = Math.max(80, hi - lo)
  const gap = Math.min(weekMs * 0.1, span / count)
  const bucket = span / count
  const times = Array.from({ length: count }, (_, index) => {
    const start = lo + bucket * index
    return start + Math.random() * Math.max(40, bucket * 0.85)
  })
  for (let i = 1; i < times.length; i++) {
    if (times[i]! - times[i - 1]! < gap) {
      times[i] = Math.min(hi, times[i - 1]! + gap)
    }
  }
  for (let i = times.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = times[i]!
    times[i] = times[j]!
    times[j] = swap
  }
  return times
}

type DonationBatch = {
  creatorId: string
  creatorName: string
  amount: number
}

function addDonationToBatch(map: Map<string, DonationBatch>, event: DayEvent) {
  const prev = map.get(event.creatorId)
  if (prev) {
    prev.amount += event.amount
    prev.creatorName = event.creatorName
    return
  }
  map.set(event.creatorId, {
    creatorId: event.creatorId,
    creatorName: event.creatorName,
    amount: event.amount,
  })
}

function takeLargestDonationBatch(map: Map<string, DonationBatch>): DonationBatch | null {
  let best: DonationBatch | null = null
  for (const row of map.values()) {
    if (!best || row.amount > best.amount) best = row
  }
  if (best) map.delete(best.creatorId)
  return best
}

function donationEventFromBatch(batch: DonationBatch, stamp: string, t: (key: string) => string): DayEvent {
  return {
    id: `donation-batch-${batch.creatorId}-${stamp}`,
    creatorId: batch.creatorId,
    creatorName: batch.creatorName,
    type: 'donation',
    amount: batch.amount,
    text: t('feed.donation').replace('{amount}', () => formatMoney(batch.amount)).replace('{name}', batch.creatorName),
    atMs: 0,
    tone: batch.amount >= 1_000 ? 'bg-amber-400' : 'bg-pink-400',
  }
}

function speedMultiplierOf(speed: SpeedOption) {
  if (speed === '2x') return 2
  if (speed === '3x') return 3
  return 1
}

function formatGameClock(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return {
    date: `${year}.${month}.${day}`,
    time: '00:00:00',
  }
}

function formatAssets(value: number) {
  return formatMoney(value)
}

function IconBack() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.5 6.5 9 12l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconDashboard() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconCreator() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5.5 19.5c1.2-3.2 3.5-4.8 6.5-4.8s5.3 1.6 6.5 4.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSchedule() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 13h3M13 13h3M8 16.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconRanking() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 19V11M12 19V6M17 19v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4.5 19.5h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852 1.01 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 16.8V19.5H7.2L17.1 9.6l-2.7-2.7L4.5 16.8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14.1 6.2l2.7 2.7 1.35-1.35a1.9 1.9 0 0 0 0-2.7l-.3-.3a1.9 1.9 0 0 0-2.7 0L14.1 6.2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconHudDate() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function IconHudRank() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 4.5h8v4.2a4 4 0 0 1-8 0V4.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.2H5.7A2.4 2.4 0 0 0 8 9M16 6.2h2.3A2.4 2.4 0 0 1 16 9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 12.7V16.5M9.3 19.5h5.4M10.2 16.5h3.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconHudViewers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.5 12s3.2-6 8.5-6 8.5 6 8.5 6-3.2 6-8.5 6-8.5-6-8.5-6z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function IconHudAssets() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7.2v9.6M9.4 9.2c.6-.8 1.5-1.2 2.6-1.2 1.7 0 2.7.9 2.7 2.1s-1 2-2.8 2.3c-1.8.3-2.8.9-2.8 2.2 0 1.3 1.1 2.2 2.9 2.2 1.2 0 2.1-.4 2.7-1.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

const TABS: { id: GameTab; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'DASHBOARD', icon: <IconDashboard /> },
  { id: 'creator', label: 'CREATOR', icon: <IconCreator /> },
  { id: 'schedule', label: 'STUDIO', icon: <IconSchedule /> },
  { id: 'ranking', label: 'RANKING', icon: <IconRanking /> },
]

type InGameProps = {
  registeredCharacters: RegisteredCharacter[]
  ownedCreators: OwnedCreator[]
  studioSlots: StudioSlot[]
  events: GameEvent[]
  registeredStaff: RegisteredStaff[]
  managerState: SlotManagerState
  onManagerStateChange: (state: SlotManagerState) => void
  onStudioSlotsChange: (slots: StudioSlot[]) => void
  onOwnedCreatorsChange: (creators: OwnedCreator[]) => void
  onScout: (creator: OwnedCreator) => void
  onBack: () => void
  onOpenEditor?: () => void
  watchedEventIds?: string[]
  onEventWatched?: (eventId: string) => void
  stationGradeConfig: StationGradeConfig
}

export function InGame({
  registeredCharacters,
  ownedCreators,
  studioSlots,
  events,
  registeredStaff,
  managerState,
  onManagerStateChange,
  onStudioSlotsChange,
  onOwnedCreatorsChange,
  onScout,
  onBack,
  onOpenEditor,
  watchedEventIds = [],
  onEventWatched,
  stationGradeConfig,
}: InGameProps) {
  const { t, locale, setLocale } = useTranslation()

  useEffect(() => {
    setStationGradeConfig(stationGradeConfig)
  }, [stationGradeConfig])
  const [tab, setTab] = useState<GameTab>('dashboard')
  const [scheduleStudioMode, setScheduleStudioMode] = useState<'creator' | 'staff' | undefined>(undefined)
  const [scheduleSelectedStaffId, setScheduleSelectedStaffId] = useState<string | null>(null)

  function handleAssignStaffPlacement(staffId: string) {
    setScheduleStudioMode('staff')
    setScheduleSelectedStaffId(staffId)
    setTab('schedule')
  }
  const speed: SpeedOption = '1x'
  const [gameMonth, setGameMonth] = useState(0)
  const [broadcastPhase, setBroadcastPhase] = useState<BroadcastPhase>('prep')
  const [livePlayVideoByCreator, setLivePlayVideoByCreator] = useState<Record<string, string>>({})
  const livePlayVideoByCreatorRef = useRef(livePlayVideoByCreator)
  const [monthWeekIndex, setMonthWeekIndex] = useState(0)
  const [assets, setAssets] = useState(INITIAL_ASSETS)
  const assetsRef = useRef(assets)
  const [liveEvents, setLiveEvents] = useState<DayEvent[]>([])
  const [conditionCrashes, setConditionCrashes] = useState<ConditionCrashFxItem[]>([])
  const [gearFailBursts, setGearFailBursts] = useState<GearFailBurstItem[]>([])
  const [staffActions, setStaffActions] = useState<StaffActionFxItem[]>([])
  const [toxicQteQueue, setToxicQteQueue] = useState<ToxicWhackQteItem[]>([])
  const [liveRevenueByCreator, setLiveRevenueByCreator] = useState<Record<string, number>>({})
  const [liveWeekProgress, setLiveWeekProgress] = useState(0)
  const [liveStaminaDrainByCreatorId, setLiveStaminaDrainByCreatorId] = useState<
    Record<string, number>
  >({})
  const [slotGearById, setSlotGearById] = useState<Record<string, SlotGear>>(() =>
    createSlotGearMapFromSlots(studioSlots),
  )
  const [weeklyStatement, setWeeklyStatement] = useState<WeeklyStatement | null>(null)
  const [settlementAssetsAfter, setSettlementAssetsAfter] = useState(0)
  const [settlementPortraits, setSettlementPortraits] = useState<Record<string, string>>({})
  const [broadcastEndedNotice, setBroadcastEndedNotice] = useState(false)
  /** 월간 방송 종료 후 명세서 대기·표시 중 — 닫기 전까지 방송 시작 잠금 */
  const [startBroadcastLocked, setStartBroadcastLocked] = useState(false)
  const [openCreatorScout, setOpenCreatorScout] = useState(false)
  const [openStaffScout, setOpenStaffScout] = useState(false)
  const [broadcastMonthNumber, setBroadcastMonthNumber] = useState(1)
  const [league, setLeague] = useState<LeagueState>(() => createInitialLeagueState([], 'black'))
  const [rankSettlement, setRankSettlement] = useState<RankSettlementResult | null>(null)
  const [rankRefreshTurnsLeft, setRankRefreshTurnsLeft] = useState(RANK_REFRESH_TURNS)
  const [rankBubblePlay, setRankBubblePlay] = useState<{
    fromRank: number
    toRank: number
  } | null>(null)
  const [promotionFx, setPromotionFx] = useState<{
    fromGrade: StationGrade
    toGrade: StationGrade
    fromRank: number
    toRank: number
  } | null>(null)
  const [stationGrade, setStationGrade] = useState<StationGrade>('black')

  const [, setStaffScoutCooldown] = useState(3)
  const [staffScoutAvailable, setStaffScoutAvailable] = useState(false)
  const staffScoutAvailableRef = useRef(staffScoutAvailable)
  staffScoutAvailableRef.current = staffScoutAvailable
  const [, setCreatorScoutCooldown] = useState(0)
  const [creatorScoutAvailable, setCreatorScoutAvailable] = useState(false)
  const creatorScoutAvailableRef = useRef(creatorScoutAvailable)
  creatorScoutAvailableRef.current = creatorScoutAvailable
  const [creatorScoutFirstDone, setCreatorScoutFirstDone] = useState(false)
  const creatorScoutFirstDoneRef = useRef(creatorScoutFirstDone)
  creatorScoutFirstDoneRef.current = creatorScoutFirstDone
  const [scoutedStaffCandidate, setScoutedStaffCandidate] = useState<ScoutedStaffCandidate | null>(null)
  const [hiredStaffSalaries, setHiredStaffSalaries] = useState<Record<string, number>>({})
  const hiredStaffSalariesRef = useRef(hiredStaffSalaries)
  hiredStaffSalariesRef.current = hiredStaffSalaries
  const [hiredStaffStartMonths, setHiredStaffStartMonths] = useState<Record<string, number>>({})
  const hiredStaffStartMonthsRef = useRef(hiredStaffStartMonths)
  hiredStaffStartMonthsRef.current = hiredStaffStartMonths
  const [staffSalaryRaiseRequest, setStaffSalaryRaiseRequest] = useState<{
    staffId: string
    staffName: string
    staffKind: StaffKind
    iconUrl: string | null
    mediaRevision?: number
    currentSalary: number
    requestedSalary: number
  } | null>(null)

  const [stationReview, setStationReview] = useState<{
    promoted: boolean
    status: StationReviewStatus
  } | null>(null)
  const [vipOffer, setVipOffer] = useState<VipOffer | null>(null)
  const [vipResult, setVipResult] = useState<VipResult | null>(null)
  const [vipEventPlay, setVipEventPlay] = useState<{
    offer: VipOffer
    event: GameEvent
    staminaMaxLoss: number
  } | null>(null)
  type SocialUi =
    | { mode: 'dateOffer'; pending: DatePending }
    | { mode: 'dateVn'; pending: DatePending; event: GameEvent }
    | { mode: 'dateResult'; pending: DatePending }
    | { mode: 'giftOffer'; pending: GiftPending }
    | {
        mode: 'giftResult'
        pending: GiftPending
        accepted: boolean
        conditionDelta: number
        staminaDelta: number
      }
    | { mode: 'hRetryOffer'; pending: HRetryPending }
    | {
        mode: 'hRetryVn'
        pending: HRetryPending
        event: GameEvent
        staminaLoss: number
      }
    | {
        mode: 'hRetryResult'
        pending: HRetryPending
        accepted: boolean
        staminaLoss: number
        conditionLoss: number
      }
  const [socialUi, setSocialUi] = useState<SocialUi | null>(null)
  const [showGameClear, setShowGameClear] = useState(false)

  // 스카웃 VN 이벤트 진행
  type ScoutEventState = {
    creator: OwnedCreator
    currentEvent: GameEvent
  }
  type PromoteSalaryNego = {
    creatorId: string
    creatorName: string
    previousGrade: Grade
    newGrade: Grade
    previousSalary: number
    proposedSalary: number
    salaryEvent: GameEvent | null
  }

  const [scoutEventState, setScoutEventState] = useState<ScoutEventState | null>(null)
  const [restRequiredName, setRestRequiredName] = useState<string | null>(null)
  const [scoutSystem, setScoutSystem] = useState<ScoutSystemState>(() =>
    createInitialScoutState(1),
  )
  const [promoteQueue, setPromoteQueue] = useState<PromoteSalaryNego[]>([])
  const [salaryEventPlay, setSalaryEventPlay] = useState<PromoteSalaryNego | null>(null)
  const [promotionExam, setPromotionExam] = useState<{
    creatorId: string
    creatorName: string
    result: PromotionExamResult
  } | null>(null)
  const [snsResultQueue, setSnsResultQueue] = useState<SnsResult[]>([])
  const snsResultQueueRef = useRef<SnsResult[]>([])
  const promotionExamRef = useRef(promotionExam)
  promotionExamRef.current = promotionExam
  const [recruitFlyCard, setRecruitFlyCard] = useState<RecruitFlyCard | null>(null)
  const [spotlightCreatorId, setSpotlightCreatorId] = useState<string | null>(null)
  const spotlightTimerRef = useRef<number | null>(null)
  const scoutSystemRef = useRef(scoutSystem)
  const registeredCharactersRef = useRef(registeredCharacters)
  const eventsRef = useRef(events)
  scoutSystemRef.current = scoutSystem
  registeredCharactersRef.current = registeredCharacters
  eventsRef.current = events

  /** 하단 탭 클릭 — 매니지먼트(CREATOR) 탭은 대기 중인 스카우트/영입 제안이 있으면 해당 뷰로 바로 이동 */
  function handleTabClick(next: GameTab) {
    setTab(next)
    if (next !== 'creator') return
    if (scoutSystem.activeOffer) {
      setOpenCreatorScout(true)
    } else if (scoutedStaffCandidate) {
      setOpenStaffScout(true)
    }
  }

  function beginRecruitPresentation(creator: OwnedCreator) {
    onScout(creator)
    setScoutSystem((prev) => clearFirstHireGuarantee(prev))
    setTab('schedule')
    setRecruitFlyCard({
      id: creator.id,
      name: creator.name,
      grade: creator.grade,
      profileImageUrl: creator.profileImageUrl || null,
    })
  }

  function beginScoutVisualNovel(creator: OwnedCreator) {
    const charDef = registeredCharactersRef.current.find((c) => c.id === creator.id)
    const scoutEventId = charDef?.eventLinks?.scout
    const scoutEvent = scoutEventId
      ? eventsRef.current.find((e) => e.id === scoutEventId) ?? null
      : null
    if (scoutEvent) {
      setScoutEventState({
        creator,
        currentEvent: scoutEvent,
      })
      return
    }
    beginRecruitPresentation(creator)
  }

  function applyPromotedSalary(item: PromoteSalaryNego) {
    const nextOwned = ownedCreatorsRef.current.map((creator) =>
      creator.id === item.creatorId
        ? { ...creator, salary: item.proposedSalary, grade: item.newGrade }
        : creator,
    )
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
    setPromoteQueue((prev) => {
      const idx = prev.findIndex((row) => row.creatorId === item.creatorId)
      if (idx < 0) return prev
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })
    setSalaryEventPlay((prev) => (prev?.creatorId === item.creatorId ? null : prev))
  }

  function finishRecruitFly() {
    const id = recruitFlyCard?.id ?? null
    setRecruitFlyCard(null)
    if (!id) return
    setSpotlightCreatorId(id)
    if (spotlightTimerRef.current != null) {
      window.clearTimeout(spotlightTimerRef.current)
    }
    spotlightTimerRef.current = window.setTimeout(() => {
      setSpotlightCreatorId((prev) => (prev === id ? null : prev))
      spotlightTimerRef.current = null
    }, 2200)
  }

  useEffect(() => {
    return () => {
      if (spotlightTimerRef.current != null) {
        window.clearTimeout(spotlightTimerRef.current)
      }
      if (statementDelayTimerRef.current != null) {
        window.clearTimeout(statementDelayTimerRef.current)
      }
    }
  }, [])

  // 승급 연봉 큐 → VN 또는 팝업 (명세서 대기/표시·스카우트 강제 오픈 중에는 대기)
  useEffect(() => {
    if (
      salaryEventPlay ||
      scoutEventState ||
      weeklyStatement ||
      rankSettlement ||
      stationReview ||
      vipOffer ||
      vipResult ||
      vipEventPlay ||
      socialUi ||
      startBroadcastLocked ||
      openCreatorScout ||
      promotionExam
    ) {
      return
    }
    const next = promoteQueue[0]
    if (!next) return
    if (next.salaryEvent) {
      setSalaryEventPlay(next)
    }
  }, [
    promoteQueue,
    salaryEventPlay,
    scoutEventState,
    weeklyStatement,
    rankSettlement,
    stationReview,
    vipOffer,
    vipResult,
    vipEventPlay,
    socialUi,
    startBroadcastLocked,
    openCreatorScout,
    promotionExam,
  ])

  const activePromotePopup =
    !salaryEventPlay &&
    !scoutEventState &&
    !weeklyStatement &&
    !rankSettlement &&
    !stationReview &&
    !vipOffer &&
    !vipResult &&
    !vipEventPlay &&
    !socialUi &&
    !startBroadcastLocked &&
    !openCreatorScout &&
    !promotionExam
      ? promoteQueue.find((row) => !row.salaryEvent) ?? null
      : null

  function handleCreatorScoutHire(offer: ScoutOffer) {
    const freeHire = ownedCreatorsRef.current.length === 0
    const check = canHireScoutOffer(offer, assets, freeHire)
    if (!check.ok) return
    const creator = hireScoutOffer(offer)
    if (!freeHire) {
      setAssets((prev) => prev - offer.salary)
    }
    setScoutSystem((prev) => clearScoutOfferAfterHire(prev))
    beginScoutVisualNovel(creator)
  }

  function handleScoutEventFinished() {
    if (!scoutEventState) return
    const { creator, currentEvent } = scoutEventState
    onEventWatched?.(currentEvent.id)
    setScoutEventState(null)
    beginRecruitPresentation(creator)
  }

  // 등록 캐릭터 로드 후 첫 스카우트 강제 등장
  useEffect(() => {
    setScoutSystem((prev) =>
      ensureOpeningScout(
        prev,
        broadcastMonthNumberRef.current,
        registeredCharacters,
        ownedCreatorsRef.current.map((c) => c.id),
      ),
    )
  }, [registeredCharacters])

  // 보유 로스터 승격 게이트 즉시 반영 (정산 시 방송 인원만 보고 막힌 순위 보정)
  const rosterGateKey = ownedCreators
    .map((creator) => `${creator.id}:${creator.grade}`)
    .sort()
    .join('|')
  useEffect(() => {
    const next = reapplyLeagueGate(
      leagueRef.current,
      toRankCreators(ownedCreatorsRef.current),
      stationGradeRef.current,
    )
    if (next === leagueRef.current) return
    leagueRef.current = next
    setLeague(next)
  }, [rosterGateKey])

  // 보유 0명이면 스카우트 후보가 생기는 즉시 스카우트 창으로
  useEffect(() => {
    if (ownedCreators.length > 0) return
    if (
      weeklyStatement ||
      rankSettlement ||
      stationReview ||
      vipOffer ||
      vipResult ||
      vipEventPlay ||
      socialUi ||
      scoutEventState ||
      openCreatorScout ||
      snsResultQueue.length > 0
    ) {
      return
    }
    if (!scoutSystem.activeOffer) return
    setTab('creator')
    setOpenCreatorScout(true)
  }, [
    ownedCreators.length,
    scoutSystem.activeOffer,
    weeklyStatement,
    rankSettlement,
    stationReview,
    vipOffer,
    vipResult,
    vipEventPlay,
    socialUi,
    scoutEventState,
    openCreatorScout,
    snsResultQueue.length,
  ])
  const dayPlanRef = useRef<StudioDayPlan | null>(null)
  const dayStartedAtRef = useRef<number | null>(null)
  const revealedIdsRef = useRef(new Set<string>())
  const donationBatchRef = useRef(new Map<string, DonationBatch>())
  const feedExtraQueueRef = useRef<DayEvent[]>([])
  const lastFeedEmitAtRef = useRef(0)
  const settledDayKeyRef = useRef<string | null>(null)
  const weekAccumRef = useRef<WeekAccumulator>(createWeekAccumulator(1))
  const prevWeekRevenueRef = useRef<number | null>(null)
  const weekFinishedRef = useRef(false)
  const toxicQteQueueRef = useRef<ToxicWhackQteItem[]>([])
  const weekInspectionsRef = useRef<WeekInspection[]>([])
  const productionBonusShownRef = useRef(new Set<string>())
  const broadcastBlockedSinceRef = useRef<Record<string, number>>({})
  const liveStaminaDrainByCreatorIdRef = useRef<Record<string, number>>({})
  const pendingWeekAdvanceAfterToxicRef = useRef(false)
  const statementDelayTimerRef = useRef<number | null>(null)
  const leagueRef = useRef(league)
  const pendingScoutAfterRankRef = useRef(false)
  const pendingRankResultRef = useRef<RankSettlementResult | null>(null)
  const pendingRankAfterBubbleRef = useRef<RankSettlementResult | null>(null)
  /** 승급 애니메이션(말풍선 상승)이 끝난 뒤 리그 상태에 반영할 승급 정보 */
  const pendingPromotionRef = useRef<{
    nextGrade: StationGrade
    oldRank: number
    newRank: number
  } | null>(null)
  const rankRefreshTurnsLeftRef = useRef(RANK_REFRESH_TURNS)
  const pendingStationReviewRef = useRef(false)
  const pendingGameClearRef = useRef(false)
  const pendingSocialQueueRef = useRef<SocialPending[]>([])
  const socialSpawnRef = useRef(createSocialSpawnState())
  const stationGradeRef = useRef(stationGrade)
  const annualRevenueByYearRef = useRef<Record<number, number>>({})
  const studioSlotsRef = useRef(studioSlots)
  const slotGearByIdRef = useRef(slotGearById)
  const ownedCreatorsRef = useRef(ownedCreators)
  const managerStateRef = useRef(managerState)
  const onManagerStateChangeRef = useRef(onManagerStateChange)
  const speedRef = useRef(speed)
  const onOwnedCreatorsChangeRef = useRef(onOwnedCreatorsChange)
  const gameMonthRef = useRef(gameMonth)
  const broadcastPhaseRef = useRef(broadcastPhase)
  const monthWeekIndexRef = useRef(monthWeekIndex)
  const broadcastMonthNumberRef = useRef(broadcastMonthNumber)
  studioSlotsRef.current = studioSlots
  slotGearByIdRef.current = slotGearById
  ownedCreatorsRef.current = ownedCreators
  managerStateRef.current = managerState
  onManagerStateChangeRef.current = onManagerStateChange

  useEffect(() => {
    setSlotGearById((prev) => {
      const next = ensureUnlockedSlotGear(prev, studioSlots)
      slotGearByIdRef.current = next
      return next
    })
  }, [studioSlots])
  assetsRef.current = assets
  livePlayVideoByCreatorRef.current = livePlayVideoByCreator
  speedRef.current = speed
  onOwnedCreatorsChangeRef.current = onOwnedCreatorsChange
  gameMonthRef.current = gameMonth
  broadcastPhaseRef.current = broadcastPhase
  monthWeekIndexRef.current = monthWeekIndex
  broadcastMonthNumberRef.current = broadcastMonthNumber
  leagueRef.current = league
  stationGradeRef.current = stationGrade
  const handCards = ownedCreators.map(toStudioHandCard)

  function rollLivePlayVideos(prev: Record<string, string> = {}) {
    const next: Record<string, string> = {}
    for (const slot of studioSlotsRef.current) {
      if (slot.status !== 'assigned' || !slot.assignment) continue
      const owned = ownedCreatorsRef.current.find((c) => c.id === slot.assignment!.creatorId)
      if (!owned) continue
      const url = pickRandomBroadcastVideoUrl(owned, 1, prev[owned.id])
      if (url) next[owned.id] = url
    }
    setLivePlayVideoByCreator(next)
  }

  function handleUnlockStudioSlot() {
    if (broadcastPhase === 'live') return
    const unlocked = countUnlockedSlots(studioSlotsRef.current)
    if (unlocked >= 6) return
    // 슬롯 해금은 랭킹 화면의 기업 등급과 동일 기준 (일반사업자 등)
    if (!meetsSlotUnlockByRank(stationGradeConfig, leagueRef.current.currentRank, unlocked)) {
      const required = slotUnlockMinGradeOf(stationGradeConfig, unlocked)
      alert(
        required
          ? t('alert.stationGradeRequiredDetail').replace('{tier}', t(companyTierLabelKey(required)))
          : t('alert.stationGradeRequired'),
      )
      return
    }
    const price =
      slotUnlockPriceOf(stationGradeConfig, unlocked) ?? calcSlotUnlockCost(unlocked)
    if (assetsRef.current < price) {
      alert(t('alert.insufficientAssets'))
      return
    }
    setAssets((prev) => prev - price)
    assetsRef.current -= price
    const nextSlots = unlockNextStudioSlot(studioSlotsRef.current)
    studioSlotsRef.current = nextSlots
    onStudioSlotsChange(nextSlots)
    setSlotGearById((prev) => {
      const next = ensureUnlockedSlotGear(prev, nextSlots)
      slotGearByIdRef.current = next
      return next
    })
    const nextManagers = ensureUnlockedSlotManagers(managerStateRef.current, nextSlots)
    managerStateRef.current = nextManagers
    onManagerStateChange(nextManagers)
  }

  function handleScoutCreator() {
    if (!creatorScoutAvailableRef.current) return
    const maxScout = maxScoutCreatorsForGrade(stationGradeConfig, stationGradeRef.current)
    if (ownedCreatorsRef.current.length >= maxScout) {
      alert(t('alert.scoutLimitReached'))
      return
    }
    const offer = createRandomScoutOffer(
      registeredCharactersRef.current,
      ownedCreatorsRef.current.map((c) => c.id),
      'C',
    )
    if (!offer) {
      alert(t('alert.noScoutCandidate'))
      return
    }
    const turn = broadcastMonthNumberRef.current
    setScoutSystem((prev) => ({
      ...prev,
      activeOffer: offer,
      offerAppearedTurn: turn,
      lastAppearTurn: turn,
      hasUnread: true,
      openingScoutPending: false,
      appearCount: prev.appearCount + 1,
    }))
    setCreatorScoutAvailable(false)
    setCreatorScoutCooldown(rollInt(3, 6))
    setOpenCreatorScout(true)
  }

  function slottedCreatorsFrom(list: OwnedCreator[]) {
    return studioSlotsRef.current
      .filter((slot) => slot.status === 'assigned' && slot.assignment)
      .map((slot) => list.find((c) => c.id === slot.assignment!.creatorId))
      .filter((c): c is OwnedCreator => Boolean(c))
  }

  function assignedCreatorsFrom(list: OwnedCreator[]) {
    return slottedCreatorsFrom(list).filter((c) => canBroadcastByStamina(c.stamina))
  }

  function toRankCreators(list: OwnedCreator[]): RankCreator[] {
    return list.map((creator) => ({
      id: creator.id,
      name: creator.name,
      grade: creator.grade,
      condition: creator.condition,
      conditionScore: creator.conditionScore,
      statCommunication: creator.statCommunication,
    }))
  }

  function openScoutFromRanking() {
    setTab('creator')
    if (ownedCreatorsRef.current.length === 0) {
      setOpenCreatorScout(true)
      return
    }
    if (creatorScoutAvailableRef.current) {
      handleScoutCreator()
    } else if (scoutSystemRef.current.activeOffer) {
      setOpenCreatorScout(true)
    }
  }

  /** 무배치면 주당 1초, 아니면 기본 5초 (배속 적용) */
  function weekDurationMs(speedOpt: SpeedOption = speedRef.current) {
    const empty = assignedCreatorsFrom(ownedCreatorsRef.current).length === 0
    const base = empty ? MS_PER_EMPTY_BROADCAST_WEEK : MS_PER_GAME_WEEK
    return base / speedMultiplierOf(speedOpt)
  }

  /** 한 주 시작: 현재 컨디션으로 주간 수익 DayPlan 선계산 */
  function beginDayPlan(dayKey: string, weekMs: number) {
    const revenueMult = 1
    const assigned = assignedCreatorsFrom(ownedCreatorsRef.current)
    const revenueMultByCreatorId: Record<string, number> = {}
    for (const creator of assigned) {
      const slotId = findSlotIdForCreator(studioSlotsRef.current, creator.id)
      const production = slotId
        ? staffBonusOf(managerStateRef.current, slotId, 'production')
        : { mul: 1 }
      revenueMultByCreatorId[creator.id] = revenueMult * production.mul
    }
    const plan = buildStudioDayPlan(
      assigned,
      weekMs,
      dayKey,
      leagueRef.current.revenueBonusPercent,
      revenueMultByCreatorId,
      leagueRef.current.viewers,
    )
    dayPlanRef.current = plan
    dayStartedAtRef.current = performance.now()
    revealedIdsRef.current = new Set()
    settledDayKeyRef.current = null
    const staminaMult = 1
    const drainByCreatorId: Record<string, number> = {}
    for (const creator of slottedCreatorsFrom(ownedCreatorsRef.current)) {
      const slotId = findSlotIdForCreator(studioSlotsRef.current, creator.id)
      const care = slotId ? staffBonusOf(managerStateRef.current, slotId, 'care') : { equipped: false }
      const careMult = care.equipped ? CARE_STAMINA_MULT : 1
      const combined = Math.max(0.5, Math.min(1, staminaMult * careMult))
      drainByCreatorId[creator.id] = Math.max(
        1,
        Math.round(calcWeeklyBroadcastStaminaCost(creator.statElegance) * combined),
      )
    }
    liveStaminaDrainByCreatorIdRef.current = drainByCreatorId
    setLiveStaminaDrainByCreatorId(drainByCreatorId)
    broadcastBlockedSinceRef.current = {}
    setLiveWeekProgress(0)
    donationBatchRef.current = new Map()
    feedExtraQueueRef.current = []
    lastFeedEmitAtRef.current = 0
    // 매주 랜덤 검사(진상/보안·수리 연출). 마지막 주도 동일하게 돌려 보안 방어가 빠지지 않게 한다.
    const inspectSlots = studioSlotsRef.current.filter(
      (slot) =>
        slot.status === 'assigned' &&
        slot.assignment &&
        assigned.some((creator) => creator.id === slot.assignment!.creatorId),
    )
    const inspectTimes = pickInspectionTimes(inspectSlots.length, weekMs)
    productionBonusShownRef.current = new Set()
    weekInspectionsRef.current = inspectSlots.map((slot, index) => ({
      creatorId: slot.assignment!.creatorId,
      slotId: slot.id,
      atMs: inspectTimes[index] ?? weekMs * 0.5,
      done: false,
    }))
  }

  function isCreatorDonationBlocked(creatorId: string, atMs?: number) {
    if (isCreatorSlotBroken(studioSlotsRef.current, slotGearByIdRef.current, creatorId)) {
      return true
    }
    const blockProgress = broadcastBlockedSinceRef.current[creatorId]
    if (blockProgress == null) return false
    const plan = dayPlanRef.current
    if (!plan || atMs == null) return true
    return atMs / plan.dayMs >= blockProgress
  }

  function trackBroadcastBlocks(elapsed: number) {
    const plan = dayPlanRef.current
    if (!plan || plan.dayMs <= 0) return
    const progress = elapsed / plan.dayMs
    for (const creator of slottedCreatorsFrom(ownedCreatorsRef.current)) {
      if (broadcastBlockedSinceRef.current[creator.id] != null) continue
      const drain = liveStaminaDrainByCreatorIdRef.current[creator.id] ?? 0
      if (isCreatorBroadcastBlockedLive(creator, drain, progress)) {
        broadcastBlockedSinceRef.current[creator.id] = progress
        donationBatchRef.current.delete(creator.id)
      }
    }
  }

  function isCreatorInspectionBlocked(creatorId: string, atMs: number) {
    const plan = dayPlanRef.current
    if (!plan || plan.dayMs <= 0) return false
    const creator = ownedCreatorsRef.current.find((row) => row.id === creatorId)
    if (!creator) return true
    const progress = atMs / plan.dayMs
    const blockProgress = broadcastBlockedSinceRef.current[creatorId]
    if (blockProgress != null && progress >= blockProgress) return true
    const drain = liveStaminaDrainByCreatorIdRef.current[creatorId] ?? 0
    return isCreatorBroadcastBlockedLive(creator, drain, progress)
  }

  function creditLiveDonations(events: DayEvent[]) {
    const donations = events.filter(
      (event) =>
        event.type === 'donation' &&
        event.amount > 0 &&
        !isCreatorDonationBlocked(event.creatorId, event.atMs),
    )
    if (donations.length === 0) return
    setLiveRevenueByCreator((prev) => {
      const next = { ...prev }
      for (const event of donations) {
        next[event.creatorId] = (next[event.creatorId] ?? 0) + event.amount
      }
      return next
    })
  }

  /** 고장난 칸의 후원은 로그/수익/FX에 넣지 않고 소멸(공개된 것으로 표시) */
  function takeRevealableEvents(events: DayEvent[]) {
    const visible: DayEvent[] = []
    for (const event of events) {
      if (revealedIdsRef.current.has(event.id)) continue
      if (
        event.type === 'donation' &&
        isCreatorDonationBlocked(event.creatorId, event.atMs)
      ) {
        revealedIdsRef.current.add(event.id)
        continue
      }
      if (
        event.type === 'donation' &&
        isCreatorSlotBroken(studioSlotsRef.current, slotGearByIdRef.current, event.creatorId)
      ) {
        revealedIdsRef.current.add(event.id)
        continue
      }
      revealedIdsRef.current.add(event.id)
      visible.push(event)
    }
    return visible
  }

  function flushRemainingEvents(plan: StudioDayPlan) {
    const pending = takeRevealableEvents(plan.plans.flatMap((p) => p.events))
    ingestLiveFeedEvents(pending, plan, true)
  }

  function pushLiveFeed(events: DayEvent[]) {
    const visible = events.filter(
      (event) =>
        event.type !== 'donation' ||
        !isCreatorDonationBlocked(event.creatorId, event.atMs),
    )
    if (visible.length === 0) return
    creditLiveDonations(visible)
    setLiveEvents((prev) => [...visible.reverse(), ...prev].slice(0, MAX_RECENT_EVENTS))
  }

  function ingestLiveFeedEvents(due: DayEvent[], plan: StudioDayPlan, force: boolean) {
    const hasBuffered =
      donationBatchRef.current.size > 0 || feedExtraQueueRef.current.length > 0
    if (due.length === 0 && !hasBuffered) return

    if (plan.plans.length < FEED_BATCH_MIN_CREATORS) {
      if (due.length > 0) pushLiveFeed(due)
      return
    }

    for (const event of due) {
      if (event.type === 'donation' && event.amount > 0) {
        if (isCreatorDonationBlocked(event.creatorId, event.atMs)) continue
        addDonationToBatch(donationBatchRef.current, event)
      } else {
        feedExtraQueueRef.current.push(event)
      }
    }

    const now = performance.now()
    const emit: DayEvent[] = []
    if (force) {
      let stamp = 0
      while (donationBatchRef.current.size > 0) {
        const batch = takeLargestDonationBatch(donationBatchRef.current)
        if (!batch) break
        if (isCreatorDonationBlocked(batch.creatorId)) continue
        emit.push(donationEventFromBatch(batch, `${plan.dayKey}-${stamp}`, t))
        stamp += 1
      }
      emit.push(...feedExtraQueueRef.current)
      feedExtraQueueRef.current = []
      lastFeedEmitAtRef.current = now
      pushLiveFeed(emit)
      return
    }

    const gapMs = Math.max(280, weekDurationMs() / SOLO_FEED_EVENTS_PER_WEEK)
    if (lastFeedEmitAtRef.current > 0 && now - lastFeedEmitAtRef.current < gapMs) return

    const batch = takeLargestDonationBatch(donationBatchRef.current)
    if (batch && !isCreatorDonationBlocked(batch.creatorId)) {
      emit.push(donationEventFromBatch(batch, `${plan.dayKey}-${Math.round(now)}`, t))
    } else if (batch) {
      // blocked creator batch — drop and retry next tick
      return
    } else {
      const extra = feedExtraQueueRef.current.shift()
      if (extra) emit.push(extra)
    }
    if (emit.length === 0) return
    lastFeedEmitAtRef.current = now
    pushLiveFeed(emit)
  }

  function presentGearFails(
    plan: StudioDayPlan,
    newlyBrokenSlots: Array<{
      id: string
      label: string
      assignment?: { creatorId: string; creatorName: string } | null
    }>,
  ) {
    if (newlyBrokenSlots.length === 0) return
    setTab('dashboard')
    setGearFailBursts((prev) => [
      ...prev,
      ...newlyBrokenSlots.map((slot) => ({
        id: `gear-fail-fx-${slot.id}-${plan.dayKey}-${Math.round(performance.now())}`,
        slotId: slot.id,
      })),
    ])
    const failEvents: DayEvent[] = newlyBrokenSlots.map((slot) => {
      const creatorName = creatorNameOf(
        slot.assignment?.creatorId,
        slot.assignment?.creatorName ?? slot.label,
      )
      return {
        id: `gear-fail-${slot.id}-${plan.dayKey}-${Math.round(performance.now())}`,
        creatorId: slot.assignment?.creatorId ?? slot.id,
        creatorName,
        type: 'gear',
        amount: 0,
        text: t('feed.gearFail').replace('{name}', creatorName),
        atMs: 0,
        tone: 'bg-amber-400',
      }
    })
    setLiveEvents((prev) => [...failEvents.reverse(), ...prev].slice(0, MAX_RECENT_EVENTS))
  }

  function staffNameOf(staffId: string | null) {
    if (!staffId) return ''
    const staff = registeredStaff.find((row) => row.id === staffId)
    return staffDisplayName(staff, locale)
  }

  /** Recent Events 등에 표시할 크리에이터 이름을 현재 언어로 (없으면 fallback) */
  function creatorNameOf(creatorId: string | null | undefined, fallback = ''): string {
    if (!creatorId) return fallback
    const creator = ownedCreatorsRef.current.find((row) => row.id === creatorId)
    return creator ? characterDisplayName(creator, locale) : fallback
  }

  function presentStaffAction(
    slotId: string,
    kind: StaffKind,
    title: string,
    subtitle: string,
    feedText: string,
    creatorId?: string,
    creatorName?: string,
  ) {
    setTab('dashboard')
    setStaffActions((prev) => [
      ...prev,
      {
        id: `staff-fx-${kind}-${slotId}-${Math.round(performance.now())}`,
        slotId,
        kind,
        title,
        subtitle,
      },
    ])
    setLiveEvents((prev) =>
      [
        {
          id: `staff-${kind}-${slotId}-${Math.round(performance.now())}`,
          creatorId: creatorId ?? slotId,
          creatorName: creatorName ?? slotId,
          type: (kind === 'production' ? 'viewers' : kind === 'repair' ? 'gear' : 'toxic') as any,
          amount: 0,
          text: feedText,
          atMs: 0,
          tone:
            kind === 'security'
              ? 'bg-rose-400'
              : kind === 'repair'
                ? 'bg-amber-400'
                : kind === 'care'
                  ? 'bg-emerald-400'
                  : 'bg-violet-400',
        },
        ...prev,
      ].slice(0, MAX_RECENT_EVENTS),
    )
  }

  function grantProductionBonus(slotId: string, creatorId: string, creatorName: string) {
    if (productionBonusShownRef.current.has(slotId)) return
    const production = staffBonusOf(managerStateRef.current, slotId, 'production')
    if (!production.equipped) return
    productionBonusShownRef.current.add(slotId)
    const bonus = productionViewerBonus(leagueRef.current.viewers)
    if (bonus > 0) {
      const nextViewers = capStationViewers(
        leagueRef.current.viewers + bonus,
        stationGradeRef.current,
      )
      leagueRef.current = { ...leagueRef.current, viewers: nextViewers }
      setLeague(leagueRef.current)
    }
    const name = staffNameOf(production.staffId)
    presentStaffAction(
      slotId,
      'production',
      t('dashboard.staffProd'),
      bonus > 0 ? `${t('dashboard.staffProdSub')} +${bonus}` : t('dashboard.staffProdSub'),
      t('feed.productionBonus')
        .replace('{name}', name || creatorName)
        .replace('{bonus}', String(bonus)),
      creatorId,
      creatorName,
    )
  }

  function tryCareRestore(creatorId: string, slotId: string) {
    const care = staffBonusOf(managerStateRef.current, slotId, 'care')
    if (!care.equipped) return false
    const creator = ownedCreatorsRef.current.find((row) => row.id === creatorId)
    if (!creator) return false
    const before = scoreOf(creator)
    if (before >= CONDITION_SCORE_RANGE.best.min) return false
    const nextOwned = ownedCreatorsRef.current.map((row) =>
      row.id === creatorId
        ? applyVitalsDelta(row, { condition: clampConditionScore(CONDITION_SCORE_RANGE.best.min - before) })
        : row,
    )
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
    const name = staffNameOf(care.staffId)
    presentStaffAction(
      slotId,
      'care',
      t('dashboard.staffCare'),
      t('dashboard.staffCareSub'),
      t('feed.care')
        .replace('{name}', name || creatorNameOf(creator.id))
        .replace('{creatorName}', creatorNameOf(creator.id)),
      creator.id,
      creatorNameOf(creator.id),
    )
    return true
  }

  function presentToxicCrashes(
    plan: StudioDayPlan,
    crashes: Array<{
      creatorId: string
      creatorName: string
      drop: number
      staminaDrop: number
    }>,
  ) {
    if (crashes.length === 0) return
    setTab('dashboard')
    const toxicEvents: DayEvent[] = crashes.map((crash) => ({
      id: `toxic-${crash.creatorId}-${plan.dayKey}-${Math.round(performance.now())}`,
      creatorId: crash.creatorId,
      creatorName: crash.creatorName,
      type: 'toxic' as const,
      amount: crash.drop,
      text: t('feed.toxicAppear')
        .replace('{name}', crash.creatorName)
        .replace('{drop}', String(crash.drop)),
      atMs: 0,
      tone: 'bg-rose-500',
    }))
    setLiveEvents((prev) => [...toxicEvents.reverse(), ...prev].slice(0, MAX_RECENT_EVENTS))
    setConditionCrashes((prev) => [
      ...prev,
      ...crashes.map((crash) => ({
        id: `crash-fx-${crash.creatorId}-${plan.dayKey}-${crash.drop}-${Math.round(performance.now())}`,
        creatorId: crash.creatorId,
        drop: crash.drop,
        staminaDrop: crash.staminaDrop,
      })),
    ])
    const qteItems: ToxicWhackQteItem[] = crashes.map((crash) => ({
      id: `toxic-qte-${crash.creatorId}-${plan.dayKey}-${crash.staminaDrop}-${Math.round(performance.now())}`,
      creatorId: crash.creatorId,
      creatorName: crash.creatorName,
      drop: crash.drop,
      staminaDrop: crash.staminaDrop,
    }))
    toxicQteQueueRef.current = [...toxicQteQueueRef.current, ...qteItems]
    setToxicQteQueue(toxicQteQueueRef.current)
    for (const crash of crashes) {
      weekAccumRef.current = {
        ...weekAccumRef.current,
        highlights: [
          t('feed.toxicCrash')
            .replace('{name}', crash.creatorName)
            .replace('{drop}', String(crash.drop)),
          ...weekAccumRef.current.highlights,
        ],
      }
    }
  }

  function runCreatorInspection(inspection: WeekInspection) {
    const plan = dayPlanRef.current
    if (!plan) return
    const creator = ownedCreatorsRef.current.find((row) => row.id === inspection.creatorId)
    if (!creator) return

    // 방송 불가(스테미나 고갈) 구간 — 진상·장비 고장 검사 없음
    if (isCreatorInspectionBlocked(creator.id, inspection.atMs)) return

    const managers = managerStateRef.current
    const security = staffBonusOf(managers, inspection.slotId, 'security')
    const repair = staffBonusOf(managers, inspection.slotId, 'repair')

    // 수리 장착 중이면 기존 고장도 즉시 점검·복구 (잔여 broken이 “고장 발동”처럼 보이지 않게)
    const gearNow = slotGearByIdRef.current[inspection.slotId]
    if (repair.equipped && gearNow?.broken) {
      const fixed = { ...slotGearByIdRef.current, [inspection.slotId]: repairSlotGear(gearNow) }
      slotGearByIdRef.current = fixed
      setSlotGearById(fixed)
      presentStaffAction(
        inspection.slotId,
        'repair',
        t('dashboard.staffBlockRepair'),
        t('dashboard.staffBlockRepairSub'),
        t('feed.repairFix').replace(
          '{name}',
          staffNameOf(repair.staffId) || characterDisplayName(creator, locale),
        ),
        creator.id,
        characterDisplayName(creator, locale),
      )
    }

    // 이미 장비 고장이 나 있는 상태인지 확인
    const alreadyBroken = isCreatorSlotBroken(studioSlotsRef.current, slotGearByIdRef.current, creator.id)

    // 진상 사태 주사위 (이미 고장난 상태가 아닐 때만 발생 가능)
    const toxicChance = calcConditionCrashChance(ownedCreatorsRef.current.length)
    const wouldToxic = !alreadyBroken && (Math.random() < toxicChance)
    let blockedOrResolved = false

    if (wouldToxic) {
      if (security.equipped) {
        // 진상이 실제로 뜬 경우에만 방어 연출. 피해는 적용하지 않음.
        presentStaffAction(
          inspection.slotId,
          'security',
          t('dashboard.staffBlockSecurity'),
          t('dashboard.staffBlockSecuritySub'),
          t('feed.securityBlocked').replace(
            '{name}',
            staffNameOf(security.staffId) || characterDisplayName(creator, locale),
          ),
          creator.id,
          characterDisplayName(creator, locale),
        )
      } else {
        const drop = rollInt(CONDITION_CRASH_DROP.min, CONDITION_CRASH_DROP.max)
        const staminaDrop = rollInt(
          CONDITION_CRASH_STAMINA_DROP.min,
          CONDITION_CRASH_STAMINA_DROP.max,
        )
        const nextOwned = ownedCreatorsRef.current.map((row) =>
          row.id === creator.id ? applyVitalsDelta(row, { condition: -drop }) : row,
        )
        ownedCreatorsRef.current = nextOwned
        onOwnedCreatorsChangeRef.current(nextOwned)
        presentToxicCrashes(plan, [
          {
            creatorId: creator.id,
            creatorName: characterDisplayName(creator, locale),
            drop,
            staminaDrop,
          },
        ])
        // 케어: 진상 QTE는 그대로 두고, 컨디션만 추가 회복
        tryCareRestore(creator.id, inspection.slotId)
      }
      blockedOrResolved = true
    }

    if (alreadyBroken) {
      // 고장난 칸은 장비 검사/프로덕션만 스킵. 보안 연출은 이미 처리됨.
      if (!blockedOrResolved || staffBonusOf(managers, inspection.slotId, 'production').equipped) {
        grantProductionBonus(inspection.slotId, creator.id, characterDisplayName(creator, locale))
      }
      return
    }

    // 진상이 등장하지 않은 경우에만 신규 장비 고장 검사 수행
    if (!wouldToxic) {
      const currentGear = slotGearByIdRef.current[inspection.slotId]
      if (currentGear && !currentGear.broken) {
        // 수리 장착 시 고장 적용 금지. 방어 FX는 위협 롤(최소 35%)로 보이게 한다.
        const naturalFailChance = gearFailChance(currentGear, 1)
        if (repair.equipped) {
          const showDefendFx = Math.random() < Math.max(naturalFailChance, 0.35)
          if (showDefendFx) {
            presentStaffAction(
              inspection.slotId,
              'repair',
              t('dashboard.staffBlockRepair'),
              t('dashboard.staffBlockRepairSub'),
              t('feed.repairDefense').replace(
                '{name}',
                staffNameOf(repair.staffId) || characterDisplayName(creator, locale),
              ),
              creator.id,
              characterDisplayName(creator, locale),
            )
            blockedOrResolved = true
          }
        } else {
          const breakThreat = tryBreakSlotGear(currentGear, 1)
          if (breakThreat.broken) {
            const nextGear = { ...slotGearByIdRef.current, [inspection.slotId]: breakThreat }
            slotGearByIdRef.current = nextGear
            setSlotGearById(nextGear)
            const slot = studioSlotsRef.current.find((row) => row.id === inspection.slotId)
            if (slot) presentGearFails(plan, [slot])
            blockedOrResolved = true
          }
        }
      }
    }

    // 프로덕션은 매 검사마다 한 번 보너스·연출 (슬롯당 주 1회는 grant 쪽에서 가드)
    if (!blockedOrResolved || staffBonusOf(managers, inspection.slotId, 'production').equipped) {
      grantProductionBonus(inspection.slotId, creator.id, characterDisplayName(creator, locale))
    }
  }

  function runDueInspections(elapsed: number) {
    for (const inspection of weekInspectionsRef.current) {
      if (inspection.done || elapsed < inspection.atMs) continue
      inspection.done = true
      runCreatorInspection(inspection)
    }
  }

  function flushRemainingInspections() {
    for (const inspection of weekInspectionsRef.current) {
      if (inspection.done) continue
      inspection.done = true
      runCreatorInspection(inspection)
    }
  }

  function repairBrokenSlot(slotId: string) {
    setGearFailBursts((prev) => prev.filter((row) => row.slotId !== slotId))
    setSlotGearById((prev) => {
      const current = prev[slotId]
      if (!current?.broken) return prev
      const next = { ...prev, [slotId]: repairSlotGear(current) }
      slotGearByIdRef.current = next
      return next
    })
  }

  function handleScoutStaff() {
    if (!staffScoutAvailableRef.current) return

    const hiredIds = managerStateRef.current.hiredStaffIds
    const pool = registeredStaff.filter((s) => !hiredIds.includes(s.id))
    if (pool.length > 0) {
      const picked = pool[Math.floor(Math.random() * pool.length)]
      const hiredCount = hiredIds.length
      const proposedHireCost = Math.round(15000 * Math.pow(1.8, hiredCount))
      const proposedSalary = Math.round(20000 * Math.pow(1.5, hiredCount))
      setScoutedStaffCandidate({
        ...picked,
        proposedHireCost,
        proposedSalary,
      })

      setStaffScoutAvailable(false)
      setStaffScoutCooldown(3)
    } else {
      setScoutedStaffCandidate(null)
      alert(t('alert.noStaffToRecruit'))
    }
  }

  function handleHireStaff(staffId: string, hireCost: number, salary: number) {
    if (managerStateRef.current.hiredStaffIds.includes(staffId)) return false
    if (assetsRef.current < hireCost) return false
    setAssets((prev) => prev - hireCost)
    setHiredStaffSalaries((prev) => ({
      ...prev,
      [staffId]: salary,
    }))
    setHiredStaffStartMonths((prev) => ({
      ...prev,
      [staffId]: gameMonth,
    }))
    const next = hireStaff(managerStateRef.current, staffId)
    managerStateRef.current = next
    onManagerStateChangeRef.current(next)
    setScoutedStaffCandidate(null)

    const staff = registeredStaff.find((s) => s.id === staffId)
    if (staff) {
      setRecruitFlyCard({
        id: staff.id,
        name: staffDisplayName(staff, locale),
        kind: t('creator.staffKindFormat').replace('{kind}', t(STAFF_KIND_LABEL_KEY[staff.kind])),
        profileImageUrl: staffCardUrl(staff) || staffIconUrl(staff),
        isStaff: true,
      })
      setScheduleStudioMode('staff')
      setTab('schedule')
    }

    return true
  }

  function handleEquipStaff(slotId: string, kind: StaffKind, staffId: string) {
    const next = equipStaff(managerStateRef.current, slotId, kind, staffId)
    managerStateRef.current = next
    onManagerStateChangeRef.current(next)
  }

  function handleUnequipStaff(slotId: string, kind: StaffKind) {
    const next = unequipStaff(managerStateRef.current, slotId, kind)
    managerStateRef.current = next
    onManagerStateChangeRef.current(next)
  }

  function settleCurrentDay() {
    const plan = dayPlanRef.current
    if (!plan || settledDayKeyRef.current === plan.dayKey) return
    settledDayKeyRef.current = plan.dayKey
    flushRemainingEvents(plan)
    flushRemainingInspections()
    const broadcastedIds = new Set(plan.plans.map((p) => p.creatorId))
    const prevGear = slotGearByIdRef.current
    // 주 종료: 스테미나/컨디션·내구 소모만. 진상·고장은 주중 랜덤 검사에서 처리
    const staminaMult = 1
    const conditionMult = 1
    const drainMultByCreatorId: Record<
      string,
      { staminaMult: number; conditionMult: number }
    > = {}
    const assignedSlotIds = new Set(
      studioSlotsRef.current
        .filter((slot) => slot.status === 'assigned' && slot.assignment)
        .map((slot) => slot.assignment!.creatorId),
    )
    const careRecoverCreatorIds = new Set<string>()
    for (const creatorId of assignedSlotIds) {
      const slotId = findSlotIdForCreator(studioSlotsRef.current, creatorId)
      const care = slotId ? staffBonusOf(managerStateRef.current, slotId, 'care') : { equipped: false }
      const careMult = care.equipped ? CARE_STAMINA_MULT : 1
      drainMultByCreatorId[creatorId] = {
        staminaMult: Math.max(0.5, Math.min(1, staminaMult * careMult)),
        conditionMult,
      }
      if (care.equipped) careRecoverCreatorIds.add(creatorId)
    }
    const { creators: nextOwned, cared } = applyWeeklyStaminaAndCondition(
      ownedCreatorsRef.current,
      broadcastedIds,
      drainMultByCreatorId,
      broadcastedIds,
      assignedSlotIds,
      careRecoverCreatorIds,
    )
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
    for (const row of cared) {
      const slotId = findSlotIdForCreator(studioSlotsRef.current, row.creatorId)
      if (!slotId) continue
      const care = staffBonusOf(managerStateRef.current, slotId, 'care')
      presentStaffAction(
        slotId,
        'care',
        t('dashboard.staffCare'),
        t('dashboard.staffCareSub'),
        t('feed.care')
          .replace('{name}', staffNameOf(care.staffId) || creatorNameOf(row.creatorId))
          .replace('{creatorName}', creatorNameOf(row.creatorId)),
        row.creatorId,
        creatorNameOf(row.creatorId),
      )
    }
    for (const creatorId of assignedSlotIds) {
      const slotId = findSlotIdForCreator(studioSlotsRef.current, creatorId)
      const creator = nextOwned.find((row) => row.id === creatorId)
      if (!slotId || !creator) continue
      grantProductionBonus(slotId, creator.id, characterDisplayName(creator, locale))
    }

    const failMulBySlotId: Record<string, number> = {}
    for (const slot of studioSlotsRef.current) {
      if (slot.status !== 'assigned') continue
      const repair = staffBonusOf(managerStateRef.current, slot.id, 'repair')
      failMulBySlotId[slot.id] = repair.equipped ? 0 : 1
    }
    const nextGear = applyWeeklySlotGear(
      prevGear,
      studioSlotsRef.current,
      broadcastedIds,
      { skipFailCreatorIds: broadcastedIds, failMulBySlotId },
    )
    slotGearByIdRef.current = nextGear
    setSlotGearById(nextGear)

    const plansForLedger = plan.plans.map((row) => {
      if (isCreatorSlotBroken(studioSlotsRef.current, nextGear, row.creatorId)) {
        return {
          ...row,
          weekRevenueWon: 0,
          events: row.events.filter((event) => event.type !== 'donation'),
        }
      }
      const blockProgress = broadcastBlockedSinceRef.current[row.creatorId]
      if (blockProgress != null) {
        return applyBroadcastBlockToCreatorPlan(row, blockProgress, plan.dayMs)
      }
      return row
    })
    const weekRevenueWon = plansForLedger.reduce((sum, row) => sum + row.weekRevenueWon, 0)
    // 자산은 턴(월) 종료 정산에서만 반영 — 방송 중 실시간 가산 없음
    if (weekRevenueWon > 0) {
      const year = monthToCalendarDate(GAME_EPOCH, gameMonthRef.current).getFullYear()
      annualRevenueByYearRef.current[year] =
        (annualRevenueByYearRef.current[year] ?? 0) + weekRevenueWon
    }
    weekAccumRef.current = recordDayIntoWeek(weekAccumRef.current, plansForLedger)
  }

  function resolveToxicQte(itemId: string, success: boolean) {
    const current = toxicQteQueueRef.current.find((row) => row.id === itemId)
    if (!current) return

    if (success) {
      setLiveEvents((prev) =>
        [
          {
            id: `toxic-block-${current.id}`,
            creatorId: current.creatorId,
            creatorName: current.creatorName,
            type: 'toxic' as const,
            amount: 0,
            text: t('feed.toxicBlocked').replace('{name}', current.creatorName),
            atMs: 0,
            tone: 'bg-emerald-400',
          },
          ...prev,
        ].slice(0, MAX_RECENT_EVENTS),
      )
      weekAccumRef.current = {
        ...weekAccumRef.current,
        highlights: [
          t('feed.toxicBlockedShort').replace('{name}', current.creatorName),
          ...weekAccumRef.current.highlights,
        ],
      }
    } else {
      const nextOwned = ownedCreatorsRef.current.map((creator) =>
        creator.id === current.creatorId
          ? applyToxicStaminaPenalty(creator, current.staminaDrop)
          : creator,
      )
      ownedCreatorsRef.current = nextOwned
      onOwnedCreatorsChangeRef.current(nextOwned)
      setLiveEvents((prev) =>
        [
          {
            id: `toxic-miss-${current.id}`,
            creatorId: current.creatorId,
            creatorName: current.creatorName,
            type: 'toxic' as const,
            amount: current.staminaDrop,
            text: t('feed.toxicFailed')
              .replace('{name}', current.creatorName)
              .replace('{drop}', String(current.staminaDrop)),
            atMs: 0,
            tone: 'bg-rose-500',
          },
          ...prev,
        ].slice(0, MAX_RECENT_EVENTS),
      )
      weekAccumRef.current = {
        ...weekAccumRef.current,
        highlights: [
          t('feed.toxicFailedShort')
            .replace('{name}', current.creatorName)
            .replace('{drop}', String(current.staminaDrop)),
          ...weekAccumRef.current.highlights,
        ],
      }
    }

    toxicQteQueueRef.current = toxicQteQueueRef.current.filter((row) => row.id !== itemId)
    setToxicQteQueue(toxicQteQueueRef.current)
  }

  function advanceBroadcastWeek() {
    const nextMonthWeek = monthWeekIndexRef.current + 1

    if (nextMonthWeek >= WEEKS_PER_MONTH) {
      monthWeekIndexRef.current = 0
      setMonthWeekIndex(0)
      finishBroadcastMonth()
      return
    }

    monthWeekIndexRef.current = nextMonthWeek
    setMonthWeekIndex(nextMonthWeek)
    rollLivePlayVideos(livePlayVideoByCreatorRef.current)
    const weekMs = weekDurationMs(speedRef.current)
    beginDayPlan(`m${broadcastMonthNumberRef.current}-w${nextMonthWeek}`, weekMs)
  }

  function recoverStuckLiveBroadcast() {
    if (broadcastPhaseRef.current !== 'live') return
    setBroadcastPhase('prep')
    setLivePlayVideoByCreator({})
    setLiveWeekProgress(0)
    setLiveStaminaDrainByCreatorId({})
    dayPlanRef.current = null
    dayStartedAtRef.current = null
    setMonthWeekIndex(0)
    monthWeekIndexRef.current = 0
  }

  function finishBroadcastMonth() {
    // Strict Mode / 중복 틱 방어: 한 달(턴) 종료는 1회만
    if (weekFinishedRef.current) {
      recoverStuckLiveBroadcast()
      return
    }
    weekFinishedRef.current = true

    // 턴 종료 → 무조건 다음 달
    const nextMonth = gameMonthRef.current + 1
    gameMonthRef.current = nextMonth
    setGameMonth(nextMonth)

    const weekSnapshot = weekAccumRef.current
    const nextOwned = ownedCreatorsRef.current

    const issued = formatGameClock(monthToCalendarDate(GAME_EPOCH, nextMonth)).date.replace(
      /\./g,
      '-',
    )
    const unlockedSlotCount = studioSlotsRef.current.filter(
      (slot) => slot.status !== 'locked',
    ).length
    const payroll = nextOwned.map((creator) => ({
      id: creator.id,
      name: creator.name,
      salary: creator.salary,
    }))
    const nextDate = monthToCalendarDate(GAME_EPOCH, nextMonth)
    const prevDate = monthToCalendarDate(GAME_EPOCH, nextMonth - 1)
    if (nextDate.getFullYear() !== prevDate.getFullYear()) {
      setLiveRevenueByCreator({})
    }
    let annualTaxWon = 0
    let taxYear: number | undefined
    let annualRevenueForTaxWon = 0
    if (isMarchCalendarMonth(nextDate)) {
      taxYear = nextDate.getFullYear() - 1
      annualRevenueForTaxWon = annualRevenueByYearRef.current[taxYear] ?? 0
      annualTaxWon = calcProgressiveAnnualTax(annualRevenueForTaxWon)
      // 과세·납부 완료 → RECENT EVENTS의 예고 알림 제거
      setLiveEvents((prev) => prev.filter((event) => event.type !== 'tax'))
    } else if (isFebruaryCalendarMonth(nextDate)) {
      const upcomingTaxYear = nextDate.getFullYear() - 1
      const annualRevenue = annualRevenueByYearRef.current[upcomingTaxYear] ?? 0
      const taxNotice = createTaxUpcomingEvent(upcomingTaxYear, annualRevenue)
      setLiveEvents((prev) =>
        [taxNotice, ...prev.filter((event) => event.type !== 'tax')].slice(0, MAX_RECENT_EVENTS),
      )
    }

    const staffPayroll = managerStateRef.current.hiredStaffIds
      .map((id) => {
        const staff = registeredStaff.find((s) => s.id === id)
        if (!staff) return null
        const annual = hiredStaffSalariesRef.current[id] ?? 0
        const salaryWon = Math.max(0, Math.round(Number(annual) / 12) || 0)
        if (salaryWon <= 0) return null
        return {
          id,
          name: staffDisplayName(staff, locale),
          kind: staff.kind,
          kindLabel: t(STAFF_KIND_LABEL_KEY[staff.kind]),
          iconUrl: staffIconUrl(staff) || null,
          mediaRevision: staff.mediaRevision,
          salaryWon,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)

    setStaffScoutCooldown((prev) => {
      if (staffScoutAvailableRef.current) return 0

      const nextCooldown = Math.max(0, prev - 1)
      if (nextCooldown === 0) {
        const pool = registeredStaff.filter((s) => !managerStateRef.current.hiredStaffIds.includes(s.id))
        if (pool.length === 0) return 3

        const isFirstStaff = managerStateRef.current.hiredStaffIds.length === 0
        const success = isFirstStaff || Math.random() < 0.5
        if (success) {
          setStaffScoutAvailable(true)
          return 0
        }
        return 3
      }
      return nextCooldown
    })

    // 크리에이터 스카우트 버튼 — 미사용 시 유지, 쿨다운 후 활성화
    const nextMonthNumberPreview = broadcastMonthNumberRef.current + 1
    setCreatorScoutCooldown((prev) => {
      if (creatorScoutAvailableRef.current) return 0
      const maxScout = maxScoutCreatorsForGrade(stationGradeConfig, stationGradeRef.current)
      if (ownedCreatorsRef.current.length >= maxScout) return prev

      if (!creatorScoutFirstDoneRef.current) {
        if (nextMonthNumberPreview > 3) {
          setCreatorScoutAvailable(true)
          setCreatorScoutFirstDone(true)
          return 0
        }
        return prev
      }

      const nextCooldown = Math.max(0, prev - 1)
      if (nextCooldown > 0) return nextCooldown
      if (Math.random() < 0.5) {
        setCreatorScoutAvailable(true)
        return 0
      }
      return rollInt(3, 6)
    })



    const viewersBefore = leagueRef.current.viewers
    const statementDraft = buildWeeklyStatement({
      week: {
        ...weekSnapshot,
        highlights: [...weekSnapshot.highlights],
      },
      issuedDate: issued,
      previousNetProfitWon: prevWeekRevenueRef.current,
      unlockedSlotCount,
      payroll,
      annualTaxWon,
      taxYear,
      annualRevenueForTaxWon,
      staffPayroll,
      rank: leagueRef.current.currentRank,
    })
    prevWeekRevenueRef.current = statementDraft.netProfitWon
    // 케어비는 이미 즉시 차감됐으므로, 명세서 net에 포함된 케어분을 환산 보정
    const careAlreadyPaid = weekSnapshot.careExpenses.reduce(
      (sum, row) => sum + row.amountWon,
      0,
    )
    const assetDelta = statementDraft.netProfitWon + careAlreadyPaid
    const assetsAfter = assetsRef.current + assetDelta
    if (assetDelta !== 0) {
      setAssets(assetsAfter)
      assetsRef.current = assetsAfter
    }
    const portraits: Record<string, string> = {}
    for (const creator of nextOwned) {
      if (creator.profileImageUrl) portraits[creator.id] = creator.profileImageUrl
    }

    const broadcastedIds = new Set(weekSnapshot.byCreator.keys())
    const ownedRankCreators = toRankCreators(ownedCreatorsRef.current)
    const broadcastedCreators = ownedRankCreators.filter((creator) =>
      broadcastedIds.has(creator.id),
    )
    const nextRefreshTurns = rankRefreshTurnsLeftRef.current - 1
    if (nextRefreshTurns <= 0) {
      rankRefreshTurnsLeftRef.current = RANK_REFRESH_TURNS
      setRankRefreshTurnsLeft(RANK_REFRESH_TURNS)
      const settled = settleLeagueRank(
        leagueRef.current,
        broadcastedCreators,
        ownedRankCreators,
        stationGradeRef.current,
      )
      leagueRef.current = settled.state
      setLeague(settled.state)
      pendingRankResultRef.current = settled.result
    } else {
      rankRefreshTurnsLeftRef.current = nextRefreshTurns
      setRankRefreshTurnsLeft(nextRefreshTurns)
      const grown = growLeagueBetweenRefresh(
        leagueRef.current,
        broadcastedCreators,
        ownedRankCreators,
        stationGradeRef.current,
      )
      leagueRef.current = grown
      setLeague(grown)
      pendingRankResultRef.current = null
    }
    pendingStationReviewRef.current = isAnnualReviewMonth(nextDate, GAME_EPOCH)

    const snsResults: SnsResult[] = []
    let extraViewers = 0
    const afterSnsOwned = ownedCreatorsRef.current.map((creator) => {
      const pending = creator.snsPending
      if (!pending) return creator
      const rolled = resolveSnsPending(pending.heat)
      extraViewers += rolled.viewersGained
      const post = (creator.snsPosts ?? []).find((row) => row.id === pending.postId)
      const media = snsPostMedia(
        creator.snsPosts ?? [],
        creator.images,
        creator.videos,
        pending.postId,
      )
      snsResults.push({
        creatorId: creator.id,
        creatorName: characterDisplayName(creator, locale),
        postId: pending.postId,
        heat: pending.heat,
        imageUrl: media?.url ?? null,
        mediaKind: media?.kind ?? null,
        blurRegions: post?.blurRegions ?? [],
        caption: post ? snsCaptionOf(post, locale) : '',
        likes: rolled.likes,
        comments: rolled.comments,
        viewersGained: rolled.viewersGained,
      })
      return {
        ...creator,
        snsPending: null,
        snsPublishedIds: [...(creator.snsPublishedIds ?? []), pending.postId],
        snsFeed: [
          ...(creator.snsFeed ?? []),
          {
            postId: pending.postId,
            heat: pending.heat,
            likes: rolled.likes,
            comments: rolled.comments,
            publishedMonth: broadcastMonthNumberRef.current,
          },
        ],
      }
    })
    if (snsResults.length > 0) {
      ownedCreatorsRef.current = afterSnsOwned
      onOwnedCreatorsChangeRef.current(afterSnsOwned)
      if (extraViewers > 0) {
        const nextViewers = capStationViewers(
          leagueRef.current.viewers + extraViewers,
          stationGradeRef.current,
        )
        leagueRef.current = { ...leagueRef.current, viewers: nextViewers }
        setLeague(leagueRef.current)
      }
      snsResultQueueRef.current = snsResults
      setSnsResultQueue(snsResults)
    }

    const viewersGained = leagueRef.current.viewers - viewersBefore
    const viewersByCreator = allocateViewersGained(
      viewersGained,
      statementDraft.lines.map((line) => {
        const creator = ownedRankCreators.find((row) => row.id === line.creatorId)
        return {
          id: line.creatorId,
          weight:
            line.broadcastHours > 0 && creator ? creatorViewerWeight(creator) : 0,
        }
      }),
    )
    const statement = {
      ...statementDraft,
      lines: statementDraft.lines.map((line) => ({
        ...line,
        viewersGained: viewersByCreator[line.creatorId] ?? 0,
      })),
      // 순위는 이번 달 시청자 진행도를 반영한 갱신 후 값으로 표시
      rank: leagueRef.current.currentRank,
      viewersBefore,
      viewersAfter: leagueRef.current.viewers,
      viewersGained,
    }

    const socialBlocked =
      pendingStationReviewRef.current || Boolean(pendingRankResultRef.current?.gameCleared)
    const socialRoll = advanceAndPickSocialEvent(
      socialSpawnRef.current,
      ownedCreatorsRef.current,
      socialBlocked,
    )
    socialSpawnRef.current = socialRoll.state
    pendingSocialQueueRef.current = socialRoll.event ? [socialRoll.event] : []

    const nextMonthNumber = broadcastMonthNumberRef.current + 1
    broadcastMonthNumberRef.current = nextMonthNumber
    setBroadcastMonthNumber(nextMonthNumber)
    weekAccumRef.current = createWeekAccumulator(nextMonthNumber)
    setBroadcastPhase('prep')
    setLivePlayVideoByCreator({})
    setLiveWeekProgress(0)
    setLiveStaminaDrainByCreatorId({})
    dayPlanRef.current = null
    dayStartedAtRef.current = null
    setStartBroadcastLocked(true)

    // 중앙에 '방송 종료'를 먼저 띄운 뒤 명세서 팝업
    setBroadcastEndedNotice(true)
    if (statementDelayTimerRef.current != null) {
      window.clearTimeout(statementDelayTimerRef.current)
    }
    statementDelayTimerRef.current = window.setTimeout(() => {
      statementDelayTimerRef.current = null
      setBroadcastEndedNotice(false)
      setSettlementAssetsAfter(assetsAfter)
      setSettlementPortraits(portraits)
      setWeeklyStatement(statement)
    }, 1800)
  }

  function finishWeeklyStatementFollowup() {
    const pendingRank = pendingRankResultRef.current
    pendingRankResultRef.current = null
    const openScout =
      ownedCreatorsRef.current.length === 0 &&
      Boolean(scoutSystemRef.current.activeOffer)
    if (pendingRank) {
      pendingScoutAfterRankRef.current = openScout
      // 순위는 매 턴 시청자 진행도로 갱신되고 명세서에 표시됨 — 랭킹 패널 이동/팝업 없이 진행
      continueAfterMonthModals(openScout)
      return
    }
    // 1월 1일 연간 심사 — 순위 정산 턴과 무관하게 항상 실행
    // (순위 정산은 3턴마다 일어나므로 12월→1월 전환과 겹치지 않아 이 경로가 필요)
    if (pendingStationReviewRef.current) {
      pendingStationReviewRef.current = false
      pendingScoutAfterRankRef.current = openScout
      const review = applyStationReview(
        stationGradeRef.current,
        leagueRef.current.viewers,
        ownedCreatorsRef.current,
        {
          unlockedSlotCount: countUnlockedSlots(studioSlotsRef.current),
          assets: assetsRef.current,
        },
      )
      setStationReview({ promoted: review.promoted, status: review.status })
      return
    }
    continueAfterMonthModals(openScout)
  }

  function checkStaffSalaryRaise() {
    const hiredStaffIds = managerStateRef.current.hiredStaffIds
    if (hiredStaffIds.length >= 2) {
      const salaries = hiredStaffIds.map((id) => hiredStaffSalariesRef.current[id] ?? 0)
      const maxSalary = Math.max(...salaries)
      const minSalary = Math.min(...salaries)
      if (maxSalary - minSalary >= 15000) {
        const underpaidStaffIds = hiredStaffIds.filter((id) => {
          const salary = hiredStaffSalariesRef.current[id] ?? 0
          if (salary !== minSalary) return false

          const startMonth = hiredStaffStartMonthsRef.current[id] ?? 0
          const elapsed = gameMonth - startMonth
          return elapsed > 0 && elapsed % 12 === 0
        })
        const targetStaffId = underpaidStaffIds[Math.floor(Math.random() * underpaidStaffIds.length)]
        const targetStaff = registeredStaff.find((s) => s.id === targetStaffId)
        if (targetStaff) {
          const requestedSalary = Math.round(maxSalary * 0.9)
          setStaffSalaryRaiseRequest({
            staffId: targetStaffId,
            staffName: staffDisplayName(targetStaff, locale),
            staffKind: targetStaff.kind,
            iconUrl: staffIconUrl(targetStaff) || null,
            mediaRevision: targetStaff.mediaRevision,
            currentSalary: minSalary,
            requestedSalary: requestedSalary,
          })
          setStartBroadcastLocked(true)
          return true
        }
      }
    }
    return false
  }

  function handleAcceptStaffSalaryRaise() {
    if (!staffSalaryRaiseRequest) return
    const { staffId, requestedSalary } = staffSalaryRaiseRequest
    setHiredStaffSalaries((prev) => ({
      ...prev,
      [staffId]: requestedSalary,
    }))
    setStaffSalaryRaiseRequest(null)
    setStartBroadcastLocked(false)
  }

  function handleRejectStaffSalaryRaise() {
    if (!staffSalaryRaiseRequest) return
    const { staffId, staffName } = staffSalaryRaiseRequest
    setHiredStaffSalaries((prev) => {
      const next = { ...prev }
      delete next[staffId]
      return next
    })
    const next = removeStaffFromState(managerStateRef.current, staffId)
    managerStateRef.current = next
    onManagerStateChangeRef.current(next)
    alert(t('alert.staffQuit').replace('{name}', staffName))
    setStaffSalaryRaiseRequest(null)
    setStartBroadcastLocked(false)
  }

  function releaseMonthEndLock(openScout: boolean) {
    pendingScoutAfterRankRef.current = false
    if (checkStaffSalaryRaise()) {
      return
    }
    setStartBroadcastLocked(false)
    if (openScout && scoutSystemRef.current.activeOffer) {
      setTab('creator')
      setOpenCreatorScout(true)
    }
  }

  /** 정산/심사 이후 월말 모달 체인을 이어간다 (게임 클리어 확인 포함) */
  function continueMonthEndFlow() {
    const openScout = pendingScoutAfterRankRef.current
    const cleared = pendingGameClearRef.current
    pendingGameClearRef.current = false
    if (cleared) {
      pendingScoutAfterRankRef.current = openScout
      setShowGameClear(true)
      return
    }
    continueAfterMonthModals(openScout)
  }

  /** 승급 애니메이션이 끝난 뒤 승급을 리그 상태에 반영 (멱등) */
  function applyPendingPromotion() {
    const promo = pendingPromotionRef.current
    if (!promo) return
    pendingPromotionRef.current = null
    const nextLeague = reapplyLeagueGate(
      leagueRef.current,
      toRankCreators(ownedCreatorsRef.current),
      promo.nextGrade,
    )
    leagueRef.current = nextLeague
    setLeague(nextLeague)
    if (nextLeague.gameCleared) pendingGameClearRef.current = true
  }

  function continueAfterMonthModals(openScout: boolean) {
    const next = pendingSocialQueueRef.current.shift() ?? null
    if (next) {
      pendingScoutAfterRankRef.current = openScout
      setStartBroadcastLocked(true)
      if (next.kind === 'vip') setVipOffer(next.offer)
      else if (next.kind === 'date') setSocialUi({ mode: 'dateOffer', pending: next })
      else if (next.kind === 'gift') setSocialUi({ mode: 'giftOffer', pending: next })
      else setSocialUi({ mode: 'hRetryOffer', pending: next })
      return
    }
    if (snsResultQueueRef.current.length > 0) {
      pendingScoutAfterRankRef.current = openScout
      setStartBroadcastLocked(true)
      return
    }
    releaseMonthEndLock(openScout)
  }

  function patchOwnedCreator(creatorId: string, patch: (creator: OwnedCreator) => OwnedCreator) {
    const nextOwned = ownedCreatorsRef.current.map((creator) =>
      creator.id === creatorId ? patch(creator) : creator,
    )
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
  }

  const completeDateEvent = (pending: DatePending) => {
    patchOwnedCreator(pending.creatorId, (creator) => ({
      ...creator,
      dateArcStep: dateArcAfter(pending.step),
    }))
    setSocialUi({ mode: 'dateResult', pending })
  }

  const handleDateStart = () => {
    if (socialUi?.mode !== 'dateOffer') return
    const pending = socialUi.pending
    const charDef = registeredCharactersRef.current.find((c) => c.id === pending.creatorId)
    const slot = pending.step === 'h' ? 'h' : pending.step
    const eventId = charDef?.eventLinks?.[slot]
    const event = eventId ? eventsRef.current.find((e) => e.id === eventId) ?? null : null
    if (event) {
      setSocialUi({ mode: 'dateVn', pending, event })
      return
    }
    completeDateEvent(pending)
  }

  function applyVipAcceptRewards(offer: VipOffer, staminaMaxLoss: number) {
    const nextOwned = ownedCreatorsRef.current.map((creator) =>
      creator.id === offer.creatorId
        ? applyStaminaMaxPenalty(creator, staminaMaxLoss)
        : creator,
    )
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
    setVipResult({
      kind: 'accept',
      creatorName: offer.creatorName,
      staminaMaxLoss,
    })
  }

  function handleVipAccept() {
    if (!vipOffer) return
    const offer = vipOffer
    setVipOffer(null)
    const spec = VIP_ACCEPT_BY_GRADE[offer.grade]
    const charDef = registeredCharactersRef.current.find((c) => c.id === offer.creatorId)
    const vipEventId = charDef?.eventLinks?.vip
    const vipEvent = vipEventId
      ? eventsRef.current.find((e) => e.id === vipEventId) ?? null
      : null
    if (vipEvent) {
      setVipEventPlay({
        offer,
        event: vipEvent,
        staminaMaxLoss: spec.staminaMaxLoss,
      })
      return
    }
    applyVipAcceptRewards(offer, spec.staminaMaxLoss)
  }

  function handleVipReject() {
    if (!vipOffer) return
    const offer = vipOffer
    setVipOffer(null)
    const viewerLoss = rollVipRejectViewers(offer.grade)
    const nextLeague = applyAudiencePenalty(
      leagueRef.current,
      toRankCreators(ownedCreatorsRef.current),
      stationGradeRef.current,
      viewerLoss,
    )
    leagueRef.current = nextLeague
    setLeague(nextLeague)
    setVipResult({
      kind: 'reject',
      creatorName: offer.creatorName,
      viewerLoss,
    })
  }

  function handleGiftAccept() {
    if (socialUi?.mode !== 'giftOffer') return
    const pending = socialUi.pending
    if (assets < pending.assetCost) return
    const vitals = rollGiftAcceptVitals()
    setAssets((prev) => prev - pending.assetCost)
    patchOwnedCreator(pending.creatorId, (creator) =>
      applyVitalsDelta(creator, { condition: vitals.condition, stamina: vitals.stamina }),
    )
    setSocialUi({
      mode: 'giftResult',
      pending,
      accepted: true,
      conditionDelta: vitals.condition,
      staminaDelta: vitals.stamina,
    })
  }

  function handleGiftReject() {
    if (socialUi?.mode !== 'giftOffer') return
    const pending = socialUi.pending
    const loss = rollRejectConditionLoss(pending.grade)
    patchOwnedCreator(pending.creatorId, (creator) =>
      applyVitalsDelta(creator, { condition: -loss }),
    )
    setSocialUi({
      mode: 'giftResult',
      pending,
      accepted: false,
      conditionDelta: loss,
      staminaDelta: 0,
    })
  }

  function handleHRetryAccept() {
    if (socialUi?.mode !== 'hRetryOffer') return
    const pending = socialUi.pending
    const spec = H_RETRY_BY_GRADE[pending.grade]
    const charDef = registeredCharactersRef.current.find((c) => c.id === pending.creatorId)
    const eventId = charDef?.eventLinks?.h
    const event = eventId ? eventsRef.current.find((e) => e.id === eventId) ?? null : null
    if (event) {
      setSocialUi({
        mode: 'hRetryVn',
        pending,
        event,
        staminaLoss: spec.staminaLoss,
      })
      return
    }
    applyHRetryAccept(pending, spec.staminaLoss)
  }

  function applyHRetryAccept(pending: HRetryPending, staminaLoss: number) {
    patchOwnedCreator(pending.creatorId, (creator) =>
      applyVitalsDelta(creator, { stamina: -staminaLoss }),
    )
    setSocialUi({
      mode: 'hRetryResult',
      pending,
      accepted: true,
      staminaLoss,
      conditionLoss: 0,
    })
  }

  function handleHRetryReject() {
    if (socialUi?.mode !== 'hRetryOffer') return
    const pending = socialUi.pending
    const loss = rollRejectConditionLoss(pending.grade)
    patchOwnedCreator(pending.creatorId, (creator) =>
      applyVitalsDelta(creator, { condition: -loss }),
    )
    setSocialUi({
      mode: 'hRetryResult',
      pending,
      accepted: false,
      staminaLoss: 0,
      conditionLoss: loss,
    })
  }

  function handleConditionCare(creatorId: string) {
    const target = ownedCreatorsRef.current.find((c) => c.id === creatorId)
    if (!target) return
    if (scoreOf(target) >= 100) return
    const cost = calcConditionFullCareCost(target.grade)
    if (assets < cost) return
    setAssets((prev) => prev - cost)
    weekAccumRef.current = recordCareExpense(weekAccumRef.current, {
      creatorId: target.id,
      name: target.name,
      amountWon: cost,
    })
    const nextOwned = ownedCreatorsRef.current.map((creator) =>
      creator.id === creatorId ? applyConditionFullCare(creator) : creator,
    )
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
  }

  function queuePromotionSalary(
    creator: OwnedCreator,
    previousGrade: Grade,
    newGrade: Grade,
  ) {
    const previousSalary = creator.salary
    const rolled = rollNegotiatedSalary(
      {
        heat: creator.heat,
        trust: creator.trust,
        stamina: creator.stamina,
        staminaMax: creator.staminaMax,
        revenueMult: creator.revenueMult,
        statSexy: creator.statSexy,
        statElegance: creator.statElegance,
        statCommunication: creator.statCommunication,
        statPerformance: creator.statPerformance,
      },
      newGrade,
    )
    const proposedSalary = Math.max(Math.round(previousSalary * 1.12), rolled)
    const charDef = registeredCharactersRef.current.find((c) => c.id === creator.id)
    const salaryEventId = charDef?.eventLinks?.salary
    const salaryEvent = salaryEventId
      ? eventsRef.current.find((e) => e.id === salaryEventId) ?? null
      : null
    setPromoteQueue((prev) => [
      ...prev,
      {
        creatorId: creator.id,
        creatorName: characterDisplayName(creator, locale),
        previousGrade,
        newGrade,
        previousSalary,
        proposedSalary,
        salaryEvent,
      },
    ])
  }

  function handleProductionTraining(creatorId: string) {
    if (promotionExamRef.current) return
    const target = ownedCreatorsRef.current.find((c) => c.id === creatorId)
    if (!target) return

    if (isPromotionExamReady(target)) {
      const examCost = calcPromotionExamCost(target)
      if (assetsRef.current < examCost) return
      const result = resolvePromotionExam(target, examCost)
      if (!result) return
      if (examCost > 0) {
        const nextAssets = assetsRef.current - examCost
        assetsRef.current = nextAssets
        setAssets(nextAssets)
      }
      const exam = {
        creatorId: target.id,
        creatorName: characterDisplayName(target, locale),
        result,
      }
      promotionExamRef.current = exam
      setPromotionExam(exam)
      return
    }

    const result = applyProductionTraining(target)
    const totalGain =
      result.gains.statSexy +
      result.gains.statElegance +
      result.gains.statCommunication +
      result.gains.statPerformance
    if (totalGain <= 0) return
    const trainingCost = calcTrainingCost(target)
    if (assetsRef.current < trainingCost) return
    if (trainingCost > 0) {
      const nextAssets = assetsRef.current - trainingCost
      assetsRef.current = nextAssets
      setAssets(nextAssets)
    }
    const nextOwned = ownedCreatorsRef.current.map((creator) =>
      creator.id === creatorId ? result.creator : creator,
    )
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
  }

  function confirmPromotionExam() {
    const play = promotionExamRef.current
    if (!play) return
    promotionExamRef.current = null
    setPromotionExam(null)
    if (play.result.refund > 0) {
      const nextAssets = assetsRef.current + play.result.refund
      assetsRef.current = nextAssets
      setAssets(nextAssets)
    }
    if (play.result.kind === 'fail') return
    const target = ownedCreatorsRef.current.find((c) => c.id === play.creatorId)
    if (!target) return
    const promoted = applyPromotionExamResult(target, play.result)
    const nextOwned = ownedCreatorsRef.current.map((creator) =>
      creator.id === play.creatorId ? promoted : creator,
    )
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
    queuePromotionSalary(promoted, play.result.fromGrade, play.result.toGrade)
  }

  function handleSnsCompose(creatorId: string, heat: SnsHeat) {
    const target = ownedCreatorsRef.current.find((creator) => creator.id === creatorId)
    if (!target || target.snsPending) return
    const published = target.snsPublishedIds ?? []
    const post = nextSnsPost(target.snsPosts ?? [], published, heat)
    const cost = SNS_HEAT_COST[heat]
    if (!post || assetsRef.current < cost) return
    const nextAssets = assetsRef.current - cost
    assetsRef.current = nextAssets
    setAssets(nextAssets)
    const nextOwned = ownedCreatorsRef.current.map((creator) =>
      creator.id === creatorId ? { ...creator, snsPending: { postId: post.id, heat } } : creator,
    )
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
  }

  function handleBulkSnsCompose(heat: SnsHeat): BulkSnsRevealEntry[] {
    const preview = previewBulkSnsCompose(ownedCreatorsRef.current, heat)
    const costPer = SNS_HEAT_COST[heat]
    const totalCost = preview.eligibleIds.length * costPer
    if (preview.eligibleIds.length === 0 || assetsRef.current < totalCost) return []

    const eligibleSet = new Set(preview.eligibleIds)
    const nextAssets = assetsRef.current - totalCost
    assetsRef.current = nextAssets
    setAssets(nextAssets)

    const posted: BulkSnsRevealEntry[] = []
    const nextOwned = ownedCreatorsRef.current.map((creator) => {
      if (!eligibleSet.has(creator.id)) return creator
      const post = nextSnsPost(creator.snsPosts ?? [], creator.snsPublishedIds ?? [], heat)
      if (!post) return creator
      const media = snsPostMedia(creator.snsPosts ?? [], creator.images, creator.videos, post.id)
      posted.push({
        creatorId: creator.id,
        postId: post.id,
        heat,
        displayName: characterDisplayName(creator, locale),
        avatarUrl: creator.profileImageUrl,
        caption: snsCaptionOf(post, locale),
        media,
        blurRegions: post.blurRegions ?? [],
      })
      return { ...creator, snsPending: { postId: post.id, heat } }
    })
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
    return posted
  }

  function handleVacation(creatorId: string) {
    const target = ownedCreatorsRef.current.find((c) => c.id === creatorId)
    if (!target) return
    const month = broadcastMonthNumberRef.current
    if (target.lastVacationMonth === month) return
    const cost = calcVacationCost(target.salary, target.grade)
    if (assets < cost) return
    setAssets((prev) => prev - cost)
    const nextOwned = ownedCreatorsRef.current.map((creator) => {
      if (creator.id !== creatorId) return creator
      return {
        ...applyVacationRecovery(creator),
        lastVacationMonth: month,
      }
    })
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
  }

  function handleStartBroadcast() {
    if (broadcastPhase === 'live') return
    if (
      weeklyStatement ||
      startBroadcastLocked ||
      vipOffer ||
      vipResult ||
      vipEventPlay ||
      socialUi
    ) {
      return
    }

    const blockedAssigned = studioSlotsRef.current
      .filter((slot) => slot.status === 'assigned' && slot.assignment)
      .map((slot) =>
        ownedCreatorsRef.current.find((c) => c.id === slot.assignment!.creatorId),
      )
      .filter((c): c is OwnedCreator => Boolean(c))
      .filter((c) => !canBroadcastByStamina(c.stamina))

    if (blockedAssigned.length > 0) {
      setRestRequiredName(characterDisplayName(blockedAssigned[0]!, locale))
      return
    }

    if (statementDelayTimerRef.current != null) {
      window.clearTimeout(statementDelayTimerRef.current)
      statementDelayTimerRef.current = null
    }
    setBroadcastEndedNotice(false)
    weekFinishedRef.current = false
    setStartBroadcastLocked(false)
    setTab('dashboard')
    setBroadcastPhase('live')
    rollLivePlayVideos()
    setMonthWeekIndex(0)
    monthWeekIndexRef.current = 0
    // 방송 시작 시 후원/시청 이벤트는 초기화, 세금 알림은 유지
    setLiveEvents((prev) => prev.filter((event) => event.type === 'tax'))
    donationBatchRef.current = new Map()
    feedExtraQueueRef.current = []
    lastFeedEmitAtRef.current = 0
    setConditionCrashes([])
    setGearFailBursts([])
    setStaffActions([])
    toxicQteQueueRef.current = []
    setToxicQteQueue([])
    pendingWeekAdvanceAfterToxicRef.current = false

    // 수리 장착 칸은 방송 시작 시 잔여 고장을 점검·복구 + 연출
    {
      let gearMap = slotGearByIdRef.current
      let gearChanged = false
      for (const slot of studioSlotsRef.current) {
        if (slot.status !== 'assigned' || !slot.assignment) continue
        const repair = staffBonusOf(managerStateRef.current, slot.id, 'repair')
        const gear = gearMap[slot.id]
        if (!repair.equipped || !gear?.broken) continue
        gearMap = { ...gearMap, [slot.id]: repairSlotGear(gear) }
        gearChanged = true
        presentStaffAction(
          slot.id,
          'repair',
          t('dashboard.staffBlockRepair'),
          t('dashboard.staffBlockRepairSub'),
          t('feed.repairPreBroadcast').replace(
            '{name}',
            staffNameOf(repair.staffId) || creatorNameOf(slot.assignment.creatorId, slot.assignment.creatorName),
          ),
          slot.assignment.creatorId,
          creatorNameOf(slot.assignment.creatorId, slot.assignment.creatorName),
        )
      }
      if (gearChanged) {
        slotGearByIdRef.current = gearMap
        setSlotGearById(gearMap)
      }
    }

    const preservedCare = weekAccumRef.current.careExpenses
    weekAccumRef.current = {
      ...createWeekAccumulator(broadcastMonthNumberRef.current),
      careExpenses: preservedCare,
    }
    const weekMs = weekDurationMs(speed)
    beginDayPlan(`m${broadcastMonthNumberRef.current}-w0`, weekMs)
  }

  // 배속 변경 시 남은 스케줄 비율 스케일
  useEffect(() => {
    if (broadcastPhase !== 'live') return
    const plan = dayPlanRef.current
    const startedAt = dayStartedAtRef.current
    if (!plan || startedAt == null) return
    const nextWeekMs = weekDurationMs(speed)
    if (nextWeekMs === plan.dayMs) return
    const elapsed = performance.now() - startedAt
    const scaled = scaleDayPlanTimes(plan, nextWeekMs)
    dayPlanRef.current = scaled
    dayStartedAtRef.current =
      performance.now() - Math.min(elapsed * (nextWeekMs / plan.dayMs), nextWeekMs - 1)
  }, [speed, broadcastPhase])

  // 진상 QTE 중 방송 시계 일시정지
  const toxicQteActive = toxicQteQueue.length > 0
  useEffect(() => {
    if (!toxicQteActive) return
    const pausedAt = performance.now()
    return () => {
      if (dayStartedAtRef.current != null) {
        dayStartedAtRef.current += performance.now() - pausedAt
      }
    }
  }, [toxicQteActive])

  // QTE 종료 후 보류된 주차 진행
  useEffect(() => {
    if (toxicQteActive) return
    if (!pendingWeekAdvanceAfterToxicRef.current) return
    if (broadcastPhase !== 'live') {
      pendingWeekAdvanceAfterToxicRef.current = false
      return
    }
    pendingWeekAdvanceAfterToxicRef.current = false
    advanceBroadcastWeek()
  }, [toxicQteActive, broadcastPhase])

  // CCTV 스테미나: 한 주 동안 소모량을 서서히 반영
  useEffect(() => {
    if (broadcastPhase !== 'live') {
      setLiveWeekProgress(0)
      return
    }
    const id = window.setInterval(() => {
      const plan = dayPlanRef.current
      const startedAt = dayStartedAtRef.current
      if (!plan || startedAt == null || plan.dayMs <= 0) return
      const elapsed = performance.now() - startedAt
      setLiveWeekProgress(Math.max(0, Math.min(1, elapsed / plan.dayMs)))
    }, 80)
    return () => window.clearInterval(id)
  }, [broadcastPhase, toxicQteActive])

  // 주 진행: 이벤트 공개
  useEffect(() => {
    if (broadcastPhase !== 'live') return
    if (toxicQteActive) return
    const id = window.setInterval(() => {
      const plan = dayPlanRef.current
      const startedAt = dayStartedAtRef.current
      if (!plan || startedAt == null) return
      const elapsed = performance.now() - startedAt
      trackBroadcastBlocks(elapsed)
      const due = takeRevealableEvents(
        plan.plans
          .flatMap((p) => p.events)
          .filter((event) => event.atMs <= elapsed)
          .sort((a, b) => a.atMs - b.atMs),
      )
      ingestLiveFeedEvents(due, plan, false)
      runDueInspections(elapsed)
    }, 50)
    return () => window.clearInterval(id)
  }, [broadcastPhase, toxicQteActive])

  // 주 틱: 결산 → 월 내 주차 진행 → 턴 종료 시 다음 달 (진상 QTE 중 일시정지)
  useEffect(() => {
    if (broadcastPhase !== 'live') return
    if (toxicQteActive) return
    const tickMs = weekDurationMs(speed)
    const timer = window.setInterval(() => {
      if (toxicQteQueueRef.current.length > 0) return
      settleCurrentDay()
      if (toxicQteQueueRef.current.length > 0) {
        pendingWeekAdvanceAfterToxicRef.current = true
        return
      }
      advanceBroadcastWeek()
    }, tickMs)
    return () => window.clearInterval(timer)
  }, [broadcastPhase, speed, toxicQteActive])

  useEffect(() => {
    document.documentElement.classList.toggle('theme-on-air', broadcastPhase === 'live')
    return () => document.documentElement.classList.remove('theme-on-air')
  }, [broadcastPhase])

  // 월간 정산·모달 흐름이 끝났는데 잠금만 남은 경우 복구
  useEffect(() => {
    if (broadcastPhase !== 'prep' || !startBroadcastLocked) return
    const monthEndUiOpen = Boolean(
      weeklyStatement ||
        broadcastEndedNotice ||
        rankSettlement ||
        rankBubblePlay ||
        stationReview ||
        promotionFx ||
        showGameClear ||
        vipOffer ||
        vipResult ||
        vipEventPlay ||
        socialUi ||
        salaryEventPlay ||
        scoutEventState ||
        promotionExam ||
        staffSalaryRaiseRequest ||
        snsResultQueue.length > 0,
    )
    if (!monthEndUiOpen) {
      setStartBroadcastLocked(false)
    }
  }, [
    broadcastPhase,
    startBroadcastLocked,
    weeklyStatement,
    broadcastEndedNotice,
    rankSettlement,
    rankBubblePlay,
    stationReview,
    promotionFx,
    showGameClear,
    vipOffer,
    vipResult,
    vipEventPlay,
    socialUi,
    salaryEventPlay,
    scoutEventState,
    promotionExam,
    staffSalaryRaiseRequest,
    snsResultQueue.length,
  ])

  const clock = formatGameClock(monthToCalendarDate(GAME_EPOCH, gameMonth))
  const broadcastWeekCurrent = monthWeekIndex + 1
  const broadcastWeeksLeft = Math.max(0, WEEKS_PER_MONTH - broadcastWeekCurrent)
  const broadcastMonthPct = Math.round((broadcastWeekCurrent / WEEKS_PER_MONTH) * 100)

  // 현재 등급의 시청자 보유 상한 = 다음 등급 승급 필요 시청자 수 (최상위 등급은 null)
  const viewerCap = stationSpec(stationGrade).viewerCap

  return (
    <main
      className={`game-stage fixed inset-0 grid h-dvh overflow-hidden ${
        broadcastPhase === 'live'
          ? 'is-on-air grid-rows-[auto_1fr]'
          : 'grid-rows-[auto_1fr_auto]'
      }`}
    >
      <header className="game-hud relative z-40 flex shrink-0 items-center justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onBack}
              title={t('hud.back')}
              aria-label={t('hud.back')}
              className="game-hud-icon-btn"
            >
              <IconBack />
            </button>
            {import.meta.env.DEV && onOpenEditor ? (
              <button
                type="button"
                onClick={onOpenEditor}
                title="EDIT"
                aria-label="EDIT"
                className="game-hud-icon-btn"
              >
                <IconEdit />
              </button>
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="game-kicker">STAR BROADCASTING CO.</p>
            <h1
              className="game-title mt-1 text-2xl"
              style={{ letterSpacing: '0.04em' }}
            >
              {t(`menu.${tab}`)}
            </h1>
          </div>
        </div>

        {broadcastPhase === 'live' ? (
          <div className="game-panel min-w-0 flex-1 max-w-md rounded-xl border border-pink-400/35 px-3 py-2 shadow-[0_0_18px_rgba(255,42,116,0.12)] sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-pink-400/40 bg-pink-500/15 px-2 py-0.5 text-[10px] font-black tracking-wider text-pink-300 neon-text-pink">
                  <span className="game-live-dot h-1.5 w-1.5 rounded-full bg-pink-400" />
                  {t('hud.onAir')}
                </span>
                <p className="text-sm font-black tabular-nums text-slate-100">
                  <span className="text-slate-500">{t('hud.dayProgress')}</span>{' '}
                  <span className="neon-text-cyan">{broadcastWeekCurrent}</span>
                  <span className="text-slate-600">/</span>
                  <span>{WEEKS_PER_MONTH}</span>
                  <span className="ml-0.5 text-[11px] font-bold text-slate-500">
                    {t('hud.weekUnit')}
                  </span>
                </p>
              </div>
              <p className="text-xs font-bold tabular-nums text-slate-300">
                <span className="text-slate-500">{t('hud.daysLeft')}</span>{' '}
                <span className="text-amber-300">{broadcastWeeksLeft}</span>
                <span className="ml-0.5 text-[10px] text-slate-500">{t('hud.weekUnit')}</span>
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-400 to-cyan-300 transition-[width] duration-500"
                style={{ width: `${broadcastMonthPct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <div className="game-hud-strip min-w-0">
            <div className="game-hud-cell game-hud-cell--date">
              <div className="game-hud-cell-head">
                <IconHudDate />
                <p className="game-stat-label">{t('hud.dateTime')}</p>
              </div>
              <p className="game-stat-value tabular-nums text-slate-100">{clock.date}</p>
            </div>
            <div className="game-hud-cell game-hud-cell--rank">
              <div className="game-hud-cell-head">
                <IconHudRank />
                <p className="game-stat-label">{t('hud.stationRank')}</p>
              </div>
              <p className="game-stat-value tabular-nums">
                {league.currentRank}
                {t('ranking.rankUnit')}
              </p>
              <p className="game-hud-rank-company">
                {t(companyTierLabelKey(companyTierOf(league.currentRank).id))}
              </p>
            </div>
            <div className="game-hud-cell game-hud-cell--viewers">
              <div className="game-hud-cell-head">
                <IconHudViewers />
                <p className="game-stat-label">{t('hud.viewers')}</p>
              </div>
              <p className="game-stat-value tabular-nums">
                {formatViewers(league.viewers)}
                {viewerCap != null ? (
                  <span className="text-slate-500/80"> / {formatViewers(viewerCap)}</span>
                ) : null}
                {t('ranking.viewersUnit')}
              </p>
            </div>
            <div className="game-hud-cell game-hud-cell--assets">
              <div className="game-hud-cell-head">
                <IconHudAssets />
                <p className="game-stat-label">{t('hud.assets')}</p>
              </div>
              <p className="game-stat-value tabular-nums">{formatAssets(assets)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTab('settings')}
            title={t('menu.settings')}
            aria-label={t('menu.settings')}
            aria-pressed={tab === 'settings'}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
              tab === 'settings'
                ? 'border-pink-400/50 bg-pink-500/20 text-pink-200 shadow-[0_0_14px_rgba(255,42,116,0.25)]'
                : 'border-white/15 bg-slate-950/70 text-slate-300 hover:border-indigo-400/40 hover:text-indigo-200'
            }`}
          >
            <IconSettings />
          </button>
        </div>
      </header>

      <section
        className={`relative z-10 min-h-0 ${
          tab === 'dashboard' ||
          tab === 'schedule' ||
          tab === 'creator' ||
          tab === 'ranking'
            ? 'h-full overflow-hidden p-3 sm:p-4'
            : 'overflow-auto p-6'
        }`}
      >
        {/* 탭 전환 시 언마운트하지 않아 idle 영상 루프 유지. 비활성 시 화면 밖으로 이동해 뒤에 비치지 않음 */}
        <div
          className={
            tab === 'dashboard'
              ? 'h-full min-h-0'
              : 'pointer-events-none fixed left-[-200vw] top-0 z-[-1] h-dvh w-screen overflow-hidden opacity-0'
          }
          aria-hidden={tab !== 'dashboard'}
        >
          <DashboardPanel
            slots={studioSlots}
            ownedCreators={ownedCreators}
            registeredStaff={registeredStaff}
            managerState={managerState}
            broadcastPhase={broadcastPhase}
            livePlayVideoByCreator={livePlayVideoByCreator}
            liveEvents={liveEvents}
            liveRevenueByCreator={liveRevenueByCreator}
            liveWeekProgress={liveWeekProgress}
            liveStaminaDrainByCreatorId={liveStaminaDrainByCreatorId}
            conditionCrashes={conditionCrashes}
            gearFailBursts={gearFailBursts}
            staffActions={staffActions}
            toxicQtes={toxicQteQueue}
            slotGearById={slotGearById}
            assets={assets}
            startBroadcastLocked={startBroadcastLocked}
            onStartBroadcast={handleStartBroadcast}
            onConditionCare={handleConditionCare}
            onRepairSlot={repairBrokenSlot}
            onConditionCrashDone={(id) =>
              setConditionCrashes((prev) => prev.filter((row) => row.id !== id))
            }
            onGearFailBurstDone={(id) =>
              setGearFailBursts((prev) => prev.filter((row) => row.id !== id))
            }
            onStaffActionDone={(id) =>
              setStaffActions((prev) => prev.filter((row) => row.id !== id))
            }
            onToxicQteResolve={resolveToxicQte}
          />
        </div>

        {tab === 'dashboard' ? null : tab === 'creator' ? (
          <CreatorPanel
            ownedCreators={ownedCreators}
            registeredCharacters={registeredCharacters}
            scoutState={scoutSystem}
            assets={assets}
            broadcastMonthNumber={broadcastMonthNumber}
            openScout={openCreatorScout}
            onScoutClosed={() => setOpenCreatorScout(false)}
            openStaffScout={openStaffScout}
            onStaffScoutClosed={() => setOpenStaffScout(false)}
            onScoutViewed={() => setScoutSystem((prev) => markScoutViewed(prev))}
            onScoutPass={() => setScoutSystem((prev) => passScoutOffer(prev))}
            onScoutHire={handleCreatorScoutHire}
            onConditionCare={handleConditionCare}
            onVacation={handleVacation}
            onProductionTraining={handleProductionTraining}
            onSnsCompose={handleSnsCompose}
            onBulkSnsCompose={handleBulkSnsCompose}
            registeredStaff={registeredStaff}
            managerState={managerState}
            onHireStaff={handleHireStaff}
            hiredStaffSalaries={hiredStaffSalaries}
            hiredStaffStartMonths={hiredStaffStartMonths}
            staffScoutAvailable={staffScoutAvailable}
            scoutedStaffCandidate={scoutedStaffCandidate}
            onScoutStaff={handleScoutStaff}
            creatorScoutAvailable={creatorScoutAvailable}
            onScoutCreator={handleScoutCreator}
            studioSlots={studioSlots}
            onAssignStaffPlacement={handleAssignStaffPlacement}
          />
        ) : tab === 'schedule' ? (
          <SchedulePanel
            slots={studioSlots}
            handCards={handCards}
            onSlotsChange={onStudioSlotsChange}
            pendingHandCreatorId={recruitFlyCard?.id ?? null}
            spotlightCreatorId={spotlightCreatorId}
            placementLocked={broadcastPhase === 'live'}
            registeredStaff={registeredStaff}
            managerState={managerState}
            onEquipStaff={handleEquipStaff}
            onUnequipStaff={handleUnequipStaff}
            defaultStudioMode={scheduleStudioMode}
            defaultSelectedStaffId={scheduleSelectedStaffId}
            onResetDefaultMode={() => {
              setScheduleStudioMode(undefined)
              setScheduleSelectedStaffId(null)
            }}
            unlockableSlotId={(() => {
              const unlocked = countUnlockedSlots(studioSlots)
              if (unlocked >= 6) return null
              if (!meetsSlotUnlockByRank(stationGradeConfig, league.currentRank, unlocked)) {
                return null
              }
              return findNextUnlockableSlot(studioSlots)?.id ?? null
            })()}
            unlockPrice={(() => {
              const unlocked = countUnlockedSlots(studioSlots)
              if (unlocked >= 6) return null
              if (!meetsSlotUnlockByRank(stationGradeConfig, league.currentRank, unlocked)) {
                return null
              }
              return (
                slotUnlockPriceOf(stationGradeConfig, unlocked) ?? calcSlotUnlockCost(unlocked)
              )
            })()}
            unlockGradeBlockedSlotId={(() => {
              const unlocked = countUnlockedSlots(studioSlots)
              if (unlocked >= 6) return null
              if (meetsSlotUnlockByRank(stationGradeConfig, league.currentRank, unlocked)) {
                return null
              }
              return findNextUnlockableSlot(studioSlots)?.id ?? null
            })()}
            unlockRequiredGradeLabel={(() => {
              const unlocked = countUnlockedSlots(studioSlots)
              if (unlocked >= 6) return null
              if (meetsSlotUnlockByRank(stationGradeConfig, league.currentRank, unlocked)) {
                return null
              }
              const required = slotUnlockMinGradeOf(stationGradeConfig, unlocked)
              return required ? t(companyTierLabelKey(required)) : null
            })()}
            assets={assets}
            onUnlockSlot={handleUnlockStudioSlot}
            currentRank={league.currentRank}
            stationGradeConfig={stationGradeConfig}
          />
        ) : tab === 'ranking' ? (
          <RankingPanel
            league={league}
            stationGrade={stationGrade}
            unlockedSlotCount={countUnlockedSlots(studioSlots)}
            assets={assets}
            nextReviewDate={
              formatGameClock(nextJanuaryAfter(monthToCalendarDate(GAME_EPOCH, gameMonth), GAME_EPOCH))
                .date
            }
            creators={toRankCreators(ownedCreators)}
            turnsUntilRankRefresh={rankRefreshTurnsLeft}
            rankPlay={rankBubblePlay}
            onRankPlayDone={() => {
              setRankBubblePlay(null)
              const pending = pendingRankAfterBubbleRef.current
              pendingRankAfterBubbleRef.current = null
              if (pending) {
                setRankSettlement(pending)
                return
              }
              // 승급 말풍선 애니메이션 종료 → 승급을 리그 상태에 반영
              applyPendingPromotion()
            }}
            onOpenScout={openScoutFromRanking}
          />
        ) : tab === 'settings' ? (
          <div className="neon-glow-card rounded-2xl p-6 bg-slate-950/50 backdrop-blur-md max-w-2xl mx-auto border border-indigo-500/20">
            <h2 className="text-lg font-bold text-slate-100 tracking-wider mb-5 flex items-center gap-2">
              ⚙️ {t('settings.title')}
            </h2>

            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 tracking-wider">
                  {t('settings.language')}
                </label>
                <p className="text-[10px] text-slate-600 mb-1">
                  {t('settings.languageDesc')}
                </p>
                <div className="relative">
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as any)}
                    className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl px-4 py-3 text-xs text-slate-200 font-bold focus:outline-none focus:border-pink-500/60 appearance-none cursor-pointer transition-all"
                  >
                    <option value="KO">한국어 (KO)</option>
                    <option value="EN">English (EN)</option>
                    <option value="JA">日本語 (JA) (일본어)</option>
                    <option value="ZH-CN">简体中文 (ZH-CN) (중국어 간체)</option>
                    <option value="RU">Русский (RU) (러시아어)</option>
                    <option value="ES">Español (ES) (스페인어)</option>
                    <option value="DE">Deutsch (DE) (독일어)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-indigo-400">
                    <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 tracking-wider">
                  {t('settings.audio')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">{t('settings.bgm')}</span>
                    <input type="range" className="accent-pink-500 bg-slate-900 border border-indigo-500/20 h-1.5 rounded-lg appearance-none cursor-pointer" defaultValue={70} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">{t('settings.se')}</span>
                    <input type="range" className="accent-pink-500 bg-slate-900 border border-indigo-500/20 h-1.5 rounded-lg appearance-none cursor-pointer" defaultValue={80} />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 tracking-wider">
                    {t('settings.devMode')}
                  </h3>
                  <p className="text-[9px] text-slate-600 mt-1">
                    {t('settings.devModeDesc')}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-bold bg-slate-900 border border-indigo-500/25 px-2.5 py-1 rounded-lg">
                  OFF
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="game-panel min-h-full rounded-2xl p-6 text-slate-500">
            <p className="text-base">
              {t('common.screenReady').replace(
                '{name}',
                t(`menu.${tab}`) || (tab as string).toUpperCase(),
              )}
            </p>
          </div>
        )}
      </section>

      {broadcastPhase === 'live' ? null : (
      <nav className="game-dock z-20 shrink-0 px-6 py-3" aria-label={t('menu.ariaGameMenu')}>
        <div className="mx-auto flex w-full max-w-6xl gap-1.5 sm:gap-2">
          {TABS.map((item) => {
            const isActive = tab === item.id
            const alert =
              item.id === 'creator' &&
              (creatorScoutAvailable ||
                staffScoutAvailable ||
                Boolean(scoutSystem.activeOffer) ||
                Boolean(scoutedStaffCandidate))
            const alertLabel =
              item.id === 'creator' && alert
                ? scoutSystem.activeOffer
                  ? t('creator.scoutNewArrival')
                  : scoutedStaffCandidate
                    ? t('creator.staffScoutNewArrival')
                    : t('menu.creator')
                : undefined
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`game-btn-tab relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold tracking-wide ${
                  isActive ? 'is-active' : ''
                }`}
              >
                {item.icon}
                <span>{t(`menu.${item.id}`)}</span>
                {alert ? <RedDot label={alertLabel} /> : null}
              </button>
            )
          })}
        </div>
      </nav>
      )}

      {broadcastEndedNotice ? (
        <div className="broadcast-ended-overlay" role="status" aria-live="polite">
          <p className="broadcast-ended-title">{t('dashboard.broadcastEnded')}</p>
        </div>
      ) : null}

      {snsResultQueue[0] &&
      !weeklyStatement &&
      !broadcastEndedNotice &&
      !rankSettlement &&
      !rankBubblePlay &&
      !stationReview &&
      !showGameClear &&
      !vipOffer &&
      !vipResult &&
      !vipEventPlay &&
      !socialUi &&
      !salaryEventPlay &&
      !scoutEventState &&
      !promotionExam ? (
        <SnsResultModal
          result={snsResultQueue[0]}
          onConfirm={() => {
            const rest = snsResultQueueRef.current.slice(1)
            snsResultQueueRef.current = rest
            setSnsResultQueue(rest)
            if (rest.length === 0) releaseMonthEndLock(pendingScoutAfterRankRef.current)
          }}
        />
      ) : null}

      {weeklyStatement ? (
        <WeeklySettlementModal
          statement={weeklyStatement}
          assetsAfter={settlementAssetsAfter}
          portraitByCreatorId={settlementPortraits}
          onConfirm={() => {
            setWeeklyStatement(null)
            finishWeeklyStatementFollowup()
          }}
        />
      ) : null}

      {rankSettlement ? (
        <RankChangeModal
          result={rankSettlement}
          onConfirm={() => {
            const cleared = rankSettlement.gameCleared
            const openScout = pendingScoutAfterRankRef.current
            setRankSettlement(null)
            if (pendingStationReviewRef.current) {
              pendingStationReviewRef.current = false
              pendingScoutAfterRankRef.current = openScout
              pendingGameClearRef.current = cleared
              const review = applyStationReview(
                stationGradeRef.current,
                leagueRef.current.viewers,
                ownedCreatorsRef.current,
                {
                  unlockedSlotCount: countUnlockedSlots(studioSlotsRef.current),
                  assets: assetsRef.current,
                },
              )
              setStationReview({ promoted: review.promoted, status: review.status })
              return
            }
            if (cleared) {
              pendingScoutAfterRankRef.current = openScout
              setShowGameClear(true)
              return
            }
            continueAfterMonthModals(openScout)
          }}
        />
      ) : null}

      {stationReview ? (
        <StationReviewModal
          promoted={stationReview.promoted}
          status={stationReview.status}
          onConfirm={() => {
            const review = stationReview
            setStationReview(null)
            if (review.promoted && review.status.next) {
              const nextGrade = review.status.next
              const oldRank = leagueRef.current.currentRank
              const newRank = stationRankForGrade(nextGrade, leagueRef.current.viewers)
              // 등급은 즉시 반영, 리그 순위는 애니메이션 종료 후 반영
              // (말풍선이 이전 순위에서 새 순위로 올라가며 피라미드가 채워지도록)
              stationGradeRef.current = nextGrade
              setStationGrade(nextGrade)
              pendingPromotionRef.current = { nextGrade, oldRank, newRank }
              setTab('ranking')
              setPromotionFx({
                fromGrade: review.status.current,
                toGrade: nextGrade,
                fromRank: oldRank,
                toRank: newRank,
              })
              setRankBubblePlay({ fromRank: oldRank, toRank: newRank })
              return
            }
            continueMonthEndFlow()
          }}
        />
      ) : null}

      {promotionFx ? (
        <StationPromotionFx
          fromLabel={t(companyTierLabelKey(promotionFx.fromGrade))}
          toLabel={t(companyTierLabelKey(promotionFx.toGrade))}
          fromRank={promotionFx.fromRank}
          toRank={promotionFx.toRank}
          onDone={() => {
            // 배너가 끝나면 승급 반영(이미 됐다면 무시) 후 월말 흐름 계속
            applyPendingPromotion()
            setPromotionFx(null)
            continueMonthEndFlow()
          }}
        />
      ) : null}

      {showGameClear ? (
        <GameClearModal
          onConfirm={() => {
            const openScout = pendingScoutAfterRankRef.current
            setShowGameClear(false)
            continueAfterMonthModals(openScout)
          }}
        />
      ) : null}

      {vipOffer ? (
        <VipOfferModal
          offer={vipOffer}
          onAccept={handleVipAccept}
          onReject={handleVipReject}
        />
      ) : null}

      {vipResult ? (
        <VipResultModal
          result={vipResult}
          onConfirm={() => {
            setVipResult(null)
            continueAfterMonthModals(pendingScoutAfterRankRef.current)
          }}
        />
      ) : null}

      {socialUi?.mode === 'dateOffer' ? (
        <DateOfferModal pending={socialUi.pending} onStart={handleDateStart} />
      ) : null}
      {socialUi?.mode === 'dateResult' ? (
        <DateResultModal
          pending={socialUi.pending}
          onConfirm={() => {
            setSocialUi(null)
            continueAfterMonthModals(pendingScoutAfterRankRef.current)
          }}
        />
      ) : null}
      {socialUi?.mode === 'giftOffer' ? (
        <GiftOfferModal
          pending={socialUi.pending}
          assets={assets}
          onAccept={handleGiftAccept}
          onReject={handleGiftReject}
        />
      ) : null}
      {socialUi?.mode === 'giftResult' ? (
        <GiftResultModal
          accepted={socialUi.accepted}
          creatorName={socialUi.pending.creatorName}
          assetCost={socialUi.pending.assetCost}
          conditionDelta={socialUi.conditionDelta}
          staminaDelta={socialUi.staminaDelta}
          onConfirm={() => {
            setSocialUi(null)
            continueAfterMonthModals(pendingScoutAfterRankRef.current)
          }}
        />
      ) : null}
      {socialUi?.mode === 'hRetryOffer' ? (
        <HRetryOfferModal
          pending={socialUi.pending}
          onAccept={handleHRetryAccept}
          onReject={handleHRetryReject}
        />
      ) : null}
      {socialUi?.mode === 'hRetryResult' ? (
        <HRetryResultModal
          accepted={socialUi.accepted}
          creatorName={socialUi.pending.creatorName}
          staminaLoss={socialUi.staminaLoss}
          conditionLoss={socialUi.conditionLoss}
          onConfirm={() => {
            setSocialUi(null)
            continueAfterMonthModals(pendingScoutAfterRankRef.current)
          }}
        />
      ) : null}

      {scoutEventState && (
        <EventSimulator
          key={scoutEventState.currentEvent.id}
          event={scoutEventState.currentEvent}
          mode="game"
          onClose={handleScoutEventFinished}
          registeredCharacters={registeredCharacters}
          allowSkip={watchedEventIds.includes(scoutEventState.currentEvent.id)}
        />
      )}

      {vipEventPlay ? (
        <EventSimulator
          key={`vip-${vipEventPlay.offer.creatorId}-${vipEventPlay.event.id}`}
          event={vipEventPlay.event}
          mode="game"
          onClose={() => {
            const play = vipEventPlay
            onEventWatched?.(play.event.id)
            setVipEventPlay(null)
            applyVipAcceptRewards(play.offer, play.staminaMaxLoss)
          }}
          registeredCharacters={registeredCharacters}
          allowSkip={watchedEventIds.includes(vipEventPlay.event.id)}
        />
      ) : null}

      {socialUi?.mode === 'dateVn' ? (
        <EventSimulator
          key={`date-${socialUi.pending.creatorId}-${socialUi.pending.step}-${socialUi.event.id}`}
          event={socialUi.event}
          mode="game"
          onClose={() => {
            if (socialUi.mode !== 'dateVn') return
            onEventWatched?.(socialUi.event.id)
            completeDateEvent(socialUi.pending)
          }}
          registeredCharacters={registeredCharacters}
          allowSkip={watchedEventIds.includes(socialUi.event.id)}
        />
      ) : null}

      {socialUi?.mode === 'hRetryVn' ? (
        <EventSimulator
          key={`hretry-${socialUi.pending.creatorId}-${socialUi.event.id}`}
          event={socialUi.event}
          mode="game"
          onClose={() => {
            if (socialUi.mode !== 'hRetryVn') return
            onEventWatched?.(socialUi.event.id)
            applyHRetryAccept(socialUi.pending, socialUi.staminaLoss)
          }}
          registeredCharacters={registeredCharacters}
          allowSkip={watchedEventIds.includes(socialUi.event.id)}
        />
      ) : null}

      {salaryEventPlay?.salaryEvent ? (
        <EventSimulator
          key={`salary-${salaryEventPlay.creatorId}-${salaryEventPlay.salaryEvent.id}`}
          event={salaryEventPlay.salaryEvent}
          mode="game"
          onClose={() => {
            onEventWatched?.(salaryEventPlay.salaryEvent!.id)
            applyPromotedSalary(salaryEventPlay)
          }}
          registeredCharacters={registeredCharacters}
          allowSkip={watchedEventIds.includes(salaryEventPlay.salaryEvent.id)}
        />
      ) : null}

      {promotionExam ? (
        <PromotionSlotModal
          creatorName={promotionExam.creatorName}
          result={promotionExam.result}
          onConfirm={confirmPromotionExam}
        />
      ) : null}

      {activePromotePopup ? (
        <SalaryNegotiateModal
          creatorName={activePromotePopup.creatorName}
          previousGrade={activePromotePopup.previousGrade}
          newGrade={activePromotePopup.newGrade}
          previousSalary={activePromotePopup.previousSalary}
          proposedSalary={activePromotePopup.proposedSalary}
          onConfirm={() => applyPromotedSalary(activePromotePopup)}
        />
      ) : null}

      {restRequiredName ? (
        <RestRequiredModal
          creatorName={restRequiredName}
          onConfirm={() => setRestRequiredName(null)}
        />
      ) : null}

      {recruitFlyCard ? (
        <RecruitCardFlyFx card={recruitFlyCard} onDone={finishRecruitFly} />
      ) : null}

      {staffSalaryRaiseRequest ? (
        <StaffSalaryRaiseModal
          staffName={staffSalaryRaiseRequest.staffName}
          staffKind={staffSalaryRaiseRequest.staffKind}
          iconUrl={staffSalaryRaiseRequest.iconUrl}
          mediaRevision={staffSalaryRaiseRequest.mediaRevision}
          currentSalary={staffSalaryRaiseRequest.currentSalary}
          requestedSalary={staffSalaryRaiseRequest.requestedSalary}
          onAccept={handleAcceptStaffSalaryRaise}
          onReject={handleRejectStaffSalaryRaise}
        />
      ) : null}
    </main>
  )
}
