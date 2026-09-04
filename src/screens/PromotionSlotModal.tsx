import { useEffect, useMemo, useRef, useState } from 'react'
import type { CreatorStatType } from '../game/characters'
import type { PromotionExamResult } from '../game/promotionExam'
import { PROMOTION_STAT_TYPES } from '../game/promotionExam'
import { formatMoneySigned } from '../game/money'
import { playSfx, stopSfx } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'
import { getPromotionDialogueText, getPromotionVoiceUrl } from '../game/promotionLines'

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
  profileImageUrl?: string | null
  result: PromotionExamResult
  onConfirm: () => void
}

export function PromotionSlotModal({
  creatorName,
  profileImageUrl,
  result,
  onConfirm,
}: PromotionSlotModalProps) {
  const { t, locale } = useTranslation()
  const [stopped, setStopped] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const isSuccess = result.kind === 'success' || result.kind === 'jackpot'
  const dialogueText = useMemo(() => getPromotionDialogueText(creatorName, locale), [creatorName, locale])
  const voiceUrl = useMemo(() => getPromotionVoiceUrl(creatorName), [creatorName])

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

    // 승급 성공 시 전용 음성 보이스 재생
    if (isSuccess && voiceUrl) {
      try {
        if (audioRef.current) {
          audioRef.current.pause()
        }
        const audio = new Audio(voiceUrl)
        audioRef.current = audio
        audio.play().catch((err) => console.warn('Promotion voice play blocked:', err))
      } catch (e) {
        console.error('Audio play error:', e)
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [result.kind, showResult, isSuccess, voiceUrl])

  const playVoice = () => {
    if (!voiceUrl) return
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
      } else {
        const audio = new Audio(voiceUrl)
        audioRef.current = audio
        audio.play().catch(() => {})
      }
    } catch (e) {
      console.error(e)
    }
  }

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
      className="fixed inset-0 z-[88] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-hidden select-none font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promotion-exam-title"
    >
      <div className={`promotion-exam-panel relative max-w-xl w-full ${machineTone}`}>
        {showResult && result.kind === 'jackpot' ? <div className="promotion-exam-flash" /> : null}

        <div className="relative z-10 px-6 pb-2 pt-6 text-center">
          <p className="game-stat-label text-amber-300/85 tracking-widest text-xs font-mono font-bold">
            PROMOTION REVIEW
          </p>
          <h2
            id="promotion-exam-title"
            className="mt-1 text-base sm:text-lg font-black tracking-tight text-slate-100"
          >
            {title}
          </h2>
        </div>

        {/* SLOT REELS WINDOW */}
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

        {/* RESULT & HEROINE CARD ELEVATION ACTION OVERLAY */}
        <div className="relative z-10 px-4 sm:px-6 pb-2 pt-3 text-center min-h-[11rem] flex flex-col items-center justify-center">
          {showResult ? (
            <div className="w-full flex flex-col items-center space-y-3">
              {/* SUCCESS ACTION: HEROINE CARD RISE & GRADE BADGE TRANSFORMATION */}
              {isSuccess ? (
                <div className="relative flex flex-col items-center w-full animate-fade-in">
                  {/* Glowing Spotlight Ray Background */}
                  <div className="absolute -top-12 inset-x-0 h-44 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/30 via-yellow-500/10 to-transparent pointer-events-none" />

                  {/* Rising Character Portrait Card Mat */}
                  <div className="relative flex flex-col items-center z-20 transition-all duration-700 transform hover:scale-105">
                    {/* Elevated Card Image Box */}
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl p-1 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 border-2 border-yellow-200 shadow-[0_0_40px_rgba(250,204,21,0.8)] overflow-hidden animate-pop-in">
                      {profileImageUrl ? (
                        <img
                          src={profileImageUrl}
                          alt={creatorName}
                          className="w-full h-full object-cover object-top rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-4xl rounded-xl">
                          👤
                        </div>
                      )}

                      {/* Sparkle Corner Badge */}
                      <div className="absolute top-1 right-1 bg-yellow-400 text-slate-950 text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full shadow">
                        RANK UP!
                      </div>
                    </div>

                    {/* Grade Badge Transformation (C급 ➔ B급) */}
                    <div className="flex items-center gap-2 mt-2 font-mono">
                      <span className="px-3 py-0.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-400 font-extrabold text-xs">
                        {result.fromGrade}급
                      </span>
                      <span className="text-amber-400 font-black text-sm animate-pulse">➔</span>
                      <span className="px-4 py-1 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-sm sm:text-base shadow-[0_0_20px_rgba(250,204,21,0.9)] animate-bounce">
                        {result.toGrade}급
                      </span>
                    </div>
                  </div>

                  {/* Character Promotion Voice Dialogue Speech Bubble */}
                  {dialogueText && (
                    <div
                      onClick={playVoice}
                      className="mt-3 px-4 py-2.5 rounded-2xl bg-slate-950/90 border-2 border-amber-400/80 text-amber-200 text-xs sm:text-sm font-medium shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer hover:border-yellow-200 transition-all max-w-md w-full text-left group z-30"
                      title="클릭하여 대사 음성 다시 듣기"
                    >
                      <span className="text-lg shrink-0 text-amber-400 group-hover:scale-125 transition-transform">
                        🔊
                      </span>
                      <p className="flex-1 leading-snug font-sans tracking-wide">
                        "{dialogueText}"
                      </p>
                    </div>
                  )}

                  {result.refund > 0 && (
                    <p className="mt-2 text-xs font-semibold tabular-nums text-amber-200/90 font-mono">
                      {t('creator.examRefund')} {formatMoneySigned(result.refund)}
                    </p>
                  )}
                </div>
              ) : (
                /* FAIL BANNER */
                <div className="promotion-exam-banner is-fail w-full">
                  <p className="promotion-exam-banner-title">{t(bannerKey)}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400">{t('creator.examFailHint')}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="pt-3 text-[11px] tracking-wide text-slate-500 font-mono animate-pulse">
              {t('creator.examSpinning')}
            </p>
          )}
        </div>

        {/* CONFIRM BUTTON */}
        <div className="relative z-10 flex justify-center px-6 pb-5 pt-2">
          <button
            type="button"
            disabled={!showResult}
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[150px] px-6 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 shadow-lg cursor-pointer"
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
