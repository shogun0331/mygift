import { useEffect, useMemo, useRef, useState } from 'react'
import {
  findCharacterLevelThumbnailUrl,
  type CreatorStatType,
  type OwnedCreator,
  type RegisteredCharacter,
} from '../game/characters'
import { resolveMediaSrc } from '../game/mediaUrl'
import type { PromotionExamResult } from '../game/promotionExam'
import { PROMOTION_STAT_TYPES } from '../game/promotionExam'
import { formatMoneySigned } from '../game/money'
import { playSfx, stopSfx } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'
import { getPromotionDialogueText, getPromotionVoiceUrl } from '../game/promotionLines'
import { getGradeBadgeStyle } from './DashboardPanel'

const REEL_META: Record<CreatorStatType, { labelKey: string; tone: string }> = {
  sexy: { labelKey: 'creator.statSexy', tone: 'sexy' },
  communication: { labelKey: 'creator.statCommunication', tone: 'comm' },
  mental: { labelKey: 'creator.statMental', tone: 'mental' },
  performance: { labelKey: 'creator.statPerformance', tone: 'perf' },
}

const STOP_MS = [780, 1380, 1980] as const
const RESULT_DELAY_MS = 280

type PromotionSlotModalProps = {
  creatorName: string
  profileImageUrl?: string | null
  creator?: OwnedCreator | RegisteredCharacter | null
  result: PromotionExamResult
  onConfirm: () => void
}

export function PromotionSlotModal({
  creatorName,
  profileImageUrl,
  creator,
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

  const unlockedSkin: (2 | 3) | null =
    isSuccess && result.toGrade === 'A'
      ? 2
      : isSuccess && result.toGrade === 'S'
        ? 3
        : null

  const unlockedSkinThumbUrl = useMemo(() => {
    if (!unlockedSkin || !creator) return null
    return findCharacterLevelThumbnailUrl(creator, unlockedSkin)
  }, [unlockedSkin, creator])

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
    if (unlockedSkin) {
      window.setTimeout(() => playSfx('rank-up'), 280)
    }

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

                    {/* Grade Badge Transformation (C ➔ B) */}
                    <div className="flex items-center gap-3 mt-3 font-mono select-none">
                      <span
                        className={`rounded-md border px-2.5 py-0.5 text-xs sm:text-sm font-black italic tracking-widest ${getGradeBadgeStyle(
                          result.fromGrade,
                        )} opacity-80`}
                      >
                        {result.fromGrade}
                      </span>
                      <span className="text-amber-400 font-black text-sm sm:text-base animate-pulse">➔</span>
                      <span
                        className={`rounded-lg border px-3.5 py-1 text-sm sm:text-base font-black italic tracking-widest ${getGradeBadgeStyle(
                          result.toGrade,
                        )} shadow-[0_0_25px_rgba(250,204,21,0.9)] animate-bounce`}
                      >
                        {result.toGrade}
                      </span>
                    </div>
                  </div>

                  {/* SKIN UNLOCK MOTION BANNER (A등급 -> SKIN2 / S등급 -> SKIN3) */}
                  {unlockedSkin ? (
                    <div className="mt-3 flex flex-col items-center w-full max-w-md rounded-2xl border-2 border-indigo-400/80 bg-gradient-to-b from-indigo-950/95 via-purple-950/90 to-slate-950/95 p-3 sm:p-3.5 shadow-[0_0_30px_rgba(129,140,248,0.5)] skin-unlock-card-animate relative overflow-hidden text-left z-30">
                      <div className="skin-unlock-shimmer-sweep" />

                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-300 animate-spin text-sm">✨</span>
                          <span className="text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-300 to-indigo-300">
                            {t('creator.skinUnlockTitle')}
                          </span>
                        </div>
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-400/50 px-2 py-0.5 text-[9px] font-black tracking-wider text-emerald-300 animate-pulse">
                          🔓 UNLOCKED
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5 w-full">
                        <div className="relative aspect-[3/4] w-16 sm:w-20 shrink-0 rounded-xl overflow-hidden border-2 border-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.6)] bg-slate-900 group">
                          {unlockedSkinThumbUrl ? (
                            <img
                              src={resolveMediaSrc(unlockedSkinThumbUrl, creator?.mediaRevision)}
                              alt={`SKIN${unlockedSkin}`}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400">
                              SKIN{unlockedSkin}
                            </div>
                          )}
                          <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-black text-white shadow-lg animate-bounce">
                            🔓
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 py-0.5 text-center">
                            <span className="text-[10px] font-black tracking-wider text-indigo-300">
                              SKIN{unlockedSkin}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/25 border border-indigo-400/30 text-[10px] font-black text-indigo-200">
                            <span>{t('creator.skinUnlockBadge').replace('{grade}', result.toGrade)}</span>
                          </div>
                          <h4 className="mt-1 text-sm font-black text-white tracking-wide">
                            {t('creator.skinUnlockName').replace('{skin}', String(unlockedSkin))}
                          </h4>
                          <p className="mt-1 text-[11px] text-slate-300 leading-snug">
                            {t('creator.skinUnlockDesc')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

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
  if (type === 'mental') {
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
