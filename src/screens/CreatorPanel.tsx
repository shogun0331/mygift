import { useEffect, useMemo, useState, useRef, type CSSProperties } from 'react'
import {
  findCharacterIconUrl,
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
  mainStatValueOf,
  nextGradeBreak,
} from '../game/training'
import {
  characterDisplayJob,
  characterDisplayName,
} from '../game/characterLocales'
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
import { previewBulkSnsCompose, canComposeSnsCreator, canAffordBulkSnsCompose, type BulkSnsRevealEntry, type SnsHeat } from '../game/sns'
import type { RegisteredStaff, StaffKind } from '../game/staff'
import { staffDisplayName, staffIconUrl, staffCardUrl, STAFF_KIND_LABEL_KEY } from '../game/staff'
import type { SlotManagerState } from '../game/slotManagers'
import { findSlotIdForStaff } from '../game/slotManagers'
import { resolveMediaSrc } from '../game/mediaUrl'
import type { ScoutedStaffCandidate } from '../game/characters'
import type { StudioSlot } from '../game/studioSlots'

type CreatorPanelProps = {
  companyViewers?: number
  ownedCreators: OwnedCreator[]
  registeredCharacters: RegisteredCharacter[]
  scoutState: ScoutSystemState
  assets: number
  broadcastMonthNumber: number
  stationGrade: StationGrade
  stationGradeConfig?: StationGradeConfig
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
  onSnsCompose: (creatorId: string) => SnsHeat | null
  onBulkSnsCompose: () => BulkSnsRevealEntry[]
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
}

const GRADE_STYLE: Record<Grade, string> = {
  S: 'border-amber-400 text-amber-200 bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.85)] ring-1 ring-amber-400/50',
  A: 'border-purple-400 text-purple-200 bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 shadow-[0_0_12px_rgba(168,85,247,0.85)] ring-1 ring-purple-400/50',
  B: 'border-cyan-400 text-cyan-200 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 shadow-[0_0_12px_rgba(6,182,212,0.8)] ring-1 ring-cyan-400/50',
  C: 'border-slate-400 text-slate-200 bg-slate-900 shadow-[0_0_8px_rgba(148,163,184,0.5)]',
}

const STAT_TYPE_LABEL_KEY: Record<CreatorStatType, string> = {
  sexy: 'creator.typeSexy',
  communication: 'creator.typeCommunication',
  elegance: 'creator.typeElegance',
  performance: 'creator.typePerformance',
}

const STAT_VALUE_LABEL_KEY: Record<CreatorStatType, string> = {
  sexy: 'creator.statSexy',
  communication: 'creator.statCommunication',
  elegance: 'creator.statElegance',
  performance: 'creator.statPerformance',
}

function formatSalary(value: number) {
  return formatMoney(value)
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
  onScoutViewed,
  onScoutPass,
  onScoutHire,
  onConditionCare,
  onVacation,
  onProductionTraining,
  onSnsCompose,
  onBulkSnsCompose,
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
  const [snsCreatorId, setSnsCreatorId] = useState<string | null>(null)
  const [bulkSnsOpen, setBulkSnsOpen] = useState(false)
  const [bulkRevealEntries, setBulkRevealEntries] = useState<BulkSnsRevealEntry[] | null>(null)

  const bulkSnsEligible = useMemo(
    () => previewBulkSnsCompose(ownedCreators).eligibleIds.length > 0,
    [ownedCreators],
  )
  const bulkSnsAffordable = useMemo(
    () => canAffordBulkSnsCompose(ownedCreators, assets),
    [ownedCreators, assets],
  )

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
        onBack={() => setSelectedId(null)}
        onConditionCare={onConditionCare}
        onVacation={onVacation}
        onProductionTraining={onProductionTraining}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="game-panel-strong flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="min-w-0">
          <p className="game-kicker">CREATOR MANAGEMENT</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('creator.manageSubtitle').replace('{count}', String(ownedCreators.length))}
          </p>
        </div>
      </div>

      <section className="game-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl mb-4">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5 sm:px-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-200">{t('creator.manageTitle')}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">{t('creator.manageDesc')}</p>
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
                📱 {t('sns.bulkCompose')}
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
                {scoutState.activeOffer || creatorScoutAvailable ? (
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
                      <span>SNS 구독자</span>
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
                              {snsPosted ? (
                                <span
                                  title={t('sns.alreadyPosted')}
                                  className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-emerald-200"
                                >
                                  {t('sns.postedMark')}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-slate-500">{displayJob}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-xs font-black italic tracking-widest ${GRADE_STYLE[creator.grade]}`}
                        >
                          {creator.grade}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div
                          className={`relative h-6 w-36 overflow-hidden rounded-md bg-slate-900 shadow-inner border transition-all duration-300 ${staminaTone.track}`}
                          title={`${t('creator.statStamina')} ${Math.round(creator.stamina)}/${creator.staminaMax}`}
                        >
                          <div
                            className={`h-6 rounded-sm transition-[width] duration-150 ease-linear ${staminaTone.fill}`}
                            style={{ width: `${staminaPct}%` }}
                          />
                          <div
                            className={`pointer-events-none absolute inset-0 flex items-center justify-between px-2 text-[10px] font-black tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)] ${staminaTone.text}`}
                          >
                            <span>
                              {staminaBlocked ? '🚨 Stamina' : 'Stamina'}
                            </span>
                            <span className="tabular-nums">
                              {Math.round(creator.stamina)}/{creator.staminaMax}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {t(STAT_TYPE_LABEL_KEY[normalizeCreatorStatType(creator.statType)])}
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-amber-400">
                        {formatSalary(creator.salary)}
                      </td>
                      <td className="px-3 py-2.5 font-bold tabular-nums text-emerald-400">
                        {formatMoney(expectedRev)}
                      </td>
                      <td className="px-3 py-2.5 font-bold tabular-nums text-cyan-300">
                        📱 {snsSubs.toLocaleString()}명
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSnsCreatorId(creator.id)}
                            className={`game-btn relative rounded-lg px-2.5 py-1 text-xs ${
                              snsPosted
                                ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
                                : ''
                            }`}
                          >
                            📱 {t('sns.action')}
                            {snsPosted ? (
                              <span className="ml-1 text-[9px] font-black text-emerald-300">
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
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5 sm:px-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-200">{t('creator.staffManageTitle')}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{t('creator.staffManageDesc')}</p>
              </div>
              <div className="flex items-center gap-2">
                {scoutedStaffCandidate ? (
                  <button
                    type="button"
                    onClick={() => setView('staffScout')}
                    className="game-btn game-btn-primary relative rounded-lg px-3 py-1 text-xs border border-indigo-400/40 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 transition"
                  >
                    {t('creator.staffOfferCheck')}
                    <RedDot label={t('creator.staffScoutNewArrival')} />
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
                      const rawSalary = hiredStaffSalaries[staff.id] ?? 3600
                      const salary = Math.min(rawSalary, 6000)

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
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                              {t(STAFF_KIND_LABEL_KEY[staff.kind])}
                            </span>
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
                          <td className="px-3 py-2.5 font-semibold tabular-nums text-amber-400">
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
          onClose={() => setSnsCreatorId(null)}
          onCompose={() => onSnsCompose(snsCreator.id)}
        />
      ) : null}
      {bulkSnsOpen ? (
        <SnsBulkComposeModal
          creators={ownedCreators}
          assets={assets}
          onClose={() => setBulkSnsOpen(false)}
          onCompose={() => {
            const posted = onBulkSnsCompose()
            if (posted.length > 0) {
              setBulkSnsOpen(false)
              setBulkRevealEntries(posted)
            }
            return posted
          }}
        />
      ) : null}
      {bulkRevealEntries && bulkRevealEntries.length > 0 ? (
        <SnsBulkPostRevealModal
          entries={bulkRevealEntries}
          onDone={() => setBulkRevealEntries(null)}
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
              <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                <span
                  className={`rounded-md border px-2.5 py-0.5 text-xs font-black italic tracking-widest ${GRADE_STYLE[offer.grade]}`}
                >
                  {offer.grade}
                </span>
                <span className="rounded border border-white/15 bg-black/40 px-2 py-0.5 text-xs font-bold text-slate-200">
                  {t(STAT_TYPE_LABEL_KEY[normalizeCreatorStatType(offer.template.statType)])}
                </span>
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
                  {t('creator.statSexy')} {stats.statSexy} · {t('creator.statPerformance')}{' '}
                  {stats.statPerformance}
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

function CreatorDetailView({
  companyViewers = 0,
  creator,
  assets,
  broadcastMonthNumber,
  ownedCreators = [],
  onBack,
  onConditionCare,
  onVacation,
  onProductionTraining,
}: {
  companyViewers?: number
  creator: OwnedCreator
  assets: number
  broadcastMonthNumber: number
  ownedCreators?: OwnedCreator[]
  onBack: () => void
  onConditionCare: (creatorId: string) => void
  onVacation: (creatorId: string) => void
  onProductionTraining: (creatorId: string) => void
}) {
  const { t, locale } = useTranslation()
  const displayName = characterDisplayName(creator, locale)
  const displayJob = characterDisplayJob(creator, locale)
  const staminaPct = Math.round((creator.stamina / Math.max(1, creator.staminaMax)) * 100)
  const conditionScore = scoreOf(creator)
  const condition = conditionFromScore(conditionScore)
  const vacationCost = calcVacationCost(creator.salary, creator.grade)
  const vacationUsed = Boolean(
    ownedCreators?.some((c) => c.lastVacationMonth === broadcastMonthNumber),
  )
  const canAffordVacation = assets >= vacationCost
  const canVacation = !vacationUsed && canAffordVacation
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
  const trainingCost = examReady ? calcPromotionExamCost(creator) : calcTrainingCost(creator)
  const canAffordTraining = assets >= trainingCost
  const trainingMaxed = !canTrainCreator(creator)
  const canTrain = canAffordTraining && !trainingMaxed
  const trainButtonLabel = trainingMaxed
    ? t('creator.trainingMaxed')
    : !canAffordTraining
      ? t('creator.trainingNeedAssets')
      : examReady
        ? t('creator.trainingExamAction')
        : t('creator.trainingAction')
  const [trainFxKey, setTrainFxKey] = useState(0)
  const [trainHot, setTrainHot] = useState(false)

  useEffect(() => {
    if (trainFxKey === 0) return
    const timer = window.setTimeout(() => setTrainHot(false), 720)
    return () => window.clearTimeout(timer)
  }, [trainFxKey])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="game-panel-strong flex shrink-0 flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <button type="button" onClick={onBack} className="game-btn rounded-xl px-3 py-2 text-sm">
          {t('common.back')}
        </button>
        <div className="min-w-0 flex-1">
          <p className="game-kicker">CREATOR PROFILE</p>
          <h2 className="truncate text-base font-semibold text-slate-100">
            {displayName}{' '}
            <span className={`ml-1.5 rounded-md border px-2 py-0.5 text-xs font-black italic tracking-widest ${GRADE_STYLE[creator.grade]}`}>
              {creator.grade}
            </span>
          </h2>
        </div>
        <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold tracking-wide text-cyan-400/80">{t('creator.payDay')}</p>
          <p className="text-sm font-bold text-cyan-300">
            {t('creator.payTurns').replace('{count}', String(creator.nextPayTurns))}
          </p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto lg:grid-cols-[auto_minmax(0,1fr)] lg:overflow-hidden">
        <section className="flex justify-center lg:h-full lg:min-h-0 lg:items-center">
          <article className="game-card relative aspect-[3/4] w-full max-w-[18rem] overflow-hidden lg:max-h-full lg:w-[min(20rem,34vh)]">
            {creator.profileImageUrl ? (
              <img
                src={resolveMediaSrc(creator.profileImageUrl, creator.mediaRevision)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-slate-700/80 to-slate-950">
                <div
                  className={`mb-16 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-slate-950 ${creator.avatarTone}`}
                >
                  {creator.name.slice(0, 1)}
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
              <span
                className={`rounded-md border px-2.5 py-0.5 text-xs font-black italic tracking-widest ${GRADE_STYLE[creator.grade]}`}
              >
                {creator.grade}
              </span>
              <span className="rounded border border-white/15 bg-black/40 px-2 py-0.5 text-xs font-bold text-slate-200">
                {t(STAT_TYPE_LABEL_KEY[normalizeCreatorStatType(creator.statType)])}
              </span>
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
              label={t('creator.expectedRevenue')}
              valueLabel={formatMoney(calcMonthRevenueWon(creator, 0, 1, companyViewers))}
              percent={100}
              barClass="from-emerald-400 to-teal-300"
            />
            <StatBar
              label={t('creator.statStamina')}
              valueLabel={`${creator.stamina}/${creator.staminaMax}`}
              percent={staminaPct}
              barClass="from-cyan-400 to-teal-300"
            />
            <StatBar
              label={t('condition.title')}
              valueLabel={`${CONDITION_ICON[condition]} ${t(CONDITION_LABEL_KEY[condition])} (${conditionScore})`}
              percent={conditionScore}
              barClass="from-emerald-400 to-lime-300"
            />
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wide text-slate-500">{t('creator.currentSalary')}</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-amber-400">
                {formatSalary(creator.salary)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
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
                      <span aria-hidden>✚</span>
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
                      <span aria-hidden>☼</span>
                      {t('creator.vacationTitle')}
                    </span>
                    <span className="mt-1 block text-[10px] leading-4 text-slate-400">
                      {t('creator.vacationDesc')}
                    </span>
                    {vacationUsed ? (
                      <span className="mt-1 block text-[10px] font-semibold text-amber-300/80">
                        {t('creator.vacationUsed')}
                      </span>
                    ) : !canAffordVacation ? (
                      <span className="mt-1 block text-[10px] font-semibold text-rose-300/80">
                        {t('creator.careNeedAssets')}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm font-black tabular-nums text-amber-300">
                    {formatMoneySigned(-vacationCost)}
                  </span>
                </button>
              </div>
            </article>

            <article className="relative flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4">
              {trainFxKey > 0 ? <TrainingBurstFx key={trainFxKey} /> : null}

              <div className="relative z-10 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[11px] font-semibold tracking-wide text-amber-200/90">
                    ⚡ {t('creator.trainingTitle')}
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
                      off: String(TRAINING_OFF_GAIN.min),
                    })}
                  </p>
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
                <span className="text-base font-bold tracking-wide text-current">
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
  { key: 'statSexy', labelKey: 'creator.statSexy', barClass: 'from-rose-500 to-pink-300' },
  {
    key: 'statCommunication',
    labelKey: 'creator.statCommunication',
    barClass: 'from-sky-400 to-cyan-300',
  },
  { key: 'statElegance', labelKey: 'creator.statElegance', barClass: 'from-violet-300 to-slate-200' },
  {
    key: 'statPerformance',
    labelKey: 'creator.statPerformance',
    barClass: 'from-amber-400 to-orange-300',
  },
] as const

function PersonalityStatBars({
  stats,
  t,
}: {
  stats: {
    statSexy?: number
    statElegance?: number
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
            label={t(row.labelKey)}
            valueLabel={`${value}`}
            percent={value}
            barClass={row.barClass}
          />
        )
      })}
    </>
  )
}

function StatBar({
  label,
  valueLabel,
  note,
  percent,
  barClass,
}: {
  label: string
  valueLabel: string
  note?: string
  percent: number
  barClass: string
}) {
  const width = Math.max(0, Math.min(100, percent))
  return (
    <div>
      <div className="mb-1 flex items-end justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400">{label}</p>
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
