import React, { useState, useEffect, useRef } from 'react'
import {
  type HighLowConfigMap,
  type Card,
  type HighLowRoomId,
  type CasinoItem,
  type CasinoItemType,
  CASINO_ITEMS_INFO,
  HIGH_LOW_UI_ASSETS,
  SUIT_SYMBOLS,
  SUIT_COLORS,
  getCardDisplayValue,
  calculatePayout,
  createDeck,
  drawDealerCard,
  rollRewardItem,
  getActiveDealerMedia,
} from './highLowConfig'
import './highLowPanel.css'
import { useTranslation } from '../../locales/i18n'
import { HighLowDealerDialogue, type DealerDialoguePlay } from './HighLowDealerDialogue'
import { resolveMediaSrc } from '../../game/mediaUrl'
import {
  playCardFlipSound,
  playBetClickSound,
  playHighLowWinSound,
  playHighLowLossSound,
  playHighLowDrawSound,
  playItemUseSound,
} from '../../game/uiSfx'
import { unlockAchievement } from '../../game/achievements'
import { CasinoPracticeCoach } from '../casino/CasinoPracticeCoach'

export type GamePhase =
  | 'LOBBY'
  | 'DEALING_DEALER'
  | 'WAITING_CHOICE'
  | 'DEALING_PLAYER'
  | 'SHOWDOWN_RESULT'

export interface HighLowMinigameProps {
  configs: HighLowConfigMap
  userChipsMap: Record<HighLowRoomId, number>
  onUpdateChips: (roomId: HighLowRoomId, newChips: number) => void
  onClose?: () => void
  /** 패배 시 카지노 세션 전체 종료 (로비로 복귀하지 않음) */
  onDefeatExit?: () => void
  initialRoomId?: HighLowRoomId
  customAnte?: number
  /** 자산·퇴장이 적용되지 않는 연습 한 판 */
  practice?: boolean
  /** 로비 다시보기. 결과 문구만 달라진다 */
  practiceReplay?: boolean
  onPracticeDone?: () => void
}

interface LogEntry {
  id: string
  text: string
  type: 'info' | 'win' | 'loss' | 'draw'
  timestamp: string
}

/* -------------------------------------------------------------------------- */
/*  CSS Keyframe Animations: 부드러운 스케일 핑퐁 & 페이드 (Scale & Fade)      */
/* -------------------------------------------------------------------------- */
const HIGH_LOW_STYLE_ID = 'highlow-custom-keyframes'

function ensureHighLowStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(HIGH_LOW_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = HIGH_LOW_STYLE_ID
  style.textContent = CUSTOM_HIGH_LOW_STYLES
  document.head.appendChild(style)
}

const CUSTOM_HIGH_LOW_STYLES = `
@keyframes cardFlyInDealer {
  0% {
    transform: translateY(-100px) scale(0.7);
    opacity: 0;
  }
  70% {
    transform: translateY(8px) scale(1.03);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes cardFlyInPlayer {
  0% {
    transform: translateY(-140px) scale(0.6);
    opacity: 0;
  }
  70% {
    transform: translateY(12px) scale(1.22);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1.15);
    opacity: 1;
  }
}

@keyframes scaleFadeOut {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  60% {
    transform: scale(0.92);
    opacity: 0.3;
  }
  100% {
    transform: scale(0.88);
    opacity: 0;
  }
}

@keyframes scaleFadeInPingPong {
  0% {
    transform: scale(0.88);
    opacity: 0;
  }
  65% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes popInScale {
  0% {
    transform: scale(0.7) translateY(20px);
    opacity: 0;
  }
  80% {
    transform: scale(1.05) translateY(-4px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes goldenCardPulse {
  0%, 100% {
    transform: scale(1) translateY(0);
  }
  50% {
    transform: scale(1.04) translateY(-4px);
  }
}

@keyframes fingerTapBounce {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.15);
  }
}

@keyframes defeatScreenShake {
  0% { transform: translate3d(0, 0, 0); }
  20% { transform: translate3d(-8px, 6px, 0); }
  40% { transform: translate3d(8px, -6px, 0); }
  60% { transform: translate3d(-5px, -4px, 0); }
  80% { transform: translate3d(5px, 4px, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

@keyframes defeatRedFlash {
  0% { opacity: 0.75; }
  50% { opacity: 0.3; }
  100% { opacity: 0; }
}

.animate-fly-dealer {
  animation: cardFlyInDealer 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.animate-fly-player {
  animation: cardFlyInPlayer 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.animate-scale-fade-out {
  animation: scaleFadeOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.animate-scale-fade-in {
  animation: scaleFadeInPingPong 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.animate-pop-in {
  animation: popInScale 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.animate-golden-card-pulse {
  animation: goldenCardPulse 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animate-finger-tap {
  animation: fingerTapBounce 0.75s ease-in-out infinite;
}

.animate-defeat-shake {
  animation: defeatScreenShake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
  will-change: transform;
}

.animate-defeat-flash {
  animation: defeatRedFlash 0.75s ease-out forwards;
}

@keyframes goldCashBurst {
  0% {
    transform: translateY(10px) scale(0.6);
    opacity: 0;
  }
  35% {
    transform: translateY(-14px) scale(1.25);
    opacity: 1;
  }
  70% {
    transform: translateY(-22px) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translateY(-32px) scale(0.9);
    opacity: 0;
  }
}

@keyframes redCashDrain {
  0% {
    transform: translateY(-6px) scale(1.1);
    opacity: 1;
  }
  60% {
    transform: translateY(12px) scale(0.95);
    opacity: 0.8;
  }
  100% {
    transform: translateY(24px) scale(0.7);
    opacity: 0;
  }
}

@keyframes comboTextBounceFade {
  0% {
    transform: translate(-50%, -50%) scale(0.2) rotate(-6deg);
    opacity: 0;
  }
  30% {
    transform: translate(-50%, -50%) scale(1.3) rotate(2deg);
    opacity: 1;
  }
  60% {
    transform: translate(-50%, -50%) scale(1.0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -65%) scale(1.15);
    opacity: 0;
  }
}

.animate-gold-cash-burst {
  animation: goldCashBurst 1.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.animate-red-cash-drain {
  animation: redCashDrain 1.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.animate-combo-text-fade {
  animation: comboTextBounceFade 1.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.5);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.85);
}
`

/* -------------------------------------------------------------------------- */
/*  트럼프 카드 — 이미지 플레이트 + 랭크/슈트 오버레이                        */
/* -------------------------------------------------------------------------- */
export const CardView: React.FC<{
  card?: Card | null
  isFaceUp: boolean
  isRevealing?: boolean
  onClick?: () => void
  className?: string
  pulseText?: string
  isLarge?: boolean
  isPeeking?: boolean
}> = ({
  card,
  isFaceUp,
  isRevealing = false,
  onClick,
  className = '',
  pulseText,
  isLarge = false,
  isPeeking = false,
}) => {
  const cardSizeClass = isLarge
    ? 'w-32 sm:w-40 lg:w-44 aspect-[2/3]'
    : 'w-28 sm:w-32 lg:w-36 aspect-[2/3]'

  const isClickable = !!onClick && !isFaceUp
  const plateStyle = {
    ['--hl-card-back' as string]: `url(${HIGH_LOW_UI_ASSETS.cardBack})`,
    ['--hl-card-front' as string]: `url(${HIGH_LOW_UI_ASSETS.cardFront})`,
  } as React.CSSProperties

  const renderBackView = () => (
    <div
      onClick={onClick}
      style={plateStyle}
      className={`hl-card-back relative flex flex-col items-center justify-center ${cardSizeClass} select-none transition-transform duration-200 hover:scale-[1.04] ${
        isClickable ? 'animate-golden-card-pulse cursor-pointer' : ''
      } ${className}`}
    >
      {isClickable && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/35 pointer-events-none">
          <span className="text-3xl animate-finger-tap">👆</span>
          <span className="mt-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase text-slate-950 bg-amber-200/95 tracking-wider border border-amber-100/80">
            CLICK TO FLIP!
          </span>
        </div>
      )}

      {pulseText && !isClickable && (
        <div className="absolute -bottom-8 whitespace-nowrap text-[11px] font-bold text-amber-100/95 bg-slate-950/90 border border-white/15 px-3 py-1 rounded-full z-20">
          {pulseText}
        </div>
      )}
    </div>
  )

  if (!card) return renderBackView()

  const suitSymbol = SUIT_SYMBOLS[card.suit]
  const color = SUIT_COLORS[card.suit]
  const displayVal = getCardDisplayValue(card.value)
  const rankSize = isLarge ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
  const suitMini = isLarge ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
  const suitBig = isLarge ? 'text-6xl sm:text-7xl' : 'text-5xl sm:text-6xl'

  const renderFrontView = () => (
    <div
      onClick={onClick}
      style={{ ...plateStyle, color }}
      className={`hl-card relative ${cardSizeClass} select-none ${className}`}
    >
      <div className={`hl-card__rank hl-card__rank--tl ${rankSize}`}>
        <span className="font-black tracking-tighter">{displayVal}</span>
        <span className={`${suitMini} mt-0.5`}>{suitSymbol}</span>
      </div>

      <div className="hl-card__suit">
        <span className={`${suitBig} opacity-90`}>{suitSymbol}</span>
      </div>

      <div className={`hl-card__rank hl-card__rank--br ${rankSize}`}>
        <span className="font-black tracking-tighter">{displayVal}</span>
        <span className={`${suitMini} mt-0.5`}>{suitSymbol}</span>
      </div>
    </div>
  )

  if (isPeeking && !isFaceUp && !isRevealing) {
    return (
      <div onClick={onClick} className="relative group cursor-pointer">
        <div className="opacity-55 transition-all duration-300 group-hover:opacity-90 group-hover:scale-105">
          {renderFrontView()}
        </div>
      </div>
    )
  }

  if (isRevealing) {
    return (
      <div className={`relative ${cardSizeClass}`}>
        <div className="absolute inset-0 z-0 animate-scale-fade-out pointer-events-none">
          {renderBackView()}
        </div>
        <div className="absolute inset-0 z-10 animate-scale-fade-in">
          {renderFrontView()}
        </div>
      </div>
    )
  }

  return isFaceUp ? renderFrontView() : renderBackView()
}

/* -------------------------------------------------------------------------- */
/*  네온 파티클 폭죽 연출 컴포넌트                                            */
/* -------------------------------------------------------------------------- */
const VictoryParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const width = (canvas.width = canvas.parentElement?.clientWidth || 900)
    const height = (canvas.height = canvas.parentElement?.clientHeight || 700)

    const colors = ['#ec4899', '#06b6d4', '#eab308', '#38bdf8', '#f43f5e', '#ffffff']
    const particles = Array.from({ length: 36 }, () => ({
      x: width / 2 + (Math.random() - 0.5) * 80,
      y: height / 2 + (Math.random() - 0.5) * 80,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.8) * 18,
      size: Math.random() * 7 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.015 + 0.01,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
    }))

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      let alive = false

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]!
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.25
        p.alpha -= p.decay
        p.rotation += p.vRot

        if (p.alpha > 0) {
          alive = true
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.fillStyle = p.color
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotation)
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
          ctx.restore()
        }
      }
      ctx.globalAlpha = 1

      if (alive) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-50 w-full h-full"
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  패배 이펙트 연출 컴포넌트 (초경량 60FPS Defeat Smokey Spark Particles)     */
/* -------------------------------------------------------------------------- */
const DefeatParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const width = (canvas.width = canvas.parentElement?.clientWidth || 900)
    const height = (canvas.height = canvas.parentElement?.clientHeight || 700)

    const colors = ['#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337', '#fda4af']
    const particles = Array.from({ length: 35 }, () => ({
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10 - 2,
      size: Math.random() * 5 + 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.025 + 0.015,
    }))

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.alpha -= p.decay
        if (p.alpha > 0) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.fill()
        }
      })

      if (particles.some((p) => p.alpha > 0)) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [active])

  if (!active) return null

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30" />
}

/* -------------------------------------------------------------------------- */
/*  승리 시 중앙 순수 텍스트 3D 콤보 페이드아웃 연출 (VictoryComboOverlay)   */
/* -------------------------------------------------------------------------- */
const VictoryComboOverlay: React.FC<{ active: boolean; comboCount: number }> = ({ active, comboCount }) => {
  if (!active || comboCount < 1) return null

  const comboMultiplier = Math.pow(2, comboCount)

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-combo-text-fade select-none">
      <div className="flex flex-col items-center justify-center font-mono">
        <h3 className="text-6xl sm:text-8xl font-black tracking-tighter text-amber-100 whitespace-nowrap drop-shadow-md">
          COMBO X{comboCount}!
        </h3>
        <span className="text-sm sm:text-base font-black text-amber-200/90 tracking-wider mt-1">
          NEXT ANTE {comboMultiplier}X BOOST
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  돈 카운팅 애니메이션 컴포넌트 (AnimatedMoneyCounter)                     */
/* -------------------------------------------------------------------------- */
const AnimatedMoneyCounter: React.FC<{ value: number }> = ({ value }) => {
  const spanRef = useRef<HTMLSpanElement | null>(null)
  const prevValueRef = useRef(value)
  const rafRef = useRef(0)

  useEffect(() => {
    const el = spanRef.current
    if (!el) return
    const startVal = prevValueRef.current
    const endVal = value
    if (startVal === endVal) {
      el.textContent = `$${endVal.toLocaleString()}`
      return
    }

    const duration = 600
    const startTime = performance.now()
    cancelAnimationFrame(rafRef.current)

    const updateCounter = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration)
      const current = Math.floor(startVal + (endVal - startVal) * progress)
      el.textContent = `$${current.toLocaleString()}`
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(updateCounter)
      } else {
        prevValueRef.current = endVal
      }
    }

    rafRef.current = requestAnimationFrame(updateCounter)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  return <span ref={spanRef}>{`$${value.toLocaleString()}`}</span>
}

/* -------------------------------------------------------------------------- */
/*  HighLowMinigame 메인 컴포넌트                                              */
/* -------------------------------------------------------------------------- */
export const HighLowMinigame: React.FC<HighLowMinigameProps> = ({
  configs,
  userChipsMap,
  onUpdateChips,
  onClose,
  onDefeatExit,
  initialRoomId = 'legend',
  customAnte,
  practice = false,
  practiceReplay = false,
  onPracticeDone,
}) => {
  const { t, locale } = useTranslation()
  useEffect(() => {
    ensureHighLowStyles()
  }, [])
  const practiceRef = useRef(practice)
  practiceRef.current = practice
  const onPracticeDoneRef = useRef(onPracticeDone)
  onPracticeDoneRef.current = onPracticeDone
  const [practiceItemStep, setPracticeItemStep] = useState<
    'peek_card' | 'double_payout' | 'loss_shield' | 'play'
  >('peek_card')
  const practiceItemStepRef = useRef(practiceItemStep)
  practiceItemStepRef.current = practiceItemStep
  const [dealerDialoguePlay, setDealerDialoguePlay] = useState<DealerDialoguePlay | null>(null)
  const roomConfigs = configs
  const [selectedRoomId, setSelectedRoomId] = useState<HighLowRoomId>(initialRoomId)
  const [phase, setPhase] = useState<GamePhase>('DEALING_DEALER')

  const currentConfig = roomConfigs[selectedRoomId]
  const currentChips = userChipsMap[selectedRoomId] ?? currentConfig.startChips
  const effectiveAnte = customAnte ?? currentConfig.ante

  // 콤보 시스템 제거 (항상 0)
  const comboCount = 0

  // 라운드 보상 아이템 & 보유 인벤토리 (입장 시 0개 시작)
  const [currentRewardItem, setCurrentRewardItem] = useState<CasinoItem | null>(null)
  const [inventory, setInventory] = useState<CasinoItem[]>([])

  // 인벤토리 변경 헬퍼
  const updateInventory = (updater: CasinoItem[] | ((prev: CasinoItem[]) => CasinoItem[])) => {
    setInventory((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }

  const [activeBuffs, setActiveBuffs] = useState<{
    doublePayout: boolean
    lossShield: boolean
    peekCard: boolean
  }>({
    doublePayout: false,
    lossShield: false,
    peekCard: false,
  })
  const [peekHintText, setPeekHintText] = useState<string | null>(null)

  // 덱 & 카드 상태
  const [deck, setDeck] = useState<Card[]>([])
  const [dealerCard, setDealerCard] = useState<Card | null>(null)
  const [playerCard, setPlayerCard] = useState<Card | null>(null)
  const [userChoice, setUserChoice] = useState<'HIGH' | 'LOW' | 'TIE' | null>(null)

  // 카드 연출 상태
  const [isDealerFlyIn, setIsDealerFlyIn] = useState(false)
  const [isDealerRevealing, setIsDealerRevealing] = useState(false)
  const [isDealerFaceUp, setIsDealerFaceUp] = useState(false)

  const [isPlayerFlyIn, setIsPlayerFlyIn] = useState(false)
  const [isPlayerRevealing, setIsPlayerRevealing] = useState(false)
  const [isPlayerFaceUp, setIsPlayerFaceUp] = useState(false)

  // 승패 및 정산 결과 (WIN / LOSS / DRAW)
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSS' | 'DRAW' | null>(null)
  const [rewardAmount, setRewardAmount] = useState(0)
  const [totalWinnings, setTotalWinnings] = useState(0)

  // 통계
  const [_stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 })
  const [consecutiveWins, setConsecutiveWins] = useState(0)

  const activeDealerMedia = getActiveDealerMedia(currentConfig, consecutiveWins)

  // 딜러 대사 비중복 셔플 덱(Bag System) 관리 ref
  const dialoguePoolsRef = useRef<Record<string, number[]>>({
    tier1: [],
    tier2: [],
    tier3: [],
    loss: [],
  })
  const lastPlayedIndexRef = useRef<{ key: string; index: number } | null>(null)

  const getNextDialogueIndex = (poolKey: 'tier1' | 'tier2' | 'tier3' | 'loss'): number => {
    let pool = dialoguePoolsRef.current[poolKey]
    if (!pool || pool.length === 0) {
      // 5개 대사 인덱스(0..4) 미복원 랜덤 셔플
      const newPool = [0, 1, 2, 3, 4]
      for (let i = newPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[newPool[i], newPool[j]] = [newPool[j], newPool[i]]
      }
      // 직전 재생 대사와의 연속 중복 방지
      const lastPlayed = lastPlayedIndexRef.current
      if (lastPlayed && lastPlayed.key === poolKey && newPool[0] === lastPlayed.index) {
        ;[newPool[0], newPool[newPool.length - 1]] = [newPool[newPool.length - 1], newPool[0]]
      }
      pool = newPool
    }
    const nextIdx = pool.shift()!
    dialoguePoolsRef.current[poolKey] = pool
    lastPlayedIndexRef.current = { key: poolKey, index: nextIdx }
    return nextIdx
  }

  const [logs, setLogs] = useState<LogEntry[]>([])
  const logEndRef = useRef<HTMLDivElement | null>(null)

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    const timeStr = new Date().toLocaleTimeString('ko-KR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    setLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, text, type, timestamp: timeStr },
    ])
  }

  const handleExitGame = (forceOutside = false) => {
    if (practiceRef.current) {
      onPracticeDoneRef.current?.()
      return
    }
    const bust = forceOutside || gameResult === 'LOSS'
    if (!bust && totalWinnings > 0) {
      const updatedChips = currentChips + totalWinnings
      onUpdateChips(selectedRoomId, updatedChips)
      addLog(`💰 누적 당첨금 100% (+$${totalWinnings.toLocaleString()}) 수령 완료!`, 'win')
      setTotalWinnings(0)
      setConsecutiveWins(0)
    }
    if (bust) {
      setTotalWinnings(0)
      setConsecutiveWins(0)
      ;(onDefeatExit ?? onClose)?.()
      return
    }
    onClose?.()
  }

  // 바로 카지노 게임 테이블 시작
  const hasAutoStartedRef = useRef(false)
  useEffect(() => {
    if (!hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true
      addLog(`=== [하이로우 카지노] 테이블에 입장하셨습니다 (기본 판돈: $${effectiveAnte.toLocaleString()}). ===`, 'info')
      startNewGameLoop(initialRoomId)
    }
  }, [initialRoomId])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // 1. 룸 선택 및 입장
  const handleEnterRoom = (roomId: HighLowRoomId) => {
    setSelectedRoomId(roomId)
    startNewGameLoop(roomId)
  }

  // 2. 새로운 판 시작 (DEALING_DEALER) - 판돈 무료 (자산 차감 없음)
  const startNewGameLoop = (roomId: HighLowRoomId = selectedRoomId) => {
    const conf = roomConfigs[roomId]
    const currentBet = totalWinnings > 0 ? totalWinnings : (customAnte ?? conf.ante)

    if (practiceRef.current) {
      addLog(t('casino.tutorial.highlowLogStart'), 'info')
    } else if (totalWinnings > 0) {
      addLog(`🔥 누적 당첨금 $${currentBet.toLocaleString()} 전액 배팅! 라운드가 시작됩니다.`, 'info')
    } else {
      addLog(`무료 기본 판돈 $${currentBet.toLocaleString()} (자산 차감 없음). 라운드가 시작됩니다.`, 'info')
    }

    if (!practiceRef.current) {
      const rewardItem = rollRewardItem(conf)
      setCurrentRewardItem(rewardItem)
      if (rewardItem) {
        addLog(`🎁 이번 라운드 드롭 보상 아이템 [${rewardItem.name}] 등장! (승리 시 수령)`, 'info')
      }
    } else {
      setCurrentRewardItem(null)
      setPracticeItemStep('peek_card')
      setActiveBuffs({ doublePayout: false, lossShield: false, peekCard: false })
      setInventory([
        { id: 'practice-peek', ...CASINO_ITEMS_INFO.peek_card },
        { id: 'practice-double', ...CASINO_ITEMS_INFO.double_payout },
        { id: 'practice-shield', ...CASINO_ITEMS_INFO.loss_shield },
      ])
    }

    setPeekHintText(null)

    // 카드 초기화 (딜러 카드는 6~10만, 플레이어 카드는 나머지 덱)
    const freshDeck = createDeck()
    const { card: drawnDealer, rest: afterDealer } = drawDealerCard(freshDeck)
    const drawnPlayer = practiceRef.current
      ? {
          id: 'practice-player',
          suit: 'hearts' as const,
          value: drawnDealer.value + 1,
        }
      : afterDealer[0]!
    const newDeck = practiceRef.current ? afterDealer : afterDealer.slice(1)

    setDeck(newDeck)
    setDealerCard(drawnDealer)
    setPlayerCard(drawnPlayer)
    setUserChoice(null)

    setIsDealerFlyIn(true)
    setIsDealerRevealing(false)
    setIsDealerFaceUp(false)

    setIsPlayerFlyIn(false)
    setIsPlayerRevealing(false)
    setIsPlayerFaceUp(false)

    setGameResult(null)
    setRewardAmount(0)

    setPhase('DEALING_DEALER')

    setTimeout(() => {
      setIsDealerFlyIn(false)
      setIsDealerRevealing(true)
      playCardFlipSound()

      setTimeout(() => {
        setIsDealerRevealing(false)
        setIsDealerFaceUp(true)
        addLog(`딜러가 카드 [${getCardDisplayValue(drawnDealer.value)} ${SUIT_SYMBOLS[drawnDealer.suit]}] 를 공개했습니다.`, 'info')

        setTimeout(() => {
          setPhase('WAITING_CHOICE')
        }, 200)
      }, 350)
    }, 500)
  }

  // 3. 유저의 HIGH / LOW / TIE 선택 -> 플레이어 대형 카드가 날라와 짠! 하고 등장
  const handleSelectChoice = (choice: 'HIGH' | 'LOW' | 'TIE') => {
    if (phase !== 'WAITING_CHOICE' || !dealerCard) return
    if (practiceRef.current && (practiceItemStepRef.current !== 'play' || choice !== 'HIGH')) return

    playBetClickSound()

    // 엿보기 카드 끄기: 배팅 선택 시 보이던 엿보기 반투명 효과가 꺼지고 다시 뒷면 카드 가림 상태로 완벽 복원!
    if (activeBuffs.peekCard) {
      setActiveBuffs((b) => ({ ...b, peekCard: false }))
      setPeekHintText(null)
    }

    setUserChoice(choice)
    const payout = calculatePayout(dealerCard.value, choice, currentConfig.houseEdge)
    if (practiceRef.current) {
      const choiceLabel = t('casino.highlow.high')
      addLog(t('casino.tutorial.highlowLogChoice', { choice: choiceLabel }), 'info')
    } else {
      addLog(`유저가 [${choice}] (배당률 ${payout}x) 를 선택했습니다.`, 'info')
    }

    // 플레이어 카드가 혹시 없으면 드로
    if (!playerCard) {
      const currentDeck = [...deck]
      const drawnPlayer = currentDeck.shift() || createDeck()[0]
      setDeck(currentDeck)
      setPlayerCard(drawnPlayer)
    }

    setPhase('DEALING_PLAYER')
    setIsPlayerFlyIn(true)

    setTimeout(() => {
      setIsPlayerFlyIn(false)
    }, 550)
  }

  // 아이템 타입별 클릭 사용 훅 (수량 기반 차감 시스템)
  const handleUseItemByType = (itemType: CasinoItemType) => {
    if (practiceRef.current && itemType !== practiceItemStepRef.current) return
    const targetItem = inventory.find((i) => i.type === itemType)
    if (!targetItem) return

    if (itemType === 'peek_card' && activeBuffs.peekCard) {
      if (!practiceRef.current) {
        addLog(`⚠️ 이미 이번 라운드에 [카드 엿보기] 센서가 가동 중입니다. (한 턴 중복 사용 불가)`, 'draw')
      }
      return
    }
    if (itemType === 'double_payout' && activeBuffs.doublePayout) {
      if (!practiceRef.current) {
        addLog(`⚠️ 이미 이번 라운드에 [배당 2배] 부스터가 적용 중입니다. (한 턴 중복 사용 불가)`, 'draw')
      }
      return
    }
    if (itemType === 'loss_shield' && activeBuffs.lossShield) {
      if (!practiceRef.current) {
        addLog(`⚠️ 이미 이번 라운드에 [패배 쉴드]가 발동 중입니다. (한 턴 중복 사용 불가)`, 'draw')
      }
      return
    }

    playItemUseSound()

    updateInventory((prev) => {
      const idx = prev.findIndex((i) => i.type === itemType)
      if (idx !== -1) {
        const next = [...prev]
        next.splice(idx, 1)
        return next
      }
      return prev
    })

    if (itemType === 'peek_card') {
      setActiveBuffs((b) => ({ ...b, peekCard: true }))
      if (playerCard) {
        const pVal = playerCard.value
        const suitSym = SUIT_SYMBOLS[playerCard.suit]
        const displayV = getCardDisplayValue(pVal)
        setPeekHintText(
          practiceRef.current
            ? t('casino.tutorial.highlowPeekHint', { card: `${displayV} ${suitSym}` })
            : `👁️ X-RAY 엿보기 작동: [ ${displayV} ${suitSym} ] 카드 투시 중!`,
        )
      }
      if (!practiceRef.current) {
        addLog(`👁️ [카드 엿보기] 아이템 사용! 플레이어 카드가 엑스레이 투명 모드로 전환됩니다. (아이템 1개 소모)`, 'info')
      }
    } else if (itemType === 'double_payout') {
      setActiveBuffs((b) => ({ ...b, doublePayout: true }))
      if (!practiceRef.current) {
        addLog(`⚡ [배당 2배] 사용! 승리 수령금 2배 증폭 적용! (아이템 1개 소모)`, 'info')
      }
    } else if (itemType === 'loss_shield') {
      setActiveBuffs((b) => ({ ...b, lossShield: true }))
      if (!practiceRef.current) {
        addLog(`🛡️ [패배 쉴드] 사용! 패배해도 퇴장하지 않고 라운드를 이어갑니다. (아이템 1개 소모)`, 'info')
      }
    }

    if (practiceRef.current) {
      setPracticeItemStep(
        itemType === 'peek_card' ? 'double_payout' : itemType === 'double_payout' ? 'loss_shield' : 'play',
      )
    }
  }

  // 4. 플레이어 대형 카드 클릭 후 정산
  const handleFlipPlayerCard = () => {
    if (phase !== 'DEALING_PLAYER' || !dealerCard || !playerCard || !userChoice || isPlayerRevealing) return

    setIsPlayerRevealing(true)
    playCardFlipSound()

    setTimeout(() => {
      setIsPlayerRevealing(false)
      setIsPlayerFaceUp(true)
      setPhase('SHOWDOWN_RESULT')

      const dVal = dealerCard.value
      const pVal = playerCard.value
      let rawPayout = calculatePayout(dVal, userChoice, currentConfig.houseEdge)
      if (activeBuffs.doublePayout) {
        rawPayout = rawPayout * 2
      }

      // 승/패/무승부 판정
      let outcome: 'WIN' | 'LOSS' | 'DRAW' = 'LOSS'
      if (userChoice === 'TIE') {
        if (pVal === dVal) {
          outcome = 'WIN'
        } else {
          outcome = 'LOSS'
        }
      } else {
        if (pVal === dVal) {
          outcome = 'DRAW'
        } else if (userChoice === 'HIGH' && pVal > dVal) {
          outcome = 'WIN'
        } else if (userChoice === 'LOW' && pVal < dVal) {
          outcome = 'WIN'
        } else {
          outcome = 'LOSS'
        }
      }

      setGameResult(outcome)

      if (practiceRef.current) {
        const currentBet = totalWinnings > 0 ? totalWinnings : (customAnte ?? currentConfig.ante)
        const grossReward = Math.floor(currentBet * rawPayout)
        setGameResult('WIN')
        setRewardAmount(grossReward)
        setTotalWinnings(0)
        addLog(t('casino.tutorial.highlowLogWin'), 'win')
        playHighLowWinSound(false)
        setActiveBuffs({ doublePayout: false, lossShield: false, peekCard: false })
        return
      }

      const currentBet = totalWinnings > 0 ? totalWinnings : (customAnte ?? currentConfig.ante)

      if (outcome === 'WIN') {
        const grossReward = Math.floor(currentBet * rawPayout)
        setRewardAmount(grossReward)
        setTotalWinnings(grossReward)
        setStats((s) => ({ ...s, wins: s.wins + 1 }))

        setConsecutiveWins((prev) => {
          const nextWins = prev + 1
          if (nextWins === 3) {
            addLog(`🔥 3연승 달성! 딜러 수위 2 미디어가 해금됩니다!`, 'win')
          } else if (nextWins === 6) {
            addLog(`🔥 6연승 달성! 딜러 수위 3 미디어가 해금됩니다!`, 'win')
          }

          // 업적 트리거 (3, 6, 9, 12연승)
          if (nextWins >= 3) unlockAchievement('casino_highlow_win_3')
          if (nextWins >= 6) unlockAchievement('casino_highlow_win_6')
          if (nextWins >= 9) unlockAchievement('casino_highlow_win_9')
          if (nextWins >= 12) unlockAchievement('casino_highlow_win_12')

          playHighLowWinSound(nextWins >= 3)

          // 딜러 대사는 짝수 연승(2, 4, 6…)일 때만
          if (nextWins % 2 === 0) {
            let tier: 1 | 2 | 3 = 1
            if (nextWins >= 6) {
              tier = 3
            } else if (nextWins >= 3) {
              tier = 2
            }
            const poolKey = `tier${tier}` as 'tier1' | 'tier2' | 'tier3'
            const randIdx = getNextDialogueIndex(poolKey)
            const activeMedia = getActiveDealerMedia(currentConfig, nextWins)
            setDealerDialoguePlay({
              tier,
              index: randIdx,
              dealerName: currentConfig.dealerName || currentConfig.name || '딜러',
              dealerMediaUrl: activeMedia?.url || currentConfig.dealerMediaUrl,
              dealerMediaType: activeMedia?.type || currentConfig.dealerMediaType,
            })
          }

          return nextWins
        })

        if (currentRewardItem) {
          updateInventory((inv) => {
            addLog(`🎁 라운드 보상 획득! [${currentRewardItem.name}] 아이템 수령 완료!`, 'win')
            return [...inv, currentRewardItem]
          })
        }

        addLog(`🎉 승리! 플레이어 [${getCardDisplayValue(pVal)}] vs 딜러 [${getCardDisplayValue(dVal)}] -> 누적 당첨금 $${grossReward.toLocaleString()} 달성!`, 'win')
      } else if (outcome === 'DRAW') {
        setRewardAmount(totalWinnings)
        setStats((s) => ({ ...s, draws: s.draws + 1 }))
        playHighLowDrawSound()
        addLog(`🤝 무승부(DRAW)! 딜러와 동일한 카드 [${getCardDisplayValue(pVal)}] -> 누적 당첨금($${totalWinnings.toLocaleString()}) 보존`, 'draw')
      } else {
        if (activeBuffs.lossShield) {
          setGameResult('DRAW')
          setRewardAmount(totalWinnings)
          setStats((s) => ({ ...s, draws: s.draws + 1 }))
          playHighLowDrawSound()
          addLog(`🛡️ 패배 무효화 쉴드 발동! 누적 당첨금($${totalWinnings.toLocaleString()}) 보존`, 'win')
        } else {
          setGameResult('LOSS')
          setStats((s) => ({ ...s, losses: s.losses + 1 }))
          setConsecutiveWins(0)
          playHighLowLossSound()
          unlockAchievement('casino_highlow_first_loss')

          const forfeited = totalWinnings
          setRewardAmount(0)
          setTotalWinnings(0)

          addLog(
            forfeited > 0
              ? `💀 패배! 플레이어 [${getCardDisplayValue(pVal)}] vs 딜러 [${getCardDisplayValue(dVal)}] -> 누적 당첨금 $${forfeited.toLocaleString()}을 잃고 빈손으로 퇴장합니다.`
              : `💀 패배! 플레이어 [${getCardDisplayValue(pVal)}] vs 딜러 [${getCardDisplayValue(dVal)}] -> 당첨금 없이 퇴장합니다.`,
            'loss',
          )

          // 딜러 패배 비중복 셔플 대사 & 음성 재생 트리거
          const randIdx = getNextDialogueIndex('loss')
          const activeMedia = getActiveDealerMedia(currentConfig, 0)
          setDealerDialoguePlay({
            tier: 1,
            index: randIdx,
            dealerName: currentConfig.dealerName || currentConfig.name || '딜러',
            dealerMediaUrl: activeMedia?.url || currentConfig.dealerMediaUrl,
            dealerMediaType: activeMedia?.type || currentConfig.dealerMediaType,
            isLoss: true,
          })
        }
      }

      // 라운드 정산 완료 시 적용 중이던 버프 초기화
      setActiveBuffs({ doublePayout: false, lossShield: false, peekCard: false })
    }, 350)
  }

  const mult = activeBuffs.doublePayout ? 2 : 1
  const effectiveBet = totalWinnings > 0 ? totalWinnings : (customAnte ?? currentConfig.ante)

  const rawLowPayout = dealerCard ? calculatePayout(dealerCard.value, 'LOW', currentConfig.houseEdge) : 1.95
  const rawHighPayout = dealerCard ? calculatePayout(dealerCard.value, 'HIGH', currentConfig.houseEdge) : 1.95
  const rawTiePayout = 50.0

  const lowPayout = Math.round(rawLowPayout * mult * 100) / 100
  const highPayout = Math.round(rawHighPayout * mult * 100) / 100
  const tiePayout = Math.round(rawTiePayout * mult * 100) / 100

  const lowWinVal = Math.floor(effectiveBet * lowPayout)
  const highWinVal = Math.floor(effectiveBet * highPayout)
  const tieWinVal = Math.floor(effectiveBet * tiePayout)

  /* -------------------------------------------------------------------------- */
  /*  RENDER: 1. LOBBY SCREEN                                                   */
  /* -------------------------------------------------------------------------- */
  if (phase === 'LOBBY') {
    return (
      <div className="relative w-full h-full min-h-0 flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-pink-500/20 shadow-2xl overflow-hidden font-sans select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-950/30 via-slate-950 to-slate-950 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between border-b border-pink-500/20 pb-4">
          <div>
            <span className="text-[11px] font-mono font-bold tracking-widest text-pink-400 uppercase">
              CYBER DUAL MINIGAME
            </span>
            <h1 className="text-2xl font-black tracking-wider text-slate-100 flex items-center gap-2">
              ♠ VIP HIGH-LOW DUEL ♥
            </h1>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-all"
            >
              ✕ 닫기
            </button>
          )}
        </div>

        <div className="relative z-10 my-auto grid grid-cols-1 md:grid-cols-3 gap-5 py-6">
          {(['local', 'star', 'legend'] as HighLowRoomId[]).map((roomId) => {
            const conf = configs[roomId]
            const chips = userChipsMap[roomId] ?? conf.startChips
            const isSelected = selectedRoomId === roomId

            return (
              <div
                key={roomId}
                onClick={() => setSelectedRoomId(roomId)}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer group ${
                  isSelected
                    ? 'border-pink-500 bg-slate-900/90 shadow-[0_0_30px_rgba(236,72,153,0.25)] scale-[1.02]'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-white shadow-sm"
                      style={{ backgroundColor: conf.badgeColor }}
                    >
                      {conf.dealerTitle}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      CHIPS: ${chips.toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-pink-400 transition-colors">
                    {conf.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{conf.subtitle}</p>

                  <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">기본 배팅 (ANTE):</span>
                      <span className="text-pink-400 font-bold">${conf.ante.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">초기 증정 칩:</span>
                      <span className="text-cyan-400">${conf.startChips.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">담당 딜러:</span>
                      <span className="text-slate-200">{conf.dealerName}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEnterRoom(roomId)
                  }}
                  className="mt-5 w-full py-2.5 rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-200 shadow-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-pink-600/30 hover:shadow-pink-500/50 active:scale-[0.98]"
                >
                  입장하기
                </button>
              </div>
            )
          })}
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-3">
          <span>🎮 MODE: HIGH-LOW DUEL SIMULATOR</span>
          <span>SELECT A ROOM & START BETTING</span>
        </div>
      </div>
    )
  }

  /* -------------------------------------------------------------------------- */
  /*  RENDER: 2. GAME TABLE OVERLAY (FULL-WIDTH 3-COLUMN VIP CASINO TABLE 6.0)  */
  /* -------------------------------------------------------------------------- */
  const hlStageStyle = {
    ['--hl-felt' as string]: `url(${HIGH_LOW_UI_ASSETS.tableFelt})`,
    ['--hl-bet-plinth' as string]: `url(${HIGH_LOW_UI_ASSETS.betPlinth})`,
  } as React.CSSProperties

  return (
    <div
      style={hlStageStyle}
      className={`hl-shell relative w-full h-full min-h-0 flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-4 rounded-3xl border ${
        gameResult === 'LOSS' ? 'is-loss animate-defeat-shake' : ''
      } overflow-hidden font-sans select-none`}
    >
      <VictoryParticles active={gameResult === 'WIN'} />
      <VictoryComboOverlay key={`${gameResult}-${comboCount}`} active={gameResult === 'WIN'} comboCount={comboCount} />
      <DefeatParticles active={gameResult === 'LOSS'} />

      {gameResult === 'LOSS' && (
        <div className="absolute inset-0 bg-gradient-to-b from-rose-950/45 via-rose-900/20 to-transparent pointer-events-none animate-defeat-flash z-20" />
      )}

      {/* Top Header */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border border-white/15 flex items-center justify-center text-amber-200/90 text-lg sm:text-xl font-black">
            ♠
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              {currentConfig.name}
            </span>
            <h2 className="text-lg sm:text-2xl font-black tracking-wider text-slate-100">
              {t('casino.highlow.title', { defaultValue: '하이로우 듀얼' })}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 z-10" />
      </div>

      {/* Felt stage */}
      <div className="hl-felt-stage relative z-10 flex-1 p-3 sm:p-4 my-auto py-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr_360px] gap-3 sm:gap-5 items-stretch flex-1 min-h-0 overflow-hidden">
          {/* LEFT: CCTV */}
          <div className="hidden lg:flex flex-col justify-between p-2 sm:p-3 font-mono text-xs overflow-hidden bg-transparent border-none shadow-none">
            <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest border-b border-white/10 pb-1.5 flex items-center justify-between shrink-0 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />
                  <span>LIVE CCTV [CAM-01]</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold">SURVEILLANCE</span>
              </h4>

              <div className="hl-cctv-monitor group">
                <div className="hl-cctv-feed">
                  <div className="cctv-scanline hl-cctv-fx-scanline" />
                  <div className="cctv-noise hl-cctv-fx-noise" />

                  <div className="pointer-events-none absolute top-2 left-2 z-20 flex items-center gap-1.5 font-mono">
                    <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded border border-rose-500/60">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[9px] font-black text-rose-400 tracking-wider">REC</span>
                    </div>
                    <div className="bg-black/75 px-2 py-0.5 rounded text-[9px] text-slate-200/90 tracking-wider font-bold">
                      CAM-01
                    </div>
                  </div>
                  <div className="pointer-events-none absolute bottom-2 right-2 z-20 font-mono">
                    <div className="bg-black/75 px-2 py-0.5 rounded text-[9px] text-slate-300/90 tracking-wider">
                      HD · LIVE
                    </div>
                  </div>

                  {activeDealerMedia?.url ? (
                    activeDealerMedia.type === 'video' ? (
                      <video
                        key={activeDealerMedia.url}
                        src={resolveMediaSrc(activeDealerMedia.url)}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        key={activeDealerMedia.url}
                        src={resolveMediaSrc(activeDealerMedia.url)}
                        alt={currentConfig.dealerName}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-300">
                      <div className="w-16 h-16 rounded-full border border-slate-500/70 p-1 mb-1 bg-black flex items-center justify-center">
                        <span className="text-3xl">🎩</span>
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest font-mono">
                        {currentConfig.dealerName}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold font-mono">
                        {currentConfig.dealerTitle}
                      </span>
                    </div>
                  )}
                </div>

                <img
                  src={HIGH_LOW_UI_ASSETS.cctvBezel}
                  alt=""
                  draggable={false}
                  className="hl-cctv-bezel"
                />
              </div>

              <div className="hl-reward-box p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎁</span>
                    <span>{t('casino.highlow.thisRoundReward')}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-300 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                    {t('casino.highlow.dropRate')}: {currentConfig.itemDropRate ?? 50}%
                  </span>
                </div>

                {currentRewardItem ? (
                  <div className="p-3 rounded-xl hl-glass-card border border-amber-200/25 flex flex-col gap-1 animate-pop-in relative overflow-hidden">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">{currentRewardItem.icon}</span>
                      <h6 className="text-sm font-black text-amber-100 tracking-wide">
                        {t(`casino.highlow.items.${currentRewardItem.type}.name`, { defaultValue: currentRewardItem.name })}
                      </h6>
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 pl-8">
                      {t('casino.highlow.autoClaimHint')}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl border border-white/10 text-center text-slate-400/80 text-[11px] font-bold">
                    {t('casino.highlow.noRewardItem')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CENTER: cards + bet */}
          <div className="flex flex-col items-center justify-between min-h-0 overflow-hidden">
          <div className="flex flex-col items-center relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="hl-card-label font-mono">
                {t('casino.highlow.dealersCard')}
              </span>
              {gameResult === 'LOSS' && (
                <span className="text-[10px] font-mono font-black text-slate-950 bg-amber-200 px-2 py-0.5 rounded-full animate-bounce">
                  {t('casino.highlow.winner')}
                </span>
              )}
              {gameResult === 'DRAW' && (
                <span className="text-[10px] font-mono font-black text-slate-100 bg-slate-700 px-2 py-0.5 rounded-full border border-white/20">
                  {t('casino.highlow.draw')}
                </span>
              )}
            </div>

            <div className="hl-card-slot flex items-center justify-center">
              <div className={`relative ${isDealerFlyIn ? 'animate-fly-dealer' : ''}`}>
                <CardView
                  card={dealerCard}
                  isFaceUp={isDealerFaceUp}
                  isRevealing={isDealerRevealing}
                  isLarge
                  className={
                    gameResult === 'LOSS'
                      ? 'scale-105 transition-all'
                      : gameResult === 'DRAW'
                      ? 'outline outline-1 outline-slate-300/50'
                      : ''
                  }
                />
              </div>
            </div>
          </div>

          <div className="w-full max-w-xl my-2 z-20">
            {phase === 'WAITING_CHOICE' ? (
              <div className="hl-bet-panel p-4 sm:p-5 flex flex-col items-center space-y-3 animate-pop-in">
                <div className="text-center flex flex-col items-center gap-1">
                  <span className="px-4 py-1 rounded-full text-xs font-mono font-black uppercase tracking-widest text-slate-100 border border-white/20 bg-black/40">
                    {t('casino.highlow.selectBet')}
                  </span>
                  {activeBuffs.doublePayout && (
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-black uppercase text-amber-100 border border-amber-200/40 bg-amber-950/50">
                      {t('casino.highlow.boosterActive')}
                    </span>
                  )}
                  {activeBuffs.lossShield && (
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-black uppercase text-rose-100 border border-rose-300/40 bg-rose-950/50">
                      {t('casino.highlow.shieldActive')}
                    </span>
                  )}
                </div>

                {practice && practiceItemStep !== 'play' ? (
                  <div className="flex w-full flex-col gap-2">
                    {(['peek_card', 'double_payout', 'loss_shield'] as CasinoItemType[]).map((type) => {
                      const info = CASINO_ITEMS_INFO[type]
                      const current = practiceItemStep === type
                      const used =
                        (type === 'peek_card' && activeBuffs.peekCard) ||
                        (type === 'double_payout' && activeBuffs.doublePayout) ||
                        (type === 'loss_shield' && activeBuffs.lossShield)
                      return (
                        <button
                          key={type}
                          type="button"
                          data-casino-coach={current ? `item-${type}` : undefined}
                          disabled={!current}
                          onClick={() => handleUseItemByType(type)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                            used
                              ? 'border-amber-200/50 bg-slate-800/70'
                              : current
                                ? 'border-amber-300/70 bg-black/40'
                                : 'border-white/10 bg-black/20 opacity-40'
                          }`}
                        >
                          <span className="flex items-center gap-2 text-sm font-black text-slate-100">
                            <span>{info.icon}</span>
                            <span>{t(`casino.highlow.items.${type}.name`, { defaultValue: info.name })}</span>
                          </span>
                          <span className="text-[11px] font-bold text-amber-100">
                            {used ? t('casino.highlow.inUse', { defaultValue: '사용중' }) : info.icon}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 w-full pt-1">
                  <div className="grid grid-cols-2 gap-3.5 w-full">
                    <button
                      onClick={() => handleSelectChoice('LOW')}
                      disabled={practice}
                      className={`group relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl hl-btn-low transition-all duration-200 hover:scale-[1.03] active:scale-95 font-mono ${
                        activeBuffs.doublePayout ? 'hl-btn-boost' : ''
                      } ${practice ? 'opacity-40' : ''}`}
                    >
                      <span className="text-xl sm:text-2xl font-black tracking-widest flex items-center gap-1.5">
                        <span>▼</span>
                        <span>{t('casino.highlow.low')}</span>
                      </span>
                      <span className="text-xs font-black mt-0.5 opacity-90">
                        +${lowWinVal.toLocaleString()} <span className="text-[10px] font-bold">({lowPayout}x)</span>
                      </span>
                    </button>

                    <button
                      data-casino-coach="high"
                      onClick={() => handleSelectChoice('HIGH')}
                      disabled={practice && practiceItemStep !== 'play'}
                      className={`group relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl hl-btn-high transition-all duration-200 hover:scale-[1.03] active:scale-95 font-mono ${
                        activeBuffs.doublePayout ? 'hl-btn-boost' : ''
                      }`}
                    >
                      <span className="text-xl sm:text-2xl font-black tracking-widest flex items-center gap-1.5">
                        <span>▲</span>
                        <span>{t('casino.highlow.high')}</span>
                      </span>
                      <span className="text-xs font-black mt-0.5 opacity-90">
                        +${highWinVal.toLocaleString()} <span className="text-[10px] font-bold">({highPayout}x)</span>
                      </span>
                    </button>
                  </div>

                  {practice ? null : (
                  <button
                    onClick={() => handleSelectChoice('TIE')}
                    className={`group relative flex items-center justify-between px-5 py-3 rounded-xl hl-btn-tie transition-all duration-200 hover:scale-[1.01] active:scale-95 font-mono ${
                      activeBuffs.doublePayout ? 'hl-btn-boost' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-200">◆</span>
                      <span className="text-xl sm:text-2xl font-black tracking-widest">{t('casino.highlow.tie')}</span>
                      <span className="text-[10px] font-black text-slate-900 bg-slate-200 px-2 py-0.5 rounded-full uppercase">
                        {activeBuffs.doublePayout ? t('casino.highlow.tieJackpotBooster') : t('casino.highlow.tieJackpot')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-slate-100">
                        +${tieWinVal.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300 ml-1">
                        ({tiePayout}x)
                      </span>
                    </div>
                  </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-12 flex items-center justify-center font-mono text-xs text-slate-200/80 font-bold">
                {phase === 'DEALING_DEALER' && t('casino.highlow.dealersTurn')}
                {phase === 'DEALING_PLAYER' && t('casino.highlow.playersTurn')}
                {phase === 'SHOWDOWN_RESULT' && '결과 확인 중...'}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center relative z-10">
            <span className="hl-card-label font-mono mb-2">
              {t('casino.highlow.playersCard')} {userChoice ? `[BET: ${userChoice}]` : ''}
            </span>

            <div className="hl-card-slot flex items-center justify-center" data-casino-coach="flip">
              <div className={isPlayerFlyIn ? 'animate-fly-player' : ''}>
                <CardView
                  card={playerCard}
                  isFaceUp={isPlayerFaceUp}
                  isRevealing={isPlayerRevealing}
                  isPeeking={activeBuffs.peekCard}
                  isLarge
                  className={
                    gameResult === 'DRAW' ? 'outline outline-1 outline-slate-300/50' : ''
                  }
                  onClick={
                    phase === 'DEALING_PLAYER'
                      ? handleFlipPlayerCard
                      : undefined
                  }
                  pulseText={
                    phase === 'DEALING_PLAYER' ? t('casino.highlow.flipCard') : undefined
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: glass stats / inventory */}
        <div className="hl-glass-panel hidden lg:flex flex-col justify-between p-3.5 sm:p-4 font-mono text-xs relative overflow-hidden h-full min-h-0">
          <div className="space-y-2.5 flex-1 flex flex-col min-h-0 overflow-hidden">
                <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center justify-between">
                  <span>{t('casino.highlow.tableStats', { defaultValue: '테이블 통계' })}</span>
                </h4>

                <div className="space-y-3.5">
                  <div className="relative p-3 hl-glass-card group">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {totalWinnings > 0
                          ? t('casino.highlow.currentRoundBet', { defaultValue: '현재 배팅금' })
                          : t('casino.highlow.currentAnte', { defaultValue: '기본 판돈 (ANTE)' })}
                      </p>
                    </div>
                    <p className="text-xl font-black text-amber-100/95 mt-1">
                      ${effectiveBet.toLocaleString()}
                    </p>
                  </div>

                  <div className="relative p-3.5 hl-glass-card border-amber-200/20">
                    {phase === 'SHOWDOWN_RESULT' && gameResult && (
                      <div className="absolute -top-3.5 right-3 z-30 pointer-events-none">
                        {gameResult === 'WIN' && (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black text-slate-950 bg-amber-200 animate-gold-cash-burst">
                            +${rewardAmount.toLocaleString()} 💰
                          </span>
                        )}
                        {gameResult === 'LOSS' && (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black text-white bg-rose-700 animate-red-cash-drain">
                            {totalWinnings > 0
                              ? `+$${totalWinnings.toLocaleString()} 퇴장`
                              : t('casino.highlow.exitGameBtn', { defaultValue: '퇴장' })}
                          </span>
                        )}
                        {gameResult === 'DRAW' && (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black text-slate-100 bg-slate-700 border border-white/20 animate-pop-in">
                            +${totalWinnings > 0 ? totalWinnings.toLocaleString() : effectiveAnte.toLocaleString()} (HOLD)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest flex items-center gap-1">
                        <span>🏆</span>
                        <span>{t('casino.highlow.myStationAssets', { defaultValue: '누적 당첨 금액' })}</span>
                      </p>
                    </div>

                    <div className="text-2xl font-black text-amber-100 mt-1">
                      <AnimatedMoneyCounter value={totalWinnings} />
                    </div>
                  </div>

                  <div className="p-3 sm:p-3.5 hl-glass-card flex-1 min-h-0 flex flex-col overflow-hidden space-y-2">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5 shrink-0">
                      <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🎒</span>
                        <span>
                          {t('casino.highlow.myInventory', { count: inventory.length, defaultValue: `내 인벤토리 (${inventory.length})` })}
                        </span>
                      </span>
                    </div>

                    {/* 활성 버프 표시 태그 */}
                    {(activeBuffs.doublePayout || activeBuffs.lossShield || activeBuffs.peekCard) && (
                      <div className="flex flex-wrap gap-1.5 py-0.5 shrink-0">
                        {activeBuffs.doublePayout && (
                          <span className="text-[10px] font-black text-slate-950 bg-amber-400 px-2.5 py-0.5 rounded-full shadow animate-pulse">
                            ⚡ 2X Payout
                          </span>
                        )}
                        {activeBuffs.lossShield && (
                          <span className="text-[10px] font-black text-white bg-pink-600 px-2.5 py-0.5 rounded-full shadow animate-pulse">
                            🛡️ Shield Active
                          </span>
                        )}
                        {activeBuffs.peekCard && (
                          <span className="text-[10px] font-black text-slate-950 bg-cyan-400 px-2.5 py-0.5 rounded-full shadow animate-pulse">
                            👁️ Peek Sensor
                          </span>
                        )}
                      </div>
                    )}

                    {peekHintText && (
                      <div className="p-2 rounded-lg bg-cyan-950/90 border border-cyan-400/60 text-[10px] font-bold text-cyan-200 animate-pop-in shrink-0">
                        {peekHintText}
                      </div>
                    )}

                    {/* 4종 아이템 수량 기반 인벤토리 슬롯 */}
                    <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                      {(['peek_card', 'double_payout', 'loss_shield'] as CasinoItemType[]).map((type) => {
                        const info = CASINO_ITEMS_INFO[type]
                        const count = inventory.filter((i) => i.type === type).length
                        const isAlreadyActive =
                          (type === 'peek_card' && activeBuffs.peekCard) ||
                          (type === 'double_payout' && activeBuffs.doublePayout) ||
                          (type === 'loss_shield' && activeBuffs.lossShield)

                        const isAvailable = count > 0 && !isAlreadyActive

                        return (
                          <button
                            key={type}
                            onClick={() => handleUseItemByType(type)}
                            disabled={!isAvailable}
                            className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group shrink-0 ${
                              isAlreadyActive
                                ? 'bg-slate-800/50 border-slate-400/40 text-slate-200'
                                : count > 0
                                ? 'bg-black/30 hover:bg-black/45 border-white/15 hover:border-white/30 active:scale-[0.98]'
                                : 'bg-black/20 border-white/5 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="text-xl sm:text-2xl shrink-0 group-hover:scale-110 transition-transform">{info.icon}</span>
                              <span className="text-xs sm:text-sm font-black text-slate-100 tracking-wide">
                                {t(`casino.highlow.items.${type}.name`, { defaultValue: info.name })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isAlreadyActive ? (
                                <span className="text-[10px] font-black text-slate-950 bg-slate-200 px-2.5 py-0.5 rounded-full uppercase">
                                  {t('casino.highlow.inUse', { defaultValue: '사용중' })}
                                </span>
                              ) : (
                                <span
                                  className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-lg border ${
                                    count > 0
                                      ? 'text-slate-950 bg-amber-200/90 border-amber-100/50'
                                      : 'text-slate-500 bg-slate-900 border-slate-800'
                                  }`}
                                >
                                  x{count}
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FLOATING OVERLAY POPUP MODAL FOR SHOWDOWN RESULT */}
            {phase === 'SHOWDOWN_RESULT' && gameResult && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-pop-in select-none">
                <div
                  className={`w-full max-w-sm p-5 rounded-3xl bg-slate-950/95 border ${
                    gameResult === 'WIN'
                      ? 'border-amber-300/50'
                      : gameResult === 'DRAW'
                      ? 'border-slate-400/50'
                      : 'border-rose-500/60'
                  } flex flex-col items-center space-y-4 font-sans text-center shadow-2xl relative overflow-hidden`}
                >
                  {/* Top Result Badge & Amount */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`px-4 py-1 rounded-full text-xs font-black uppercase shadow-lg flex items-center gap-1.5 ${
                        gameResult === 'WIN'
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-amber-500/50'
                          : gameResult === 'DRAW'
                          ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-cyan-950/80'
                          : 'bg-rose-950 border border-rose-500 text-rose-300 shadow-rose-950/80'
                      }`}
                    >
                      <span>{gameResult === 'WIN' ? '🎉' : gameResult === 'DRAW' ? '🤝' : '💀'}</span>
                      <span>
                        {gameResult === 'WIN'
                          ? t('casino.highlow.victoryWin', { defaultValue: '승리!' })
                          : gameResult === 'DRAW'
                          ? t('casino.highlow.draw', { defaultValue: '무승부' })
                          : t('casino.highlow.betDefeat', { defaultValue: '패배' })}
                      </span>
                    </span>

                    <div
                      className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                        gameResult === 'WIN'
                          ? 'text-amber-200'
                          : gameResult === 'LOSS'
                          ? 'text-amber-200'
                          : 'text-slate-200'
                      }`}
                    >
                      {gameResult === 'WIN'
                        ? `+$${rewardAmount.toLocaleString()}`
                        : gameResult === 'LOSS'
                        ? `$${totalWinnings.toLocaleString()}`
                        : t('casino.highlow.antePreserved', { defaultValue: '판돈 보존' })}
                    </div>
                  </div>

                  {/* Clean 2-Line Explanation: 1. Cumulative Winnings, 2. Next Round Bet / Loss Notice */}
                  {!practice && gameResult === 'WIN' && (
                    <div className="w-full space-y-2 py-3 px-4 rounded-2xl bg-slate-900/90 border border-amber-400/30 text-xs">
                      <div className="flex items-center justify-between font-bold text-amber-300">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <span>🏆</span>
                          <span>{t('casino.highlow.myStationAssets', { defaultValue: '누적 당첨금액' })}:</span>
                        </span>
                        <span className="font-mono text-base text-amber-300 font-black">${totalWinnings.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center justify-between font-bold text-amber-200/90 border-t border-slate-800 pt-2">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>🔥</span>
                          <span>{t('casino.highlow.nextBetNotice')}</span>
                        </span>
                        <span className="font-mono text-sm text-amber-400 font-bold">${totalWinnings.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {gameResult === 'LOSS' && (
                    <div className="w-full p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-100 text-center font-medium">
                      {t('casino.highlow.lossExitNotice')}
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 w-full pt-1">
                    {practice ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onPracticeDoneRef.current?.()}
                          className="flex-1 py-3 px-2.5 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-amber-200 hover:brightness-105 border border-amber-100/60 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <span>▶</span>
                          <span>{t('casino.highlow.nextRoundBtn')}</span>
                        </button>
                        <button
                          type="button"
                          data-casino-coach="result"
                          onClick={() => onPracticeDoneRef.current?.()}
                          className="flex-1 py-3 px-2.5 rounded-2xl font-black text-xs sm:text-sm text-slate-100 bg-slate-800 hover:brightness-110 border border-white/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <span>{t('casino.highlow.cashoutBtn')}</span>
                        </button>
                      </>
                    ) : gameResult === 'WIN' || gameResult === 'DRAW' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startNewGameLoop()}
                          className="flex-1 py-3 px-2.5 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-amber-200 hover:brightness-105 border border-amber-100/60 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <span>▶</span>
                          <span>{t('casino.highlow.nextRoundBtn')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExitGame(false)}
                          className="flex-1 py-3 px-2.5 rounded-2xl font-black text-xs sm:text-sm text-slate-100 bg-slate-800 hover:brightness-110 border border-white/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <span>{t('casino.highlow.cashoutBtn')}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleExitGame(true)}
                        className="flex-1 py-3 px-2.5 rounded-2xl font-black text-xs sm:text-sm text-white bg-slate-700 hover:brightness-110 border border-white/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <span>{t('casino.highlow.collectExitBtn')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
      </div>
      </div>

      <div className="relative z-10 flex shrink-0 items-center justify-between text-xs font-mono text-slate-400 border-t border-white/10 pt-3">
        <span>{currentConfig.name}</span>
        <span>HIGH-LOW DUEL</span>
      </div>

      {dealerDialoguePlay && (
        <HighLowDealerDialogue
          play={dealerDialoguePlay}
          locale={locale}
          onClose={() => {
            const wasLoss = Boolean(dealerDialoguePlay.isLoss)
            setDealerDialoguePlay(null)
            if (wasLoss) handleExitGame(true)
          }}
        />
      )}
      {practice && phase !== 'DEALING_DEALER' && phase !== 'LOBBY' ? (
        <CasinoPracticeCoach
          titleKey="casino.tutorial.highlowTitle"
          bodyKey={
            phase === 'DEALING_PLAYER'
              ? 'casino.tutorial.highlowFlip'
              : phase === 'SHOWDOWN_RESULT'
                ? practiceReplay
                  ? 'casino.tutorial.highlowResultReplay'
                  : 'casino.tutorial.highlowResult'
                : practiceItemStep === 'peek_card'
                  ? 'casino.tutorial.highlowItemPeek'
                  : practiceItemStep === 'double_payout'
                    ? 'casino.tutorial.highlowItemDouble'
                    : practiceItemStep === 'loss_shield'
                      ? 'casino.tutorial.highlowItemShield'
                      : 'casino.tutorial.highlowChoice'
          }
          selector={
            phase === 'DEALING_PLAYER'
              ? '[data-casino-coach="flip"]'
              : phase === 'SHOWDOWN_RESULT'
                ? '[data-casino-coach="result"]'
                : practiceItemStep === 'play'
                  ? '[data-casino-coach="high"]'
                  : `[data-casino-coach="item-${practiceItemStep}"]`
          }
          onSkip={() => onPracticeDoneRef.current?.()}
        />
      ) : null}
    </div>
  )
}
