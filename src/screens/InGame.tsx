import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from '../locales/i18n'
import {
  toStudioHandCard,
  type OwnedCreator,
  type RegisteredCharacter,
} from '../game/characters'
import type { StudioSlot } from '../game/studioSlots'
import type { BroadcastPhase } from '../game/broadcast'
import { MS_PER_GAME_WEEK, WEEKS_PER_MONTH, monthToCalendarDate } from '../game/broadcast'
import { applyEndOfDayConditions } from '../game/condition'
import {
  buildStudioDayPlan,
  scaleDayPlanTimes,
  type DayEvent,
  type StudioDayPlan,
} from '../game/economy'
import {
  calcProgressiveAnnualTax,
  createTaxUpcomingEvent,
  isFebruaryCalendarMonth,
  isMarchCalendarMonth,
} from '../game/tax'
import {
  buildWeeklyStatement,
  createWeekAccumulator,
  recordDayIntoWeek,
  type WeekAccumulator,
  type WeeklyStatement,
} from '../game/weeklyReport'
import { CreatorPanel } from './CreatorPanel'
import { DashboardPanel } from './DashboardPanel'
import { EquipmentPanel } from './EquipmentPanel'
import { SchedulePanel } from './SchedulePanel'
import { WeeklySettlementModal } from './WeeklySettlementModal'

export type GameTab =
  | 'dashboard'
  | 'creator'
  | 'schedule'
  | 'equipment'
  | 'settings'


const SPEED_OPTIONS = ['1x', '2x', '3x'] as const
type SpeedOption = (typeof SPEED_OPTIONS)[number]

const GAME_EPOCH = new Date(2026, 0, 1)
const INITIAL_ASSETS = 12_500_000
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
  return `₩${value.toLocaleString('ko-KR')}`
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
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M4.9 6.4l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.6l1.6-1.6M17.5 8l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

const TABS: { id: GameTab; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'DASHBOARD', icon: <IconDashboard /> },
  { id: 'creator', label: 'CREATOR', icon: <IconCreator /> },
  { id: 'schedule', label: 'STUDIO', icon: <IconSchedule /> },
  { id: 'equipment', label: 'EQUIPMENT', icon: <IconEquipment /> },
  { id: 'settings', label: 'SETTINGS', icon: <IconSettings /> },
]

type InGameProps = {
  registeredCharacters: RegisteredCharacter[]
  ownedCreators: OwnedCreator[]
  studioSlots: StudioSlot[]
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
  const [liveRevenueByCreator, setLiveRevenueByCreator] = useState<Record<string, number>>({})
  const [weeklyStatement, setWeeklyStatement] = useState<WeeklyStatement | null>(null)
  const [broadcastMonthNumber, setBroadcastMonthNumber] = useState(1)
  const dayPlanRef = useRef<StudioDayPlan | null>(null)
  const dayStartedAtRef = useRef<number | null>(null)
  const revealedIdsRef = useRef(new Set<string>())
  const settledDayKeyRef = useRef<string | null>(null)
  const weekAccumRef = useRef<WeekAccumulator>(createWeekAccumulator(1))
  const prevWeekRevenueRef = useRef<number | null>(null)
  const weekFinishedRef = useRef(false)
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
  const handCards = ownedCreators.map(toStudioHandCard)

  const handleUpgradeStudio = () => {
    const targetIndex = studioSlots.findIndex((slot) => slot.status === 'locked')
    if (targetIndex === -1) return
    onStudioSlotsChange(
      studioSlots.map((slot, idx) => {
        if (idx !== targetIndex) return slot
        return { ...slot, status: 'empty' }
      }),
    )
  }

  function assignedCreatorsFrom(list: OwnedCreator[]) {
    return studioSlotsRef.current
      .filter((slot) => slot.status === 'assigned' && slot.assignment)
      .map((slot) => list.find((c) => c.id === slot.assignment!.creatorId))
      .filter((c): c is OwnedCreator => Boolean(c))
  }

  /** 한 주 시작: 현재 컨디션으로 주간 수익 DayPlan 선계산 */
  function beginDayPlan(dayKey: string, weekMs: number) {
    const plan = buildStudioDayPlan(
      assignedCreatorsFrom(ownedCreatorsRef.current),
      weekMs,
      dayKey,
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
    // 주 종료: 방송자 하락 / 미방송 회복
    const broadcastedIds = new Set(
      studioSlotsRef.current
        .filter((slot) => slot.status === 'assigned' && slot.assignment)
        .map((slot) => slot.assignment!.creatorId),
    )
    const nextOwned = applyEndOfDayConditions(ownedCreatorsRef.current, broadcastedIds)
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
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
    const issued = formatGameClock(monthToCalendarDate(GAME_EPOCH, nextMonth)).date.replace(
      /\./g,
      '-',
    )
    const unlockedSlotCount = studioSlotsRef.current.filter(
      (slot) => slot.status !== 'locked',
    ).length
    const payroll = ownedCreatorsRef.current.map((creator) => ({
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
      week: weekSnapshot,
      issuedDate: issued,
      previousNetProfitWon: prevWeekRevenueRef.current,
      unlockedSlotCount,
      payroll,
      annualTaxWon,
      taxYear,
      annualRevenueForTaxWon,
    })
    prevWeekRevenueRef.current = statement.netProfitWon
    // 한 턴(월) 종료 시 수익·지출을 한꺼번에 자산에 반영
    if (statement.netProfitWon !== 0) {
      setAssets((prev) => prev + statement.netProfitWon)
    }
    setWeeklyStatement(statement)

    const nextMonthNumber = broadcastMonthNumberRef.current + 1
    broadcastMonthNumberRef.current = nextMonthNumber
    setBroadcastMonthNumber(nextMonthNumber)
    weekAccumRef.current = createWeekAccumulator(nextMonthNumber)
    setBroadcastPhase('prep')
    dayPlanRef.current = null
    dayStartedAtRef.current = null
  }

  function handleRecoverCondition(creatorId: string) {
    const nextOwned = ownedCreatorsRef.current.map((creator) => {
      if (creator.id === creatorId) {
        return {
          ...creator,
          condition: 'best' as const,
          conditionScore: 100,
        }
      }
      return creator
    })
    ownedCreatorsRef.current = nextOwned
    onOwnedCreatorsChangeRef.current(nextOwned)
  }

  function handleStartBroadcast() {
    if (broadcastPhase === 'live') return
    if (weeklyStatement) return
    weekFinishedRef.current = false
    setBroadcastPhase('live')
    setMonthWeekIndex(0)
    monthWeekIndexRef.current = 0
    // 방송 시작 시 후원/시청 이벤트는 초기화, 세금 알림은 유지
    setLiveEvents((prev) => prev.filter((event) => event.type === 'tax'))
    setLiveRevenueByCreator({})
    weekAccumRef.current = createWeekAccumulator(broadcastMonthNumberRef.current)
    const weekMs = MS_PER_GAME_WEEK / speedMultiplierOf(speed)
    beginDayPlan(`m${broadcastMonthNumberRef.current}-w0`, weekMs)
  }

  // 배속 변경 시 남은 스케줄 비율 스케일
  useEffect(() => {
    if (broadcastPhase !== 'live') return
    const plan = dayPlanRef.current
    const startedAt = dayStartedAtRef.current
    if (!plan || startedAt == null) return
    const nextWeekMs = MS_PER_GAME_WEEK / speedMultiplierOf(speed)
    if (nextWeekMs === plan.dayMs) return
    const elapsed = performance.now() - startedAt
    const scaled = scaleDayPlanTimes(plan, nextWeekMs)
    dayPlanRef.current = scaled
    dayStartedAtRef.current =
      performance.now() - Math.min(elapsed * (nextWeekMs / plan.dayMs), nextWeekMs - 1)
  }, [speed, broadcastPhase])

  // 주 진행: 이벤트 공개
  useEffect(() => {
    if (broadcastPhase !== 'live') return
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
  }, [broadcastPhase])

  // 주 틱: 결산 → 월 내 주차 진행 → 턴 종료 시 다음 달
  useEffect(() => {
    if (broadcastPhase !== 'live') return
    const tickMs = MS_PER_GAME_WEEK / speedMultiplierOf(speed)
    const timer = window.setInterval(() => {
      settleCurrentDay()

      const nextMonthWeek = monthWeekIndexRef.current + 1

      if (nextMonthWeek >= WEEKS_PER_MONTH) {
        monthWeekIndexRef.current = 0
        setMonthWeekIndex(0)
        finishBroadcastMonth()
        return
      }

      monthWeekIndexRef.current = nextMonthWeek
      setMonthWeekIndex(nextMonthWeek)
      const weekMs = MS_PER_GAME_WEEK / speedMultiplierOf(speedRef.current)
      beginDayPlan(`m${broadcastMonthNumberRef.current}-w${nextMonthWeek}`, weekMs)
    }, tickMs)
    return () => window.clearInterval(timer)
  }, [broadcastPhase, speed])

  const clock = formatGameClock(monthToCalendarDate(GAME_EPOCH, gameMonth))
  const broadcastWeekCurrent = monthWeekIndex + 1
  const broadcastWeeksLeft = Math.max(0, WEEKS_PER_MONTH - broadcastWeekCurrent)
  const broadcastMonthPct = Math.round((broadcastWeekCurrent / WEEKS_PER_MONTH) * 100)

  return (
    <main className="game-stage fixed inset-0 grid h-dvh grid-rows-[auto_1fr_auto] overflow-hidden">
      <header className="game-hud z-20 flex shrink-0 items-center justify-between gap-4 px-6 pt-6 pb-3">
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
        </div>
      </header>

      <section
        className={`relative z-10 min-h-0 ${
          tab === 'dashboard' || tab === 'schedule' || tab === 'creator'
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
            onStartBroadcast={handleStartBroadcast}
            onRecoverCondition={handleRecoverCondition}
          />
        </div>

        {tab === 'dashboard' ? null : tab === 'creator' ? (
          <CreatorPanel
            ownedCreators={ownedCreators}
            registeredCharacters={registeredCharacters}
            onScout={onScout}
          />
        ) : tab === 'schedule' ? (
          <SchedulePanel
            slots={studioSlots}
            handCards={handCards}
            onSlotsChange={onStudioSlotsChange}
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
        <div className="mx-auto flex w-full max-w-5xl gap-2">
          {TABS.map((item) => {
            const isActive = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`game-btn-tab flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold tracking-wide ${
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
          onConfirm={() => setWeeklyStatement(null)}
        />
      ) : null}
    </main>
  )
}
