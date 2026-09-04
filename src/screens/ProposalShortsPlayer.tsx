import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from '../locales/i18n'
import {
  getProposalDialogueText,
  getProposalImageUrl,
  getProposalVoiceUrl,
} from '../game/proposalLines'
import { playSfx } from '../game/uiSfx'

type ProposalShortsPlayerProps = {
  creatorName: string
  profileImageUrl?: string | null
  onAccept: () => void
  onReject: () => void
}

export function ProposalShortsPlayer({
  creatorName,
  profileImageUrl,
  onAccept,
  onReject,
}: ProposalShortsPlayerProps) {
  const { locale } = useTranslation()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const dialogueText = useMemo(
    () => getProposalDialogueText(creatorName, locale),
    [creatorName, locale],
  )
  const voiceUrl = useMemo(() => getProposalVoiceUrl(creatorName), [creatorName])
  const proposalImageUrl = useMemo(
    () => getProposalImageUrl(creatorName) || profileImageUrl,
    [creatorName, profileImageUrl],
  )

  useEffect(() => {
    playSfx('training-exam-success')
    if (voiceUrl) {
      try {
        const audio = new Audio(voiceUrl)
        audioRef.current = audio
        audio.play().catch((err) => console.warn('Proposal voice play blocked:', err))
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
  }, [voiceUrl])

  const replayVoice = () => {
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

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md overflow-hidden select-none font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-shorts-title"
    >
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-500/25 via-rose-950/40 to-slate-950 pointer-events-none" />

      {/* Main Shorts Event Card */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md rounded-3xl border-2 border-pink-400/60 bg-slate-900/95 p-6 shadow-[0_0_60px_rgba(244,63,94,0.4)] flex flex-col items-center text-center animate-pop-in">
        {/* Top Kicker Header */}
        <div className="mb-3">
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black tracking-widest text-pink-300 bg-pink-950 border border-pink-500/40 uppercase shadow">
            💍 SPECIAL CONFESSION EVENT 💍
          </span>
          <h2
            id="proposal-shorts-title"
            className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-pink-100 italic"
          >
            {creatorName}의 고백
          </h2>
        </div>

        {/* Heroine Proposal Portrait Card */}
        <div className="relative w-48 h-64 sm:w-56 sm:h-72 rounded-2xl p-1.5 bg-gradient-to-tr from-pink-500 via-rose-400 to-amber-300 border-2 border-pink-200 shadow-[0_0_35px_rgba(244,63,94,0.6)] overflow-hidden my-2">
          {proposalImageUrl ? (
            <img
              src={proposalImageUrl}
              alt={creatorName}
              className="w-full h-full object-cover object-top rounded-xl"
            />
          ) : (
            <div className="w-full h-full bg-slate-950 flex items-center justify-center text-5xl rounded-xl">
              👸
            </div>
          )}

          {/* Glowing Ring Icon Badge */}
          <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-mono font-black px-2 py-0.5 rounded-full shadow-lg border border-pink-200 animate-pulse">
            PROPOSE!
          </div>
        </div>

        {/* Dialogue Speech Bubble (Click to replay voice) */}
        {dialogueText && (
          <div
            onClick={replayVoice}
            className="mt-3 px-4 py-3 rounded-2xl bg-slate-950/90 border-2 border-pink-400/80 text-pink-100 text-xs sm:text-sm font-medium shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_20px_rgba(244,63,94,0.3)] flex items-center gap-2.5 cursor-pointer hover:border-pink-200 transition-all w-full text-left group"
            title="클릭하여 대사 음성 다시 듣기"
          >
            <span className="text-xl shrink-0 text-pink-400 group-hover:scale-125 transition-transform animate-bounce">
              🔊
            </span>
            <p className="flex-1 leading-relaxed font-sans tracking-wide">
              "{dialogueText}"
            </p>
          </div>
        )}

        {/* Decision Action Buttons ([💍 수락] / [❌ 거부]) */}
        <div className="mt-6 flex w-full gap-3">
          <button
            type="button"
            onClick={onReject}
            className="game-btn flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            ❌ 거부
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="game-btn flex-1 py-3.5 px-4 rounded-xl border-2 border-yellow-200 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-black text-sm sm:text-base shadow-[0_0_25px_rgba(244,63,94,0.7)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            💍 수락하기
          </button>
        </div>
      </div>
    </div>
  )
}
