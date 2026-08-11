import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from '../locales/i18n'
import {
  toStudioHandCard,
  type Grade,
  type OwnedCreator,
  type RegisteredCharacter,
} from '../game/characters'
import type { StudioSlot } from '../game/studioSlots'
import { calcSlotUnlockCost, countUnlockedSlots, findNextUnlockableSlot, unlockStudioSlot } from '../game/studioSlots'
import type { BroadcastPhase } from '../game/broadcast'
import { MS_PER_EMPTY_BROADCAST_WEEK, MS_PER_GAME_WEEK, WEEKS_PER_MONTH, monthToCalendarDate } from '../game/broadcast'
import {
  applyConditionFullCare,
  applyToxicStaminaPenalty,
  applyWeeklyStaminaAndCondition,
  applyVacationRecovery,
  calcConditionFullCareCost,
  calcVacationCost,
  canBroadcastByStamina,
  scoreOf,
} from '../game/condition'
import {
  buildStudioDayPlan,
  scaleDayPlanTimes,
  type DayEvent,
  type StudioDayPlan,
} from '../game/economy'
import { applyBroadcastGrowth } from '../game/growth'
import { formatMoney } from '../game/money'
import { rollNegotiatedSalary } from '../game/salary'
import {
  createInitialLeagueState,
  reapplyLeagueGate,
  settleLeagueRank,
  type LeagueState,
  type RankCreator,
  type RankSettlementResult,
} from '../game/ranking'
import {
  advanceScoutTurn,
  canHireScoutOffer,
  clearFirstHireGuarantee,
  clearScoutOfferAfterHire,
  createInitialScoutState,
  enablePremiumScout,
  ensureOpeningScout,
  hireScoutOffer,
  markScoutViewed,
  passScoutOffer,
  rollScoutAccept,
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
import { type ToxicWhackQteItem } from './ToxicWhackQte'
import { CreatorPanel } from './CreatorPanel'
import { DashboardPanel } from './DashboardPanel'
import { EquipmentPanel } from './EquipmentPanel'
import { RecruitCardFlyFx, type RecruitFlyCard } from './RecruitCardFlyFx'
import { RestRequiredModal } from './RestRequiredModal'
import { SalaryNegotiateModal } from './SalaryNegotiateModal'
import { SchedulePanel } from './SchedulePanel'
import { ScoutFailModal } from './ScoutFailModal'
import { GameClearModal } from './GameClearModal'
import { RankChangeModal } from './RankChangeModal'
import { RankingPanel } from './RankingPanel'
import { WeeklySettlementModal } from './WeeklySettlementModal'
import { EventSimulator } from '../events/EventSimulator'
import type { GameEvent } from '../events/types'

export type GameTab =
  | 'dashboard'
  | 'creator'
  | 'schedule'
  | 'ranking'
  | 'equipment'
  | 'settings'


const SPEED_OPTIONS = ['1x', '2x', '3x'] as const
type SpeedOption = (typeof SPEED_OPTIONS)[number]

const GAME_EPOCH = new Date(2026, 0, 1)
const INITIAL_ASSETS = 100_000
const MAX_RECENT_EVENTS = 40

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

function IconEquipment() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="7" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 10.5l4-2.2v7.4l-4-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="8.2" cy="18.8" r="1.2" fill="currentColor" />
      <circle cx="12.2" cy="18.8" r="1.2" fill="currentColor" />
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

const TABS: { id: GameTab; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'DASHBOARD', icon: <IconDashboard /> },
  { id: 'creator', label: 'CREATOR', icon: <IconCreator /> },
  { id: 'schedule', label: 'STUDIO', icon: <IconSchedule /> },
  { id: 'equipment', label: 'EQUIPMENT', icon: <IconEquipment /> },
  { id: 'ranking', label: 'RANKING', icon: <IconRanking /> },
]

type InGameProps = {
  registeredCharacters: RegisteredCharacter[]
  ownedCreators: OwnedCreator[]
  studioSlots: StudioSlot[]
  events: GameEvent[]
  onStudioSlotsChange: (slots: StudioSlot[]) => void
  onOwnedCreatorsChange: (creators: OwnedCreator[]) => void
  onScout: (creator: OwnedCreator) => void
  onBack: () => void
  onOpenEditor?: () => void
}

export function InGame({
  registeredCharacters,
  ownedCreators,
  studioSlots,
  events,
  onStudioSlotsChange,
  onOwnedCreatorsChange,
  onScout,
  onBack,
  onOpenEditor,
}: InGameProps) {
  const { t, locale, setLocale } = useTranslation()
  const [tab, setTab] = useState<GameTab>('dashboard')
  const [speed, setSpeed] = useState<SpeedOption>('1x')
  const [gameMonth, setGameMonth] = useState(0)
  const [broadcastPhase, setBroadcastPhase] = useState<BroadcastPhase>('prep')
  const [monthWeekIndex, setMonthWeekIndex] = useState(0)
  const [assets, setAssets] = useState(INITIAL_ASSETS)
  const [liveEvents, setLiveEvents] = useState<DayEvent[]>([])
  const [conditionCrashes, setConditionCrashes] = useState<ConditionCrashFxItem[]>([])
  const [toxicQteQueue, setToxicQteQueue] = useState<ToxicWhackQteItem[]>([])
  const [liveRevenueByCreator, setLiveRevenueByCreator] = useState<Record<string, number>>({})
  const [weeklyStatement, setWeeklyStatement] = useState<WeeklyStatement | null>(null)
  /** 월간 방송 종료 후 명세서 대기·표시 중 — 닫기 전까지 방송 시작 잠금 */
  const [startBroadcastLocked, setStartBroadcastLocked] = useState(false)
  const [openCreatorScout, setOpenCreatorScout] = useState(false)
  const [broadcastMonthNumber, setBroadcastMonthNumber] = useState(1)
  const [league, setLeague] = useState<LeagueState>(() => createInitialLeagueState())
  const [rankSettlement, setRankSettlement] = useState<RankSettlementResult | null>(null)
  const [showGameClear, setShowGameClear] = useState(false)

  // 스카웃 VN 이벤트 진행
  type ScoutEventState = {
    creator: OwnedCreator
    step: 'scout' | 'accept'
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
  const [scoutFailName, setScoutFailName] = useState<string | null>(null)
  const [restRequiredName, setRestRequiredName] = useState<string | null>(null)
  const [scoutSystem, setScoutSystem] = useState<ScoutSystemState>(() =>
    createInitialScoutState(1),
  )
  const [promoteQueue, setPromoteQueue] = useState<PromoteSalaryNego[]>([])
  const [salaryEventPlay, setSalaryEventPlay] = useState<PromoteSalaryNego | null>(null)
  const [recruitFlyCard, setRecruitFlyCard] = useState<RecruitFlyCard | null>(null)
  const [spotlightCreatorId, setSpotlightCreatorId] = useState<string | null>(null)
  const spotlightTimerRef = useRef<number | null>(null)
  const scoutSystemRef = useRef(scoutSystem)
  const registeredCharactersRef = useRef(registeredCharacters)
  const eventsRef = useRef(events)
  scoutSystemRef.current = scoutSystem
  registeredCharactersRef.current = registeredCharacters
  eventsRef.current = events

  function beginRecruitPresentation(creator: OwnedCreator) {
    onScout(creator)
    setScoutSystem((prev) => clearFirstHireGuarantee(prev))
    setTab('schedule')
    setRecruitFlyCard({
      id: creator.id,
      name: creator.name,
      grade: creator.grade,
      popularity: creator.popularity,
      profileImageUrl: creator.profileImageUrl || null,
    })
  }

  function showScoutFail(creatorName: string) {
    setScoutEventState(null)
    setScoutFailName(creatorName)
  }

  /** 스카웃 VN 유무와 무관 — 성공/실패 판정 후 승낙 VN 또는 즉시 결과 */
  function resolveScoutHireOutcome(creator: OwnedCreator) {
    const ownedCount = ownedCreatorsRef.current.length
    const isSuccess = rollScoutAccept(
      ownedCount,
      scoutSystemRef.current.firstHireGuaranteed,
    )
    if (isSuccess) {
      const charDef = registeredCharactersRef.current.find((c) => c.id === creator.id)
      const acceptEventId = charDef?.eventLinks?.scoutAccept
      const acceptEvent = acceptEventId
        ? eventsRef.current.find((e) => e.id === acceptEventId) ?? null
        : null
      if (acceptEvent) {
        setScoutEventState({
          creator,
          step: 'accept',
          currentEvent: acceptEvent,
        })
      } else {
        setScoutEventState(null)
        beginRecruitPresentation(creator)
      }
      return
    }

    // 실패 — 차감 연봉 환불 (보유 합류 전)
    setAssets((prev) => prev + creator.salary)
    showScoutFail(creator.name)
  }

  function applyPromotedSalary(item: PromoteSalaryNego) {
    const nextOwned = ownedCreatorsRef.current.map((creator) =>
      creator.id === item.creatorId ? { ...creator, salary: item.proposedSalary } : creator,
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
      startBroadcastLocked ||
      openCreatorScout
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
    startBroadcastLocked,
    openCreatorScout,
  ])

  const activePromotePopup =
    !salaryEventPlay &&
    !scoutEventState &&
    !weeklyStatement &&
    !rankSettlement &&
    !startBroadcastLocked &&
    !openCreatorScout
      ? promoteQueue.find((row) => !row.salaryEvent) ?? null
      : null

  function handleCreatorScoutHire(offer: ScoutOffer) {
    const check = canHireScoutOffer(offer, assets)
    if (!check.ok) return
    const creator = hireScoutOffer(offer)
    setAssets((prev) => prev - offer.salary)
    setScoutSystem((prev) => clearScoutOfferAfterHire(prev))
    const charDef = registeredCharacters.find((c) => c.id === creator.id)
    const scoutEventId = charDef?.eventLinks?.scout
    const scoutEvent = scoutEventId ? events.find((e) => e.id === scoutEventId) : null
    if (scoutEvent) {
      setScoutEventState({
        creator,
        step: 'scout',
        currentEvent: scoutEvent,
      })
    } else {
      // 스카웃 VN 미연결 → 바로 성공/실패 결과
      resolveScoutHireOutcome(creator)
    }
  }

  function handleScoutEventFinished() {
    if (!scoutEventState) return
    const { creator, step } = scoutEventState

    if (step === 'scout') {
      resolveScoutHireOutcome(creator)
    } else if (step === 'accept') {
      setScoutEventState(null)
      beginRecruitPresentation(creator)
    }
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
    const next = reapplyLeagueGate(leagueRef.current, toRankCreators(ownedCreatorsRef.current))
    if (next === leagueRef.current) return
    leagueRef.current = next
    setLeague(next)
    if (next.scoutRateUp) {
      setScoutSystem((scout) => enablePremiumScout(scout))
    }
  }, [rosterGateKey])

  // 보유 0명이면 스카우트 후보가 생기는 즉시 스카우트 창으로
  useEffect(() => {
    if (ownedCreators.length > 0) return
    if (weeklyStatement || rankSettlement || scoutEventState || openCreatorScout) return
    if (!scoutSystem.activeOffer) return
    setTab('creator')
    setOpenCreatorScout(true)
  }, [
    ownedCreators.length,
    scoutSystem.activeOffer,
    weeklyStatement,
    rankSettlement,
    scoutEventState,
    openCreatorScout,
  ])
  const dayPlanRef = useRef<StudioDayPlan | null>(null)
  const dayStartedAtRef = useRef<number | null>(null)
  const revealedIdsRef = useRef(new Set<string>())
  const settledDayKeyRef = useRef<string | null>(null)
  const weekAccumRef = useRef<WeekAccumulator>(createWeekAccumulator(1))
  const prevWeekRevenueRef = useRef<number | null>(null)
  const weekFinishedRef = useRef(false)
  const toxicQteQueueRef = useRef<ToxicWhackQteItem[]>([])
  const pendingWeekAdvanceAfterToxicRef = useRef(false)
  const statementDelayTimerRef = useRef<number | null>(null)
  const leagueRef = useRef(league)
  const pendingScoutAfterRankRef = useRef(false)
  const pendingRankResultRef = useRef<RankSettlementResult | null>(null)
  const annualRevenueByYearRef = useRef<Record<number, number>>({})
  const studioSlotsRef = useRef(studioSlots)
  const ownedCreatorsRef = useRef(ownedCreators)
  const speedRef = useRef(speed)
  const onOwnedCreatorsChangeRef = useRef(onOwnedCreatorsChange)
  const gameMonthRef = useRef(gameMonth)
  const monthWeekIndexRef = useRef(monthWeekIndex)
  const broadcastMonthNumberRef = useRef(broadcastMonthNumber)
  studioSlotsRef.current = studioSlots
  ownedCreatorsRef.current = ownedCreators
  speedRef.current = speed
  onOwnedCreatorsChangeRef.current = onOwnedCreatorsChange
  gameMonthRef.current = gameMonth
  monthWeekIndexRef.current = monthWeekIndex
  broadcastMonthNumberRef.current = broadcastMonthNumber
  leagueRef.current = league
  const handCards = ownedCreators.map(toStudioHandCard)

  const handleUpgradeStudio = () => {
    const target = findNextUnlockableSlot(studioSlots)
    if (!target) return
    const cost = calcSlotUnlockCost(countUnlockedSlots(studioSlots))
    if (assets < cost) return
    setAssets((prev) => prev - cost)
    onStudioSlotsChange(unlockStudioSlot(studioSlots, target.id))
  }

  function handleUnlockStudioSlot(slotId: string) {
    if (broadcastPhase === 'live') return false
    const next = findNextUnlockableSlot(studioSlots)
    if (!next || next.id !== slotId) return false
    const cost = calcSlotUnlockCost(countUnlockedSlots(studioSlots))
    if (assets < cost) return false
    setAssets((prev) => prev - cost)
    onStudioSlotsChange(unlockStudioSlot(studioSlots, slotId))
    return true
  }

  function assignedCreatorsFrom(list: OwnedCreator[]) {
    return studioSlotsRef.current
      .filter((slot) => slot.status === 'assigned' && slot.assignment)
      .map((slot) => list.find((c) => c.id === slot.assignment!.creatorId))
      .filter((c): c is OwnedCreator => Boolean(c))
      .filter((c) => canBroadcastByStamina(c.stamina))
  }

  function toRankCreators(list: OwnedCreator[]): RankCreator[] {
    return list.map((creator) => ({
      id: creator.id,
      name: creator.name,
      grade: creator.grade,
      popularity: creator.popularity,
      skill: creator.skill,
      condition: creator.condition,
      conditionScore: creator.conditionScore,
    }))
  }

  function openScoutFromRanking() {
    setTab('creator')
    setOpenCreatorScout(true)
  }

  /** 무배치면 주당 1초, 아니면 기본 5초 (배속 적용) */
  function weekDurationMs(speedOpt: SpeedOption = speedRef.current) {
    const empty = assignedCreatorsFrom(ownedCreatorsRef.current).length === 0
    const base = empty ? MS_PER_EMPTY_BROADCAST_WEEK : MS_PER_GAME_WEEK
    return base / speedMultiplierOf(speedOpt)
  }

  /** 한 주 시작: 현재 컨디션으로 주간 수익 DayPlan 선계산 */
  function beginDayPlan(dayKey: string, weekMs: number) {
    const plan = buildStudioDayPlan(
      assignedCreatorsFrom(ownedCreatorsRef.current),
      weekMs,
      dayKey,
      leagueRef.current.revenueBonusPercent,
    )
    dayPlanRef.current = plan
    dayStartedAtRef.current = performance.now()
    revealedIdsRef.current = new Set()
    settledDayKeyRef.current = null
  }

  function creditLiveDonations(events: DayEvent[]) {
    const donations = events.filter((event) => event.type === 'donation' && event.amount > 0)
    if (donations.length === 0) return
    setLiveRevenueByCreator((prev) => {
      const next = { ...prev }
      for (const event of donations) {
        next[event.creatorId] = (next[event.creatorId] ?? 0) + event.amount
      }
      return next
    })
  }

  function flushRemainingEvents(plan: StudioDayPlan) {
    const pending = plan.plans
      .flatMap((p) => p.events)
      .filter((event) => !revealedIdsRef.current.has(event.id))
    if (pending.length === 0) return
    pending.forEach((event) => revealedIdsRef.current.add(event.id))
    creditLiveDonations(pending)
    setLiveEvents((prev) => [...pending.reverse(), ...prev].slice(0, MAX_RECENT_EVENTS))
  }

  function settleCurrentDay() {
    const plan = dayPlanRef.current
    if (!plan || settledDayKeyRef.current === plan.dayKey) return
    settledDayKeyRef.current = plan.dayKey
    flushRemainingEvents(plan)
    // 자산은 턴(월) 종료 정산에서만 반영 — 방송 중 실시간 가산 없음
    if (plan.totalRevenueWon > 0) {
      const year = monthToCalendarDate(GAME_EPOCH, gameMonthRef.current).getFullYear()
      annualRevenueByYearRef.current[year] =
        (annualRevenueByYearRef.current[year] ?? 0) + plan.totalRevenueWon
    }
    weekAccumRef.current = recordDayIntoWeek(weekAccumRef.current, plan.plans)
    // 주 종료: 실제 방송자만 스테미나/컨디션 소모(+진상 시 컨디션 급락, 스테미나는 QTE)
    const broadcastedIds = new Set(plan.plans.map((p) => p.creatorId))
    const { creators: nextOwned, crashes } = applyWeeklyStaminaAndCondition(
      ownedCreatorsRef.current,
      broadcastedIds,
    )
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)

    if (crashes.length > 0) {
      const toxicEvents: DayEvent[] = crashes.map((crash) => ({
        id: `toxic-${crash.creatorId}-${plan.dayKey}`,
        creatorId: crash.creatorId,
        creatorName: crash.creatorName,
        type: 'toxic',
        amount: crash.drop,
        text: `${crash.creatorName} 진상 시청자! 컨디션 −${crash.drop} · 클릭으로 스테미나 방어!`,
        atMs: 0,
        tone: 'bg-rose-500',
      }))
      setLiveEvents((prev) => [...toxicEvents.reverse(), ...prev].slice(0, MAX_RECENT_EVENTS))
      setConditionCrashes((prev) => [
        ...prev,
        ...crashes.map((crash) => ({
          id: `crash-fx-${crash.creatorId}-${plan.dayKey}-${crash.drop}`,
          creatorId: crash.creatorId,
          drop: crash.drop,
          staminaDrop: crash.staminaDrop,
        })),
      ])
      const qteItems: ToxicWhackQteItem[] = crashes.map((crash) => ({
        id: `toxic-qte-${crash.creatorId}-${plan.dayKey}-${crash.staminaDrop}`,
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
            `${crash.creatorName} 진상 사태로 컨디션 −${crash.drop}`,
            ...weekAccumRef.current.highlights,
          ],
        }
      }
    }
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
            text: `${current.creatorName} 진상 차단 성공! 스테미나 방어`,
            atMs: 0,
            tone: 'bg-emerald-400',
          },
          ...prev,
        ].slice(0, MAX_RECENT_EVENTS),
      )
      weekAccumRef.current = {
        ...weekAccumRef.current,
        highlights: [
          `${current.creatorName} 진상 차단 — 스테미나 방어`,
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
            text: `${current.creatorName} 진상 대응 실패! 스테미나 −${current.staminaDrop}`,
            atMs: 0,
            tone: 'bg-rose-500',
          },
          ...prev,
        ].slice(0, MAX_RECENT_EVENTS),
      )
      weekAccumRef.current = {
        ...weekAccumRef.current,
        highlights: [
          `${current.creatorName} 진상 실패로 스테미나 −${current.staminaDrop}`,
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
    const weekMs = weekDurationMs(speedRef.current)
    beginDayPlan(`m${broadcastMonthNumberRef.current}-w${nextMonthWeek}`, weekMs)
  }

  function finishBroadcastMonth() {
    // Strict Mode / 중복 틱 방어: 한 달(턴) 종료는 1회만
    if (weekFinishedRef.current) return
    weekFinishedRef.current = true

    // 턴 종료 → 무조건 다음 달
    const nextMonth = gameMonthRef.current + 1
    gameMonthRef.current = nextMonth
    setGameMonth(nextMonth)

    const weekSnapshot = weekAccumRef.current
    // 월간 1회: 해당 월에 방송한 크리에이터만 성장
    const monthBroadcastIds = new Set(weekSnapshot.byCreator.keys())
    const growthHighlights: string[] = []
    const promoteBatch: PromoteSalaryNego[] = []
    let nextOwned = ownedCreatorsRef.current.map((creator) => {
      if (!monthBroadcastIds.has(creator.id)) return creator
      const result = applyBroadcastGrowth(creator)
      growthHighlights.push(
        `${creator.name} 성장 인기 +${result.popularityGain} / 스킬 +${result.skillGain}`,
      )
      if (result.promotedTo) {
        growthHighlights.push(
          `${creator.name} ${result.previousGrade}→${result.promotedTo} 등급 상승!`,
        )
        const previousSalary = result.creator.salary
        const proposedSalary = rollNegotiatedSalary(
          {
            popularity: result.creator.popularity,
            skill: result.creator.skill,
            heat: result.creator.heat,
            trust: result.creator.trust,
            stamina: result.creator.stamina,
            staminaMax: result.creator.staminaMax,
            revenueMult: result.creator.revenueMult,
          },
          result.promotedTo,
        )
        const charDef = registeredCharactersRef.current.find((c) => c.id === creator.id)
        const salaryEventId = charDef?.eventLinks?.salary
        const salaryEvent = salaryEventId
          ? eventsRef.current.find((e) => e.id === salaryEventId) ?? null
          : null
        promoteBatch.push({
          creatorId: result.creator.id,
          creatorName: result.creator.name,
          previousGrade: result.previousGrade,
          newGrade: result.promotedTo,
          previousSalary,
          proposedSalary,
          salaryEvent,
        })
      }
      return result.creator
    })
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
    if (promoteBatch.length > 0) {
      setPromoteQueue((prev) => [...prev, ...promoteBatch])
    }

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

    const statement = buildWeeklyStatement({
      week: {
        ...weekSnapshot,
        highlights: [...growthHighlights, ...weekSnapshot.highlights],
      },
      issuedDate: issued,
      previousNetProfitWon: prevWeekRevenueRef.current,
      unlockedSlotCount,
      payroll,
      annualTaxWon,
      taxYear,
      annualRevenueForTaxWon,
    })
    prevWeekRevenueRef.current = statement.netProfitWon
    // 케어비는 이미 즉시 차감됐으므로, 명세서 net에 포함된 케어분을 환산 보정
    const careAlreadyPaid = weekSnapshot.careExpenses.reduce(
      (sum, row) => sum + row.amountWon,
      0,
    )
    const assetDelta = statement.netProfitWon + careAlreadyPaid
    if (assetDelta !== 0) {
      setAssets((prev) => prev + assetDelta)
    }

    const broadcastedIds = new Set(weekSnapshot.byCreator.keys())
    const ownedRankCreators = toRankCreators(ownedCreatorsRef.current)
    const broadcastedCreators = ownedRankCreators.filter((creator) =>
      broadcastedIds.has(creator.id),
    )
    const settled = settleLeagueRank(
      leagueRef.current,
      broadcastedCreators,
      ownedRankCreators,
    )
    leagueRef.current = settled.state
    setLeague(settled.state)
    pendingRankResultRef.current = settled.result
    const unlockPremiumScout = settled.result.scoutRateUp

    const nextMonthNumber = broadcastMonthNumberRef.current + 1
    broadcastMonthNumberRef.current = nextMonthNumber
    setBroadcastMonthNumber(nextMonthNumber)
    weekAccumRef.current = createWeekAccumulator(nextMonthNumber)
    setBroadcastPhase('prep')
    dayPlanRef.current = null
    dayStartedAtRef.current = null
    setStartBroadcastLocked(true)

    // 방송 종료 직후 명세서가 덮지 않도록 잠시 대기 (진상 QTE 여유)
    if (statementDelayTimerRef.current != null) {
      window.clearTimeout(statementDelayTimerRef.current)
    }
    statementDelayTimerRef.current = window.setTimeout(() => {
      statementDelayTimerRef.current = null
      setWeeklyStatement(statement)
    }, 2000)

    // 새 턴 진입: 스카우트 후보 만료·등장 판정
    setScoutSystem((prev) => {
      const base = unlockPremiumScout ? enablePremiumScout(prev) : prev
      return advanceScoutTurn(
        base,
        nextMonthNumber,
        registeredCharactersRef.current,
        ownedCreatorsRef.current.map((c) => c.id),
      )
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
    if (weeklyStatement || startBroadcastLocked) return

    const blockedAssigned = studioSlotsRef.current
      .filter((slot) => slot.status === 'assigned' && slot.assignment)
      .map((slot) =>
        ownedCreatorsRef.current.find((c) => c.id === slot.assignment!.creatorId),
      )
      .filter((c): c is OwnedCreator => Boolean(c))
      .filter((c) => !canBroadcastByStamina(c.stamina))

    if (blockedAssigned.length > 0) {
      setRestRequiredName(blockedAssigned[0]!.name)
      return
    }

    if (statementDelayTimerRef.current != null) {
      window.clearTimeout(statementDelayTimerRef.current)
      statementDelayTimerRef.current = null
    }
    weekFinishedRef.current = false
    setStartBroadcastLocked(false)
    setBroadcastPhase('live')
    setMonthWeekIndex(0)
    monthWeekIndexRef.current = 0
    // 방송 시작 시 후원/시청 이벤트는 초기화, 세금 알림은 유지
    setLiveEvents((prev) => prev.filter((event) => event.type === 'tax'))
    setLiveRevenueByCreator({})
    setConditionCrashes([])
    toxicQteQueueRef.current = []
    setToxicQteQueue([])
    pendingWeekAdvanceAfterToxicRef.current = false
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

  // 주 진행: 이벤트 공개
  useEffect(() => {
    if (broadcastPhase !== 'live') return
    if (toxicQteActive) return
    const id = window.setInterval(() => {
      const plan = dayPlanRef.current
      const startedAt = dayStartedAtRef.current
      if (!plan || startedAt == null) return
      const elapsed = performance.now() - startedAt
      const due = plan.plans
        .flatMap((p) => p.events)
        .filter((event) => event.atMs <= elapsed && !revealedIdsRef.current.has(event.id))
        .sort((a, b) => a.atMs - b.atMs)
      if (due.length === 0) return
      due.forEach((event) => revealedIdsRef.current.add(event.id))
      creditLiveDonations(due)
      setLiveEvents((prev) => [...due.reverse(), ...prev].slice(0, MAX_RECENT_EVENTS))
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

  const clock = formatGameClock(monthToCalendarDate(GAME_EPOCH, gameMonth))
  const broadcastWeekCurrent = monthWeekIndex + 1
  const broadcastWeeksLeft = Math.max(0, WEEKS_PER_MONTH - broadcastWeekCurrent)
  const broadcastMonthPct = Math.round((broadcastWeekCurrent / WEEKS_PER_MONTH) * 100)

  return (
    <main className="game-stage fixed inset-0 grid h-dvh grid-rows-[auto_1fr_auto] overflow-hidden">
      <header className="game-hud relative z-40 flex shrink-0 items-center justify-between gap-4 px-6 pt-6 pb-3">
        <div className="min-w-0">
          <p className="game-kicker">STAR BROADCASTING CO.</p>
          <h1
            className="game-title mt-1 text-2xl"
            style={{ letterSpacing: '0.04em' }}
          >
            {t(`menu.${tab}`)}
          </h1>
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

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="game-panel rounded-xl px-3 py-2 text-right sm:px-4 border-indigo-500/25 shadow-[0_0_15px_rgba(0,245,255,0.04)]">
            <p className="game-stat-label">{t('hud.dateTime')}</p>
            <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-100 sm:text-sm">
              <span>{clock.date}</span>
              <span className="mx-1.5 text-slate-600">|</span>
              <span className="neon-text-cyan" style={{ textShadow: '0 0 8px rgba(0, 245, 255, 0.45)' }}>{clock.time}</span>
            </p>
          </div>

          <div className="game-panel rounded-xl px-2.5 py-2 sm:px-3 border-indigo-500/25">
            <p className="game-stat-label mb-1 px-0.5">{t('hud.speed')}</p>
            <div className="flex gap-1">
              {SPEED_OPTIONS.map((option) => {
                const isActive = speed === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSpeed(option)}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                      isActive ? 'game-btn-pink' : 'game-btn'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="game-panel rounded-xl px-3 py-2 text-right sm:px-4 border-indigo-500/25 shadow-[0_0_15px_rgba(251,191,36,0.04)]">
            <p className="game-stat-label">{t('hud.assets')}</p>
            <p className="text-sm font-black text-amber-400" style={{ textShadow: '0 0 8px rgba(251, 191, 36, 0.45)' }}>
              {formatAssets(assets)}
            </p>
          </div>

          {import.meta.env.DEV && onOpenEditor ? (
            <button
              type="button"
              onClick={onOpenEditor}
              className="game-btn px-4 py-2 text-sm"
            >
              EDIT
            </button>
          ) : null}
          <button
            type="button"
            onClick={onBack}
            className="game-btn px-4 py-2 text-sm"
          >
            <IconBack />
            <span>{t('hud.back')}</span>
          </button>

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
          tab === 'dashboard' || tab === 'schedule' || tab === 'creator' || tab === 'ranking'
            ? 'overflow-hidden p-3 sm:p-4'
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
            broadcastPhase={broadcastPhase}
            weekDayIndex={monthWeekIndex}
            liveEvents={liveEvents}
            liveRevenueByCreator={liveRevenueByCreator}
            conditionCrashes={conditionCrashes}
            toxicQtes={toxicQteQueue}
            assets={assets}
            startBroadcastLocked={startBroadcastLocked}
            onStartBroadcast={handleStartBroadcast}
            onConditionCare={handleConditionCare}
            onConditionCrashDone={(id) =>
              setConditionCrashes((prev) => prev.filter((row) => row.id !== id))
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
            onScoutViewed={() => setScoutSystem((prev) => markScoutViewed(prev))}
            onScoutPass={() => setScoutSystem((prev) => passScoutOffer(prev))}
            onScoutHire={handleCreatorScoutHire}
            onConditionCare={handleConditionCare}
            onVacation={handleVacation}
          />
        ) : tab === 'schedule' ? (
          <SchedulePanel
            slots={studioSlots}
            handCards={handCards}
            onSlotsChange={onStudioSlotsChange}
            assets={assets}
            onUnlockSlot={handleUnlockStudioSlot}
            pendingHandCreatorId={recruitFlyCard?.id ?? null}
            spotlightCreatorId={spotlightCreatorId}
            placementLocked={broadcastPhase === 'live'}
          />
        ) : tab === 'ranking' ? (
          <RankingPanel
            league={league}
            creators={toRankCreators(ownedCreators)}
            weeksUntilSettlement={
              broadcastPhase === 'live'
                ? Math.max(0, WEEKS_PER_MONTH - (monthWeekIndex + 1))
                : WEEKS_PER_MONTH
            }
            onOpenScout={openScoutFromRanking}
          />
        ) : tab === 'equipment' ? (
          <EquipmentPanel onUpgradeStudio={handleUpgradeStudio} />
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
                    <option value="JA">日本語 (JA)</option>
                    <option value="ZH-CN">简体中文 (ZH-CN)</option>
                    <option value="RU">Русский (RU)</option>
                    <option value="ES">Español (ES)</option>
                    <option value="DE">Deutsch (DE)</option>
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
            <p className="text-base">{t(`menu.${tab}`) || (tab as string).toUpperCase()} 화면 준비 중</p>
          </div>
        )}
      </section>

      <nav className="game-dock z-20 shrink-0 px-6 py-3" aria-label="인게임 메뉴">
        <div className="mx-auto flex w-full max-w-6xl gap-1.5 sm:gap-2">
          {TABS.map((item) => {
            const isActive = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`game-btn-tab relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold tracking-wide ${
                  isActive ? 'is-active' : ''
                }`}
              >
                {item.icon}
                <span>{t(`menu.${item.id}`)}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {weeklyStatement ? (
        <WeeklySettlementModal
          statement={weeklyStatement}
          onConfirm={() => {
            setWeeklyStatement(null)
            const pendingRank = pendingRankResultRef.current
            pendingRankResultRef.current = null
            if (pendingRank) {
              pendingScoutAfterRankRef.current = Boolean(scoutSystemRef.current.activeOffer)
              setRankSettlement(pendingRank)
              return
            }
            setStartBroadcastLocked(false)
            if (scoutSystemRef.current.activeOffer) {
              setTab('creator')
              setOpenCreatorScout(true)
            }
          }}
        />
      ) : null}

      {rankSettlement ? (
        <RankChangeModal
          result={rankSettlement}
          onOpenScout={() => {
            const cleared = rankSettlement.gameCleared
            setRankSettlement(null)
            setStartBroadcastLocked(false)
            pendingScoutAfterRankRef.current = false
            openScoutFromRanking()
            if (cleared) setShowGameClear(true)
          }}
          onConfirm={() => {
            const cleared = rankSettlement.gameCleared
            const openScout = pendingScoutAfterRankRef.current
            setRankSettlement(null)
            setStartBroadcastLocked(false)
            if (cleared) {
              pendingScoutAfterRankRef.current = openScout
              setShowGameClear(true)
              return
            }
            pendingScoutAfterRankRef.current = false
            if (openScout && scoutSystemRef.current.activeOffer) {
              setTab('creator')
              setOpenCreatorScout(true)
            }
          }}
        />
      ) : null}

      {showGameClear ? (
        <GameClearModal
          onConfirm={() => {
            setShowGameClear(false)
            if (pendingScoutAfterRankRef.current && scoutSystemRef.current.activeOffer) {
              pendingScoutAfterRankRef.current = false
              setTab('creator')
              setOpenCreatorScout(true)
            }
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
        />
      )}

      {salaryEventPlay?.salaryEvent ? (
        <EventSimulator
          key={`salary-${salaryEventPlay.creatorId}-${salaryEventPlay.salaryEvent.id}`}
          event={salaryEventPlay.salaryEvent}
          mode="game"
          onClose={() => applyPromotedSalary(salaryEventPlay)}
          registeredCharacters={registeredCharacters}
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

      {scoutFailName ? (
        <ScoutFailModal
          creatorName={scoutFailName}
          onConfirm={() => setScoutFailName(null)}
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
    </main>
  )
}
