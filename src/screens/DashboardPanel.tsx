import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  findCharacterIconUrl,
  findLevelIdleVideoUrl,
  type OwnedCreator,
} from '../game/characters'
import {
  canBroadcastByStamina,
  calcConditionFullCareCost,
  CONDITION_DOT_CLASS,
  CONDITION_ICON,
  CONDITION_LABEL_KEY,
  CONDITION_ROW_CLASS,
  conditionFromScore,
  previewLiveStamina,
  previewLiveConditionScore,
  scoreOf,
  type CreatorCondition,
} from '../game/condition'
import type { DayEvent } from '../game/economy'
import { formatMoney, formatMoneyCompact } from '../game/money'
import { resolveMediaSrc } from '../game/mediaUrl'
import {
  characterDisplayJob,
  characterDisplayName,
} from '../game/characterLocales'
import { creatorVisuals, type StudioSlot } from '../game/studioSlots'
import type { RegisteredStaff } from '../game/staff'
import type { SlotManagerState } from '../game/slotManagers'
import { StaffSlotIcons } from './StaffManagerUi'
import type { SlotGear } from '../game/slotGear'
import { useTranslation, type Locale } from '../locales/i18n'
import type { BroadcastPhase } from '../game/broadcast'
import {
  RevenueBurstFx,
  revenueBurstTier,
  type RevenueBurst,
} from './RevenueBurstFx'
import {
  getCreatorPrimaryStatType,
  type CreatorStatType,
} from '../game/stats'

const TREND_TYPE_INFO: Record<CreatorStatType, { label: string; icon: string }> = {
  sexy: { label: '섹시', icon: '🔥' },
  elegance: { label: '기품', icon: '👑' },
  communication: { label: '소통', icon: '💬' },
  performance: { label: '퍼포먼스', icon: '⚡' },
}
import {
  ConditionCrashFx,
  type ConditionCrashFxItem,
} from './ConditionCrashFx'
import { GearFailBurstFx, type GearFailBurstItem } from './GearFailBurstFx'
import { StaffActionFx, type StaffActionFxItem } from './StaffActionFx'
import { ToxicWhackQte, type ToxicWhackQteItem } from './ToxicWhackQte'
import { LiveRankBoard } from './LiveRankBoard'

/** 등급별(S, A, B, C) 프리미엄 네온 글로우 뱃지 스타일 헬퍼 */
export function getGradeBadgeStyle(grade: string = 'B') {
  const g = (grade || 'B').toUpperCase()
  switch (g) {
    case 'S':
      return 'border-amber-400 text-amber-200 bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.85)] ring-1 ring-amber-400/50'
    case 'A':
      return 'border-purple-400 text-purple-200 bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 shadow-[0_0_12px_rgba(168,85,247,0.85)] ring-1 ring-purple-400/50'
    case 'B':
      return 'border-cyan-400 text-cyan-200 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 shadow-[0_0_12px_rgba(6,182,212,0.8)] ring-1 ring-cyan-400/50'
    case 'C':
    default:
      return 'border-emerald-400 text-emerald-200 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 shadow-[0_0_10px_rgba(52,211,153,0.7)] ring-1 ring-emerald-400/50'
  }
}

type DashboardPanelProps = {
  slots: StudioSlot[]
  ownedCreators?: OwnedCreator[]
  registeredStaff?: RegisteredStaff[]
  managerState?: SlotManagerState
  broadcastPhase?: BroadcastPhase
  livePlayVideoByCreator?: Record<string, string>
  liveEvents?: DayEvent[]
  /** 방송 월간 누적 실시간 수익 (크리에이터 id → USD) */
  liveRevenueByCreator?: Record<string, number>
  /** 이번 주 경과 0~1. 스테미나 미리보기용 */
  liveWeekProgress?: number
  /** 이번 주 종료 시 깎일 스테미나 (크리에이터 id) */
  liveStaminaDrainByCreatorId?: Record<string, number>
  /** 이번 주 종료 시 깎일 컨디션 (크리에이터 id) */
  liveConditionDrainByCreatorId?: Record<string, number>
  assets?: number
  conditionCrashes?: ConditionCrashFxItem[]
  gearFailBursts?: GearFailBurstItem[]
  staffActions?: StaffActionFxItem[]
  toxicQtes?: ToxicWhackQteItem[]
  slotGearById?: Record<string, SlotGear>
  /** 주간 대세 트렌드 타입 */
  weeklyTrendType?: CreatorStatType
  /** 명세서 대기/표시 중 — 방송 시작 비활성 */
  startBroadcastLocked?: boolean
  onStartBroadcast: () => void
  onConditionCare?: (creatorId: string) => void
  onConditionCrashDone?: (id: string) => void
  onGearFailBurstDone?: (id: string) => void
  onStaffActionDone?: (id: string) => void
  onToxicQteResolve?: (id: string, success: boolean) => void
  onRepairSlot?: (slotId: string) => void
}

type StreamCreatorView = {
  id: string
  name: string
  concept: string
  avatar: string
  avatarTone: string
  profileImageUrl?: string | null
  playVideoUrl?: string | null
  mediaRevision?: string | number
  stamina: number
  staminaMax: number
  canBroadcast: boolean
  grade: 'S' | 'A' | 'B' | 'C'
  condition: CreatorCondition
  conditionScore: number
  viewers: string
  live: boolean
  preview: string
  tag?: { text: string; tone: 'amber' | 'rose' | 'cyan' | 'violet' }
  isTrendMatching?: boolean
}

type BroadcastSlotView = {
  id: string
  label: string
  status: StudioSlot['status']
  creator?: StreamCreatorView
}

function toBroadcastSlot(
  slot: StudioSlot,
  owned: OwnedCreator | undefined,
  broadcastPhase: BroadcastPhase,
  locale: Locale,
  livePlayUrl?: string | null,
  weekProgress = 0,
  weeklyDrain = 0,
  weeklyConditionDrain = 0,
  weeklyTrendType?: CreatorStatType,
): BroadcastSlotView {
  const streamLabel = `STREAM ${String(slot.index).padStart(2, '0')}`
  if (slot.status !== 'assigned' || !slot.assignment) {
    return {
      id: slot.id,
      label: streamLabel,
      status: slot.status === 'locked' ? 'locked' : 'empty',
    }
  }

  const displayName = owned
    ? characterDisplayName(owned, locale)
    : slot.assignment.creatorName
  const displayJob = owned ? characterDisplayJob(owned, locale) : ''
  const visuals = creatorVisuals(slot.assignment.creatorId, displayName)
  const staminaMax = owned?.staminaMax ?? 100
  const baseStamina = owned
    ? Math.min(staminaMax, owned.stamina)
    : staminaMax
  const stamina =
    broadcastPhase === 'live' && weeklyDrain > 0
      ? previewLiveStamina(baseStamina, staminaMax, weeklyDrain, weekProgress)
      : baseStamina
  const idleVideoUrl =
    (owned ? findLevelIdleVideoUrl(owned) : null) ||
    slot.assignment.idleVideoUrl ||
    null
  const playVideoUrl =
    broadcastPhase === 'live' && owned
      ? livePlayUrl || idleVideoUrl
      : idleVideoUrl
  const mediaRevision =
    owned?.mediaRevision ?? slot.assignment.mediaRevision ?? playVideoUrl ?? undefined
  const iconUrl =
    findCharacterIconUrl(owned) || slot.assignment.profileImageUrl || null

  const baseCondScore = owned ? scoreOf(owned) : 60
  const conditionScore =
    broadcastPhase === 'live' && weeklyConditionDrain > 0
      ? previewLiveConditionScore(baseCondScore, weeklyConditionDrain, weekProgress)
      : baseCondScore
  const condition = owned ? conditionFromScore(conditionScore) : 'normal'
  const isTrendMatching =
    owned && weeklyTrendType ? getCreatorPrimaryStatType(owned) === weeklyTrendType : false

  return {
    id: slot.id,
    label: streamLabel,
    status: 'assigned',
    creator: {
      id: slot.assignment.creatorId,
      name: displayName,
      concept: displayJob || slot.assignment.grade,
      avatar: visuals.avatar,
      avatarTone: visuals.avatarTone,
      profileImageUrl: iconUrl,
      playVideoUrl,
      mediaRevision,
      stamina,
      staminaMax,
      canBroadcast: canBroadcastByStamina(stamina),
      grade: (() => {
        const g = owned?.grade ?? slot.assignment.grade
        return g === 'S' || g === 'A' || g === 'B' || g === 'C' ? g : 'C'
      })(),
      conditionScore,
      condition,
      isTrendMatching,
      viewers: '—',
      live: broadcastPhase === 'live',
      preview: visuals.preview,
    },
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const TAG_STYLE = {
  amber: 'border-amber-400/30 bg-amber-400/15 text-amber-300',
  rose: 'border-rose-400/30 bg-rose-400/15 text-rose-300',
  cyan: 'border-cyan-400/30 bg-cyan-400/15 text-cyan-300',
  violet: 'border-violet-400/30 bg-violet-400/15 text-violet-300',
} as const

const STATUS_BADGE: Record<StudioSlot['status'], { labelKey: string; className: string }> = {
  empty: {
    labelKey: 'dashboard.standby',
    className: 'border-slate-500/20 bg-slate-800/10 text-slate-400',
  },
  locked: {
    labelKey: 'dashboard.lockedChannel',
    className: 'border-rose-500/20 bg-rose-950/20 text-rose-400/80',
  },
  assigned: {
    labelKey: 'dashboard.ready',
    className: 'border-pink-500/40 bg-pink-500/10 text-pink-300 neon-text-pink',
  },
}

export function DashboardPanel({
  slots: studioSlots,
  ownedCreators = [],
  registeredStaff = [],
  managerState,
  broadcastPhase = 'prep',
  livePlayVideoByCreator = {},
  liveEvents = [],
  liveRevenueByCreator = {},
  liveWeekProgress = 0,
  liveStaminaDrainByCreatorId = {},
  liveConditionDrainByCreatorId = {},
  assets = 0,
  conditionCrashes = [],
  gearFailBursts = [],
  staffActions = [],
  toxicQtes = [],
  slotGearById = {},
  weeklyTrendType,
  startBroadcastLocked = false,
  onStartBroadcast,
  onConditionCare,
  onConditionCrashDone,
  onGearFailBurstDone,
  onStaffActionDone,
  onToxicQteResolve,
  onRepairSlot,
}: DashboardPanelProps) {
  const { t, locale } = useTranslation()
  const reducedMotion = prefersReducedMotion()
  const ownedById: Record<string, OwnedCreator> = {}
  for (const creator of ownedCreators) {
    ownedById[creator.id] = creator
  }
  const isLive = broadcastPhase === 'live'
  const canStartBroadcast = !isLive && !startBroadcastLocked
  const [revenueBursts, setRevenueBursts] = useState<RevenueBurst[]>([])
  const seenEventIdsRef = useRef(new Set<string>())

  useEffect(() => {
    if (!isLive) {
      seenEventIdsRef.current = new Set()
      setRevenueBursts([])
      return
    }
    const fresh = liveEvents.filter(
      (event) =>
        event.type === 'donation' &&
        event.amount > 0 &&
        !seenEventIdsRef.current.has(event.id),
    )
    if (fresh.length === 0) return
    for (const event of fresh) seenEventIdsRef.current.add(event.id)
    setRevenueBursts((prev) => [
      ...prev,
      ...fresh.map((event) => ({
        id: event.id,
        creatorId: event.creatorId,
        amount: event.amount,
        tier: revenueBurstTier(event.amount),
      })),
    ])
  }, [liveEvents, isLive])

  const dismissBurst = useCallback((id: string) => {
    setRevenueBursts((prev) => prev.filter((burst) => burst.id !== id))
  }, [])

  const slots = studioSlots.map((slot) => {
    const creatorId = slot.assignment?.creatorId
    return toBroadcastSlot(
      slot,
      creatorId ? ownedById[creatorId] : undefined,
      broadcastPhase,
      locale,
      creatorId ? livePlayVideoByCreator[creatorId] : undefined,
      liveWeekProgress,
      creatorId ? liveStaminaDrainByCreatorId[creatorId] ?? 0 : 0,
      creatorId ? liveConditionDrainByCreatorId[creatorId] ?? 0 : 0,
      weeklyTrendType,
    )
  })
  const assigned = studioSlots.filter(
    (slot) => slot.status === 'assigned' && Boolean(slot.assignment),
  )
  const hasAssigned = assigned.length > 0

  const assignedByCreatorId: Record<string, (typeof assigned)[number]> = {}
  for (const slot of assigned) {
    const creatorId = slot.assignment?.creatorId
    if (creatorId) assignedByCreatorId[creatorId] = slot
  }

  const rankIds = new Set<string>()
  for (const [creatorId, amount] of Object.entries(liveRevenueByCreator)) {
    if (amount > 0) rankIds.add(creatorId)
  }
  for (const slot of assigned) {
    if (slot.assignment) rankIds.add(slot.assignment.creatorId)
  }
  for (const creator of ownedCreators) {
    rankIds.add(creator.id)
  }

  const liveRanking = [...rankIds]
    .map((creatorId) => {
      const owned = ownedById[creatorId]
      const assignment = assignedByCreatorId[creatorId]?.assignment
      if (!owned && !assignment) return null
      const displayName = owned
        ? characterDisplayName(owned, locale)
        : assignment!.creatorName
      const displayJob = owned ? characterDisplayJob(owned, locale) : assignment!.grade
      const visuals = creatorVisuals(creatorId, displayName)
      const stamina = owned?.stamina ?? 100
      return {
        id: creatorId,
        rank: 0,
        name: displayName,
        concept: displayJob,
        avatar: visuals.avatar,
        avatarTone: visuals.avatarTone,
        profileImageUrl:
          findCharacterIconUrl(owned) ||
          owned?.profileImageUrl ||
          assignment?.profileImageUrl ||
          null,
        revenue: liveRevenueByCreator[creatorId] ?? 0,
        viewers: '—',
        blocked: !canBroadcastByStamina(owned?.stamina ?? stamina),
        placed: Boolean(assignment),
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name, 'ko'))
    .slice(0, 6)
    .map((row, index) => ({ ...row, rank: index + 1 }))

  // 최대 6명 슬롯 높이 확보용 빈 칸
  const rankPlaceholders = Math.max(0, 6 - Math.max(liveRanking.length, 1))

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,22%)] xl:grid-cols-[minmax(0,1fr)_minmax(15rem,20%)] 2xl:grid-cols-[minmax(0,1fr)_minmax(16rem,18%)]">
      <section className="grid min-h-0 content-start grid-cols-1 gap-2.5 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
        {weeklyTrendType ? (
          <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-2.5 rounded-xl border border-pink-500/40 bg-gradient-to-r from-pink-950/70 via-purple-950/60 to-slate-950/80 px-4 py-2 shadow-[0_0_15px_rgba(236,72,153,0.25)]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-pink-400/40 bg-pink-500/20 text-base shadow-[0_0_10px_rgba(236,72,153,0.4)]">
                {TREND_TYPE_INFO[weeklyTrendType]?.icon ?? '🔥'}
              </span>
              <div>
                <p className="text-[9px] font-bold text-pink-300/80 uppercase tracking-widest">주간 방송 대세 트렌드</p>
                <p className="text-xs sm:text-sm font-black text-white">
                  이번 주 대세:{' '}
                  <span className="text-pink-300 underline underline-offset-4 decoration-pink-400 font-extrabold">
                    [{TREND_TYPE_INFO[weeklyTrendType]?.label ?? weeklyTrendType}]
                  </span>{' '}
                  타입 크리에이터
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]">
              <span>💰 방송 수익</span>
              <span className="text-sm font-black text-amber-200">+35%</span>
            </div>
          </div>
        ) : null}
        {slots.map((slot) => (
          <StreamCard
            key={slot.id}
            slot={slot}
            slotId={slot.id}
            registeredStaff={registeredStaff}
            managerState={managerState}
            broadcastPhase={broadcastPhase}
            assets={assets}
            revenueBursts={
              slot.creator
                ? revenueBursts.filter((burst) => burst.creatorId === slot.creator!.id)
                : []
            }
            conditionCrashes={
              slot.creator
                ? conditionCrashes.filter((crash) => crash.creatorId === slot.creator!.id)
                : []
            }
            toxicQte={
              slot.creator
                ? toxicQtes.find((qte) => qte.creatorId === slot.creator!.id) ?? null
                : null
            }
            gearBroken={Boolean(slot.status === 'assigned' && slotGearById[slot.id]?.broken)}
            gearFailBursts={gearFailBursts.filter((burst) => burst.slotId === slot.id)}
            staffActions={staffActions.filter((action) => action.slotId === slot.id)}
            onBurstDone={dismissBurst}
            onConditionCare={onConditionCare}
            onConditionCrashDone={onConditionCrashDone}
            onGearFailBurstDone={onGearFailBurstDone}
            onStaffActionDone={onStaffActionDone}
            onToxicQteResolve={onToxicQteResolve}
            onRepairSlot={onRepairSlot}
          />
        ))}
      </section>

      <aside className="flex min-h-0 flex-col gap-2.5 lg:h-full lg:overflow-hidden">
        <section className="game-panel flex min-h-0 max-h-40 flex-col rounded-2xl p-3 lg:max-h-none lg:flex-[0.85]">
          <h2 className="game-stat-label shrink-0">{t('dashboard.recentEvents')}</h2>
          {liveEvents.length === 0 ? (
            <p className="mt-4 text-center text-xs text-slate-500">{t('dashboard.noEvents')}</p>
          ) : (
            <ul className="mt-2.5 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
              <AnimatePresence initial={false}>
                {liveEvents.map((event) => (
                  <motion.li
                    key={event.id}
                    layout
                    initial={reducedMotion ? false : { opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reducedMotion ? undefined : { opacity: 0, x: -12 }}
                    transition={{
                      layout: reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 380, damping: 30 },
                      opacity: { duration: 0.22 },
                      x: { type: 'spring', stiffness: 420, damping: 28 },
                    }}
                    className="flex items-start gap-2 rounded-xl border-0 bg-white/[0.06] px-2.5 py-2 text-xs text-slate-300"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${event.tone}`} />
                    <div className="min-w-0">
                      <span>{event.text}</span>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <section className={`game-panel live-rank-panel flex min-h-[24rem] flex-[1.35] flex-col rounded-2xl p-3 sm:min-h-[26rem] lg:min-h-0 ${isLive ? 'is-live' : ''}`}>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h2 className="game-stat-label">{t('dashboard.liveRank')}</h2>
            {isLive && hasAssigned ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-pink-400/30 bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold text-pink-300 neon-text-pink">
                <span className="game-live-dot h-1.5 w-1.5 rounded-full bg-pink-400" />
                {t('dashboard.live')}
              </span>
            ) : liveRanking.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-pink-400/30 bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold text-pink-300 neon-text-pink">
                <span className="game-live-dot h-1.5 w-1.5 rounded-full bg-pink-400" />
                {t('dashboard.ready')}
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                OFF
              </span>
            )}
          </div>
          {liveRanking.length === 0 ? (
            <div className="mt-2.5 flex min-h-0 flex-1 flex-col gap-1.5">
              <p className="py-2 text-center text-xs text-slate-500">
                {t('dashboard.noLiveBroadcast')}
              </p>
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={`rank-empty-${i}`}
                  className="h-10 rounded-xl border border-dashed border-white/8 bg-black/10"
                />
              ))}
            </div>
          ) : (
            <LiveRankBoard
              ranking={liveRanking}
              placeholders={rankPlaceholders}
              jackpots={revenueBursts.filter(
                (burst) => burst.tier === 'big' || burst.tier === 'mega',
              )}
            />
          )}
        </section>

        <button
          type="button"
          onClick={onStartBroadcast}
          disabled={!canStartBroadcast}
          className="game-btn-pink mt-auto w-full shrink-0 rounded-2xl px-4 py-3 text-sm font-bold tracking-wide disabled:cursor-not-allowed disabled:opacity-40 sm:py-3.5 sm:text-[15px]"
        >
          {isLive ? t('dashboard.broadcasting') : t('dashboard.startBroadcast')}
        </button>
      </aside>
    </div>
  )
}

function StreamCard({
  slot,
  slotId,
  registeredStaff = [],
  managerState,
  broadcastPhase,
  assets = 0,
  revenueBursts = [],
  conditionCrashes = [],
  toxicQte = null,
  gearBroken = false,
  gearFailBursts = [],
  staffActions = [],
  onBurstDone,
  onConditionCare,
  onConditionCrashDone,
  onGearFailBurstDone,
  onStaffActionDone,
  onToxicQteResolve,
  onRepairSlot,
}: {
  slot: BroadcastSlotView
  slotId: string
  registeredStaff?: RegisteredStaff[]
  managerState?: SlotManagerState
  broadcastPhase: BroadcastPhase
  assets?: number
  revenueBursts?: RevenueBurst[]
  conditionCrashes?: ConditionCrashFxItem[]
  toxicQte?: ToxicWhackQteItem | null
  gearBroken?: boolean
  gearFailBursts?: GearFailBurstItem[]
  staffActions?: StaffActionFxItem[]
  onBurstDone?: (id: string) => void
  onConditionCare?: (creatorId: string) => void
  onConditionCrashDone?: (id: string) => void
  onGearFailBurstDone?: (id: string) => void
  onStaffActionDone?: (id: string) => void
  onToxicQteResolve?: (id: string, success: boolean) => void
  onRepairSlot?: (slotId: string) => void
}) {
  const { t } = useTranslation()
  const creator = slot.creator
  const blocked = Boolean(creator && !creator.canBroadcast)
  const badge =
    gearBroken
      ? {
          labelKey: 'dashboard.noSignal',
          className: 'border-amber-400/70 bg-amber-500/20 text-amber-200',
        }
      : blocked
        ? {
            labelKey: 'dashboard.broadcastBlockedBadge',
            className: 'border-rose-400/40 bg-rose-500/15 text-rose-300',
          }
        : slot.status === 'assigned' && broadcastPhase === 'live'
          ? {
              labelKey: 'dashboard.live',
              className: 'border-pink-500/50 bg-pink-500/15 text-pink-300 neon-text-pink',
            }
          : STATUS_BADGE[slot.status]
  const staminaPct =
    creator && creator.staminaMax > 0
      ? Math.max(0, Math.min(100, (creator.stamina / creator.staminaMax) * 100))
      : 0
  const staminaTone = staminaToneClass(staminaPct, blocked)
  const conditionFull = Boolean(creator && creator.conditionScore >= 100)
  const careCost = creator ? calcConditionFullCareCost(creator.grade) : 0
  const canAffordCare = assets >= careCost
  const canCare = Boolean(creator && onConditionCare && !conditionFull && canAffordCare)
  const hasCareManager = Boolean(managerState?.equippedBySlotId[slot.id]?.care)
  const [careSpendFlash, setCareSpendFlash] = useState<string | null>(null)

  useEffect(() => {
    if (!careSpendFlash) return
    const id = window.setTimeout(() => setCareSpendFlash(null), 1400)
    return () => window.clearTimeout(id)
  }, [careSpendFlash])

  if (slot.status === 'locked') {
    return (
      <article className="border border-rose-950/30 flex flex-col overflow-hidden rounded-2xl opacity-60 bg-slate-950/90 cursor-not-allowed select-none">
        <div className="relative aspect-[2/1] w-full shrink-0 bg-slate-950 bg-[radial-gradient(circle_at_50%_50%,rgba(255,42,116,0.06),transparent_70%)]">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_8px,rgba(255,255,255,0.01)_8px,rgba(255,255,255,0.01)_16px)] animate-pulse" />
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
            <span className="rounded-md border border-white/5 bg-black/60 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-slate-500 backdrop-blur-sm">
              {slot.label}
            </span>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(255,42,116,0.15)]">
              <IconLock />
            </div>
            <p className="text-[10px] font-bold tracking-widest text-rose-400/60 uppercase">{t('dashboard.lockedChannel')}</p>
          </div>
        </div>

        <div className="shrink-0 space-y-2 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 text-slate-600">
              <IconLockSmall />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-500">{t('dashboard.lockedSlot')}</p>
              <p className="mt-0.5 text-[10px] text-slate-600">{t('dashboard.unlockHint')}</p>
            </div>
          </div>
        </div>
      </article>
    )
  }

  if (slot.status === 'empty') {
    return (
      <article className="neon-glow-card flex flex-col overflow-hidden rounded-2xl bg-slate-950/40">
        <div className="relative aspect-[2/1] w-full shrink-0 bg-slate-950">
          <div className="cctv-scanline" />
          <div className="cctv-noise" />
          <div className="reticle-corner reticle-tl" />
          <div className="reticle-corner reticle-tr" />
          <div className="reticle-corner reticle-bl" />
          <div className="reticle-corner reticle-br" />

          <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-start justify-between gap-2">
            <span className="rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-slate-300 backdrop-blur-sm">
              {slot.label}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${badge.className}`}>
              {t(badge.labelKey)}
            </span>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-10">
            <div className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase">{t('dashboard.noSignal')}</div>
            <p className="text-xs font-bold text-slate-500 tracking-wide">{t('dashboard.standby')}</p>
            <p className="text-[10px] text-slate-600">{t('dashboard.placeCreator')}</p>
          </div>
        </div>

        <div className="shrink-0 space-y-2 p-3 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 bg-black/25 text-sm font-bold text-slate-500">
              ＋
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-400">{t('dashboard.unassigned')}</p>
              <p className="mt-0.5 text-[10px] text-slate-600">{t('dashboard.unassignedLinked')}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-600">
              <IconEye />
              —
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="relative min-w-0 flex-1 overflow-hidden rounded-md border border-white/10 bg-slate-900 shadow-inner">
              <div className="h-6 w-0 bg-gradient-to-r from-cyan-400 to-teal-300" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2 text-[10px] font-bold tracking-wide text-slate-400">
                <span>Stamina</span>
                <span className="tabular-nums">—</span>
              </div>
            </div>

            {managerState ? (
              <div className="shrink-0">
                <StaffSlotIcons
                  slotId={slotId}
                  managerState={managerState}
                  registeredStaff={registeredStaff}
                  size="sm"
                />
              </div>
            ) : null}
          </div>


        </div>
      </article>
    )
  }

  const playVideoUrl = creator?.playVideoUrl || null
  const mediaRevision = creator?.mediaRevision
  const playableSrc = playVideoUrl
    ? resolveMediaSrc(playVideoUrl, mediaRevision ?? playVideoUrl)
    : null
  const isLive = Boolean(creator?.live)
  const feedOff = gearBroken || (isLive && blocked)
  const crashing = conditionCrashes.length > 0
  const staffing = staffActions.length > 0

  return (
    <article
      className={`neon-glow-card relative flex flex-col overflow-hidden rounded-2xl bg-slate-950/40 transition-all duration-300 ${
        isLive && !feedOff ? 'stream-on-air' : ''
      } ${
        crashing ? 'condition-crash-slot' : ''
      } ${
        staffing ? 'staff-action-slot' : ''
      } ${
        gearBroken ? 'is-gear-broken' : isLive && blocked ? 'is-cctv-rest-off' : blocked ? 'border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.35)]' : ''
      }`}
    >
      <div
        className={`relative aspect-[2/1] w-full shrink-0 overflow-hidden bg-gradient-to-br ${creator?.preview ?? 'from-slate-700/40 via-slate-900 to-slate-950'}`}
      >
        {playableSrc ? (
          <video
            key={playableSrc}
            src={playableSrc}
            className={`absolute inset-0 z-0 h-full w-full object-cover${feedOff ? ' cctv-feed-dead' : ''}`}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        ) : null}

        <div
          className={`cctv-scanline${feedOff ? ' is-gear-broken' : ''}`}
          style={playVideoUrl && !feedOff ? { opacity: 0.25 } : undefined}
        />
        <div
          className={`cctv-noise${feedOff ? ' is-gear-broken' : ''}`}
          style={playVideoUrl && !feedOff ? { opacity: 0.02 } : undefined}
        />
        {!playVideoUrl ? (
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(124,77,255,0.15),transparent_60%)]" />
        ) : null}
        <div className="reticle-corner reticle-tl" />
        <div className="reticle-corner reticle-tr" />
        <div className="reticle-corner reticle-bl" />
        <div className="reticle-corner reticle-br" />
        <div
          className={`absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t to-transparent ${
            playVideoUrl ? 'from-slate-950/75' : 'from-slate-950'
          }`}
        />

        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-start justify-between gap-2">
          <span className="rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-slate-200 backdrop-blur-sm">
            {slot.label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${badge.className}`}>
              {t(badge.labelKey)}
            </span>
            <div className="flex items-center gap-1 rounded bg-black/50 border border-white/5 px-1.5 py-0.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  feedOff ? (gearBroken ? 'bg-amber-400' : 'bg-rose-400') : 'bg-pink-500 animate-ping'
                }`}
              />
              <span
                className={`text-[8px] font-extrabold tracking-wider ${
                  feedOff ? (gearBroken ? 'text-amber-300' : 'text-rose-300') : 'text-pink-400'
                }`}
              >
                {feedOff ? t('dashboard.noSignal') : isLive ? t('dashboard.live') : t('dashboard.idle')}
              </span>
              {feedOff ? null : (
                <div className="live-audio-wave ml-1">
                  <span className="audio-bar" />
                  <span className="audio-bar" />
                  <span className="audio-bar" />
                  <span className="audio-bar" />
                </div>
              )}
            </div>
          </div>
        </div>

        {revenueBursts.length > 0 && onBurstDone ? (
          <RevenueBurstFx bursts={revenueBursts} onBurstDone={onBurstDone} />
        ) : null}

        {crashing && onConditionCrashDone ? (
          <ConditionCrashFx crashes={conditionCrashes} onDone={onConditionCrashDone} />
        ) : null}

        {gearFailBursts.length > 0 && onGearFailBurstDone ? (
          <GearFailBurstFx
            bursts={gearFailBursts}
            title={t('dashboard.gearFail')}
            subtitle={t('dashboard.gearFailSlamSub')}
            onDone={onGearFailBurstDone}
          />
        ) : null}

        {staffing ? <StaffActionFx actions={staffActions} variant="visual" /> : null}

        {gearBroken ? (
          <div className="cctv-gear-fail-fx" aria-hidden>
            <div className="cctv-gear-fail-dim" />
            <div className="cctv-gear-fail-static" />
            <div className="cctv-gear-fail-tear" />
            <div className="cctv-gear-fail-flash" />
          </div>
        ) : blocked && isLive ? (
          <div className="cctv-gear-fail-fx" aria-hidden>
            <div className="cctv-gear-fail-dim" />
            <div className="cctv-gear-fail-static" />
          </div>
        ) : null}

        {blocked && isLive && !gearBroken ? (
          <div className="pointer-events-none absolute inset-0 z-[29] flex flex-col items-center justify-center gap-1 px-3 text-center">
            <span className="rounded border border-rose-400/45 bg-black/75 px-2 py-0.5 text-[9px] font-black tracking-[0.18em] text-rose-200">
              {t('dashboard.noSignal')}
            </span>
            <p className="text-[10px] font-semibold text-rose-200/90">{t('dashboard.broadcastBlocked')}</p>
          </div>
        ) : null}


        {gearBroken && !toxicQte && onRepairSlot ? (
          <button
            type="button"
            className="cctv-gear-fail-repair"
            data-no-ui-click
            onClick={() => onRepairSlot(slot.id)}
            aria-label={`${t('dashboard.gearFail')} — ${t('dashboard.gearFailHint')}`}
          >
            <span className="cctv-gear-fail-badge">{t('dashboard.gearFail')}</span>
            <span className="cctv-gear-fail-hint">{t('dashboard.gearFailHint')}</span>
          </button>
        ) : null}

        {toxicQte && onToxicQteResolve ? (
          <ToxicWhackQte
            item={toxicQte}
            onResolve={(success) => onToxicQteResolve(toxicQte.id, success)}
          />
        ) : null}
      </div>

      <div className="relative shrink-0 space-y-2 p-3 pt-7 pb-3.5">
        {staffing ? (
          <StaffActionFx
            actions={staffActions}
            variant="caption"
            onDone={onStaffActionDone}
          />
        ) : null}
        {/* 프로필 이미지 & 우측 끝 컨디션 회복 버튼 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {creator?.profileImageUrl ? (
              <img
                src={resolveMediaSrc(creator.profileImageUrl, creator.mediaRevision)}
                alt={creator.name}
                className="h-8 w-8 rounded-full object-cover shrink-0 border border-white/10"
              />
            ) : (
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-slate-950 ${creator?.avatarTone ?? 'from-slate-500 to-slate-700'}`}
              >
                {(creator?.avatar ?? '?').slice(0, 2)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                {creator?.grade ? (
                  <span className={`rounded-md border px-1.5 py-0.2 text-[10px] sm:text-xs font-black italic tracking-wider ${getGradeBadgeStyle(creator.grade)}`}>
                    {creator.grade}
                  </span>
                ) : null}
                <p className="truncate text-xs font-bold text-slate-100">
                  {creator?.name ?? '—'}
                  {creator?.concept ? (
                    <span className="font-medium text-amber-400"> ({creator.concept})</span>
                  ) : null}
                </p>
                {creator?.tag ? (
                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${TAG_STYLE[creator.tag.tone]}`}
                  >
                    {creator.tag.text}
                  </span>
                ) : null}
                {creator?.isTrendMatching ? (
                  <span className="rounded-md border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-pink-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.35)] animate-pulse">
                    ✨ 대세 타입 +35%
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* 우측 영역: 시청자 수 & 컨디션 회복 버튼 (케어매니저 미장착 시에만 회복버튼 표시) */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
              <IconEye />
              {creator?.viewers ?? '—'}
            </div>

            {!hasCareManager ? (
              <div className="relative">
                <button
                  type="button"
                  title={`${t('dashboard.actionRecover')} −${formatMoney(careCost)}`}
                  disabled={!canCare}
                  onClick={() => {
                    if (!creator || !canCare) return
                    onConditionCare?.(creator.id)
                    setCareSpendFlash(`−${formatMoney(careCost)}`)
                  }}
                  className="game-btn flex h-7 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/70 px-2 text-emerald-200 transition-all hover:bg-emerald-900 hover:border-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:border-slate-800 disabled:bg-slate-900/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                >
                  <IconTrain />
                  <span className="text-[10px] font-black tabular-nums text-amber-300">
                    {careCost > 0 ? formatCareCostShort(careCost) : '—'}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-300">{t('dashboard.actionRecover')}</span>
                </button>

                {careSpendFlash ? (
                  <div className="pointer-events-none absolute bottom-full right-0 z-30 mb-1 rounded-md border border-amber-400/40 bg-slate-950/95 px-2 py-0.5 shadow-[0_4px_16px_rgba(0,0,0,0.6)] whitespace-nowrap">
                    <p className="text-[10px] font-black tabular-nums text-amber-300">{careSpendFlash}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* 컨디션 & Stamina 게이지바 */}
        <div className="space-y-1.5 pt-0.5">
          {/* 컨디션 게이지바 */}
          {creator ? (
            <div>
              <div className="mb-0.5 flex items-center justify-between text-[10px]">
                <span className={`flex items-center gap-1.5 font-bold ${CONDITION_ROW_CLASS[creator.condition]}`}>
                  <span
                    className={`condition-status-dot h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_6px_currentColor] ${CONDITION_DOT_CLASS[creator.condition]}`}
                    aria-hidden
                  />
                  <span className="text-[11px]" aria-hidden>
                    {CONDITION_ICON[creator.condition]}
                  </span>
                  <span>{t(CONDITION_LABEL_KEY[creator.condition])}</span>
                </span>
                <span className="font-extrabold tabular-nums text-slate-300 text-[10px]">
                  {creator.conditionScore}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-900 border border-white/10 shadow-inner">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ease-out ${CONDITION_DOT_CLASS[creator.condition]} shadow-[0_0_8px_currentColor]`}
                  style={{ width: `${creator.conditionScore}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Stamina 게이지바 & 우측 스태프 아이콘 (한 줄로 통합 배치) */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div
              className={`relative min-w-0 flex-1 overflow-hidden rounded-md bg-slate-900 shadow-inner border transition-all duration-300 ${
                staminaTone.track
              }`}
            >
              <div
                className={`h-6 rounded-sm transition-[width] duration-150 ease-linear ${
                  staminaTone.fill
                }`}
                style={{ width: `${staminaPct}%` }}
              />
              <div
                className={`pointer-events-none absolute inset-0 flex items-center justify-between px-2 text-[10px] font-black tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)] ${
                  staminaTone.text
                }`}
              >
                <span>{blocked ? '🚨 Stamina (고갈)' : 'Stamina'}</span>
                <span className="tabular-nums">
                  {creator ? `${Math.round(creator.stamina)}/${creator.staminaMax}` : '—'}
                </span>
              </div>
            </div>

            {managerState ? (
              <div className="shrink-0">
                <StaffSlotIcons
                  slotId={slotId}
                  managerState={managerState}
                  registeredStaff={registeredStaff}
                  size="sm"
                />
              </div>
            ) : null}
          </div>

          {blocked ? (
            <div className="mt-1 flex items-center gap-1.5 rounded-md border border-rose-500/70 bg-rose-950/90 px-2 py-0.5 text-[10px] font-black text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse">
              <span className="text-xs shrink-0">🚨</span>
              <span className="truncate">{t('dashboard.broadcastBlocked')} — 회복 케어가 필요합니다!</span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function staminaToneClass(pct: number, blocked: boolean) {
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

function formatCareCostShort(amount: number) {
  return formatMoneyCompact(amount)
}

export function StreamAction({
  label,
  icon,
  disabled = false,
  onClick,
}: {
  label: string
  icon: ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="game-btn flex h-7 items-center justify-center rounded-lg text-slate-300 disabled:cursor-not-allowed disabled:opacity-35"
    >
      <span className="sr-only">{label}</span>
      {icon}
    </button>
  )
}

function IconLock() {
  return (
    <svg className="h-7 w-7 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconLockSmall() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconEye() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function IconAssign() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 18.5c.9-2.8 2.8-4.2 5.5-4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M17 9v6M14 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconTrain() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V8M12 8l-2.5 2.5M12 8l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="18.5" r="1.2" fill="currentColor" />
      <path d="M6 19.5h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconStats() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18V11M10 18V7M15 18v-5M20 18V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconGear() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
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
