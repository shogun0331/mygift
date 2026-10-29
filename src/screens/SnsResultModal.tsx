import { useEffect, useState } from 'react'
import { formatMoney } from '../game/money'
import type { SnsAdRevenueTier, SnsResult } from '../game/sns'
import { snsCommentText } from '../game/snsComments'
import { playSfx } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'
import { SnsMediaLightbox, SnsMediaWithBlur } from './SnsMediaWithBlur'

type SnsResultModalProps = {
  result: SnsResult
  onConfirm: () => void
}

function useCountUp(target: number, durationMs: number, delayMs = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const safeTarget = Math.max(0, Math.round(target) || 0)
    setValue(0)
    if (safeTarget <= 0) return
    let frame = 0
    let startAt = 0
    const delayTimer = window.setTimeout(() => {
      startAt = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - startAt) / durationMs)
        const eased = 1 - (1 - p) ** 3
        setValue(Math.round(safeTarget * eased))
        if (p < 1) frame = window.requestAnimationFrame(tick)
      }
      frame = window.requestAnimationFrame(tick)
    }, delayMs)
    return () => {
      window.clearTimeout(delayTimer)
      window.cancelAnimationFrame(frame)
    }
  }, [target, durationMs, delayMs])
  return value
}

function adTierLabelKey(tier: SnsAdRevenueTier | undefined): string {
  if (tier === 'jackpot') return 'sns.resultAdJackpot'
  if (tier === 'hit') return 'sns.resultAdHit'
  return 'sns.resultAdRevenueLabel'
}

const JACKPOT_BURST = [
  { emoji: '🪙', x: '-18%', y: '8%', delay: '0ms', rot: '-18deg' },
  { emoji: '✨', x: '12%', y: '-6%', delay: '40ms', rot: '12deg' },
  { emoji: '💰', x: '62%', y: '-10%', delay: '80ms', rot: '8deg' },
  { emoji: '💎', x: '78%', y: '18%', delay: '110ms', rot: '22deg' },
  { emoji: '🪙', x: '88%', y: '58%', delay: '150ms', rot: '-10deg' },
  { emoji: '✨', x: '48%', y: '78%', delay: '190ms', rot: '4deg' },
  { emoji: '💰', x: '8%', y: '70%', delay: '220ms', rot: '-24deg' },
  { emoji: '🪙', x: '34%', y: '-14%', delay: '260ms', rot: '16deg' },
] as const

export function SnsResultModal({ result, onConfirm }: SnsResultModalProps) {
  const { t, locale } = useTranslation()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [jackpotBurst, setJackpotBurst] = useState(false)
  const likes = useCountUp(result.likes, 1100)
  const adTarget = Math.max(0, Math.round(result.adRevenueWon ?? 0) || 0)
  const adTier = result.adRevenueTier ?? 'normal'
  const isJackpot = adTier === 'jackpot'
  const isHit = adTier === 'hit'
  const adDelayMs = 180
  const adDurationMs = isJackpot ? 820 : isHit ? 720 : 680
  const adShown = useCountUp(adTarget, adDurationMs, adDelayMs)
  const adDone = adTarget > 0 && adShown >= adTarget
  const subscribersTotal = Math.max(0, Math.round(result.snsSubscribersTotal ?? 0) || 0)
  const subscribersGained = Math.max(0, Math.round(result.snsSubscribersGained ?? 0) || 0)

  useEffect(() => {
    setJackpotBurst(false)
    if (adTarget <= 0) return
    let tickTimer = 0
    let finishTimer = 0
    let burstClear = 0
    const startTimer = window.setTimeout(() => {
      playSfx('live-donation', { gain: isJackpot ? 0.45 : 0.35 })
      if (isJackpot) setJackpotBurst(true)
      tickTimer = window.setInterval(() => {
        playSfx('ui-click', { gain: isJackpot ? 0.34 : 0.28 })
      }, isJackpot ? 55 : 70)
      finishTimer = window.setTimeout(() => {
        window.clearInterval(tickTimer)
        tickTimer = 0
        if (isJackpot) playSfx('rank-up', { gain: 0.7 })
        else if (isHit) playSfx('live-donation', { gain: 0.7 })
        else playSfx('live-donation', { gain: 0.55 })
        if (isJackpot) {
          burstClear = window.setTimeout(() => setJackpotBurst(false), 900)
        }
      }, adDurationMs)
    }, adDelayMs)
    return () => {
      window.clearTimeout(startTimer)
      window.clearTimeout(finishTimer)
      window.clearTimeout(burstClear)
      if (tickTimer) window.clearInterval(tickTimer)
    }
  }, [adTarget, adDelayMs, adDurationMs, isHit, isJackpot, result.postId])

  const viral = t('sns.resultViral', { viewers: result.viewersGained.toLocaleString() })

  const cardClass = isJackpot
    ? 'border-fuchsia-300/45 bg-gradient-to-r from-fuchsia-950/80 via-amber-950/55 to-rose-950/70 shadow-[inset_0_0_28px_rgba(232,121,249,0.16)]'
    : isHit
      ? 'border-amber-200/50 bg-gradient-to-r from-amber-950/80 via-orange-950/50 to-emerald-950/45 shadow-[inset_0_0_24px_rgba(251,191,36,0.14)]'
      : 'border-amber-300/35 bg-gradient-to-r from-amber-950/70 via-emerald-950/50 to-amber-950/40 shadow-[inset_0_0_24px_rgba(251,191,36,0.08)]'

  return (
    <div className="fixed inset-0 z-[87] flex flex-col items-center justify-center overflow-hidden bg-black/78 p-3 backdrop-blur-[3px] sm:p-4">
      {jackpotBurst ? (
        <div className="sns-ad-jackpot-flash pointer-events-none absolute inset-0" aria-hidden />
      ) : null}
      <div className="game-panel-strong relative flex max-h-full min-h-0 w-full max-w-md flex-col overflow-hidden rounded-2xl">
        {jackpotBurst ? (
          <div className="sns-ad-jackpot-burst pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
            {JACKPOT_BURST.map((spark, index) => (
              <span
                key={`${spark.emoji}-${index}`}
                className="sns-ad-jackpot-spark"
                style={{
                  left: spark.x,
                  top: spark.y,
                  animationDelay: spark.delay,
                  ['--spark-rot' as string]: spark.rot,
                }}
              >
                {spark.emoji}
              </span>
            ))}
          </div>
        ) : null}
        <div className="shrink-0 border-b border-white/10 px-5 py-3 text-center">
          <p className="text-[10px] font-semibold tracking-wide text-slate-500">SNS</p>
          <h2 className="mt-1 text-lg font-bold text-slate-100">{t('sns.resultTitle')}</h2>
          <p className="mt-1 text-sm text-slate-400">{result.creatorName}</p>
          {result.heat === 3 ? (
            <p className="sns-heat3-result mt-2 text-sm font-black tracking-wide text-fuchsia-200">
              {t('sns.heat3')}
            </p>
          ) : null}
        </div>
        {result.imageUrl && result.mediaKind ? (
          <SnsMediaWithBlur
            url={result.imageUrl}
            kind={result.mediaKind}
            regions={result.blurRegions}
            className="shrink-0 overflow-hidden bg-black/40"
            mediaClassName="mx-auto block max-h-[min(34dvh,280px)] w-full object-contain"
            onClick={() => setLightboxOpen(true)}
          />
        ) : null}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
          {result.caption ? <p className="text-sm text-slate-200">{result.caption}</p> : null}
          <p className="text-2xl font-black tabular-nums text-rose-300">
            ❤️ +{likes.toLocaleString()}
          </p>
          <ul className="space-y-1.5">
            {result.comments.map((comment) => (
              <li
                key={`${comment.userId}-${comment.heat}-${comment.line}-${comment.text}`}
                className="text-[13px] text-slate-400"
              >
                <span className="mr-1.5 font-semibold text-slate-200">@{comment.userId}</span>
                {snsCommentText(comment, locale)}
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-amber-200">{viral}</p>
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/30 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-300/80">
              {t('sns.subscribers')}
            </p>
            <p className="mt-0.5 text-[18px] font-black tabular-nums tracking-tight text-cyan-100">
              {subscribersTotal.toLocaleString()}
              {subscribersGained > 0 ? (
                <span className="ml-2 text-[13px] font-bold text-emerald-300">
                  (+{subscribersGained.toLocaleString()})
                </span>
              ) : null}
            </p>
          </div>
          {adTarget > 0 ? (
            <div
              className={`relative overflow-hidden rounded-xl border px-3.5 py-3 transition-transform duration-300 ${cardClass} ${
                adDone ? 'scale-[1.01]' : 'scale-100'
              } ${isJackpot && jackpotBurst ? 'sns-ad-jackpot-card' : ''}`}
            >
              <div className="pointer-events-none absolute -right-4 -top-6 h-16 w-16 rounded-full bg-amber-300/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-8 left-6 h-14 w-14 rounded-full bg-emerald-400/10 blur-2xl" />
              {isJackpot ? (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(232,121,249,0.22),transparent_55%)]" />
              ) : null}
              <div className="relative flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[22px] transition-transform duration-300 ${
                    isJackpot
                      ? 'border-fuchsia-200/40 bg-fuchsia-400/20 shadow-[0_0_20px_rgba(232,121,249,0.35)]'
                      : 'border-amber-200/30 bg-amber-400/15 shadow-[0_0_18px_rgba(251,191,36,0.22)]'
                  } ${adDone ? 'scale-110' : 'scale-100'}`}
                >
                  <span aria-hidden>🪙</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                      isJackpot ? 'text-fuchsia-200' : isHit ? 'text-amber-100' : 'text-amber-200/80'
                    }`}
                  >
                    {t(adTierLabelKey(adTier))}
                  </p>
                  <p
                    className={`mt-0.5 font-black leading-none tabular-nums tracking-tight ${
                      isJackpot ? 'text-[24px] text-fuchsia-100' : 'text-[22px] text-amber-100'
                    }`}
                  >
                    <span className={`mr-0.5 ${isJackpot ? 'text-fuchsia-300' : 'text-emerald-300'}`}>
                      +
                    </span>
                    {formatMoney(adShown)}
                  </p>
                </div>
                <span className="shrink-0 text-lg opacity-90" aria-hidden>
                  💰
                </span>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 justify-center border-t border-white/10 px-5 py-3">
          <button type="button" className="game-btn game-btn-primary min-w-[140px] py-2.5 text-sm" onClick={onConfirm}>
            {t('sns.close')}
          </button>
        </div>
      </div>
      {lightboxOpen && result.imageUrl && result.mediaKind ? (
        <SnsMediaLightbox
          url={result.imageUrl}
          kind={result.mediaKind}
          regions={result.blurRegions}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  )
}
