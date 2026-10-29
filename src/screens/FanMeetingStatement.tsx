import { useEffect, useState } from 'react'
import { formatMoneySigned } from '../game/money'
import { localizeVipRewardText } from '../game/vip'
import { useTranslation } from '../locales/i18n'

type FanMeetingStatementProps = {
  fanCount: number
  pay: number
  rewardText: string
  title?: string
  bodyText?: string
  hideIncome?: boolean
  note?: string
  confirmLabel: string
  onConfirm: () => void
  zClass?: string
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useCountTo(target: number, delayMs: number, durationMs = 640) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    setValue(0)
    let raf = 0
    let startedAt: number | null = null
    const wait = window.setTimeout(() => {
      const tick = (now: number) => {
        if (startedAt == null) startedAt = now
        const t = Math.min(1, (now - startedAt) / durationMs)
        const eased = 1 - (1 - t) ** 3
        setValue(Math.round(target * eased))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delayMs)
    return () => {
      window.clearTimeout(wait)
      cancelAnimationFrame(raf)
    }
  }, [target, delayMs, durationMs])
  return value
}

export function FanMeetingStatement({
  fanCount,
  pay,
  rewardText,
  title,
  bodyText,
  hideIncome = false,
  note,
  confirmLabel,
  onConfirm,
  zClass = 'z-[87]',
}: FanMeetingStatementProps) {
  const { t } = useTranslation()
  const countedPay = useCountTo(Math.max(0, pay), 180, 1100)
  const localizedReward = localizeVipRewardText(rewardText, t)

  return (
    <div
      className={`statement-overlay fixed inset-0 ${zClass} flex items-center justify-center bg-black/78 p-4 backdrop-blur-[4px]`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fan-meeting-statement-title"
    >
      <div className="statement-sheet w-full max-w-xl overflow-hidden rounded-2xl">
        <div className="statement-inner px-5 py-5 sm:px-7 sm:py-6">
          <header className="statement-header border-b border-white/8 pb-4">
            <p className="statement-gold-label">{t('vip.visitResultKicker')}</p>
            <h2
              id="fan-meeting-statement-title"
              className="mt-1.5 text-xl font-bold tracking-tight text-slate-100 sm:text-2xl"
            >
              {title ?? t('vip.visitResultTitle')}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {bodyText ?? t('vip.visitResultBody').replace('{count}', String(fanCount))}
            </p>
          </header>

          {localizedReward ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-200">
              <span className="game-stat-label mr-2">{t('vip.visitReward')}</span>
              {localizedReward}
            </p>
          ) : null}

          <footer className="statement-footer mt-4 border-t border-white/8 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              {hideIncome ? <div /> : (
              <div>
                <p className="game-stat-label">{t('vip.visitResultIncome')}</p>
                <p className="statement-amt-pos mt-1 text-3xl font-black tabular-nums tracking-tight text-amber-200 drop-shadow-[0_0_16px_rgba(251,191,36,0.65)] sm:text-5xl">
                  {formatMoneySigned(countedPay)}
                </p>
              </div>
              )}
              <button
                type="button"
                onClick={onConfirm}
                className="game-btn game-btn-primary min-w-[148px] px-6 py-2.5 text-sm"
              >
                {confirmLabel}
              </button>
            </div>
            {note ? <p className="mt-3 text-[11px] text-slate-500">{note}</p> : null}
          </footer>
        </div>
      </div>
    </div>
  )
}
