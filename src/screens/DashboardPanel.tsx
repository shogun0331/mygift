import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
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
  scoreOf,
  type CreatorCondition,
} from '../game/condition'
import type { DayEvent } from '../game/economy'
import { formatMoney, formatMoneyCompact } from '../game/money'
import { resolveMediaSrc } from '../game/mediaUrl'
import { creatorVisuals, type StudioSlot } from '../game/studioSlots'
import { useTranslation } from '../locales/i18n'
import type { BroadcastPhase } from '../game/broadcast'
import {
  RevenueBurstFx,
  revenueBurstTier,
  type RevenueBurst,
} from './RevenueBurstFx'
import {
  ConditionCrashFx,
  type ConditionCrashFxItem,
} from './ConditionCrashFx'
import { ToxicWhackQte, type ToxicWhackQteItem } from './ToxicWhackQte'

type DashboardPanelProps = {
  slots: StudioSlot[]
  ownedCreators?: OwnedCreator[]
  broadcastPhase?: BroadcastPhase
  livePlayVideoByCreator?: Record<string, string>
  liveEvents?: DayEvent[]
  /** 방송 월간 누적 실시간 수익 (크리에이터 id → USD) */
  liveRevenueByCreator?: Record<string, number>
  assets?: number
  conditionCrashes?: ConditionCrashFxItem[]
  toxicQtes?: ToxicWhackQteItem[]
  /** 명세서 대기/표시 중 — 방송 시작 비활성 */
  startBroadcastLocked?: boolean
  onStartBroadcast: () => void
  onConditionCare?: (creatorId: string) => void
  onConditionCrashDone?: (id: string) => void
  onToxicQteResolve?: (id: string, success: boolean) => void
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
  livePlayUrl?: string | null,
): BroadcastSlotView {
  const streamLabel = `STREAM ${String(slot.index).padStart(2, '0')}`
  if (slot.status !== 'assigned' || !slot.assignment) {
    return {
      id: slot.id,
      label: streamLabel,
      status: slot.status === 'locked' ? 'locked' : 'empty',
    }
  }

  const visuals = creatorVisuals(slot.assignment.creatorId, slot.assignment.creatorName)
  const staminaMax = owned?.staminaMax ?? 100
  const stamina = owned
    ? Math.min(staminaMax, owned.stamina)
    : Math.min(staminaMax, 40 + slot.assignment.popularity)
  const heatLevel = owned?.heat ?? 1
  const idleVideoUrl =
    (owned ? findLevelIdleVideoUrl(owned, heatLevel) : null) ||
    slot.assignment.idleVideoUrl ||
    null
  const playVideoUrl =
    broadcastPhase === 'live' && owned
      ? livePlayUrl || idleVideoUrl
      : idleVideoUrl
  const mediaRevision =
    owned?.mediaRevision ?? slot.assignment.mediaRevision ?? playVideoUrl ?? undefined

  return {
    id: slot.id,
    label: streamLabel,
    status: 'assigned',
    creator: {
      id: slot.assignment.creatorId,
      name: slot.assignment.creatorName,
      concept: slot.assignment.grade,
      avatar: visuals.avatar,
      avatarTone: visuals.avatarTone,
      profileImageUrl: slot.assignment.profileImageUrl || null,
      playVideoUrl,
      mediaRevision,
      stamina,
      staminaMax,
      canBroadcast: canBroadcastByStamina(stamina),
      grade: (() => {
        const g = owned?.grade ?? slot.assignment.grade
        return g === 'S' || g === 'A' || g === 'B' || g === 'C' ? g : 'C'
      })(),
      conditionScore: owned ? scoreOf(owned) : 60,
      condition: owned ? conditionFromScore(scoreOf(owned)) : 'normal',
      viewers: '—',
      live: broadcastPhase === 'live',
      preview: visuals.preview,
    },
  }
}

function formatRevenue(value: number) {
  return formatMoney(value)
}

const RANK_BADGE: Record<number, string> = {
  1: 'border-amber-400/40 bg-amber-400/15 text-amber-300',
  2: 'border-slate-300/35 bg-slate-300/10 text-slate-200',
  3: 'border-orange-400/35 bg-orange-400/10 text-orange-300',
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
  broadcastPhase = 'prep',
  livePlayVideoByCreator = {},
  liveEvents = [],
  liveRevenueByCreator = {},
  assets = 0,
  conditionCrashes = [],
  toxicQtes = [],
  startBroadcastLocked = false,
  onStartBroadcast,
  onConditionCare,
  onConditionCrashDone,
  onToxicQteResolve,
}: DashboardPanelProps) {
  const { t } = useTranslation()
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
      creatorId ? livePlayVideoByCreator[creatorId] : undefined,
    )
  })
  const assigned = studioSlots.filter((slot) => {
    if (slot.status !== 'assigned' || !slot.assignment) return false
    const owned = ownedById[slot.assignment.creatorId]
    if (!owned) return true
    return canBroadcastByStamina(owned.stamina)
  })
  const hasAssigned = assigned.length > 0

  const liveRanking = assigned
    .map((slot) => {
      const a = slot.assignment!
      const visuals = creatorVisuals(a.creatorId, a.creatorName)
      return {
        id: a.creatorId,
        rank: 0,
        name: a.creatorName,
        concept: a.grade,
        avatar: visuals.avatar,
        avatarTone: visuals.avatarTone,
        profileImageUrl: a.profileImageUrl || null,
        revenue: liveRevenueByCreator[a.creatorId] ?? 0,
        viewers: '—',
      }
    })
    .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name, 'ko'))
    .slice(0, 6)
    .map((row, index) => ({ ...row, rank: index + 1 }))

  // 최대 6명 슬롯 높이 확보용 빈 칸
  const rankPlaceholders = Math.max(0, 6 - Math.max(liveRanking.length, 1))

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,22%)] xl:grid-cols-[minmax(0,1fr)_minmax(15rem,20%)] 2xl:grid-cols-[minmax(0,1fr)_minmax(16rem,18%)]">
      <section className="grid min-h-0 content-start grid-cols-1 gap-2.5 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <StreamCard
            key={slot.id}
            slot={slot}
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
            onBurstDone={dismissBurst}
            onConditionCare={onConditionCare}
            onConditionCrashDone={onConditionCrashDone}
            onToxicQteResolve={onToxicQteResolve}
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
              {liveEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/20 px-2.5 py-2 text-xs text-slate-300"
                >
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${event.tone}`} />
                  <div className="min-w-0">
                    <span>{event.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="game-panel flex min-h-[22rem] flex-[1.35] flex-col rounded-2xl p-3 sm:min-h-[24rem] lg:min-h-0">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h2 className="game-stat-label">{t('dashboard.liveRank')}</h2>
            {hasAssigned ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-pink-400/30 bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold text-pink-300 neon-text-pink">
                <span className="game-live-dot h-1.5 w-1.5 rounded-full bg-pink-400" />
                {isLive ? t('dashboard.live') : t('dashboard.ready')}
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
            <ul className="mt-2.5 grid min-h-0 flex-1 auto-rows-fr grid-rows-6 gap-1.5 overflow-hidden pr-0.5">
              {liveRanking.map((creator) => (
                <li
                  key={creator.id}
                  className="flex min-h-0 items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-2 py-1.5"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-black ${
                      RANK_BADGE[creator.rank] ?? 'border-white/10 bg-black/30 text-slate-400'
                    }`}
                  >
                    {creator.rank}
                  </span>
                  {creator.profileImageUrl ? (
                    <img
                      src={creator.profileImageUrl}
                      alt={creator.name}
                      className="h-8 w-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-slate-950 ${creator.avatarTone}`}
                    >
                      {creator.avatar.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-100">
                      {creator.name}
                      <span className="ml-1 font-medium text-amber-400/90">({creator.concept})</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{t('dashboard.studioPlaced')}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold tracking-wide text-slate-500">
                      {t('dashboard.rankRevenue')}
                    </p>
                    <p className="text-xs font-bold tabular-nums text-amber-400">
                      {formatRevenue(creator.revenue)}
                    </p>
                  </div>
                </li>
              ))}
              {Array.from({ length: rankPlaceholders }, (_, i) => (
                <li
                  key={`rank-slot-${i}`}
                  className="rounded-xl border border-dashed border-white/8 bg-black/10"
                />
              ))}
            </ul>
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
  broadcastPhase,
  assets = 0,
  revenueBursts = [],
  conditionCrashes = [],
  toxicQte = null,
  onBurstDone,
  onConditionCare,
  onConditionCrashDone,
  onToxicQteResolve,
}: {
  slot: BroadcastSlotView
  broadcastPhase: BroadcastPhase
  assets?: number
  revenueBursts?: RevenueBurst[]
  conditionCrashes?: ConditionCrashFxItem[]
  toxicQte?: ToxicWhackQteItem | null
  onBurstDone?: (id: string) => void
  onConditionCare?: (creatorId: string) => void
  onConditionCrashDone?: (id: string) => void
  onToxicQteResolve?: (id: string, success: boolean) => void
}) {
  const { t } = useTranslation()
  const creator = slot.creator
  const blocked = Boolean(creator && !creator.canBroadcast)
  const badge =
    blocked
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
  const conditionFull = Boolean(creator && creator.conditionScore >= 100)
  const careCost = creator ? calcConditionFullCareCost(creator.grade) : 0
  const canAffordCare = assets >= careCost
  const canCare = Boolean(creator && onConditionCare && !conditionFull && canAffordCare)
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
          <div className="grid grid-cols-4 gap-1">
            <StreamAction label="배정" icon={<IconAssign />} disabled />
            <StreamAction label="훈련" icon={<IconTrain />} disabled />
            <StreamAction label="통계" icon={<IconStats />} disabled />
            <StreamAction label="설정" icon={<IconGear />} disabled />
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

        <div className="shrink-0 space-y-2 p-2.5">
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

          <div>
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="font-semibold tracking-wide text-slate-500">Stamina</span>
              <span className="font-semibold text-slate-600">—</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-0 rounded-full bg-gradient-to-r from-cyan-400 to-teal-300" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1">
            <StreamAction label="배정" icon={<IconAssign />} disabled />
            <StreamAction label="훈련" icon={<IconTrain />} disabled />
            <StreamAction label="통계" icon={<IconStats />} disabled />
            <StreamAction label="설정" icon={<IconGear />} disabled />
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
  const crashing = conditionCrashes.length > 0

  return (
    <article
      className={`neon-glow-card relative flex flex-col overflow-hidden rounded-2xl bg-slate-950/40 ${
        crashing ? 'condition-crash-slot' : ''
      }`}
    >
      <div
        className={`relative aspect-[2/1] w-full shrink-0 overflow-hidden bg-gradient-to-br ${creator?.preview ?? 'from-slate-700/40 via-slate-900 to-slate-950'}`}
      >
        {playableSrc ? (
          <video
            key={playableSrc}
            src={playableSrc}
            className="absolute inset-0 z-0 h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        ) : null}

        <div
          className="cctv-scanline"
          style={playVideoUrl ? { opacity: 0.25 } : undefined}
        />
        <div
          className="cctv-noise"
          style={playVideoUrl ? { opacity: 0.02 } : undefined}
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
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-ping" />
              <span className="text-[8px] font-extrabold text-pink-400 tracking-wider">
                {isLive ? t('dashboard.live') : t('dashboard.idle')}
              </span>
              <div className="live-audio-wave ml-1">
                <span className="audio-bar" />
                <span className="audio-bar" />
                <span className="audio-bar" />
                <span className="audio-bar" />
              </div>
            </div>
          </div>
        </div>

        {revenueBursts.length > 0 && onBurstDone ? (
          <RevenueBurstFx bursts={revenueBursts} onBurstDone={onBurstDone} />
        ) : null}

        {crashing && onConditionCrashDone ? (
          <ConditionCrashFx crashes={conditionCrashes} onDone={onConditionCrashDone} />
        ) : null}

        {toxicQte && onToxicQteResolve ? (
          <ToxicWhackQte
            item={toxicQte}
            onResolve={(success) => onToxicQteResolve(toxicQte.id, success)}
          />
        ) : null}
      </div>

      <div className="shrink-0 space-y-1.5 p-2.5">
        <div className="flex items-center gap-2.5">
          {creator?.profileImageUrl ? (
            <img
              src={creator.profileImageUrl}
              alt={creator.name}
              className="h-8 w-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-slate-950 ${creator?.avatarTone ?? 'from-slate-500 to-slate-700'}`}
            >
              {(creator?.avatar ?? '?').slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <p className="truncate text-xs font-semibold text-slate-100">
                {creator?.name ?? '—'}
                {creator?.concept ? (
                  <span className="font-medium text-amber-400"> ({creator.concept})</span>
                ) : null}
              </p>
              {creator ? (
                <div className="flex flex-col gap-0.5 items-start">
                  <span
                    className={`inline-flex min-w-0 max-w-full items-center gap-1 text-[10px] font-bold leading-none ${CONDITION_ROW_CLASS[creator.condition]}`}
                    title={`${t('condition.title')} ${t(CONDITION_LABEL_KEY[creator.condition])} (${creator.conditionScore}%)`}
                  >
                    <span
                      className={`condition-status-dot h-1.5 w-1.5 shrink-0 rounded-full ${CONDITION_DOT_CLASS[creator.condition]}`}
                      aria-hidden
                    />
                    <span className="shrink-0 text-[11px]" aria-hidden>
                      {CONDITION_ICON[creator.condition]}
                    </span>
                    <span className="truncate">
                      {t(CONDITION_LABEL_KEY[creator.condition])}
                    </span>
                  </span>
                  <div className="h-1 w-10 overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className={`h-full rounded-full ${CONDITION_DOT_CLASS[creator.condition]}`}
                      style={{ width: `${creator.conditionScore}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {creator?.tag ? (
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${TAG_STYLE[creator.tag.tone]}`}
                >
                  {creator.tag.text}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-400">
            <IconEye />
            {creator?.viewers ?? '—'}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
            <span className="font-semibold tracking-wide text-slate-400">Stamina</span>
            <span className={`font-semibold ${blocked ? 'text-rose-300' : 'text-cyan-300'}`}>
              {creator ? `${creator.stamina}/${creator.staminaMax}` : '—'}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${
                blocked ? 'from-rose-400 to-orange-300' : 'from-cyan-400 to-teal-300'
              }`}
              style={{ width: `${staminaPct}%` }}
            />
          </div>
          {blocked ? (
            <p className="mt-1 text-[10px] font-semibold text-rose-300/90">
              {t('dashboard.broadcastBlocked')}
            </p>
          ) : null}
        </div>

        <div className="relative grid grid-cols-4 gap-1">
          <StreamAction label="배정" icon={<IconAssign />} disabled />
          <button
            type="button"
            title={`${t('dashboard.actionRecover')} −${formatMoney(careCost)}`}
            disabled={!canCare}
            onClick={() => {
              if (!creator || !canCare) return
              onConditionCare?.(creator.id)
              setCareSpendFlash(`−${formatMoney(careCost)}`)
            }}
            className="game-btn flex h-7 flex-col items-center justify-center gap-0 rounded-lg px-0.5 text-emerald-200 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <IconTrain />
            <span className="text-[7px] font-black leading-none tabular-nums text-amber-300">
              {careCost > 0 ? formatCareCostShort(careCost) : '—'}
            </span>
            <span className="sr-only">{t('dashboard.actionRecover')}</span>
          </button>
          <StreamAction label="통계" icon={<IconStats />} disabled />
          <StreamAction label="설정" icon={<IconGear />} disabled />

          {careSpendFlash ? (
            <div className="pointer-events-none absolute bottom-full left-1/4 z-20 mb-1 -translate-x-1/2 rounded-md border border-amber-400/40 bg-slate-950/95 px-2 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              <p className="text-[10px] font-black tabular-nums text-amber-300">{careSpendFlash}</p>
              <p className="text-[8px] font-semibold text-slate-400">{t('dashboard.actionRecover')}</p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function formatCareCostShort(amount: number) {
  return formatMoneyCompact(amount)
}

function StreamAction({
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

function IconAssign() {
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

function IconStats() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18V11M10 18V7M15 18v-5M20 18V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconGear() {
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
