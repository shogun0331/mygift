import { useEffect, useMemo, type CSSProperties } from 'react'
import { resolveMediaSrc } from '../game/mediaUrl'
import { playSfx } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'

/** VN 캐릭터 Reiko — 2026-10-19_00005 스탠딩 */
export const REIKO_VN_CHARACTER_ID = '1792369110889-p0l69g7'
export const REIKO_RANK_ONE_IMAGE_URL =
  'media://vn_characters/1792369110889-p0l69g7/images/1792375265395-3tl0dnj__2026-10-19_00005.webp'
export const REIKO_MEDIA_REVISION = 1792375268328

type RankOneEndingModalProps = {
  onConfirm: () => void
}

const SPARK_COLORS = ['#fbbf24', '#fde68a', '#fb923c', '#f472b6', '#a5f3fc', '#fef08a', '#ffffff']
const CONFETTI_COLORS = ['#fbbf24', '#f59e0b', '#f472b6', '#38bdf8', '#a3e635', '#e879f9', '#fde68a']

function sparkStyle(index: number): CSSProperties {
  const angle = (index / 24) * 360
  const dist = 140 + (index % 6) * 38
  return {
    '--sa': `${angle}deg`,
    '--dist': `${dist}px`,
    '--sd': `${(index % 8) * 0.06}s`,
    '--c': SPARK_COLORS[index % SPARK_COLORS.length]!,
  } as CSSProperties
}

function confettiStyle(index: number): CSSProperties {
  const left = ((index * 37) % 100) + (index % 3) * 0.4
  const delay = (index % 12) * 0.12
  const duration = 2.4 + (index % 5) * 0.35
  const size = 6 + (index % 5) * 2
  const rot = (index * 47) % 360
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size * (index % 2 === 0 ? 1.6 : 1)}px`,
    background: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    '--cr': `${rot}deg`,
  } as CSSProperties
}

/** 리그 1위 달성 시 1회 — Reiko가 엔딩/고백하기 해금 안내 */
export function RankOneEndingModal({ onConfirm }: RankOneEndingModalProps) {
  const { t } = useTranslation()
  const portraitSrc = useMemo(
    () => resolveMediaSrc(REIKO_RANK_ONE_IMAGE_URL, REIKO_MEDIA_REVISION),
    [],
  )

  useEffect(() => {
    playSfx('rank-up')
  }, [])

  return (
    <div
      className="rank-one-ending-fx"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rank-one-ending-title"
      aria-describedby="rank-one-ending-body"
    >
      <div className="rank-one-ending-glow" aria-hidden />
      <div className="rank-one-ending-sparks" aria-hidden>
        {Array.from({ length: 24 }, (_, i) => (
          <span key={`spark-${i}`} style={sparkStyle(i)} />
        ))}
      </div>
      <div className="rank-one-ending-confetti" aria-hidden>
        {Array.from({ length: 36 }, (_, i) => (
          <span key={`bit-${i}`} className="rank-one-ending-confetti-bit" style={confettiStyle(i)} />
        ))}
      </div>

      <div className="rank-one-ending-card">
        <div className="rank-one-ending-crown" aria-hidden>
          ♛
        </div>
        <p className="rank-one-ending-kicker">{t('ranking.rankOneEndingKicker')}</p>
        <p className="rank-one-ending-rankbadge">#1</p>

        <div className="rank-one-ending-layout">
          <div className="rank-one-ending-portrait">
            {portraitSrc ? (
              <img src={portraitSrc} alt="" className="h-full w-full object-cover object-top" draggable={false} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-amber-950 text-4xl font-black text-amber-200">
                R
              </div>
            )}
            <span className="rank-one-ending-namechip">Reiko</span>
          </div>

          <div className="rank-one-ending-copy">
            <h2 id="rank-one-ending-title" className="rank-one-ending-title">
              {t('ranking.rankOneEndingTitle')}
            </h2>
            <div id="rank-one-ending-body" className="rank-one-ending-body">
              <p>{t('ranking.rankOneEndingLine1')}</p>
              <p>{t('ranking.rankOneEndingLine2')}</p>
              <p className="is-accent">{t('ranking.rankOneEndingLine3')}</p>
            </div>
          </div>
        </div>

        <button type="button" onClick={onConfirm} className="rank-one-ending-btn">
          {t('ranking.rankOneEndingConfirm')}
        </button>
      </div>
    </div>
  )
}
