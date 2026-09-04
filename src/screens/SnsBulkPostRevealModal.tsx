import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BulkSnsRevealEntry } from '../game/sns'
import { playSfx } from '../game/uiSfx'
import { resolveMediaSrc } from '../game/mediaUrl'
import { useTranslation } from '../locales/i18n'
import { SnsMediaLightbox, SnsMediaWithBlur } from './SnsMediaWithBlur'

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
  const [heat3Burst, setHeat3Burst] = useState<{ name: string; key: number } | null>(null)
  const [heat3CardKey, setHeat3CardKey] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{
    url: string
    kind: 'image' | 'video'
    regions?: import('../events/types').BlurRegion[]
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const heat3SeenRef = useRef(new Set<string>())

  const intervalMs = useMemo(() => {
    const count = entries.length
    if (count <= 1) return 520
    return Math.min(360, Math.max(140, Math.round(2800 / count)))
  }, [entries.length])

  const progress = entries.length > 0 ? visibleCount / entries.length : 1
  const visible = entries.slice(0, visibleCount)

  useEffect(() => {
    startedRef.current = true
    heat3SeenRef.current = new Set()
    const kick = window.setTimeout(() => setVisibleCount(1), 120)
    return () => window.clearTimeout(kick)
  }, [])

  useEffect(() => {
    if (visibleCount <= 0) return
    const entry = entries[visibleCount - 1]
    if (!entry || entry.heat !== 3) return
    const key = `${entry.creatorId}-${entry.postId}`
    if (heat3SeenRef.current.has(key)) return
    heat3SeenRef.current.add(key)
    playSfx('sns-heat3')
    setHeat3CardKey(key)
    setHeat3Burst({ name: entry.displayName, key: Date.now() })
    const clearBurst = window.setTimeout(() => setHeat3Burst(null), 1500)
    const clearCard = window.setTimeout(() => setHeat3CardKey(null), 1800)
    return () => {
      window.clearTimeout(clearBurst)
      window.clearTimeout(clearCard)
    }
  }, [visibleCount, entries])

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
    const last = entries[visibleCount - 1]
    const wait = last?.heat === 3 ? Math.max(intervalMs + 1200, 1650) : intervalMs
    const timer = window.setTimeout(() => setVisibleCount((count) => count + 1), wait)
    return () => window.clearTimeout(timer)
  }, [visibleCount, entries, intervalMs, onDone])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return

    const scrollToBottom = () => {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
    }

    scrollToBottom()
    const rafId = requestAnimationFrame(scrollToBottom)
    const t1 = window.setTimeout(scrollToBottom, 50)
    const t2 = window.setTimeout(scrollToBottom, 150)
    const t3 = window.setTimeout(scrollToBottom, 350)
    const t4 = window.setTimeout(scrollToBottom, 700)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        scrollToBottom()
      })
      if (scroller.firstElementChild) {
        observer.observe(scroller.firstElementChild)
      } else {
        observer.observe(scroller)
      }
    }

    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
      if (observer) observer.disconnect()
    }
  }, [visibleCount])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (lightbox) {
        setLightbox(null)
        return
      }
      if (finished) onDone()
      else {
        setVisibleCount(entries.length)
        setFinished(true)
        setHeat3Burst(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finished, onDone, entries.length, lightbox])

  function skip() {
    setVisibleCount(entries.length)
    setFinished(true)
    setHeat3Burst(null)
  }

  if (entries.length === 0) return null

  return createPortal(
    <div className="sns-bulk-reveal-overlay fixed inset-0 z-[93] flex items-center justify-center bg-black/84 p-4 backdrop-blur-[6px]">
      <div
        className={`sns-bulk-reveal-phone relative flex h-[min(88dvh,42rem)] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-[2rem] p-[0.65rem] shadow-[0_28px_80px_rgba(0,0,0,0.55)] ${
          heat3Burst ? 'sns-bulk-reveal-phone--heat3' : ''
        }`}
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
              {visible.map((entry, index) => {
                const cardKey = `${entry.creatorId}-${entry.postId}`
                const isHeat3 = entry.heat === 3
                const isHot = heat3CardKey === cardKey
                return (
                  <article
                    key={cardKey}
                    className={`sns-bulk-reveal-card border-b border-white/8 py-3 last:border-b-0 ${
                      isHeat3 ? 'sns-bulk-reveal-card--heat3' : ''
                    } ${isHot ? 'is-heat3-hot' : ''}`}
                    style={{ animationDelay: `${Math.min(index * 20, 120)}ms` }}
                  >
                    <div className="flex gap-2.5">
                      <Face name={entry.displayName} imageUrl={entry.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-1.5">
                          <span className="text-[12px] font-bold text-white">{entry.displayName}</span>
                          <span className="text-[10px] text-slate-500">{snsHandle(entry.displayName)}</span>
                          {isHeat3 ? (
                            <span className="sns-heat3-ribbon rounded-full border border-fuchsia-400/45 bg-fuchsia-500/20 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-fuchsia-100">
                              {t('sns.heat3')}
                            </span>
                          ) : null}
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
                          <SnsMediaWithBlur
                            url={entry.media.url}
                            kind={entry.media.kind}
                            regions={entry.blurRegions}
                            objectFit="contain"
                            className={`sns-bulk-reveal-media mt-2 w-[72%] overflow-hidden rounded-xl border bg-black/30 ${
                              isHeat3
                                ? 'border-fuchsia-400/45 shadow-[0_0_18px_rgba(232,121,249,0.28)]'
                                : 'border-white/10'
                            }`}
                            mediaClassName="block max-h-28 w-full object-contain"
                            onClick={() =>
                              setLightbox({
                                url: entry.media!.url,
                                kind: entry.media!.kind,
                                regions: entry.blurRegions,
                              })
                            }
                          />
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })}
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

          {heat3Burst ? (
            <div key={heat3Burst.key} className="sns-heat3-burst sns-heat3-burst--bulk" aria-hidden>
              <div className="sns-heat3-burst-flash" />
              <div className="sns-heat3-burst-ring" />
              <div className="sns-heat3-burst-ring is-late" />
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className="sns-heat3-burst-spark"
                  style={{ ['--ang' as string]: `${i * 36}deg` }}
                />
              ))}
              <div className="sns-heat3-burst-copy">
                <p className="sns-heat3-burst-kicker">BREAKING</p>
                <p className="sns-heat3-burst-title">{t('sns.heat3')}</p>
                <p className="sns-heat3-burst-name">{heat3Burst.name}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {lightbox ? (
        <SnsMediaLightbox
          url={lightbox.url}
          kind={lightbox.kind}
          regions={lightbox.regions}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>,
    document.body,
  )
}
