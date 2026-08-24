import { useEffect, type CSSProperties } from 'react'
import { useTranslation } from '../locales/i18n'

type StationPromotionFxProps = {
  fromLabel: string
  toLabel: string
  fromRank: number
  toRank: number
  onDone: () => void
}

const FX_MS = 2600
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

  useEffect(() => {
    const timer = window.setTimeout(onDone, FX_MS)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return (
    <div className="station-promotion-fx" role="status" aria-live="assertive">
      <div className="station-promotion-sparks" aria-hidden>
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={sparkStyle(i)} />
        ))}
      </div>
      <div className="station-promotion-card">
        <p className="station-promotion-kicker">{t('station.reviewKicker')}</p>
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
      </div>
    </div>
  )
}
