import React, { useState, useEffect, useRef } from 'react'
import {
  type HighLowConfigMap,
  type Card,
  type HighLowRoomId,
  type CasinoItem,
  type CasinoItemType,
  CASINO_ITEMS_INFO,
  SUIT_SYMBOLS,
  SUIT_COLORS,
  getCardDisplayValue,
  calculatePayout,
  createDeck,
  rollRewardItem,
} from './highLowConfig'
import { loadUserInventory, saveUserInventory } from './highLowStore'

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
  onHireStaff?: () => void
  onClose?: () => void
  initialRoomId?: HighLowRoomId
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
    box-shadow: 0 0 25px rgba(245, 158, 11, 0.6);
    border-color: rgba(251, 191, 36, 0.8);
  }
  50% {
    transform: scale(1.06) translateY(-6px);
    box-shadow: 0 0 50px rgba(245, 158, 11, 0.95), 0 0 20px rgba(255, 255, 255, 0.8);
    border-color: rgba(255, 235, 59, 1);
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
/*  트럼프 카드 렌더링 컴포넌트 (.hl-card / .hl-card-back)                     */
/*  (부드러운 Scale Down 핑퐁 & Fade 연출 - 모서리 깨짐 0%)                   */
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
    ? 'w-28 h-40 sm:w-36 sm:h-52 lg:w-40 lg:h-56'
    : 'w-24 h-34 sm:w-28 sm:h-40 lg:w-32 lg:h-44'

  const isClickable = !!onClick && !isFaceUp

  // 뒷면 카드
  const renderBackView = () => (
    <div
      onClick={onClick}
      className={`hl-card-back relative flex flex-col items-center justify-center ${cardSizeClass} rounded-2xl border-2 ${
        isClickable
          ? 'border-amber-400 animate-golden-card-pulse cursor-pointer'
          : 'border-amber-400/70 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
      } bg-slate-950 select-none transition-all duration-200 hover:scale-[1.07] hover:border-yellow-300 overflow-hidden ${className}`}
    >
      <div className="absolute inset-1.5 rounded-xl border border-amber-400/40 bg-slate-900 flex flex-col items-center justify-center p-2 overflow-hidden">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#f59e0b_1.5px,transparent_1.5px)] [background-size:10px_10px]" />
        <div className="w-full h-full border border-amber-400/30 rounded-lg flex flex-col items-center justify-center p-2 bg-slate-950/90">
          <svg
            className="w-10 h-10 text-amber-400 animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" strokeWidth="1.5" />
            <polyline points="2 17 12 22 22 17" strokeWidth="1.5" />
            <polyline points="2 12 12 17 22 12" strokeWidth="1.5" />
          </svg>
          <span className="text-[9px] font-mono text-amber-300 font-bold mt-2 tracking-widest">
            HIGH-LOW DUEL
          </span>
        </div>
      </div>

      {/* Interactive Finger Click Guide Badge */}
      {isClickable && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[1px] pointer-events-none">
          <span className="text-3xl animate-finger-tap drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]">
            👆
          </span>
          <span className="mt-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.9)] tracking-wider animate-pulse">
            CLICK TO FLIP!
          </span>
        </div>
      )}

      {pulseText && !isClickable && (
        <div className="absolute -bottom-8 whitespace-nowrap text-[11px] font-bold text-amber-300 bg-slate-950/95 border border-amber-400/80 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-bounce z-20">
          ✨ {pulseText}
        </div>
      )}
    </div>
  )

  if (!card) return renderBackView()

  const suitSymbol = SUIT_SYMBOLS[card.suit]
  const color = SUIT_COLORS[card.suit]
  const displayVal = getCardDisplayValue(card.value)

  // 앞면 카드
  const renderFrontView = () => (
    <div
      onClick={onClick}
      className={`hl-card relative flex flex-col justify-between ${cardSizeClass} rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 border-2 border-slate-300 shadow-[0_12px_35px_rgba(0,0,0,0.6)] p-3 select-none overflow-hidden ${className}`}
      style={{ color }}
    >
      {/* Top Left [숫자 + 무늬] */}
      <div className="absolute top-2.5 left-2.5 flex flex-col items-center leading-none font-bold">
        <span className={`${isLarge ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'} font-black tracking-tighter`}>
          {displayVal}
        </span>
        <span className={`${isLarge ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} mt-0.5`}>
          {suitSymbol}
        </span>
      </div>

      {/* Center Center 대형 무늬 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`${isLarge ? 'text-7xl sm:text-8xl' : 'text-5xl sm:text-6xl'} opacity-90 drop-shadow-md`}>
          {suitSymbol}
        </span>
      </div>

      {/* Bottom Right 180도 뒤집힌 [숫자 + 무늬] (우측 하단 정렬) */}
      <div className="absolute bottom-2.5 right-2.5 flex flex-col items-center leading-none font-bold rotate-180">
        <span className={`${isLarge ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'} font-black tracking-tighter`}>
          {displayVal}
        </span>
        <span className={`${isLarge ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} mt-0.5`}>
          {suitSymbol}
        </span>
      </div>
    </div>
  )

  // 카드 엿보기 (Peek) 뷰: 복잡한 뱃지 제거 후 깨끗한 앞면 카드를 반투명(opacity-55)하게만 보여줌!
  if (isPeeking && !isFaceUp && !isRevealing) {
    return (
      <div onClick={onClick} className="relative group cursor-pointer">
        <div className="opacity-55 transition-all duration-300 group-hover:opacity-90 group-hover:scale-105 shadow-[0_0_30px_rgba(6,182,212,0.85)] rounded-2xl">
          {renderFrontView()}
        </div>
      </div>
    )
  }

  // 카드가 뒤집히는 순간: 부드러운 스케일 페이드 (Scale & Fade) 전환
  if (isRevealing) {
    return (
      <div className={`relative ${cardSizeClass}`}>
        {/* 뒷면 카드: 스케일 다운 + 페이드 아웃 */}
        <div className="absolute inset-0 z-0 animate-scale-fade-out pointer-events-none">
          {renderBackView()}
        </div>

        {/* 앞면 카드: 스케일 핑퐁 바운스 + 페이드 인 */}
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
    const particles = Array.from({ length: 110 }, () => ({
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

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.25
        p.alpha -= p.decay
        p.rotation += p.vRot

        if (p.alpha > 0) {
          ctx.save()
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotation)
          ctx.fillStyle = p.color
          ctx.shadowBlur = 10
          ctx.shadowColor = p.color
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
          ctx.restore()
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
        <h3 className="text-6xl sm:text-8xl font-black tracking-tighter bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(245,158,11,1)] whitespace-nowrap">
          🔥 COMBO X{comboCount}!
        </h3>
        <span className="text-sm sm:text-base font-black text-amber-300 tracking-wider drop-shadow-[0_0_15px_rgba(245,158,11,0.9)] mt-1">
          ✨ NEXT ANTE {comboMultiplier}X BOOST! ✨
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  돈 카운팅 애니메이션 컴포넌트 (AnimatedMoneyCounter)                     */
/* -------------------------------------------------------------------------- */
const AnimatedMoneyCounter: React.FC<{ value: number }> = ({ value }) => {
  const [displayVal, setDisplayVal] = useState(value)
  const prevValueRef = useRef(value)

  useEffect(() => {
    const startVal = prevValueRef.current
    const endVal = value
    if (startVal === endVal) return

    const duration = 600
    const startTime = performance.now()

    const updateCounter = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const current = Math.floor(startVal + (endVal - startVal) * progress)
      setDisplayVal(current)

      if (progress < 1) {
        requestAnimationFrame(updateCounter)
      } else {
        setDisplayVal(endVal)
        prevValueRef.current = endVal
      }
    }

    requestAnimationFrame(updateCounter)
  }, [value])

  return <span>${displayVal.toLocaleString()}</span>
}

/* -------------------------------------------------------------------------- */
/*  HighLowMinigame 메인 컴포넌트                                              */
/* -------------------------------------------------------------------------- */
export const HighLowMinigame: React.FC<HighLowMinigameProps> = ({
  configs,
  userChipsMap,
  onUpdateChips,
  onHireStaff,
  onClose,
  initialRoomId = 'legend',
}) => {
  const roomConfigs = configs
  const [selectedRoomId, setSelectedRoomId] = useState<HighLowRoomId>(initialRoomId)
  const [phase, setPhase] = useState<GamePhase>('LOBBY')

  const currentConfig = roomConfigs[selectedRoomId]
  const currentChips = userChipsMap[selectedRoomId] ?? currentConfig.startChips

  // 콤보 시스템 (연속 승리 시 콤보 판돈 2^comboCount배 증가!)
  const [comboCount, setComboCount] = useState(0)

  // 라운드 보상 아이템 & 보유 인벤토리 & 버프 상태
  const [currentRewardItem, setCurrentRewardItem] = useState<CasinoItem | null>(null)
  const [inventory, setInventory] = useState<CasinoItem[]>(() => loadUserInventory(initialRoomId))

  // 룸 변경 시 해당 룸 보유 인벤토리 로컬스토리지 자동 로드
  useEffect(() => {
    setInventory(loadUserInventory(selectedRoomId))
  }, [selectedRoomId])

  // 인벤토리 영구 저장 동기화 헬퍼
  const updateInventory = (updater: CasinoItem[] | ((prev: CasinoItem[]) => CasinoItem[])) => {
    setInventory((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveUserInventory(selectedRoomId, next)
      return next
    })
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

  // 통계
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 })

  // 게임 로그
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

  // initialRoomId가 주어지면 중복 룸 선택 로비를 건너뛰고 바로 실제 하이로우 카드 게임 테이블로 직행!
  const hasAutoStartedRef = useRef(false)
  useEffect(() => {
    if (!hasAutoStartedRef.current && initialRoomId) {
      hasAutoStartedRef.current = true
      handleEnterRoom(initialRoomId)
    }
  }, [initialRoomId])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // 1. 룸 선택 및 입장
  const handleEnterRoom = (roomId: HighLowRoomId) => {
    setSelectedRoomId(roomId)
    const conf = configs[roomId]
    const chips = userChipsMap[roomId] ?? conf.startChips

    if (chips < conf.ante) {
      alert(`[${conf.name}] 입장 배팅금($${conf.ante.toLocaleString()})이 부족합니다!`)
      return
    }

    addLog(`=== [${conf.name}] 테이블에 입장하셨습니다. ===`, 'info')
    startNewGameLoop(roomId)
  }

  // 2. 새로운 판 시작 (DEALING_DEALER)
  const startNewGameLoop = (roomId: HighLowRoomId = selectedRoomId) => {
    const conf = roomConfigs[roomId]
    const chips = userChipsMap[roomId] ?? conf.startChips

    // 콤보 계산: 판돈 = ANTE * 2^comboCount
    const comboMultiplier = Math.pow(2, Math.min(comboCount, conf.maxComboLimit ?? 5))
    const currentBet = conf.ante * comboMultiplier

    if (chips < currentBet) {
      addLog(`판돈 $${currentBet.toLocaleString()} (콤보 ${comboCount}x) 부족으로 게임을 진행할 수 없습니다.`, 'loss')
      setComboCount(0)
      setPhase('LOBBY')
      return
    }

    // 판돈 차감
    const nextChips = chips - currentBet
    onUpdateChips(roomId, nextChips)
    addLog(`Ante $${currentBet.toLocaleString()} ${comboCount > 0 ? `(🔥 콤보 ${comboMultiplier}배 판돈)` : ''} 차감. 게임이 시작됩니다.`, 'info')

    // 라운드 보상 아이템 가챠 세팅 (개별 아이템 등장 확률 적용)
    const rewardItem = rollRewardItem(conf)
    setCurrentRewardItem(rewardItem)
    if (rewardItem) {
      addLog(`🎁 이번 라운드 드롭 보상 아이템 [${rewardItem.name}] 등장! (승리 시 수령)`, 'info')
    }

    setPeekHintText(null)

    // 카드 초기화 (딜러 카드 및 플레이어 카드 미리 준비)
    const newDeck = createDeck()
    const drawnDealer = newDeck.shift()!
    const drawnPlayer = newDeck.shift()!

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

    // 엿보기 카드 끄기: 배팅 선택 시 보이던 엿보기 반투명 효과가 꺼지고 다시 뒷면 카드 가림 상태로 완벽 복원!
    if (activeBuffs.peekCard) {
      setActiveBuffs((b) => ({ ...b, peekCard: false }))
      setPeekHintText(null)
    }

    setUserChoice(choice)
    const payout = calculatePayout(dealerCard.value, choice, currentConfig.houseEdge)
    addLog(`유저가 [${choice}] (배당률 ${payout}x) 를 선택했습니다.`, 'info')

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
    // 인벤토리에서 해당 타입의 아이템 1개 찾기
    const targetItem = inventory.find((i) => i.type === itemType)
    if (!targetItem) return

    // 1. 버프형 아이템 한 턴 중복 사용 금지 체크
    if (itemType === 'peek_card' && activeBuffs.peekCard) {
      addLog(`⚠️ 이미 이번 라운드에 [카드 엿보기] 센서가 가동 중입니다. (한 턴 중복 사용 불가)`, 'draw')
      return
    }
    if (itemType === 'double_payout' && activeBuffs.doublePayout) {
      addLog(`⚠️ 이미 이번 라운드에 [배당 2배] 부스터가 적용 중입니다. (한 턴 중복 사용 불가)`, 'draw')
      return
    }
    if (itemType === 'loss_shield' && activeBuffs.lossShield) {
      addLog(`⚠️ 이미 이번 라운드에 [패배 쉴드]가 발동 중입니다. (한 턴 중복 사용 불가)`, 'draw')
      return
    }

    if (itemType === 'staff_hire') {
      // 스태프 영입 카드는 1개 인벤토리에서 소모
      updateInventory((prev) => {
        const idx = prev.findIndex((i) => i.type === 'staff_hire')
        if (idx !== -1) {
          const next = [...prev]
          next.splice(idx, 1)
          return next
        }
        return prev
      })

      if (onHireStaff) {
        onHireStaff()
      } else {
        try {
          for (let i = 0; i < 10; i++) {
            const saveKey = `broadcast-game-save-slot-${i}`
            const raw = localStorage.getItem(saveKey)
            if (raw) {
              const data = JSON.parse(raw)
              if (data && data.managerState) {
                const hired = data.managerState.hiredStaffIds || []
                const casinoStaffId = `staff_casino_${Date.now()}`
                if (!hired.includes(casinoStaffId)) {
                  data.managerState.hiredStaffIds = [...hired, casinoStaffId]
                  if (!data.hiredStaffSalaries) data.hiredStaffSalaries = {}
                  if (!data.hiredStaffStartMonths) data.hiredStaffStartMonths = {}
                  data.hiredStaffSalaries[casinoStaffId] = 3600
                  data.hiredStaffStartMonths[casinoStaffId] = 1
                  localStorage.setItem(saveKey, JSON.stringify(data))
                }
              }
            }
          }
        } catch (e) {
          console.error(e)
        }
      }
      addLog(`🎩 [스태프 영입] 사용 완료! 방송국 전문 스태프 정식 고용 등록 성공! (스태프 관리 메뉴 확인)`, 'win')
    } else if (itemType === 'peek_card') {
      setActiveBuffs((b) => ({ ...b, peekCard: true }))
      if (playerCard) {
        const pVal = playerCard.value
        const suitSym = SUIT_SYMBOLS[playerCard.suit]
        const displayV = getCardDisplayValue(pVal)
        setPeekHintText(`👁️ X-RAY 엿보기 작동: [ ${displayV} ${suitSym} ] 카드 투시 중!`)
      }
      addLog(`👁️ [카드 엿보기] 아이템 사용! 플레이어 카드가 엑스레이 투명 모드로 전환됩니다. (정산 시 1개 소모)`, 'info')
    } else if (itemType === 'double_payout') {
      setActiveBuffs((b) => ({ ...b, doublePayout: true }))
      addLog(`⚡ [배당 2배] 사용! 승리 수령금 2배 증폭 적용! (정산 시 1개 소모)`, 'info')
    } else if (itemType === 'loss_shield') {
      setActiveBuffs((b) => ({ ...b, lossShield: true }))
      addLog(`🛡️ [패배 쉴드] 사용! 패배 시 판돈 손실 100% 방어! (정산 시 1개 소모)`, 'info')
    }
  }

  // 4. 플레이어 대형 카드 클릭 후 정산
  const handleFlipPlayerCard = () => {
    if (phase !== 'DEALING_PLAYER' || !dealerCard || !playerCard || !userChoice || isPlayerRevealing) return

    setIsPlayerRevealing(true)

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

      const comboMultiplier = Math.pow(2, Math.min(comboCount, currentConfig.maxComboLimit ?? 5))
      const currentBet = currentConfig.ante * comboMultiplier

      if (outcome === 'WIN') {
        const reward = Math.floor(currentBet * rawPayout)
        setRewardAmount(reward)
        const updatedChips = currentChips + reward
        onUpdateChips(selectedRoomId, updatedChips)
        setStats((s) => ({ ...s, wins: s.wins + 1 }))

        const nextCombo = comboCount + 1
        setComboCount(nextCombo)

        if (currentRewardItem) {
          updateInventory((inv) => {
            if (currentRewardItem.type === 'staff_hire' && inv.some((item) => item.type === 'staff_hire')) {
              addLog(`🎁 [스태프 영입 계약서] 이미 인벤토리에 스태프 계약서를 보유하고 있어 중복 수령되지 않습니다.`, 'info')
              return inv
            }
            addLog(`🎁 라운드 보상 획득! [${currentRewardItem.name}] 아이템 수령 완료!`, 'win')
            return [...inv, currentRewardItem]
          })
        }

        addLog(`🎉 승리! 플레이어 [${getCardDisplayValue(pVal)}] vs 딜러 [${getCardDisplayValue(dVal)}] -> +$${reward.toLocaleString()} 획득! (🔥 ${nextCombo}연속 콤보 달성!)`, 'win')
      } else if (outcome === 'DRAW') {
        setRewardAmount(currentBet)
        const refundedChips = currentChips + currentBet
        onUpdateChips(selectedRoomId, refundedChips)
        setStats((s) => ({ ...s, draws: s.draws + 1 }))
        // DRAW (무승부) 발생 시 콤보 수치(comboCount) 100% 온전히 유지!
        addLog(`🤝 무승부(DRAW)! 딜러와 동일한 카드 [${getCardDisplayValue(pVal)}] -> Ante $${currentBet.toLocaleString()} 전액 환불 & 🔥 ${comboCount}연속 콤보 완벽 유지!`, 'draw')
      } else {
        if (activeBuffs.lossShield) {
          // 🛡️ 패배 무효화 쉴드 완벽 발동: 판돈 100% 원상 복구 & 연속 콤보 수치 유지!
          setGameResult('DRAW')
          setRewardAmount(currentBet)
          const refundedChips = currentChips + currentBet
          onUpdateChips(selectedRoomId, refundedChips)
          setStats((s) => ({ ...s, draws: s.draws + 1 }))
          addLog(`🛡️ 패배 무효화 쉴드 완벽 발동! 판돈 $${currentBet.toLocaleString()} 손실 100% 방어 & 🔥 ${comboCount}연속 콤보 완벽 유지!`, 'win')
        } else {
          setGameResult('LOSS')
          setComboCount(0)
          setRewardAmount(0)
          setStats((s) => ({ ...s, losses: s.losses + 1 }))
          addLog(`💀 패배! 플레이어 [${getCardDisplayValue(pVal)}] vs 딜러 [${getCardDisplayValue(dVal)}]`, 'loss')
        }
      }

      // 정산 완료 시 활성화되었던 버프 아이템들 차감 소모
      if (activeBuffs.peekCard || activeBuffs.doublePayout || activeBuffs.lossShield) {
        updateInventory((prev) => {
          let next = [...prev]
          if (activeBuffs.peekCard) {
            const idx = next.findIndex((i) => i.type === 'peek_card')
            if (idx !== -1) next.splice(idx, 1)
          }
          if (activeBuffs.doublePayout) {
            const idx = next.findIndex((i) => i.type === 'double_payout')
            if (idx !== -1) next.splice(idx, 1)
          }
          if (activeBuffs.lossShield) {
            const idx = next.findIndex((i) => i.type === 'loss_shield')
            if (idx !== -1) next.splice(idx, 1)
          }
          return next
        })
      }

      setActiveBuffs({ doublePayout: false, lossShield: false, peekCard: false })
    }, 350)
  }

  const mult = activeBuffs.doublePayout ? 2 : 1
  const comboMultiplier = Math.pow(2, Math.min(comboCount, currentConfig.maxComboLimit ?? 5))
  const effectiveBet = currentConfig.ante * comboMultiplier

  const rawLowPayout = dealerCard ? calculatePayout(dealerCard.value, 'LOW', currentConfig.houseEdge) : 1.95
  const rawHighPayout = dealerCard ? calculatePayout(dealerCard.value, 'HIGH', currentConfig.houseEdge) : 1.95
  const rawTiePayout = 50.0

  const lowPayout = Math.round(rawLowPayout * mult * 100) / 100
  const highPayout = Math.round(rawHighPayout * mult * 100) / 100
  const tiePayout = Math.round(rawTiePayout * mult * 100) / 100

  const lowWinVal = Math.floor(effectiveBet * lowPayout)
  const highWinVal = Math.floor(effectiveBet * highPayout)
  const tieWinVal = Math.floor(effectiveBet * tiePayout)

  const totalDecided = stats.wins + stats.losses
  const winRate = totalDecided > 0 ? ((stats.wins / totalDecided) * 100).toFixed(1) : '0.0'

  /* -------------------------------------------------------------------------- */
  /*  RENDER: 1. LOBBY SCREEN                                                   */
  /* -------------------------------------------------------------------------- */
  if (phase === 'LOBBY') {
    return (
      <div className="relative w-full h-full min-h-0 flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-pink-500/20 shadow-2xl overflow-hidden font-sans select-none">
        <style>{CUSTOM_HIGH_LOW_STYLES}</style>

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
                  [ 참여하기 ]
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
  return (
    <div
      className={`relative w-full h-full min-h-0 flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-4 rounded-3xl border-2 ${
        gameResult === 'LOSS'
          ? 'border-rose-600 shadow-[0_0_100px_rgba(225,29,72,0.75)] animate-defeat-shake'
          : 'border-amber-400/80 shadow-[0_0_90px_rgba(245,158,11,0.45)]'
      } overflow-hidden font-sans select-none`}
    >
      <style>{CUSTOM_HIGH_LOW_STYLES}</style>
      <VictoryParticles active={gameResult === 'WIN'} />
      <VictoryComboOverlay key={`${gameResult}-${comboCount}`} active={gameResult === 'WIN'} comboCount={comboCount} />
      <DefeatParticles active={gameResult === 'LOSS'} />

      {/* Red Defeat Flash & Ambient Crimson Overlay */}
      {gameResult === 'LOSS' && (
        <div className="absolute inset-0 bg-gradient-to-b from-rose-950/60 via-rose-900/30 to-slate-950 pointer-events-none animate-defeat-flash z-20 border-4 border-rose-600/80" />
      )}

      {/* Whole Screen Golden Ambient Spotlight Glow & Rotating Rays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/28 via-slate-950/95 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#eab30825_1px,transparent_1px),linear-gradient(to_bottom,#eab30825_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      {/* Top Header Bar (Single Exit Button Only) */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-amber-400/30 pb-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center text-slate-950 text-lg sm:text-xl font-black shadow-lg shadow-amber-500/50">
            ♠
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              ★ {currentConfig.name} SPECIAL DUEL STAGE ★
            </span>
            <h2 className="text-lg sm:text-2xl font-black tracking-wider bg-gradient-to-r from-yellow-100 via-amber-300 to-amber-200 bg-clip-text text-transparent drop-shadow">
              VIP HIGH-LOW DUEL TABLE
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-xl border-2 border-amber-400/80 bg-slate-900/90 text-[11px] sm:text-xs font-black tracking-wider text-amber-300 hover:text-slate-950 hover:bg-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] transition-all"
            >
              ✕ 게임 종료 (EXIT)
            </button>
          )}
        </div>
      </div>

      {/* Full-Width Integrated Emerald Felt Casino Stage (화면 전체 100% 꽉 채우는 초록색 카지노 테이블 패널!) */}
      <div className="relative z-10 flex-1 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-b from-emerald-950 via-emerald-900/90 to-emerald-950 backdrop-blur-md shadow-[inset_0_0_90px_rgba(16,185,129,0.4),0_0_50px_rgba(16,185,129,0.3)] my-auto py-1 flex flex-col min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-3 sm:gap-4 items-stretch flex-1 min-h-0 overflow-hidden">
          {/* 1. LEFT COLUMN: Live Dealer Showcase & Round Item Drop Reward (까만 배경 완전 제거 & 펠트 카지노 테이블 투과!) */}
          <div className="hidden lg:flex flex-col justify-between p-2 sm:p-3 font-mono text-xs overflow-hidden bg-transparent border-none shadow-none">
            <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest border-b border-emerald-400/40 pb-1.5 flex items-center justify-between shrink-0">
                <span>★ LIVE DEALER PROFILE ★</span>
                <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-400/40">ONLINE</span>
              </h4>

              {/* Live Dealer CCTV Media Box (세로 3:4 럭셔리 대형 스탠딩 카지노 카드 프레임!) */}
              <div className="relative w-full aspect-[3/4] flex-1 min-h-[220px] max-h-[360px] rounded-2xl overflow-hidden border-2 border-amber-400/80 bg-emerald-950/60 shadow-[0_0_30px_rgba(245,158,11,0.4)] group">
                {currentConfig.dealerMediaUrl ? (
                  currentConfig.dealerMediaType === 'video' ? (
                    <video
                      src={currentConfig.dealerMediaUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={currentConfig.dealerMediaUrl}
                      alt={currentConfig.dealerName}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-emerald-950/80 to-emerald-900/40 text-emerald-200">
                    <div className="w-14 h-14 rounded-full border-2 border-amber-400/70 p-1 mb-1 bg-emerald-950 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <span className="text-3xl">🎩</span>
                    </div>
                    <span className="text-xs font-black text-amber-300 uppercase tracking-widest">
                      {currentConfig.dealerName}
                    </span>
                    <span className="text-[9px] text-amber-400/90 font-bold">
                      {currentConfig.dealerTitle}
                    </span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-2 bg-emerald-950/85 backdrop-blur-sm border-t border-amber-400/40 flex items-center justify-between font-mono">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-100">{currentConfig.dealerName}</h5>
                    <span className="text-[9px] text-amber-400 font-bold">{currentConfig.dealerTitle}</span>
                  </div>
                  <span className="text-[9px] font-bold text-amber-300 bg-emerald-900/80 px-2 py-0.5 rounded-full border border-amber-400/40">
                    ANTE ${currentConfig.ante.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* THIS ROUND REWARD ITEM BOX */}
              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-400/40 backdrop-blur-sm space-y-2 shadow-sm">
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1.5">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎁</span>
                    <span>THIS ROUND REWARD</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-amber-400/30">
                    DROP: {currentConfig.itemDropRate ?? 50}%
                  </span>
                </div>

                {currentRewardItem ? (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/80 via-emerald-950/90 to-amber-950/80 border-2 border-yellow-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] flex flex-col gap-1 animate-pop-in relative overflow-hidden">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0 animate-bounce">{currentRewardItem.icon}</span>
                      <h6 className="text-sm font-black text-amber-200 tracking-wide">{currentRewardItem.name}</h6>
                    </div>
                    <div className="text-[9px] font-bold text-amber-400/90 pl-8">
                      ✨ 승리 시 인벤토리에 자동 수령
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center text-emerald-300/60 text-[11px] font-bold">
                    보상 아이템 미등장
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-400/30 text-[10px] text-emerald-300/80 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>HIGH-LOW DUEL SALON</span>
              <span className="text-amber-400 font-black">VIP STAGE</span>
            </div>
          </div>

          {/* 2. CENTER COLUMN: Main Cards Duel Arena & Bet Deck */}
          <div className="flex flex-col items-center justify-between min-h-0 overflow-hidden">
          {/* Dealer Card Section (흰색 라운드 처리 카지노 카드 슬롯!) */}
          <div className="flex flex-col items-center relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-emerald-200 tracking-widest uppercase font-black bg-slate-950/90 px-3.5 py-1 rounded-full border border-emerald-400/50 shadow-md">
                DEALER'S CARD
              </span>
              {gameResult === 'LOSS' && (
                <span className="text-[10px] font-mono font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 px-2 py-0.5 rounded-full shadow-md animate-bounce">
                  👑 WINNER
                </span>
              )}
              {gameResult === 'DRAW' && (
                <span className="text-[10px] font-mono font-black text-cyan-950 bg-gradient-to-r from-cyan-400 to-sky-300 px-2 py-0.5 rounded-full shadow-md">
                  🤝 DRAW
                </span>
              )}
            </div>

            {/* 흰색 라운드 카지노 카드 슬롯 매트 */}
            <div className="p-2 sm:p-2.5 rounded-3xl border-2 border-dashed border-white/80 bg-white/10 backdrop-blur-sm shadow-[0_0_25px_rgba(255,255,255,0.35)] flex items-center justify-center">
              <div className={`relative ${isDealerFlyIn ? 'animate-fly-dealer' : ''}`}>
                <CardView
                  card={dealerCard}
                  isFaceUp={isDealerFaceUp}
                  isRevealing={isDealerRevealing}
                  className={
                    gameResult === 'LOSS'
                      ? 'ring-4 ring-amber-400 shadow-[0_0_50px_rgba(245,158,11,1)] scale-105 transition-all'
                      : gameResult === 'DRAW'
                      ? 'ring-2 ring-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.7)]'
                      : ''
                  }
                />
              </div>
            </div>
          </div>

          {/* Integrated Bet Choice & Non-Blocking Result Panel */}
          <div className="w-full max-w-xl my-2 z-20">
            {phase === 'WAITING_CHOICE' ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/95 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.6)] flex flex-col items-center space-y-3 animate-pop-in">
                <div className="text-center flex flex-col items-center gap-1">
                  <span className="px-4 py-1 rounded-full text-xs font-mono font-black uppercase tracking-widest text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-md">
                    SELECT YOUR BET
                  </span>
                  {activeBuffs.doublePayout && (
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-black uppercase text-slate-950 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.9)] animate-pulse">
                      ⚡ 2X PAYOUT BOOSTER ACTIVE (배당금 2배 실시간 적용!)
                    </span>
                  )}
                  {activeBuffs.lossShield && (
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-black uppercase text-white bg-gradient-to-r from-pink-600 to-rose-600 shadow-[0_0_15px_rgba(236,72,153,0.9)] animate-pulse">
                      🛡️ LOSS SHIELD ACTIVE (패배 시 판돈 손실 방어)
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3 w-full pt-1">
                  <div className="grid grid-cols-2 gap-3.5 w-full">
                    {/* Left: LOW Button */}
                    <button
                      onClick={() => handleSelectChoice('LOW')}
                      className={`group relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 hover:from-cyan-300 hover:to-sky-300 text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all duration-300 hover:scale-105 active:scale-95 font-mono ${
                        activeBuffs.doublePayout ? 'ring-4 ring-yellow-300 shadow-[0_0_40px_rgba(234,179,8,0.8)]' : ''
                      }`}
                    >
                      <span className="text-xl sm:text-2xl font-black tracking-widest text-slate-950 flex items-center gap-1.5">
                        <span>▼</span>
                        <span>LOW</span>
                      </span>
                      <span className="text-xs text-slate-950 font-black mt-0.5">
                        +${lowWinVal.toLocaleString()} <span className="text-[10px] text-slate-900 font-bold">({lowPayout}x)</span>
                      </span>
                    </button>

                    {/* Right: HIGH Button */}
                    <button
                      onClick={() => handleSelectChoice('HIGH')}
                      className={`group relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all duration-300 hover:scale-105 active:scale-95 font-mono ${
                        activeBuffs.doublePayout ? 'ring-4 ring-yellow-300 shadow-[0_0_40px_rgba(234,179,8,0.8)]' : ''
                      }`}
                    >
                      <span className="text-xl sm:text-2xl font-black tracking-widest text-slate-950 flex items-center gap-1.5">
                        <span>▲</span>
                        <span>HIGH</span>
                      </span>
                      <span className="text-xs text-slate-950 font-black mt-0.5">
                        +${highWinVal.toLocaleString()} <span className="text-[10px] text-slate-900 font-bold">({highPayout}x)</span>
                      </span>
                    </button>
                  </div>

                  {/* Bottom Full-Width: 50x TIE Button (Purple Luxury Neon) */}
                  <button
                    onClick={() => handleSelectChoice('TIE')}
                    className={`group relative flex items-center justify-between px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-fuchsia-400 text-white shadow-[0_0_30px_rgba(192,38,211,0.6)] border border-fuchsia-300/50 transition-all duration-300 hover:scale-[1.015] active:scale-95 font-mono ${
                      activeBuffs.doublePayout ? 'ring-4 ring-yellow-300 shadow-[0_0_40px_rgba(234,179,8,0.8)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-amber-300">◆</span>
                      <span className="text-xl sm:text-2xl font-black tracking-widest text-white">TIE</span>
                      <span className="text-[10px] font-black text-slate-950 bg-amber-300 px-2 py-0.5 rounded-full uppercase shadow">
                        {activeBuffs.doublePayout ? '100x JACKPOT' : '50x JACKPOT'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-amber-300">
                        +${tieWinVal.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-fuchsia-200 ml-1">
                        ({tiePayout}x)
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            ) : phase === 'SHOWDOWN_RESULT' && gameResult ? (
              /* NON-BLOCKING OPEN RESULT PANEL (No Popup Overlay! Cards Stay Fully Visible!) */
              <div
                className={`p-4 sm:p-5 rounded-2xl bg-slate-950/95 border-2 ${
                  gameResult === 'WIN'
                    ? 'border-amber-400/90 shadow-[0_0_50px_rgba(245,158,11,0.7)]'
                    : gameResult === 'DRAW'
                    ? 'border-cyan-400/90 shadow-[0_0_50px_rgba(6,182,212,0.7)]'
                    : 'border-rose-600/90 shadow-[0_0_50px_rgba(225,29,72,0.7)]'
                } flex flex-col items-center space-y-3 animate-pop-in font-mono`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-black uppercase shadow-md ${
                      gameResult === 'WIN'
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-amber-500/50'
                        : gameResult === 'DRAW'
                        ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-cyan-950/80'
                        : 'bg-rose-950 border border-rose-500 text-rose-300 shadow-rose-950/80'
                    }`}
                  >
                    {gameResult === 'WIN'
                      ? '🎉 VICTORY WIN!'
                      : gameResult === 'DRAW'
                      ? '🤝 DRAW (무승부)'
                      : '💀 BET DEFEAT'}
                  </span>

                  <span
                    className={`text-sm font-black ${
                      gameResult === 'WIN'
                        ? 'text-amber-200'
                        : gameResult === 'DRAW'
                        ? 'text-cyan-300'
                        : 'text-rose-300'
                    }`}
                  >
                    {gameResult === 'WIN'
                      ? `+$${rewardAmount.toLocaleString()} 획득!`
                      : gameResult === 'DRAW'
                      ? `ANTE $${currentConfig.ante.toLocaleString()} 전액 환불!`
                      : `ANTE $${currentConfig.ante.toLocaleString()} 소모`}
                  </span>
                </div>

                {/* 3D Golden Next Round Button */}
                <button
                  onClick={() => startNewGameLoop()}
                  className="w-full py-3 rounded-xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.6)] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>♠</span>
                  <span>[ 다음 라운드 진행 (한판더) ]</span>
                  <span>♣</span>
                </button>
              </div>
            ) : (
              <div className="h-12 flex items-center justify-center font-mono text-xs text-amber-300/80 font-bold">
                {phase === 'DEALING_DEALER' && '🎲 딜러 카드 배분 중...'}
                {phase === 'DEALING_PLAYER' && '👉 플레이어 카드를 클릭하여 뒤집으세요!'}
              </div>
            )}
          </div>

          {/* Player Card Section (흰색 라운드 처리 카지노 카드 슬롯!) */}
          <div className="flex flex-col items-center relative z-10">
            <span className="text-xs font-mono text-emerald-200 tracking-widest mb-2 uppercase font-black bg-slate-950/90 px-3.5 py-1 rounded-full border border-emerald-400/50 shadow-md">
              PLAYER'S CARD {userChoice ? `[BET: ${userChoice}]` : ''}
            </span>

            {/* 흰색 라운드 카지노 카드 슬롯 매트 */}
            <div className="p-2 sm:p-2.5 rounded-3xl border-2 border-dashed border-white/80 bg-white/10 backdrop-blur-sm shadow-[0_0_25px_rgba(255,255,255,0.35)] flex items-center justify-center">
              <div className={isPlayerFlyIn ? 'animate-fly-player' : ''}>
                <CardView
                  card={playerCard}
                  isFaceUp={isPlayerFaceUp}
                  isRevealing={isPlayerRevealing}
                  isPeeking={activeBuffs.peekCard}
                  className={
                    gameResult === 'DRAW' ? 'ring-2 ring-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.7)]' : ''
                  }
                  onClick={
                    phase === 'DEALING_PLAYER'
                      ? handleFlipPlayerCard
                      : undefined
                  }
                  pulseText={
                    phase === 'DEALING_PLAYER' ? '카드 뒤집기 (FLIP)!' : undefined
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Table Stats & Main In-Game Assets Board & MY INVENTORY */}
        <div className="hidden lg:flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950 backdrop-blur-md font-mono text-xs shadow-[0_0_35px_rgba(245,158,11,0.25)] relative overflow-hidden h-full min-h-0">
          <div className="space-y-2.5 flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header Title */}
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest border-b border-amber-400/40 pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="text-amber-300">★</span>
                <span>TABLE STATS</span>
                <span className="text-amber-300">★</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-amber-400/40 shadow-sm">
                REAL MONEY
              </span>
            </h4>

            <div className="space-y-3.5">
              {/* CURRENT ANTE BET Card + COMBO MULTIPLIER BADGE */}
              <div className="relative p-3 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 border border-amber-400/40 shadow-inner group">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">CURRENT ANTE BET</p>
                  {comboCount > 0 && (
                    <span className="text-[10px] font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 px-2 py-0.5 rounded-full shadow animate-pulse">
                      🔥 {comboCount} COMBO (x{Math.pow(2, Math.min(comboCount, currentConfig.maxComboLimit ?? 5))})
                    </span>
                  )}
                </div>
                <p className="text-xl font-black bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent mt-1">
                  ${(currentConfig.ante * Math.pow(2, Math.min(comboCount, currentConfig.maxComboLimit ?? 5))).toLocaleString()}
                </p>
              </div>

              {/* MY STATION ASSETS Card */}
              <div className="relative p-3.5 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border-2 border-amber-400/70 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                {phase === 'SHOWDOWN_RESULT' && gameResult && (
                  <div className="absolute -top-3.5 right-3 z-30 pointer-events-none">
                    {gameResult === 'WIN' && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black text-slate-950 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 shadow-[0_0_20px_rgba(245,158,11,1)] animate-gold-cash-burst">
                        +${rewardAmount.toLocaleString()} 💰
                      </span>
                    )}
                    {gameResult === 'LOSS' && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black text-white bg-gradient-to-r from-rose-600 to-pink-600 shadow-[0_0_20px_rgba(225,29,72,0.9)] animate-red-cash-drain">
                        -${currentConfig.ante.toLocaleString()} 💸
                      </span>
                    )}
                    {gameResult === 'DRAW' && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black text-cyan-950 bg-gradient-to-r from-cyan-300 to-sky-300 shadow-[0_0_15px_rgba(6,182,212,0.9)] animate-pop-in">
                        +${currentConfig.ante.toLocaleString()} (REFUND)
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest flex items-center gap-1">
                    <span>🏛️</span>
                    <span>MY STATION ASSETS</span>
                  </p>
                  <span className="text-xs text-amber-400 font-bold">VAULT</span>
                </div>

                <div className="text-2xl font-black text-amber-300 mt-1 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                  <AnimatedMoneyCounter value={currentChips} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-400/40 space-y-2 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">RECORD</span>
                  <span className="text-slate-100 font-black text-xs tracking-wider">
                    <span className="text-amber-300">{stats.wins}W</span> / <span className="text-rose-400">{stats.losses}L</span> / <span className="text-cyan-300">{stats.draws}D</span>
                  </span>
                </div>

                <div className="space-y-1 pt-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">WIN RATE</span>
                    <span className="text-amber-300 font-black text-xs">{winRate}%</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-900 border border-amber-400/30 overflow-hidden p-0.5 shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.8)] transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, parseFloat(winRate)))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* MY INVENTORY BOX (스크롤이 100% 매끄럽게 동작하는 보유 아이템 공간!) */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-950/90 border border-amber-400/60 flex-1 min-h-0 flex flex-col overflow-hidden shadow-inner space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 shrink-0">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎒</span>
                    <span>MY INVENTORY ({inventory.length})</span>
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-amber-400/30">
                    클릭 시 사용
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

                {/* 4종 아이템 수량 기반 인벤토리 슬롯 (한 라인 풀-위드로 짤림 0%!) */}
                <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                  {(['peek_card', 'double_payout', 'loss_shield', 'staff_hire'] as CasinoItemType[]).map((type) => {
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
                        className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group shadow-md shrink-0 ${
                          isAlreadyActive
                            ? 'bg-cyan-950/40 border-cyan-400/60 text-cyan-200'
                            : count > 0
                            ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 hover:from-slate-850 hover:to-amber-900/60 border-amber-400/50 hover:border-amber-300 active:scale-[0.98]'
                            : 'bg-slate-950/40 border-slate-900 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="text-xl sm:text-2xl shrink-0 group-hover:scale-110 transition-transform">{info.icon}</span>
                          <span className="text-xs sm:text-sm font-black text-amber-200 group-hover:text-amber-300 tracking-wide">
                            {info.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isAlreadyActive ? (
                            <span className="text-[10px] font-black text-slate-950 bg-cyan-400 px-2.5 py-0.5 rounded-full uppercase shadow animate-pulse">
                              적용 중
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-lg border shadow-sm ${
                                count > 0
                                  ? 'text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 border-amber-300'
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
      </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 flex shrink-0 items-center justify-between text-xs font-mono text-amber-400/80 border-t border-amber-400/30 pt-3">
        <span>🎰 SALON: {currentConfig.name}</span>
        <span>LAS VEGAS VIP HIGH-LOW CASINO CLUB</span>
      </div>

    </div>
  )
}
