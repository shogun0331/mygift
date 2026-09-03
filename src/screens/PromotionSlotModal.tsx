import { useEffect, useMemo, useState } from 'react'
import type { CreatorStatType } from '../game/characters'
import type { PromotionExamResult } from '../game/promotionExam'
import { PROMOTION_STAT_TYPES } from '../game/promotionExam'
import { formatMoneySigned } from '../game/money'
import { playSfx, stopSfx } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'

const REEL_META: Record<CreatorStatType, { labelKey: string; tone: string }> = {
  sexy: { labelKey: 'creator.statSexy', tone: 'sexy' },
  communication: { labelKey: 'creator.statCommunication', tone: 'comm' },
  elegance: { labelKey: 'creator.statElegance', tone: 'elegance' },
  performance: { labelKey: 'creator.statPerformance', tone: 'perf' },
}

const STOP_MS = [780, 1380, 1980] as const
const RESULT_DELAY_MS = 280

type PromotionSlotModalProps = {
  creatorName: string
  result: PromotionExamResult
  onConfirm: () => void
}

export function PromotionSlotModal({ creatorName, result, onConfirm }: PromotionSlotModalProps) {
  const { t } = useTranslation()
  const [stopped, setStopped] = useState(0)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    playSfx('training-roll', { loop: true })
    const timers = STOP_MS.map((ms, index) =>
      window.setTimeout(() => setStopped(index + 1), ms),
    )
    const resultTimer = window.setTimeout(
      () => setShowResult(true),
      STOP_MS[2] + RESULT_DELAY_MS,
    )
    return () => {
      stopSfx('training-roll')
      for (const timer of timers) window.clearTimeout(timer)
      window.clearTimeout(resultTimer)
    }
  }, [result])

  useEffect(() => {
    if (!showResult) return
    stopSfx('training-roll')
    playSfx(result.kind === 'fail' ? 'training-exam-fail' : 'training-exam-success')
  }, [result.kind, showResult])

  const bannerKey =
    result.kind === 'jackpot'
      ? 'creator.examJackpot'
      : result.kind === 'success'
        ? 'creator.examSuccess'
        : 'creator.examFail'
  const title = Object.entries({
    name: creatorName,
    from: result.fromGrade,
    to: result.toGrade,
  }).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), t('creator.examTitle'))
  const machineTone = !showResult
    ? 'is-spinning'
    : result.kind === 'jackpot'
      ? 'is-jackpot'
      : result.kind === 'success'
        ? 'is-win'
        : 'is-fail'

  return (
    <div
      className="fixed inset-0 z-[88] flex items-center justify-center bg-black/80 p-4 backdrop-blur-[4px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promotion-exam-title"
    >
      <div className={`promotion-exam-panel ${machineTone}`}>
        {showResult && result.kind === 'jackpot' ? <div className="promotion-exam-flash" /> : null}

        <div className="relative z-10 px-6 pb-4 pt-6 text-center">
          <p className="game-stat-label text-amber-300/85">PROMOTION REVIEW</p>
          <h2
            id="promotion-exam-title"
            className="mt-1.5 text-lg font-bold tracking-tight text-slate-100"
          >
            {title}
          </h2>
        </div>

        <div className="promotion-slot-cabinet">
          <div className="promotion-slot-lamps" aria-hidden>
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} style={{ animationDelay: `${index * 90}ms` }} />
            ))}
          </div>

          <div className="promotion-slot-window">
            <div className="promotion-slot-payline" />
            {result.reels.map((face, index) => (
              <ReelWindow
                key={`${result.fromGrade}-${result.toGrade}-${index}`}
                face={face}
                spinning={stopped <= index}
                seed={index * 3 + 1}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 min-h-[6.25rem] px-6 pb-2 pt-4 text-center">
          {showResult ? (
            <div className={`promotion-exam-banner is-${result.kind}`}>
              <p className="promotion-exam-banner-title">{t(bannerKey)}</p>
              {result.refund > 0 ? (
                <p className="mt-1 text-xs font-semibold tabular-nums text-amber-200/85">
                  {t('creator.examRefund')} {formatMoneySigned(result.refund)}
                </p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-slate-400">
                {result.kind === 'fail' ? t('creator.examFailHint') : t('creator.examSuccessHint')}
              </p>
            </div>
          ) : (
            <p className="pt-3 text-[11px] tracking-wide text-slate-500">{t('creator.examSpinning')}</p>
          )}
        </div>

        <div className="relative z-10 flex justify-center px-6 pb-5 pt-1">
          <button
            type="button"
            disabled={!showResult}
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[148px] px-6 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('creator.examConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReelWindow({
  face,
  spinning,
  seed,
}: {
  face: CreatorStatType
  spinning: boolean
  seed: number
}) {
  const { t } = useTranslation()
  const strip = useMemo(() => buildReelStrip(face, seed), [face, seed])
  const faceIndex = strip.lastIndexOf(face)
  const landOffset = Math.max(0, faceIndex * 88 - 40)

  return (
    <div className="promotion-reel">
      <div
        className={`promotion-reel-strip ${spinning ? 'is-spinning' : 'is-stopped'}`}
        style={{
          animationDuration: spinning ? `${110 + seed * 18}ms` : undefined,
          ['--reel-land' as string]: `-${landOffset}px`,
        }}
      >
        {strip.map((type, index) => (
          <span
            key={`${type}-${index}`}
            className={`promotion-reel-cell tone-${REEL_META[type].tone} ${
              !spinning && type === face && index === faceIndex ? 'is-face' : ''
            }`}
          >
            <ReelGlyph type={type} />
            <em>{t(REEL_META[type].labelKey)}</em>
          </span>
        ))}
      </div>
    </div>
  )
}

function buildReelStrip(face: CreatorStatType, seed: number): CreatorStatType[] {
  const loop = Array.from({ length: 10 }, (_, index) => {
    return PROMOTION_STAT_TYPES[(index + seed) % PROMOTION_STAT_TYPES.length] ?? 'sexy'
  })
  const before =
    PROMOTION_STAT_TYPES[(PROMOTION_STAT_TYPES.indexOf(face) + 3) % PROMOTION_STAT_TYPES.length] ??
    'performance'
  const after =
    PROMOTION_STAT_TYPES[(PROMOTION_STAT_TYPES.indexOf(face) + 1) % PROMOTION_STAT_TYPES.length] ??
    'sexy'
  return [...loop, before, face, after]
}

function ReelGlyph({ type }: { type: CreatorStatType }) {
  if (type === 'communication') {
    return (
      <svg viewBox="0 0 48 48" className="promotion-reel-glyph" aria-hidden>
        <path
          d="M10 12.5h28a5 5 0 0 1 5 5V29a5 5 0 0 1-5 5H22l-9 7v-7h-3a5 5 0 0 1-5-5V17.5a5 5 0 0 1 5-5Z"
          fill="currentColor"
        />
      </svg>
    )
  }
  if (type === 'elegance') {
    return (
      <svg viewBox="0 0 48 48" className="promotion-reel-glyph" aria-hidden>
        <path
          d="M8 18 16 10l8 8 8-8 8 8-4 6H12l-4-6Zm4 10h24l-2.4 12H14.4L12 28Z"
          fill="currentColor"
        />
      </svg>
    )
  }
  if (type === 'performance') {
    return (
      <svg viewBox="0 0 48 48" className="promotion-reel-glyph" aria-hidden>
        <path
          d="M26 6c2 8-6 12-6 20 6-2 10-8 12-12 2 6 6 12 6 18 0 10-8 16-16 16s-16-6-16-16c0-10 10-18 20-26Z"
          fill="currentColor"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 48 48" className="promotion-reel-glyph" aria-hidden>
      <path
        d="M24 40s-14-8.8-14-18.2C10 15 16 12 20 15c2 1.6 3.2 3.6 4 5.4 0.8-1.8 2-3.8 4-5.4 4-3 10 0 10 6.8C38 31.2 24 40 24 40Z"
        fill="currentColor"
      />
    </svg>
  )
}
