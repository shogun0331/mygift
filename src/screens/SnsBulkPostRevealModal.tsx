import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BulkSnsRevealEntry } from '../game/sns'
import { resolveMediaSrc } from '../game/mediaUrl'
import { useTranslation } from '../locales/i18n'
import { SnsMediaWithBlur } from './SnsMediaWithBlur'

type SnsBulkPostRevealModalProps = {
  entries: BulkSnsRevealEntry[]
  onDone: () => void
}

function snsHandle(name: string) {
  const compact = name.replace(/\s+/g, '')
  return compact ? `@${compact}` : '@creator'
}

function Face({
  name,
  imageUrl,
}: {
  name: string
  imageUrl?: string | null
}) {
  if (imageUrl) {
    return (
      <img
        src={resolveMediaSrc(imageUrl)}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-black/60"
      />
    )
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/80 text-xs font-bold text-white ring-2 ring-black/60">
      {name.slice(0, 1)}
    </div>
  )
}

export function SnsBulkPostRevealModal({ entries, onDone }: SnsBulkPostRevealModalProps) {
  const { t } = useTranslation()
  const [visibleCount, setVisibleCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  const intervalMs = useMemo(() => {
    const count = entries.length
    if (count <= 1) return 520
    return Math.min(360, Math.max(140, Math.round(2800 / count)))
  }, [entries.length])

  const progress = entries.length > 0 ? visibleCount / entries.length : 1
  const visible = entries.slice(0, visibleCount)

  useEffect(() => {
    startedRef.current = true
    const kick = window.setTimeout(() => setVisibleCount(1), 120)
    return () => window.clearTimeout(kick)
  }, [])

  useEffect(() => {
    if (!startedRef.current) return
    if (visibleCount >= entries.length) {
      if (entries.length === 0) {
        onDone()
        return
      }
      setFinished(true)
      return
    }
    const timer = window.setTimeout(() => setVisibleCount((count) => count + 1), intervalMs)
    return () => window.clearTimeout(timer)
  }, [visibleCount, entries.length, intervalMs, onDone])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    requestAnimationFrame(() => {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
    })
  }, [visibleCount])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (finished) onDone()
      else {
        setVisibleCount(entries.length)
        setFinished(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finished, onDone, entries.length])

  function skip() {
    setVisibleCount(entries.length)
    setFinished(true)
  }

  if (entries.length === 0) return null

  return createPortal(
    <div className="sns-bulk-reveal-overlay fixed inset-0 z-[93] flex items-center justify-center bg-black/84 p-4 backdrop-blur-[6px]">
      <div
        className="sns-bulk-reveal-phone relative flex h-[min(88dvh,42rem)] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-[2rem] p-[0.65rem] shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
        style={{
          background:
            'linear-gradient(165deg, #3a3f4d 0%, #1a1d26 38%, #0d0f14 100%)',
          boxShadow:
            '0 28px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.5)',
        }}
      >
        <div className="absolute left-1/2 top-[0.38rem] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-slate-700 ring-1 ring-black/40" />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.55rem] bg-[#070b12]">
          <header className="shrink-0 border-b border-white/8 px-4 pb-3 pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="game-kicker text-[10px]">SNS</p>
                <h2 className="truncate text-sm font-bold text-slate-100">
                  {finished ? t('sns.bulkRevealDoneTitle') : t('sns.bulkRevealTitle')}
                </h2>
              </div>
              {!finished ? (
                <span className="sns-bulk-reveal-live inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-400/35 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-rose-200">
                  <span className="sns-bulk-reveal-live-dot h-1.5 w-1.5 rounded-full bg-rose-400" />
                  LIVE
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                  OK
                </span>
              )}
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="sns-bulk-reveal-progress h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-300 to-amber-300 transition-[width] duration-300 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-right text-[10px] tabular-nums text-slate-500">
              {visibleCount}/{entries.length}
            </p>
          </header>

          <div ref={scrollRef} className="sns-bulk-reveal-feed relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
            <div className="sns-bulk-reveal-list px-3 py-2">
              {visible.map((entry, index) => (
                <article
                  key={`${entry.creatorId}-${entry.postId}`}
                  className="sns-bulk-reveal-card border-b border-white/8 py-3 last:border-b-0"
                  style={{ animationDelay: `${Math.min(index * 20, 120)}ms` }}
                >
                  <div className="flex gap-2.5">
                    <Face name={entry.displayName} imageUrl={entry.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-[12px] font-bold text-white">{entry.displayName}</span>
                        <span className="text-[10px] text-slate-500">{snsHandle(entry.displayName)}</span>
                        <span className="sns-bulk-reveal-badge text-[10px] font-semibold text-amber-300">
                          · {t('sns.pending')}
                        </span>
                      </div>
                      {entry.caption ? (
                        <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-200">
                          {entry.caption}
                        </p>
                      ) : null}
                      {entry.media ? (
                        <div className="sns-bulk-reveal-media mt-2 w-[72%] overflow-hidden rounded-xl border border-white/10 bg-black/30">
                          <SnsMediaWithBlur
                            url={entry.media.url}
                            kind={entry.media.kind}
                            regions={entry.blurRegions}
                            className="overflow-hidden rounded-xl"
                            mediaClassName="block max-h-28 w-full object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <footer className="shrink-0 border-t border-white/8 bg-[#080c16] px-3 py-2.5">
            {finished ? (
              <button
                type="button"
                onClick={onDone}
                className="game-btn game-btn-primary w-full rounded-full py-2.5 text-[13px] font-bold"
              >
                {t('sns.bulkRevealDone').replace('{count}', String(entries.length))}
              </button>
            ) : (
              <button
                type="button"
                onClick={skip}
                className="game-btn w-full rounded-full py-2.5 text-[13px] font-semibold text-slate-300"
              >
                {t('sns.bulkRevealSkip')}
              </button>
            )}
            <div className="mx-auto mt-2 h-1 w-20 rounded-full bg-white/18" />
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  )
}
