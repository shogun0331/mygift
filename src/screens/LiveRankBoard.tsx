import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatMoney } from '../game/money'
import { resolveMediaSrc } from '../game/mediaUrl'
import { useTranslation } from '../locales/i18n'

export type LiveRankRow = {
  id: string
  rank: number
  name: string
  concept: string
  avatar: string
  avatarTone: string
  profileImageUrl?: string | null
  revenue: number
  blocked?: boolean
  placed?: boolean
}

type RankDelta = 'up' | 'down'

const RANK_BADGE: Record<number, string> = {
  1: 'border-amber-400/40 bg-amber-400/15 text-amber-300',
  2: 'border-slate-300/35 bg-slate-300/10 text-slate-200',
  3: 'border-orange-400/35 bg-orange-400/10 text-orange-300',
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function RollingMoney({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)

  useEffect(() => {
    const from = shownRef.current
    if (from === value) return
    if (value === 0 || prefersReducedMotion()) {
      shownRef.current = value
      setShown(value)
      return
    }
    const delta = Math.abs(value - from)
    const duration = Math.min(920, 260 + Math.log10(delta + 1) * 220)
    let raf = 0
    let startedAt: number | null = null
    const tick = (now: number) => {
      if (startedAt == null) startedAt = now
      const t = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - (1 - t) ** 3
      const next = Math.round(from + (value - from) * eased)
      shownRef.current = next
      setShown(next)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <span className={className}>{formatMoney(shown)}</span>
}

function RankCrown() {
  return (
    <svg className="live-rank-crown" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 16.5 6.2 8.2 10 12.2 12 6.5l2 5.7 3.8-4 2.2 8.3H4Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path d="M5 18.2h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function RankConfetti({ seed }: { seed: string }) {
  const bits = useMemo(() => {
    const items: Array<{ id: number; x: number; delay: number; hue: number; rot: number }> = []
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    for (let i = 0; i < 12; i++) {
      hash = (hash * 1664525 + 1013904223) >>> 0
      const x = (hash % 1000) / 10
      hash = (hash * 1664525 + 1013904223) >>> 0
      const delay = (hash % 180) / 1000
      hash = (hash * 1664525 + 1013904223) >>> 0
      const hue = hash % 50
      hash = (hash * 1664525 + 1013904223) >>> 0
      const rot = (hash % 240) - 120
      items.push({ id: i, x, delay, hue, rot })
    }
    return items
  }, [seed])

  return (
    <div className="live-rank-confetti" aria-hidden>
      {bits.map((bit) => (
        <span
          key={bit.id}
          className="live-rank-confetti-bit"
          style={{
            left: `${bit.x}%`,
            animationDelay: `${bit.delay}s`,
            background:
              bit.hue < 18
                ? '#e8c872'
                : bit.hue < 34
                  ? '#f5e6a8'
                  : '#6bb89a',
            transform: `rotate(${bit.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}

export function LiveRankBoard({
  ranking,
  placeholders,
  jackpots,
}: {
  ranking: LiveRankRow[]
  placeholders: number
  jackpots: Array<{ id: string; creatorId: string }>
}) {
  const { t } = useTranslation()
  const rankingRef = useRef(ranking)
  rankingRef.current = ranking
  const rankSignature = ranking.map((row) => `${row.id}:${row.rank}`).join('|')
  const prevRankRef = useRef<Record<string, number>>({})
  const [deltaById, setDeltaById] = useState<Record<string, RankDelta>>({})
  const [riseIds, setRiseIds] = useState<Set<string>>(new Set())
  const [firstBurstId, setFirstBurstId] = useState<string | null>(null)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    const list = rankingRef.current
    const nextDelta: Record<string, RankDelta> = {}
    const rose = new Set<string>()
    let newFirst: string | null = null
    for (const row of list) {
      const prev = prevRankRef.current[row.id]
      if (prev != null && prev !== row.rank) {
        if (prev > row.rank) {
          nextDelta[row.id] = 'up'
          rose.add(row.id)
          if (row.rank === 1) newFirst = row.id
        } else {
          nextDelta[row.id] = 'down'
        }
      }
    }
    prevRankRef.current = Object.fromEntries(list.map((row) => [row.id, row.rank]))
    if (Object.keys(nextDelta).length === 0) return

    const timers: number[] = []
    setDeltaById((prev) => ({ ...prev, ...nextDelta }))
    if (rose.size > 0) {
      setRiseIds((prev) => new Set([...prev, ...rose]))
      timers.push(
        window.setTimeout(() => {
          setRiseIds((current) => {
            const next = new Set(current)
            for (const id of rose) next.delete(id)
            return next
          })
        }, 520),
      )
    }
    if (newFirst) {
      setFirstBurstId(newFirst)
      timers.push(
        window.setTimeout(() => {
          setFirstBurstId((current) => (current === newFirst ? null : current))
        }, 900),
      )
    }
    const clearIds = Object.keys(nextDelta)
    timers.push(
      window.setTimeout(() => {
        setDeltaById((current) => {
          const next = { ...current }
          for (const id of clearIds) delete next[id]
          return next
        })
      }, 2200),
    )
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [rankSignature])

  const layoutTransition = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.7 }

  return (
    <LayoutGroup>
      <ul className="mt-2.5 grid min-h-0 flex-1 auto-rows-fr grid-rows-6 gap-1 overflow-hidden pr-0.5">
        <AnimatePresence initial={false}>
          {ranking.map((creator) => {
            const delta = deltaById[creator.id]
            const isFirst = creator.rank === 1
            const jackpot = jackpots.find((burst) => burst.creatorId === creator.id)
            const innerClass = [
              'live-rank-card-inner',
              isFirst ? 'is-first' : '',
              riseIds.has(creator.id) ? 'is-rising' : '',
              jackpot ? 'is-jackpot' : '',
              firstBurstId === creator.id ? 'is-first-burst' : '',
              creator.blocked ? 'is-blocked' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <motion.li
                key={creator.id}
                layout
                initial={false}
                transition={{ layout: layoutTransition }}
                className="h-full min-h-0"
              >
                <div className={innerClass}>
                  {isFirst ? <span className="live-rank-gold-ring" aria-hidden /> : null}
                  {jackpot ? <RankConfetti seed={jackpot.id} /> : null}
                  <span className="live-rank-badge relative flex h-6 w-6 shrink-0 items-center justify-center">
                    {isFirst ? <RankCrown /> : null}
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-black ${
                        RANK_BADGE[creator.rank] ?? 'border-white/10 bg-black/30 text-slate-400'
                      }`}
                    >
                      {creator.rank}
                    </span>
                  </span>
                  {creator.profileImageUrl ? (
                    <img
                      src={resolveMediaSrc(creator.profileImageUrl)}
                      alt={creator.name}
                      className="h-7 w-7 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-slate-950 ${creator.avatarTone}`}
                    >
                      {creator.avatar.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-xs font-semibold leading-tight text-slate-100">
                      {creator.name}
                      <span className="ml-1 font-medium text-amber-400/90">({creator.concept})</span>
                    </p>
                    <p className="mt-0.5 text-[9px] leading-none text-slate-500">
                      {creator.blocked
                        ? t('dashboard.broadcastBlockedBadge')
                        : creator.placed
                          ? t('dashboard.studioPlaced')
                          : t('dashboard.yearRankHeld')}
                    </p>
                  </div>
                  {delta ? (
                    <span
                      className={`live-rank-delta ${delta === 'up' ? 'is-up' : 'is-down'}`}
                      aria-label={delta === 'up' ? t('dashboard.rankUp') : t('dashboard.rankDown')}
                    >
                      {delta === 'up' ? '▲' : '▼'}
                    </span>
                  ) : null}
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold tracking-wide text-slate-500">
                      {t('dashboard.rankRevenue')}
                    </p>
                    <RollingMoney
                      value={creator.revenue}
                      className="text-[11px] font-bold tabular-nums text-amber-400"
                    />
                  </div>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
        {Array.from({ length: placeholders }, (_, i) => (
          <li
            key={`rank-slot-${i}`}
            className="rounded-xl border border-dashed border-white/8 bg-black/10"
          />
        ))}
      </ul>
    </LayoutGroup>
  )
}
