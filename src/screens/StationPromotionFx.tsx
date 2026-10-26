import { useRef, type CSSProperties } from 'react'
import { useTranslation } from '../locales/i18n'

type StationPromotionFxProps = {
  fromLabel: string
  toLabel: string
  fromRank: number
  toRank: number
  onDone: () => void
}

const SPARK_COLORS = ['#fbbf24', '#fde68a', '#fb923c', '#f472b6', '#a5f3fc', '#6ee7b7']

function sparkStyle(index: number): CSSProperties {
  const angle = (index / 18) * 360
  const dist = 110 + (index % 5) * 34
  return {
    '--sa': `${angle}deg`,
    '--dist': `${dist}px`,
    '--sd': `${(index % 7) * 0.07}s`,
    '--c': SPARK_COLORS[index % SPARK_COLORS.length]!,
  } as CSSProperties
}

export function StationPromotionFx({
  fromLabel,
  toLabel,
  fromRank,
  toRank,
  onDone,
}: StationPromotionFxProps) {
  const { t } = useTranslation()
  const doneRef = useRef(false)
  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  return (
    <div
      className="station-promotion-fx cursor-pointer"
      role="dialog"
      aria-live="assertive"
      onClick={finish}
    >
      <div className="station-promotion-sparks" aria-hidden>
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={sparkStyle(i)} />
        ))}
      </div>
      <div
        className="station-promotion-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1">
          <p className="station-promotion-kicker">{t('station.reviewKicker')}</p>
        </div>
        <h2 className="station-promotion-title">{t('station.reviewPass')}</h2>
        <div className="station-promotion-grades">
          <span className="station-promotion-from">{fromLabel}</span>
          <span className="station-promotion-arrow">→</span>
          <span className="station-promotion-to">{toLabel}</span>
        </div>
        <p className="station-promotion-rank">
          {fromRank}
          {t('ranking.rankUnit')} → {toRank}
          {t('ranking.rankUnit')}
        </p>
        <button
          type="button"
          onClick={finish}
          className="mt-5 w-full cursor-pointer rounded-xl border-2 border-yellow-200 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.45)] transition hover:brightness-110"
        >
          {t('station.confirm')}
        </button>
      </div>
    </div>
  )
}
