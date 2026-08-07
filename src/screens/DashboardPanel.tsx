import type { ReactNode } from 'react'
import { creatorVisuals, type StudioSlot } from '../game/studioSlots'

type DashboardPanelProps = {
  slots: StudioSlot[]
  onStartBroadcast: () => void
}

type StreamCreatorView = {
  name: string
  concept: string
  avatar: string
  avatarTone: string
  stamina: number
  staminaMax: number
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

function toBroadcastSlot(slot: StudioSlot): BroadcastSlotView {
  const streamLabel = `STREAM ${String(slot.index).padStart(2, '0')}`
  if (slot.status !== 'assigned' || !slot.assignment) {
    return {
      id: slot.id,
      label: streamLabel,
      status: slot.status === 'locked' ? 'locked' : 'empty',
    }
  }

  const visuals = creatorVisuals(slot.assignment.creatorId, slot.assignment.creatorName)
  const staminaMax = 100
  const stamina = Math.min(staminaMax, 40 + slot.assignment.popularity)

  return {
    id: slot.id,
    label: streamLabel,
    status: 'assigned',
    creator: {
      name: slot.assignment.creatorName,
      concept: slot.assignment.grade,
      avatar: visuals.avatar,
      avatarTone: visuals.avatarTone,
      stamina,
      staminaMax,
      viewers: '—',
      live: false,
      preview: visuals.preview,
    },
  }
}

const EVENTS: Array<{ time: string; text: string; tone: string }> = []

function formatRevenue(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`
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

const STATUS_BADGE: Record<StudioSlot['status'], { label: string; className: string }> = {
  empty: {
    label: '미배정',
    className: 'border-slate-400/30 bg-slate-500/15 text-slate-300',
  },
  locked: {
    label: '잠금',
    className: 'border-white/10 bg-black/40 text-slate-500',
  },
  assigned: {
    label: '배정',
    className: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-300',
  },
}

export function DashboardPanel({ slots: studioSlots, onStartBroadcast }: DashboardPanelProps) {
  const slots = studioSlots.map(toBroadcastSlot)
  const assigned = studioSlots.filter((slot) => slot.status === 'assigned' && slot.assignment)
  const hasAssigned = assigned.length > 0

  const liveRanking = assigned
    .map((slot, index) => {
      const a = slot.assignment!
      const visuals = creatorVisuals(a.creatorId, a.creatorName)
      return {
        id: a.creatorId,
        rank: index + 1,
        name: a.creatorName,
        concept: a.grade,
        avatar: visuals.avatar,
        avatarTone: visuals.avatarTone,
        revenue: a.popularity * 1000,
        viewers: '—',
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .map((row, index) => ({ ...row, rank: index + 1 }))

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,22%)] xl:grid-cols-[minmax(0,1fr)_minmax(15rem,20%)] 2xl:grid-cols-[minmax(0,1fr)_minmax(16rem,18%)]">
      <section className="grid min-h-0 content-start grid-cols-1 gap-2.5 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <StreamCard key={slot.id} slot={slot} />
        ))}
      </section>

      <aside className="flex min-h-0 flex-col gap-2.5 lg:h-full lg:overflow-hidden">
        <section className="game-panel flex max-h-48 min-h-0 flex-col rounded-2xl p-3 lg:max-h-none lg:flex-1">
          <h2 className="game-stat-label shrink-0">Recent Events</h2>
          {EVENTS.length === 0 ? (
            <p className="mt-4 text-center text-xs text-slate-500">아직 발생한 이벤트가 없습니다.</p>
          ) : (
            <ul className="mt-2.5 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
              {EVENTS.map((event) => (
                <li
                  key={`${event.time}-${event.text}`}
                  className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/20 px-2.5 py-2 text-xs text-slate-300"
                >
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${event.tone}`} />
                  <div className="min-w-0">
                    <span className="mr-1.5 font-semibold text-slate-500">{event.time}</span>
                    <span>{event.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="game-panel flex max-h-64 min-h-0 shrink-0 flex-col rounded-2xl p-3 lg:max-h-[40%]">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h2 className="game-stat-label">Live Broadcast Rank</h2>
            {hasAssigned ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                <span className="game-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                READY
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                OFF
              </span>
            )}
          </div>
          {liveRanking.length === 0 ? (
            <p className="mt-4 text-center text-xs text-slate-500">
              스튜디오에서 배정된 방송이 없습니다.
            </p>
          ) : (
            <ul className="mt-2.5 min-h-0 flex-1 space-y-1.5 overflow-auto pr-0.5">
              {liveRanking.map((creator) => (
                <li
                  key={creator.id}
                  className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-2 py-1.5"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-black ${
                      RANK_BADGE[creator.rank] ?? 'border-white/10 bg-black/30 text-slate-400'
                    }`}
                  >
                    {creator.rank}
                  </span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-slate-950 ${creator.avatarTone}`}
                  >
                    {creator.avatar.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-100">
                      {creator.name}
                      <span className="ml-1 font-medium text-amber-400/90">({creator.concept})</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">스튜디오 배치</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold tracking-wide text-slate-500">인기</p>
                    <p className="text-xs font-bold tabular-nums text-amber-400">
                      {formatRevenue(creator.revenue)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button
          type="button"
          onClick={onStartBroadcast}
          disabled={!hasAssigned}
          className="game-btn-primary mt-auto w-full shrink-0 rounded-2xl px-4 py-3 text-sm font-bold tracking-wide disabled:cursor-not-allowed disabled:opacity-40 sm:py-3.5 sm:text-[15px]"
        >
          ▶ 방송시작
        </button>
      </aside>
    </div>
  )
}

function StreamCard({ slot }: { slot: BroadcastSlotView }) {
  const badge = STATUS_BADGE[slot.status]
  const creator = slot.creator
  const staminaPct =
    creator && creator.staminaMax > 0
      ? Math.max(0, Math.min(100, (creator.stamina / creator.staminaMax) * 100))
      : 0

  if (slot.status === 'locked') {
    return (
      <article className="game-panel flex flex-col overflow-hidden rounded-2xl opacity-70">
        <div className="relative aspect-video w-full shrink-0 bg-gradient-to-br from-slate-800/50 via-slate-900 to-slate-950">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_8px,rgba(255,255,255,0.02)_8px,rgba(255,255,255,0.02)_16px)]" />
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
            <span className="rounded-md border border-white/10 bg-black/45 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-slate-400 backdrop-blur-sm">
              {slot.label}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <IconLock />
            <p className="text-xs font-semibold tracking-wide text-slate-500">슬롯 잠김</p>
          </div>
        </div>

        <div className="shrink-0 space-y-2 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 text-slate-600">
              <IconLockSmall />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-500">잠금된 방송 슬롯</p>
              <p className="mt-0.5 text-[10px] text-slate-600">해금 후 사용할 수 있습니다</p>
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
      <article className="game-panel flex flex-col overflow-hidden rounded-2xl">
        <div className="relative aspect-video w-full shrink-0 bg-gradient-to-br from-slate-700/35 via-slate-900 to-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.12),transparent_55%)]" />
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
            <span className="rounded-md border border-white/10 bg-black/45 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-slate-200 backdrop-blur-sm">
              {slot.label}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <p className="text-sm font-semibold tracking-wide text-slate-300">비어 있음</p>
            <p className="text-[11px] text-slate-500">스튜디오에서 배치하세요</p>
          </div>
        </div>

        <div className="shrink-0 space-y-2 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 bg-black/25 text-sm font-bold text-slate-500">
              ＋
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-400">미배정 슬롯</p>
              <p className="mt-0.5 text-[10px] text-slate-600">스튜디오 배치와 연동</p>
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

  return (
    <article className="game-panel flex flex-col overflow-hidden rounded-2xl">
      <div
        className={`relative aspect-video w-full shrink-0 bg-gradient-to-br ${creator?.preview ?? 'from-slate-700/40 via-slate-900 to-slate-950'}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/90 to-transparent" />

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
          <span className="rounded-md border border-white/10 bg-black/45 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-slate-200 backdrop-blur-sm">
            {slot.label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
              {badge.label}
            </span>
            {creator?.live ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-300">
                <span className="game-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                LIVE
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                IDLE
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 space-y-2 p-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-slate-950 ${creator?.avatarTone ?? 'from-slate-500 to-slate-700'}`}
          >
            {(creator?.avatar ?? '?').slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-xs font-semibold text-slate-100">
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
          <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-400">
            <IconEye />
            {creator?.viewers ?? '—'}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="font-semibold tracking-wide text-slate-400">Stamina</span>
            <span className="font-semibold text-cyan-300">
              {creator ? `${creator.stamina}/${creator.staminaMax}` : '—'}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300"
              style={{ width: `${staminaPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1">
          <StreamAction label="배정" icon={<IconAssign />} disabled />
          <StreamAction label="훈련" icon={<IconTrain />} />
          <StreamAction label="통계" icon={<IconStats />} />
          <StreamAction label="설정" icon={<IconGear />} />
        </div>
      </div>
    </article>
  )
}

function StreamAction({
  label,
  icon,
  disabled = false,
}: {
  label: string
  icon: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
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
