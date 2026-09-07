import { useState, useEffect, useRef } from 'react'
import type { StationGrade } from '../../game/stationGradeConfig'
import {
  SLOT_SYMBOLS,
  PAYLINES,
  getBetAmountByGrade,
  getRandomSlotSymbol,
  generateRandomSlotGrid,
  generateSmartSlotGrid,
  evaluateSlotSpin,
  type SlotSymbolId,
  type SlotSpinResult,
} from './slotConfig'
import {
  playSfx,
  stopSfx,
  playAuditPassFanfare,
  playSlotWinSmallSound,
  playSlotWinMediumSound,
  playSlotWinBigSound,
  playCoinCountUpTickSound,
} from '../../game/uiSfx'
import { useTranslation } from '../../locales/i18n'
import { resolveMediaSrc } from '../../game/mediaUrl'
import { DEFAULT_HIGH_LOW_CONFIG, getActiveDealerMedia } from '../highlow/highLowConfig'
import { loadHighLowConfig } from '../highlow/highLowStore'
import { HighLowDealerDialogue, type DealerDialoguePlay } from '../highlow/HighLowDealerDialogue'
import { unlockAchievement } from '../../game/achievements'

export type CasinoSlotMachineProps = {
  stationGrade?: StationGrade | null
  userAssets: number
  onUpdateAssets: (newAssets: number) => void
  onClose: () => void
}

/** 릴 스코프 생성을 위한 무작위 스트립 빌더 */
function buildReelColumnStrip(targetColSymbols: SlotSymbolId[]): SlotSymbolId[] {
  const dummyCount = 9
  const dummies: SlotSymbolId[] = []
  for (let i = 0; i < dummyCount; i += 1) {
    dummies.push(getRandomSlotSymbol())
  }
  return [...dummies, ...targetColSymbols]
}

type CoinParticle = {
  id: number
  x: number
  icon: string
  delay: number
}

type ConfettiParticle = {
  id: number
  x: number
  color: string
  delay: number
}

export function CasinoSlotMachine({
  stationGrade,
  userAssets,
  onUpdateAssets,
  onClose,
}: CasinoSlotMachineProps) {
  const { t, locale } = useTranslation()

  // 등급별 기본 보상 기준금 (3회 무료 도전)
  const baseReward = getBetAmountByGrade(stationGrade)

  // 하이로우 미디어 등록 단일 딜러 설정 로드 (선택 드롭다운 제거)
  const [dealerConfig] = useState(() => {
    const map = loadHighLowConfig()
    for (const key of ['legend', 'local', 'star'] as const) {
      const cfg = map[key]
      if (
        cfg?.dealerMediaStages?.tier1?.url ||
        cfg?.dealerMediaStages?.tier2?.url ||
        cfg?.dealerMediaStages?.tier3?.url
      ) {
        return cfg
      }
    }
    return map.legend || map.local || DEFAULT_HIGH_LOW_CONFIG.legend
  })

  const [spinsLeft, setSpinsLeft] = useState(3)
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0)
  const [sessionTotalWon, setSessionTotalWon] = useState(0)
  const [currentTurn, setCurrentTurn] = useState(1) // 1, 2, 3턴

  // 딜러 대사 & 음성 재생 상태
  const [dealerDialoguePlay, setDealerDialoguePlay] = useState<DealerDialoguePlay | null>(null)

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
      const newPool = [0, 1, 2, 3, 4]
      for (let i = newPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[newPool[i], newPool[j]] = [newPool[j], newPool[i]]
      }
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

  // 릴 회전 멈춤 스태거 상태 (0: 3개 모두 회전, 1: 1번릴 멈춤, 2: 2번릴 멈춤, 3: 3개 모두 멈춤)
  const [stoppedCount, setStoppedCount] = useState(3)
  const isSpinning = stoppedCount < 3

  const [currentGrid, setCurrentGrid] = useState<SlotSymbolId[][]>(() => generateRandomSlotGrid())
  const [lastResult, setLastResult] = useState<SlotSpinResult | null>(null)
  const [isLeverPulled, setIsLeverPulled] = useState(false)

  // 당첨 연출 및 돈 카운트업 상태
  const [animWinAmount, setAnimWinAmount] = useState(0)
  const [isCountingUp, setIsCountingUp] = useState(false)
  const [winTier, setWinTier] = useState<'small' | 'medium' | 'big' | 'jackpot' | null>(null)
  const [coinParticles, setCoinParticles] = useState<CoinParticle[]>([])
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([])

  const winAmountTextRef = useRef<HTMLSpanElement>(null)

  const [showPaytable, setShowPaytable] = useState(false)
  const [jackpotBanner, setJackpotBanner] = useState(false)

  const userAssetsRef = useRef(userAssets)
  userAssetsRef.current = userAssets

  // 3개 칼럼용 스트립 데이터 (릴 스핀용)
  const [colStrips, setColStrips] = useState<SlotSymbolId[][]>(() => [
    buildReelColumnStrip(currentGrid.map((r) => r[0])),
    buildReelColumnStrip(currentGrid.map((r) => r[1])),
    buildReelColumnStrip(currentGrid.map((r) => r[2])),
  ])

  // 언마운트 시 사운드 정리
  useEffect(() => {
    return () => {
      stopSfx('training-roll')
    }
  }, [])

  // 현재 턴 수에 맞는 딜러 미디어 추출 (턴 1 -> 수위 1, 턴 2 -> 수위 2, 턴 3 -> 수위 3)
  const activeConsecutiveWins = (currentTurn - 1) * 3 // 턴 1: 0(수위1), 턴 2: 3(수위2), 턴 3: 6(수위3)
  const activeDealerMedia = getActiveDealerMedia(dealerConfig, activeConsecutiveWins)

  // 레버 당기기 & 스핀 동작 (무료 3회 도전)
  const handleSpin = () => {
    const isFreeSpin = freeSpinsLeft > 0
    let nextSpinsLeft = spinsLeft
    let nextFreeSpinsLeft = freeSpinsLeft

    let turnForThisSpin = currentTurn
    if (!isFreeSpin) {
      if (spinsLeft <= 0) return
      turnForThisSpin = Math.min(3, 4 - spinsLeft)
      nextSpinsLeft = spinsLeft - 1
      setSpinsLeft(nextSpinsLeft)
    } else {
      nextFreeSpinsLeft = freeSpinsLeft - 1
      setFreeSpinsLeft(nextFreeSpinsLeft)
    }

    // 회전 시작 시 기존 대사 창 닫기
    setDealerDialoguePlay(null)

    // 초기화
    setWinTier(null)
    setAnimWinAmount(0)
    setCoinParticles([])
    setConfettiParticles([])

    // 레버 애니메이션 트리거
    setIsLeverPulled(true)
    setTimeout(() => setIsLeverPulled(false), 500)

    // 최종 타겟 그리드 & 평가 생성
    const targetGrid = generateSmartSlotGrid()
    const result = evaluateSlotSpin(targetGrid, baseReward)

    setLastResult(null)
    setStoppedCount(0)

    // 각 컬럼용 신규 스트립 준비
    const newStrips = [
      buildReelColumnStrip(targetGrid.map((r) => r[0])),
      buildReelColumnStrip(targetGrid.map((r) => r[1])),
      buildReelColumnStrip(targetGrid.map((r) => r[2])),
    ]
    setColStrips(newStrips)

    // 회전 사운드 루프 시작
    playSfx('training-roll', { loop: true })

    // 스태거드(Staggered) 릴 스톱 타임아웃 (700ms, 1300ms, 1900ms)
    setTimeout(() => {
      setStoppedCount(1)
      playSfx('audit-card-hit')
    }, 700)

    setTimeout(() => {
      setStoppedCount(2)
      playSfx('audit-card-hit')
    }, 1300)

    setTimeout(() => {
      setStoppedCount(3)
      playSfx('audit-card-hit')
      stopSfx('training-roll')

      // 최종 릴 멈춤 완료 후 결과 적용
      setCurrentGrid(targetGrid)
      setLastResult(result)

      let updatedTotalWon = sessionTotalWon
      if (result.totalWinAmount > 0) {
        onUpdateAssets(userAssetsRef.current + result.totalWinAmount)
        updatedTotalWon = sessionTotalWon + result.totalWinAmount
        setSessionTotalWon(updatedTotalWon)

        // 릴이 완전히 멈추고 당첨이 확정되었을 때 딜러 승리 대사/보이스 재생
        const turnTier = Math.min(3, Math.max(1, turnForThisSpin)) as 1 | 2 | 3
        const turnConsecutive = (turnTier - 1) * 3
        const spinDealerMedia = getActiveDealerMedia(dealerConfig, turnConsecutive)
        const dialogueIdx = getNextDialogueIndex(`tier${turnTier}` as any)

        setDealerDialoguePlay({
          tier: turnTier,
          index: dialogueIdx,
          dealerName: dealerConfig.dealerName || '전설의 딜러',
          dealerMediaUrl: spinDealerMedia?.url || dealerConfig.dealerMediaUrl,
          dealerMediaType: spinDealerMedia?.type || dealerConfig.dealerMediaType,
        })

        // 당첨 등급(Tier) 판정
        let currentTier: 'small' | 'medium' | 'big' | 'jackpot' = 'small'
        const hasSevenLine = result.winningLines.some((line) => line.matchedSymbol.id === 'seven')
        if (result.isJackpot || hasSevenLine) {
          unlockAchievement('casino_slot_777')
        }

        if (result.isJackpot) {
          currentTier = 'jackpot'
        } else if (result.winningLines.length >= 3 || result.totalWinAmount >= baseReward * 8) {
          currentTier = 'big'
        } else if (result.winningLines.length >= 2 || result.totalWinAmount >= baseReward * 3) {
          currentTier = 'medium'
        } else {
          currentTier = 'small'
        }
        setWinTier(currentTier)

        // 1. 사운드 이펙트 다변화 실행
        if (currentTier === 'jackpot') {
          setJackpotBanner(true)
          playAuditPassFanfare()
        } else if (currentTier === 'big') {
          playSlotWinBigSound()
        } else if (currentTier === 'medium') {
          playSlotWinMediumSound()
        } else {
          playSlotWinSmallSound()
        }

        // 2. 파티클 이펙트 생성
        const coinIcons = ['🪙', '💰', '✨', '⭐', '💎']
        const coinCount = currentTier === 'big' || currentTier === 'jackpot' ? 30 : currentTier === 'medium' ? 18 : 10
        const coins: CoinParticle[] = Array.from({ length: coinCount }, (_, i) => ({
          id: i,
          x: Math.random() * 90 + 5,
          icon: coinIcons[Math.floor(Math.random() * coinIcons.length)],
          delay: Math.random() * 0.4,
        }))
        setCoinParticles(coins)

        if (currentTier === 'medium' || currentTier === 'big' || currentTier === 'jackpot') {
          const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#a855f7', '#eab308']
          const confettis: ConfettiParticle[] = Array.from({ length: 25 }, (_, i) => ({
            id: i,
            x: Math.random() * 95,
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 0.5,
          }))
          setConfettiParticles(confettis)
        }

        // 3. 돈 올라가는 Count-up 애니메이션
        const targetVal = result.totalWinAmount
        const duration = currentTier === 'big' ? 1200 : currentTier === 'medium' ? 900 : 600
        const startTimestamp = performance.now()
        setIsCountingUp(true)
        let lastStep = -1

        const stepCountUp = (now: number) => {
          const elapsed = now - startTimestamp
          const progress = Math.min(1, elapsed / duration)
          const easeOut = 1 - Math.pow(1 - progress, 3)
          const currentAmount = Math.round(targetVal * easeOut)

          if (winAmountTextRef.current) {
            winAmountTextRef.current.textContent = `+$${currentAmount.toLocaleString()}`
          }

          const currentStep = Math.floor(progress * 10)
          if (currentStep !== lastStep && progress < 1) {
            lastStep = currentStep
            playCoinCountUpTickSound(currentStep)
          }

          if (progress < 1) {
            requestAnimationFrame(stepCountUp)
          } else {
            if (winAmountTextRef.current) {
              winAmountTextRef.current.textContent = `+$${targetVal.toLocaleString()}`
            }
            setIsCountingUp(false)
          }
        }
        requestAnimationFrame(stepCountUp)
      }

      if (result.freeSpinsAwarded > 0) {
        nextFreeSpinsLeft += result.freeSpinsAwarded
        setFreeSpinsLeft((prev) => prev + result.freeSpinsAwarded)
      }

      // 회전 완료 및 대사 출력 후 즉시 다음 단계 수위로 전환 (1턴 회전 완료 -> 2단계 수위 영상, 2턴 회전 완료 -> 3단계 수위 영상)
      if (!isFreeSpin && nextSpinsLeft > 0) {
        setCurrentTurn(Math.min(3, turnForThisSpin + 1))
      }

      // 추가 기회(3회 도전 + 프리스핀)가 모두 소진되면 딜러 패배 대사 & 음성만 즉시 재생.
      // 스캐너(스캐터 🎰 3개) 당첨 시 프리스핀 추가 기회가 생성되므로 isGameOver가 false로 유지되어 패배를 건너뜀.
      const isGameOver = nextSpinsLeft <= 0 && nextFreeSpinsLeft <= 0
      if (isGameOver) {
        const defeatBonus = Math.max(10, Math.round(baseReward * 0.1))
        // 위로금(누적 참여 10%)은 세션 당첨금이 0원인 순수 패배일 때만 지급
        if (updatedTotalWon === 0) {
          onUpdateAssets(userAssetsRef.current + defeatBonus)
        }

        // 패배 팝업 없이 딜러 패배 대사 & 음성만 즉시 재생
        const defeatIdx = getNextDialogueIndex('loss')
        const defeatDealerMedia = getActiveDealerMedia(dealerConfig, (turnForThisSpin - 1) * 3)
        setDealerDialoguePlay({
          tier: 1,
          index: defeatIdx,
          dealerName: dealerConfig.dealerName || '전설의 딜러',
          dealerMediaUrl: defeatDealerMedia?.url || dealerConfig.dealerMediaUrl,
          dealerMediaType: defeatDealerMedia?.type || dealerConfig.dealerMediaType,
          isLoss: true,
        })
      }
    }, 1900)
  }

  // 수동 스톱 버튼 액션
  const handleStopColumn = (colIndex: number) => {
    if (!isSpinning) return
    if (stoppedCount === colIndex) {
      setStoppedCount(colIndex + 1)
      playSfx('audit-card-hit')
    }
  }

  // 8개 페이라인 SVG Coordinate 계산 (3x3 Grid)
  const getLineSvgCoords = (coords: [number, number][]) => {
    const getPosPercent = (row: number, col: number) => ({
      x: col * 33.333 + 16.666,
      y: row * 33.333 + 16.666,
    })
    const p0 = getPosPercent(coords[0][0], coords[0][1])
    const p1 = getPosPercent(coords[1][0], coords[1][1])
    const p2 = getPosPercent(coords[2][0], coords[2][1])

    return `M ${p0.x}% ${p0.y}% L ${p1.x}% ${p1.y}% L ${p2.x}% ${p2.y}%`
  }

  const isOutOfSpins = spinsLeft <= 0 && freeSpinsLeft <= 0

  const machineToneClass =
    stoppedCount < 3
      ? 'is-spinning'
      : lastResult?.isJackpot
      ? 'is-jackpot'
      : (lastResult?.totalWinAmount ?? 0) > 0
      ? 'is-win'
      : ''

  return (
    <div className="relative w-full h-full min-h-0 flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-4 rounded-2xl border border-amber-400/30 shadow-2xl overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-amber-400/30 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center text-slate-950 text-xl font-black shadow-lg shadow-amber-500/50">
            🎰
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              VIP CYBER CASINO
            </span>
            <h1 className="text-lg sm:text-2xl font-black tracking-wider bg-gradient-to-r from-yellow-100 via-amber-300 to-amber-200 bg-clip-text text-transparent drop-shadow">
              골든 슬롯머신
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPaytable(true)}
            className="px-3.5 py-1.5 rounded-xl border border-amber-300/80 bg-gradient-to-b from-amber-400/25 via-yellow-500/15 to-amber-600/30 text-amber-300 hover:text-yellow-200 hover:border-yellow-200 hover:bg-amber-400/40 text-xs font-black shadow-[0_0_12px_rgba(245,158,11,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            📖 {t('casino.paytable')}
          </button>

          {/* 럭셔리 보유 자산 표시 패널 */}
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-2xl border-2 border-amber-400/70 bg-gradient-to-r from-amber-500/25 via-yellow-400/15 to-amber-600/30 text-xs font-mono shadow-[0_0_20px_rgba(245,158,11,0.4)] backdrop-blur-md">
            <span className="text-lg drop-shadow">💰</span>
            <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wide uppercase">{t('casino.userAssets')}</span>
            <span className="text-base sm:text-xl font-black font-mono text-yellow-200 tracking-tight drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]">
              ${userAssets.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border-2 border-red-400/90 bg-gradient-to-b from-red-500 via-red-600 to-red-800 text-white font-extrabold text-xs shadow-[0_4px_12px_rgba(239,68,68,0.5),inset_0_1px_2px_rgba(255,255,255,0.6)] hover:brightness-110 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            🚪 {t('casino.exit')}
          </button>
        </div>
      </div>

      {/* 2. FULL-WIDTH INTEGRATED EMERALD FELT CASINO STAGE (3-COLUMN RESPONSIVE LAYOUT) */}
      <div className="relative z-10 flex-1 p-3 sm:p-4 rounded-2xl border-2 border-amber-400/40 bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 backdrop-blur-md shadow-[inset_0_0_90px_rgba(245,158,11,0.2),0_0_50px_rgba(245,158,11,0.15)] my-auto py-2 flex flex-col min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 sm:gap-6 items-center flex-1 min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: Live Dealer Showcase (High-Tech CCTV Surveillance Feed) */}
          <div className="hidden lg:flex flex-col justify-between p-2 sm:p-3 font-mono text-xs overflow-hidden bg-transparent border-none shadow-none">
            <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
              <h4 className="text-xs font-black text-amber-300 uppercase tracking-widest border-b border-amber-400/30 pb-1.5 flex items-center justify-between shrink-0 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  <span>📡 LIVE CCTV FEED [CAM-01]</span>
                </span>
                <span className="text-[10px] text-amber-400 font-bold">TURN {currentTurn}/3</span>
              </h4>

              {/* Live Dealer CCTV Media Box */}
              <div className="relative w-full aspect-[3/4] flex-1 min-h-[220px] max-h-[360px] rounded-2xl overflow-hidden border-2 border-amber-400/80 bg-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.3)] group">
                <div className="cctv-scanline" />
                <div className="cctv-noise" />

                {/* Viewfinder Reticle Corners */}
                <div className="pointer-events-none absolute inset-0 z-10 p-2.5 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <span className="border-t-2 border-l-2 border-amber-400/80 w-3.5 h-3.5 block" />
                    <span className="border-t-2 border-r-2 border-amber-400/80 w-3.5 h-3.5 block" />
                  </div>
                  <div className="flex justify-between">
                    <span className="border-b-2 border-l-2 border-amber-400/80 w-3.5 h-3.5 block" />
                    <span className="border-b-2 border-r-2 border-amber-400/80 w-3.5 h-3.5 block" />
                  </div>
                </div>

                {/* Top HUD: Blinking Red REC Badge */}
                <div className="pointer-events-none absolute top-2 left-2 z-20 flex items-center font-mono">
                  <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded border border-rose-500/60 shadow">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[9px] font-black text-rose-400 tracking-wider">REC</span>
                  </div>
                </div>

                {/* Dealer Media Video/Image Feed */}
                {activeDealerMedia?.url ? (
                  activeDealerMedia.type === 'video' ? (
                    <video
                      key={activeDealerMedia.url}
                      src={resolveMediaSrc(activeDealerMedia.url)}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover filter contrast-[1.05] brightness-95 saturate-[0.95]"
                    />
                  ) : (
                    <img
                      key={activeDealerMedia.url}
                      src={resolveMediaSrc(activeDealerMedia.url)}
                      alt={dealerConfig.dealerName}
                      className="w-full h-full object-cover filter contrast-[1.05] brightness-95 saturate-[0.95]"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-amber-950/70 to-slate-950 text-amber-200">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-400/70 p-1 mb-1 bg-black flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <span className="text-3xl">🎩</span>
                    </div>
                    <span className="text-xs font-black text-amber-300 uppercase tracking-widest font-mono">
                      {dealerConfig.dealerName}
                    </span>
                    <span className="text-[9px] text-amber-400/90 font-bold font-mono">
                      {dealerConfig.dealerTitle}
                    </span>
                  </div>
                )}
              </div>

              {/* SPIN TURN PROGRESS BADGE */}
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-400/30 backdrop-blur-sm space-y-1.5 text-center">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                  🎰 슬롯 도전 진행 상황
                </span>
                <div className="flex items-center justify-center gap-2 font-mono text-sm font-black text-yellow-200">
                  <span>턴 {currentTurn} / 3</span>
                  <span className="text-xs text-amber-400 font-bold">(남은 회전: {spinsLeft}회)</span>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN: Authentic Pachislot Cabinet & Reels */}
          <div className="relative flex flex-col items-center justify-center w-full min-h-0 overflow-visible max-w-2xl mx-auto">
            <div className={`pachislot-cabinet ${machineToneClass} flex flex-col relative w-full max-w-xl mx-auto`}>
              {/* COIN PARTICLES OVERLAY */}
              {coinParticles.length > 0 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
                  {coinParticles.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        left: `${p.x}%`,
                        bottom: '15%',
                        animationDelay: `${p.delay}s`,
                      }}
                      className="absolute text-2xl sm:text-3xl animate-coin-float filter drop-shadow-[0_0_10px_rgba(250,204,21,0.9)]"
                    >
                      {p.icon}
                    </div>
                  ))}
                </div>
              )}

              {/* CONFETTI PARTICLES OVERLAY */}
              {confettiParticles.length > 0 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
                  {confettiParticles.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        left: `${p.x}%`,
                        top: '0%',
                        backgroundColor: p.color,
                        animationDelay: `${p.delay}s`,
                      }}
                      className="absolute w-2.5 h-2.5 rounded-sm animate-confetti-fall shadow-md"
                    />
                  ))}
                </div>
              )}

              {/* TOP MARQUEE HEADER */}
              <div className="pachislot-top-marquee">
                <div className="pachislot-marquee-lamps">
                  {Array.from({ length: 16 }, (_, index) => (
                    <span key={index} style={{ animationDelay: `${index * 60}ms` }} />
                  ))}
                </div>

                <div className="px-6 py-2.5 flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="pachislot-777-box">
                      <div className="flex items-center gap-1 px-3.5 py-1 rounded-xl border-2 border-yellow-300 bg-gradient-to-r from-red-700 via-amber-500 to-red-700 shadow-[0_0_20px_rgba(250,204,21,0.95)]">
                        <span className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-yellow-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] animate-pulse">
                          7️⃣ 7️⃣ 7️⃣
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* REEL SHOWCASE DECK */}
              <div className="pachislot-reel-showcase">
                <div className="p-2.5 sm:p-3.5 flex flex-col gap-2.5">
                  <div className="relative flex items-center justify-between gap-2">
                    {/* LEFT PAYLINE BADGES */}
                    <div className="flex flex-col gap-3 text-[10px] font-mono font-bold shrink-0">
                      {PAYLINES.slice(0, 4).map((line) => {
                        const isWon = lastResult?.winningLines.some((w) => w.payline.id === line.id)
                        return (
                          <div
                            key={line.id}
                            style={{ borderColor: line.color, color: isWon ? '#000' : line.color }}
                            className={`px-2 py-0.5 rounded-lg border-2 ${
                              isWon
                                ? 'bg-amber-400 animate-bounce shadow-[0_0_15px_currentColor]'
                                : 'bg-slate-950/90'
                            } transition-all`}
                          >
                            L{line.id}
                          </div>
                        )
                      })}
                    </div>

                    {/* 3 REEL COLUMNS CONTAINER */}
                    <div className="pachislot-reel-window flex-1">
                      <svg className="absolute inset-3 w-[calc(100%-24px)] h-[calc(100%-24px)] pointer-events-none z-30">
                        {PAYLINES.map((line) => {
                          const isWon = lastResult?.winningLines.some((w) => w.payline.id === line.id)
                          return (
                            <path
                              key={line.id}
                              d={getLineSvgCoords(line.coords)}
                              fill="none"
                              stroke={isWon ? line.color : 'transparent'}
                              strokeWidth={isWon ? 5 : 0}
                              className={isWon ? 'animate-pulse filter drop-shadow-[0_0_15px_currentColor]' : ''}
                            />
                          )
                        })}
                      </svg>

                      {[0, 1, 2].map((colIdx) => {
                        const isColumnSpinning = stoppedCount <= colIdx
                        const stripSymbols = colStrips[colIdx] ?? []
                        const landOffsetPx = 9 * 70

                        return (
                          <div key={colIdx} className="pachislot-reel-column">
                            <div
                              className={`pachislot-reel-strip ${
                                isColumnSpinning ? 'is-spinning' : 'is-stopped'
                              }`}
                              style={{
                                ['--reel-land' as string]: `-${landOffsetPx}px`,
                              }}
                            >
                              {stripSymbols.map((symId, idx) => {
                                const sym = SLOT_SYMBOLS[symId] ?? SLOT_SYMBOLS.cherry
                                const rowIdx = idx - 9
                                const isTargetCell = !isColumnSpinning && rowIdx >= 0 && rowIdx < 3
                                const isWinningCell =
                                  isTargetCell &&
                                  lastResult?.winningLines.some((w) =>
                                    w.payline.coords.some(([r, c]) => r === rowIdx && c === colIdx),
                                  )

                                return (
                                  <div
                                    key={`${symId}-${idx}`}
                                    className={`pachislot-reel-cell ${isWinningCell ? 'is-winner' : ''}`}
                                  >
                                    {symId === 'seven' ? (
                                      <div className="relative flex items-center justify-center px-2.5 py-1 rounded-xl border-2 border-yellow-300 bg-gradient-to-b from-red-600 via-amber-500 to-red-800 shadow-[0_0_14px_rgba(250,204,21,0.95)] animate-pulse scale-105">
                                        <span className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-yellow-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                          7️⃣
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-3xl sm:text-4xl filter drop-shadow-md">
                                        {sym.icon}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* RIGHT PAYLINE BADGES */}
                    <div className="flex flex-col gap-3 text-[10px] font-mono font-bold shrink-0">
                      {PAYLINES.slice(4, 8).map((line) => {
                        const isWon = lastResult?.winningLines.some((w) => w.payline.id === line.id)
                        return (
                          <div
                            key={line.id}
                            style={{ borderColor: line.color, color: isWon ? '#000' : line.color }}
                            className={`px-2 py-0.5 rounded-lg border-2 ${
                              isWon
                                ? 'bg-amber-400 animate-bounce shadow-[0_0_15px_currentColor]'
                                : 'bg-slate-950/90'
                            } transition-all`}
                          >
                            L{line.id}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* SPIN DISPLAY RESULTS BANNER */}
                  <div className="min-h-[38px] flex items-center justify-center px-4 py-1 bg-slate-950/95 rounded-xl border border-amber-400/50 text-center font-mono shadow-inner relative overflow-hidden">
                    {isSpinning ? (
                      <span className="text-amber-400 font-bold animate-pulse text-xs">
                        🎰 {t('casino.spinning')}
                      </span>
                    ) : lastResult ? (
                      lastResult.totalWinAmount > 0 ? (
                        <div className="flex items-center gap-2 text-yellow-300 font-black text-xs sm:text-sm">
                          <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-400/40 text-amber-300 animate-pulse">
                            {winTier === 'big' || winTier === 'jackpot'
                              ? t('casino.megaWin')
                              : winTier === 'medium'
                              ? t('casino.bigWin')
                              : t('casino.win')}
                          </span>
                          <span
                            ref={winAmountTextRef}
                            className={`text-amber-400 text-sm sm:text-base font-extrabold ${
                              isCountingUp ? 'animate-money-pulse text-yellow-200 scale-110' : ''
                            }`}
                          >
                            +${(isCountingUp ? animWinAmount : lastResult.totalWinAmount).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          {isOutOfSpins ? t('casino.outOfSpinsMsg') : t('casino.tryNext')}
                        </span>
                      )
                    ) : (
                      <span className="text-amber-300/90 text-xs">
                        {t('casino.startPrompt')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* PHYSICAL BUTTON DECK & LEVER */}
              <div className="pachislot-button-deck flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  {[0, 1, 2].map((idx) => {
                    const isStopped = stoppedCount > idx
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isStopped || !isSpinning}
                        onClick={() => handleStopColumn(idx)}
                        className={`pachislot-btn-stop ${isStopped ? 'is-pressed opacity-50' : ''}`}
                      >
                        <span>{t('casino.stop')}</span>
                        <span className="text-[9px] font-bold text-amber-400">{idx + 1}</span>
                      </button>
                    )
                  })}
                </div>

                <button
                  disabled={isSpinning || isOutOfSpins}
                  onClick={handleSpin}
                  className={`pachislot-btn-spin text-sm sm:text-base ${
                    isSpinning || isOutOfSpins
                      ? 'opacity-60 cursor-not-allowed'
                      : freeSpinsLeft > 0
                      ? 'animate-pulse'
                      : ''
                  }`}
                >
                  <span className="text-xl">🎰</span>
                  <span>
                    {isSpinning
                      ? t('casino.spinning')
                      : isOutOfSpins
                      ? t('casino.spinsExhausted')
                      : freeSpinsLeft > 0
                      ? t('casino.bonusSpin').replace('{spins}', String(freeSpinsLeft))
                      : t('casino.spin').replace('{spins}', String(spinsLeft))}
                  </span>
                </button>
              </div>

              {/* BOTTOM COIN TRAY */}
              <div className="pachislot-bottom-deck">
                <div className="pachislot-coin-tray flex items-center justify-between px-4 py-2 border-2 border-amber-400/50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl sm:text-3xl animate-bounce drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]">🪙</span>
                    <span className="text-xs sm:text-sm font-black tracking-wide text-amber-300 uppercase">{t('casino.accumulatedWin')}</span>
                  </div>
                  <div className="text-base sm:text-xl font-black font-mono text-yellow-200 bg-gradient-to-r from-amber-950 via-yellow-900/90 to-amber-950 px-4 py-1.5 rounded-xl border-2 border-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                    +${sessionTotalWon.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 3D SIDE MECHANICAL PULL LEVER WITH SPHERE KNOB */}
              <div className="hidden xl:flex flex-col items-center justify-center absolute -right-12 top-1/2 -translate-y-1/2 select-none z-30">
                <div className="w-5 h-36 bg-gradient-to-r from-slate-700 via-slate-400 to-slate-800 rounded-full border-2 border-slate-900 shadow-2xl relative flex flex-col items-center p-1">
                  <div
                    className={`w-2.5 bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 rounded-full transition-all duration-300 origin-bottom shadow-inner ${
                      isLeverPulled ? 'h-16 transform rotate-[45deg]' : 'h-28'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={isSpinning || isOutOfSpins}
                      onClick={handleSpin}
                      className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-700 via-red-500 to-yellow-300 border-2 border-yellow-200 shadow-[0_0_20px_rgba(239,68,68,0.9)] -translate-x-3 -translate-y-4 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING DEFEAT MODAL REMOVED — 기회 소진 시 패배 팝업 없이 딜러 패배 대사 & 음성만 재생 */}

      {/* PAYTABLE MODAL */}
      {showPaytable && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-3">
              <h2 className="text-xl font-black text-amber-300 flex items-center gap-2">
                <span>📖</span> {t('casino.paytableTitle')}
              </h2>
              <button
                onClick={() => setShowPaytable(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                {t('casino.symbolMultiplierTitle')}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.values(SLOT_SYMBOLS).map((sym) => (
                  <div
                    key={sym.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-amber-400/20"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{sym.icon}</span>
                      <span className="font-bold text-slate-200">{t(`casino.symbols.${sym.id}`)}</span>
                    </div>
                    <span className="font-mono font-black text-amber-300">
                      {sym.isScatter
                        ? t('casino.scatterBonus')
                        : sym.isWild
                        ? t('casino.wildMultiplier')
                        : `${sym.multiplier}x`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowPaytable(false)}
              className="w-full py-3 rounded-xl border-2 border-yellow-300 bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-600 text-slate-950 font-black text-sm shadow-[0_4px_15px_rgba(245,158,11,0.6),inset_0_1px_2px_rgba(255,255,255,0.8)] hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              {t('casino.confirmClose')}
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN JACKPOT BANNER OVERLAY */}
      {jackpotBanner && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in text-center">
          <div className="text-8xl animate-bounce mb-4">🎰💥👑</div>
          <h1 className="text-4xl sm:text-6xl font-black bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_50px_rgba(250,204,21,1)]">
            {t('casino.jackpotTitle')}
          </h1>
          <p className="text-xl font-bold text-amber-300 mt-2 font-mono">
            {t('casino.jackpotDesc')}
          </p>
          <div className="my-6 text-3xl sm:text-4xl font-black text-yellow-300 font-mono bg-amber-950/80 px-8 py-4 rounded-3xl border-2 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.6)]">
            +${(baseReward * 100).toLocaleString()}
          </div>
          <button
            onClick={() => setJackpotBanner(false)}
            className="px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg shadow-2xl transition-all cursor-pointer"
          >
            {t('casino.claimJackpot')}
          </button>
        </div>
      )}

      {/* DEALER DIALOGUE OVERLAY PORTAL */}
      {dealerDialoguePlay && (
        <HighLowDealerDialogue
          play={dealerDialoguePlay}
          locale={locale}
          onClose={() => setDealerDialoguePlay(null)}
        />
      )}
    </div>
  )
}
