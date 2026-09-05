import type { CSSProperties, ReactNode } from 'react'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import {
  chatLangOf,
  formatChatDonationText,
  translateUserChatLine,
} from '../game/chatComments'
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
  /** 주간 대세 트렌드 타입 (미사용) */
  weeklyTrendType?: string
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
      viewers: '—',
      live: broadcastPhase === 'live',
      preview: visuals.preview,
    },
  }
}

/** 유저 ID 기반 트위치/숲(아프리카TV) 스타일 닉네임 색상 생성 */
function getChatUserColor(userId: string): string {
  const colors = [
    'text-cyan-400 font-bold',
    'text-purple-400 font-bold',
    'text-emerald-400 font-bold',
    'text-pink-400 font-bold',
    'text-amber-400 font-bold',
    'text-sky-400 font-bold',
    'text-violet-400 font-bold',
    'text-rose-400 font-bold',
    'text-lime-400 font-bold',
    'text-fuchsia-400 font-bold',
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return colors[hash % colors.length]!
}

/** 유저 ID 기반 배지 (구독자, VIP, 매니저, 팬클럽) 생성 */
function getChatUserBadge(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 37 + userId.charCodeAt(i)) >>> 0
  }
  const type = hash % 5
  if (type === 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-purple-400/40 bg-purple-500/20 px-1 py-0.2 text-[9px] font-black text-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.3)]">
        👑 SUB
      </span>
    )
  }
  if (type === 1) {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-amber-400/40 bg-amber-500/20 px-1 py-0.2 text-[9px] font-black text-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.3)]">
        💎 VIP
      </span>
    )
  }
  if (type === 2) {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-cyan-400/40 bg-cyan-500/20 px-1 py-0.2 text-[9px] font-black text-cyan-300 shadow-[0_0_6px_rgba(6,182,212,0.25)]">
        ⚡ FAN
      </span>
    )
  }
  if (type === 3) {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-emerald-400/40 bg-emerald-500/20 px-1 py-0.2 text-[9px] font-black text-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.25)]">
        🛡️ MOD
      </span>
    )
  }
  return null
}

/** 라이브챗 후원 금액 티어 → 색상 클래스 (숲 / 트위치 / 치즈 후원 카드 스타일) */
function donationChatTone(amount: number, superDonation?: boolean) {
  if (superDonation || amount >= 10_000) {
    return {
      tier: 'mega' as const,
      card: 'live-chat-donation live-chat-donation--mega border border-fuchsia-400/70 bg-slate-950/90 shadow-[0_0_16px_rgba(232,121,249,0.35)] ring-1 ring-fuchsia-400/30',
      header: 'bg-gradient-to-r from-fuchsia-950/90 via-pink-950/80 to-purple-950/90 border-b border-fuchsia-400/40 px-2.5 py-1.5',
      accentBar: 'bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300',
      handle: 'text-fuchsia-200 font-extrabold',
      badge: 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black shadow-[0_0_8px_rgba(217,70,239,0.6)] border border-fuchsia-300/50',
      body: 'text-fuchsia-100 bg-fuchsia-950/20 px-2.5 py-2 font-medium',
    }
  }
  if (amount >= 1_000) {
    return {
      tier: 'big' as const,
      card: 'live-chat-donation live-chat-donation--big border border-amber-400/60 bg-slate-950/90 shadow-[0_0_12px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/20',
      header: 'bg-gradient-to-r from-amber-950/85 via-amber-900/60 to-orange-950/75 border-b border-amber-400/35 px-2.5 py-1.5',
      accentBar: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300',
      handle: 'text-amber-200 font-bold',
      badge: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.5)] border border-amber-300/60',
      body: 'text-amber-100 bg-amber-950/20 px-2.5 py-1.5 font-medium',
    }
  }
  if (amount >= 100) {
    return {
      tier: 'mid' as const,
      card: 'live-chat-donation live-chat-donation--mid border border-cyan-400/45 bg-slate-950/85 shadow-[0_0_8px_rgba(6,182,212,0.18)]',
      header: 'bg-gradient-to-r from-cyan-950/80 via-slate-900/70 to-teal-950/75 border-b border-cyan-400/30 px-2.5 py-1.5',
      accentBar: 'bg-gradient-to-r from-cyan-400 to-teal-300',
      handle: 'text-cyan-200 font-bold',
      badge: 'bg-cyan-500/30 text-cyan-100 font-bold border border-cyan-400/40',
      body: 'text-cyan-100 bg-cyan-950/15 px-2.5 py-1.5 font-medium',
    }
  }
  return {
    tier: 'small' as const,
    card: 'live-chat-donation live-chat-donation--small border border-emerald-400/35 bg-slate-950/80 shadow-sm',
    header: 'bg-gradient-to-r from-emerald-950/70 via-slate-900/60 to-teal-950/65 border-b border-emerald-400/25 px-2.5 py-1',
    accentBar: 'bg-emerald-400',
    handle: 'text-emerald-200 font-bold',
    badge: 'bg-emerald-500/25 text-emerald-100 font-bold border border-emerald-400/30',
    body: 'text-emerald-100/90 bg-emerald-950/10 px-2.5 py-1.5 font-medium',
  }
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

function formatSystemFeedText(event: DayEvent, locale: Locale, t: (key: string) => string): string {
  if (event.type === 'viewers' && event.amount > 0) {
    const name = event.creatorName || ''
    const tmpl = t('feed.viewersGained') || '📈 {count} viewers gained! ({name})'
    return tmpl.replace('{count}', String(event.amount)).replace('{name}', name)
  }

  if (event.id.startsWith('trend-evt-') || event.text.includes('주간 대세 트렌드') || event.text.includes('trend')) {
    let typeName = ''
    if (event.text.includes('섹시') || event.id.includes('sexy')) typeName = t('creator.typeSexy') || 'Sexy'
    else if (event.text.includes('기품') || event.id.includes('elegance')) typeName = t('creator.typeElegance') || 'Elegance'
    else if (event.text.includes('소통') || event.id.includes('communication')) typeName = t('creator.typeCommunication') || 'Communication'
    else if (event.text.includes('퍼포먼스') || event.id.includes('performance')) typeName = t('creator.typePerformance') || 'Performance'
    else typeName = 'Popular'

    const lang = chatLangOf(locale)
    switch (lang) {
      case 'ko':
        return `🔥 주간 대세 트렌드가 [${typeName}] 타입으로 변경되었습니다! (+35% 수익 보너스)`
      case 'ja':
        return `🔥 今週のトレンドが [${typeName}] タイプに変更されました! (+35% 収益ボーナス)`
      case 'zh':
        return `🔥 本周热门趋势已更新为 [${typeName}] 类型！(+35% 收益加成)`
      case 'es':
        return `🔥 ¡La tendencia semanal cambió al tipo [${typeName}]! (+35% bonificación)`
      case 'de':
        return `🔥 Wöchentlicher Trend geändert auf [${typeName}]! (+35% Einnahmenbonus)`
      case 'ru':
        return `🔥 Тренды недели сменились на тип [${typeName}]! (+35% бонус доходности)`
      case 'en':
      default:
        return `🔥 Weekly trend updated to [${typeName}] type! (+35% revenue bonus)`
    }
  }

  if (event.type === 'toxic' || event.text.includes('방송 피로 급증') || event.text.includes('fatigue')) {
    const name = event.creatorName || ''
    const drop = event.amount > 0 ? event.amount : (event.text.match(/\d+/)?.[0] || '20')
    const lang = chatLangOf(locale)
    switch (lang) {
      case 'ko':
        return `${name} 방송 피로 급증! 컨디션 -${drop} 급락!`
      case 'ja':
        return `${name} 配信疲労急増！コンディション -${drop} 急降下!`
      case 'zh':
        return `${name} 直播疲劳暴增！状态 -${drop}！`
      case 'es':
        return `¡Fatiga de transmisión de ${name}! ¡Condición -${drop}! `
      case 'de':
        return `Streaming-Ermüdung bei ${name}! Kondition -${drop}!`
      case 'ru':
        return `Усталость стрима у ${name}! Состояние -${drop}!`
      case 'en':
      default:
        return `${name} broadcast fatigue spike! Condition -${drop}!`
    }
  }

  if (event.text.includes('프로덕션 보너스') || event.text.includes('보너스!')) {
    const lang = chatLangOf(locale)
    if (lang !== 'ko') {
      return event.text
        .replace('프로덕션 보너스!', 'Production Bonus!')
        .replace('시청자', 'Viewers')
        .replace('수익 증가', 'Revenue Boost')
        .replace('보너스!', 'Bonus!')
    }
  }

  return event.text
}

/** 스크롤로 전체 피드를 밀어 올림 — 캐릭터 늘어도 줄마다 layout thrash 없음 */
function LiveChatFeed({
  liveEvents,
  ownedById = {},
}: {
  liveEvents: DayEvent[]
  ownedById?: Record<string, OwnedCreator>
}) {
  const { t, locale } = useTranslation()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stickBottomRef = useRef(true)
  const prevNewestIdRef = useRef<string | null>(null)
  const visible = liveEvents.slice(0, 18)
  const newestId = visible[0]?.id ?? null
  const ordered = useMemo(
    () => [...liveEvents.slice(0, 18)].reverse(),
    [liveEvents],
  )

  const onScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    stickBottomRef.current = dist < 48
  }

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const isNew = newestId != null && newestId !== prevNewestIdRef.current
    prevNewestIdRef.current = newestId
    if (!isNew || !stickBottomRef.current) return

    el.scrollTop = el.scrollHeight
  }, [newestId, ordered.length])

  if (ordered.length === 0) return null

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="live-chat-scroller mt-2 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-0.5"
    >
      <ul className="live-chat-list flex min-h-full flex-col justify-end gap-1.5">
        <AnimatePresence initial={false}>
          {ordered.map((event) => {
            const isDonation = event.type === 'donation' && event.amount > 0
            const isUserChat = Boolean(event.userId)

            if (isDonation) {
              const handle = event.userId || '@user_fan'
              const tone = donationChatTone(event.amount, event.superDonation)
              const isSuper = Boolean(event.superDonation) || tone.tier === 'mega'
              const userBadge = getChatUserBadge(handle)
              const creator = event.creatorId ? ownedById[event.creatorId] : undefined
              const creatorName = creator ? characterDisplayName(creator, locale) : (event.creatorName || 'Creator')
              const donationText = formatChatDonationText(creatorName, event.amount, locale)

              return (
                <motion.li
                  key={event.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: { type: 'spring', stiffness: 450, damping: 32 },
                    opacity: { duration: 0.18 },
                    y: { duration: 0.18, ease: 'easeOut' },
                  }}
                  className={`live-chat-row relative overflow-hidden rounded-xl text-xs shrink-0 ${tone.card}${
                    isSuper ? ' is-super' : ''
                  }`}
                >
                  <div className={`h-0.5 w-full ${tone.accentBar}`} />

                  {isSuper ? (
                    <span className="live-chat-donation-burst" aria-hidden>
                      {Array.from({ length: 6 }, (_, i) => (
                        <span
                          key={i}
                          className="live-chat-donation-spark"
                          style={{ '--i': String(i) } as CSSProperties}
                        />
                      ))}
                    </span>
                  ) : null}

                  <div className={`relative z-[1] flex items-center justify-between gap-1.5 ${tone.header}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {userBadge}
                      <span className={`truncate text-[11px] ${tone.handle}`}>
                        {handle}
                      </span>
                      {isSuper ? (
                        <span className="rounded bg-fuchsia-500/30 px-1 py-0.2 text-[8px] font-black tracking-wider text-fuchsia-200 border border-fuchsia-300/40">
                          SUPER CHAT
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${tone.badge}`}
                    >
                      <span>💰</span> ${event.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className={`relative z-[1] ${tone.body}`}>
                    <p className="text-[11px] leading-snug">
                      {donationText}
                    </p>
                  </div>
                </motion.li>
              )
            }

            if (isUserChat) {
              const userColorClass = getChatUserColor(event.userId || '')
              const userBadge = getChatUserBadge(event.userId || '')
              const chatText = translateUserChatLine(event.text, locale)
              return (
                <motion.li
                  key={event.id}
                  layout="position"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    layout: { type: 'spring', stiffness: 450, damping: 32 },
                    opacity: { duration: 0.12 },
                    y: { duration: 0.12, ease: 'easeOut' },
                  }}
                  className="live-chat-row flex shrink-0 items-start gap-1.5 rounded px-2 py-0.5 text-xs transition-colors hover:bg-white/[0.04]"
                >
                  {userBadge}
                  <span className={`shrink-0 text-[11px] ${userColorClass}`}>
                    {event.userId}
                    <span className="text-slate-500 font-normal ml-0.5">:</span>
                  </span>
                  <span className="break-all text-[11px] leading-relaxed text-slate-100">{chatText}</span>
                </motion.li>
              )
            }

            const systemText = formatSystemFeedText(event, locale, t)
            return (
              <motion.li
                key={event.id}
                layout="position"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  layout: { type: 'spring', stiffness: 450, damping: 32 },
                  opacity: { duration: 0.12 },
                  y: { duration: 0.12, ease: 'easeOut' },
                }}
                className="live-chat-row flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-gradient-to-r from-slate-900/90 via-cyan-950/40 to-slate-900/90 px-2.5 py-1 text-xs text-cyan-200 shadow-sm"
              >
                <span className="rounded bg-cyan-500/20 px-1 py-0.2 text-[9px] font-extrabold text-cyan-300 border border-cyan-400/30">
                  SYSTEM
                </span>
                <span className="break-all text-[11px] font-medium leading-tight text-slate-200">
                  {systemText}
                </span>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </div>
  )
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
  weeklyTrendType: _weeklyTrendType,
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
  const ownedById = useMemo(() => {
    const map: Record<string, OwnedCreator> = {}
    for (const creator of ownedCreators) {
      map[creator.id] = creator
    }
    return map
  }, [ownedCreators])
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
    setRevenueBursts((prev) =>
      [
        ...prev,
        ...fresh.map((event) => ({
          id: event.id,
          creatorId: event.creatorId,
          amount: event.amount,
          tier: event.superDonation ? ('mega' as const) : revenueBurstTier(event.amount),
        })),
      ].slice(-3),
    )
  }, [liveEvents, isLive])

  const dismissBurst = useCallback((id: string) => {
    setRevenueBursts((prev) => prev.filter((burst) => burst.id !== id))
  }, [])

  const slots = useMemo(() => {
    return studioSlots.map((slot) => {
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
      )
    })
  }, [
    studioSlots,
    ownedById,
    broadcastPhase,
    locale,
    livePlayVideoByCreator,
    liveWeekProgress,
    liveStaminaDrainByCreatorId,
    liveConditionDrainByCreatorId,
  ])
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
        <section className="game-panel flex min-h-[16rem] sm:min-h-[20rem] flex-col rounded-2xl p-3 lg:min-h-0 lg:flex-[1.6] overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 pb-1.5 border-b border-white/10">
            <h2 className="game-stat-label flex items-center gap-1.5 text-xs font-bold tracking-wider text-pink-400">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t('dashboard.recentEvents')}
            </h2>
            <span className="text-[10px] font-mono text-slate-400">MAX 18</span>
          </div>
          {liveEvents.length === 0 ? (
            <p className="mt-4 text-center text-xs text-slate-500">{t('dashboard.noEvents')}</p>
          ) : (
            <LiveChatFeed liveEvents={liveEvents} ownedById={ownedById} />
          )}
        </section>

        <section className={`game-panel live-rank-panel flex min-h-[12rem] sm:min-h-[14rem] lg:min-h-0 lg:flex-[0.8] flex-col rounded-2xl p-3 ${isLive ? 'is-live' : ''}`}>
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
              {Array.from({ length: 2 }, (_, i) => (
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

const StreamCard = memo(function StreamCard({
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
            preload="metadata"
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
                      feedOff ? (gearBroken ? 'bg-amber-400' : 'bg-rose-400') : 'bg-pink-500 live-dot-static'
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
                    <div className="live-audio-wave ml-1" aria-hidden>
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
})

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
