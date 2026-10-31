import { useState, useEffect, useRef, type ReactNode } from 'react'
import { CasinoPracticeCoach } from '../casino/CasinoPracticeCoach'
import './slotPanel.css'
import type { StationGrade } from '../../game/stationGradeConfig'
import {
  SLOT_SYMBOLS,
  SLOT_UI_ASSETS,
  PAYLINES,
  getBetAmountByGrade,
  getRandomSlotSymbol,
  generateRandomSlotGrid,
  generateSmartSlotGrid,
  evaluateSlotSpin,
  type SlotSymbolId,
  type SlotSpinResult,
} from './slotConfig'

function SlotSymbolImg({
  symId,
  className = '',
  sizeClass = 'w-12 h-12 sm:w-14 sm:h-14',
}: {
  symId: SlotSymbolId
  className?: string
  sizeClass?: string
}) {
  const sym = SLOT_SYMBOLS[symId] ?? SLOT_SYMBOLS.cherry
  return (
    <img
      src={sym.iconSrc}
      alt={sym.name}
      draggable={false}
      className={`slot-symbol-img object-contain select-none pointer-events-none ${sizeClass} ${className}`}
    />
  )
}

/** Isolated clock so 1Hz ticks don't re-render the whole slot tree. */
function SlotCctvClock({ locale }: { locale: string }) {
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const label = clock.toLocaleTimeString(locale === 'KO' ? 'ko-KR' : undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  return (
    <div className="bg-black/75 px-2 py-0.5 rounded text-[9px] text-emerald-300/90 tracking-wider tabular-nums">
      {label}
    </div>
  )
}
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
import { loadHighLowConfig, loadHighLowConfigFromDisk } from '../highlow/highLowStore'
import { HighLowDealerDialogue, type DealerDialoguePlay } from '../highlow/HighLowDealerDialogue'
import { unlockAchievement } from '../../game/achievements'

export type CasinoSlotMachineProps = {
  stationGrade?: StationGrade | null
  userAssets: number
  onUpdateAssets: (newAssets: number) => void
  onClose: () => void
  /** 스핀 소진(세션 패배/종료) 시 카지노 세션 전체 종료 */
  onDefeatExit?: () => void
  /** 헤더 오른쪽에 붙는 추가 컨트롤 (시뮬레이터 등급/충전 등). X는 셸에만 둔다. */
  headerExtras?: ReactNode
  /** 자산·스핀이 적용되지 않는 연습 한 판 */
  practice?: boolean
  /** 로비 다시보기. 결과 문구만 달라진다 */
  practiceReplay?: boolean
  onPracticeDone?: () => void
}

function practiceWinGrid(): SlotSymbolId[][] {
  return [
    ['lemon', 'grape', 'bell'],
    ['cherry', 'cherry', 'cherry'],
    ['grape', 'lemon', 'star'],
  ]
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
  onDefeatExit,
  headerExtras,
  practice = false,
  practiceReplay = false,
  onPracticeDone,
}: CasinoSlotMachineProps) {
  const { t, locale } = useTranslation()

  // 등급별 기본 보상 기준금 (3회 무료 도전)
  const baseReward = getBetAmountByGrade(stationGrade)

  // 하이로우 미디어 등록 단일 딜러 설정 로드 (선택 드롭다운 제거)
  const [dealerConfig, setDealerConfig] = useState(() => {
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

  useEffect(() => {
    let cancelled = false
    void loadHighLowConfigFromDisk().then((map) => {
      if (cancelled) return
      for (const key of ['legend', 'local', 'star'] as const) {
        const cfg = map[key]
        if (
          cfg?.dealerMediaStages?.tier1?.url ||
          cfg?.dealerMediaStages?.tier2?.url ||
          cfg?.dealerMediaStages?.tier3?.url ||
          cfg?.dealerMediaUrl
        ) {
          setDealerConfig(cfg)
          return
        }
      }
      setDealerConfig(map.legend || map.local || DEFAULT_HIGH_LOW_CONFIG.legend)
    })
    return () => {
      cancelled = true
    }
  }, [])

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
  const practiceRef = useRef(practice)
  practiceRef.current = practice
  const practiceLockRef = useRef(false)
  const [practiceStep, setPracticeStep] = useState<'spin' | 'rolling' | 'result'>(
    practice ? 'spin' : 'result',
  )

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
    const practicing = practiceRef.current
    if (practicing) {
      if (practiceLockRef.current || practiceStep !== 'spin') return
      practiceLockRef.current = true
      setPracticeStep('rolling')
    }

    const isFreeSpin = freeSpinsLeft > 0
    let nextSpinsLeft = spinsLeft
    let nextFreeSpinsLeft = freeSpinsLeft

    let turnForThisSpin = currentTurn
    if (!practicing && !isFreeSpin) {
      if (spinsLeft <= 0) return
      turnForThisSpin = Math.min(3, 4 - spinsLeft)
      nextSpinsLeft = spinsLeft - 1
      setSpinsLeft(nextSpinsLeft)
    } else if (!practicing) {
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
    const targetGrid = practicing ? practiceWinGrid() : generateSmartSlotGrid()
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

      const applyEconomy = !practiceRef.current
      let updatedTotalWon = sessionTotalWon
      if (result.totalWinAmount > 0) {
        if (applyEconomy) {
          onUpdateAssets(userAssetsRef.current + result.totalWinAmount)
          updatedTotalWon = sessionTotalWon + result.totalWinAmount
          setSessionTotalWon(updatedTotalWon)
        }

        if (applyEconomy) {
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
        }

        // 당첨 등급(Tier) 판정
        let currentTier: 'small' | 'medium' | 'big' | 'jackpot' = 'small'
        const hasSevenLine = result.winningLines.some((line) => line.matchedSymbol.id === 'seven')
        if (applyEconomy && (result.isJackpot || hasSevenLine)) {
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

      if (applyEconomy && result.freeSpinsAwarded > 0) {
        nextFreeSpinsLeft += result.freeSpinsAwarded
        setFreeSpinsLeft((prev) => prev + result.freeSpinsAwarded)
      }

      // 회전 완료 및 대사 출력 후 즉시 다음 단계 수위로 전환 (1턴 회전 완료 -> 2단계 수위 영상, 2턴 회전 완료 -> 3단계 수위 영상)
      if (applyEconomy && !isFreeSpin && nextSpinsLeft > 0) {
        setCurrentTurn(Math.min(3, turnForThisSpin + 1))
      }

      if (!applyEconomy) {
        setPracticeStep('result')
      }

      // 추가 기회(3회 도전 + 프리스핀)가 모두 소진되면 딜러 패배 대사 & 음성만 즉시 재생.
      // 스캐너(스캐터 🎰 3개) 당첨 시 프리스핀 추가 기회가 생성되므로 isGameOver가 false로 유지되어 패배를 건너뜀.
      const isGameOver = applyEconomy && nextSpinsLeft <= 0 && nextFreeSpinsLeft <= 0
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

  const leaveAfterDefeat = () => {
    ;(onDefeatExit ?? onClose)()
  }

  const handleShellClose = () => {
    if (practiceRef.current) {
      onPracticeDone?.()
      return
    }
    if (isOutOfSpins) {
      leaveAfterDefeat()
      return
    }
    onClose()
  }

  const machineToneClass =
    stoppedCount < 3
      ? 'is-spinning'
      : lastResult?.isJackpot
      ? 'is-jackpot'
      : (lastResult?.totalWinAmount ?? 0) > 0
      ? 'is-win'
      : ''

  return (
    <div className="slot-shell relative w-full h-full min-h-0 flex-1 text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* 단일 헤더: 타이틀 · 페이테이블 · 자산 · (옵션 extras) · X 하나 */}
      <div className="slot-shell-header relative z-10 flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="slot-shell-title-mark" aria-hidden>
            🎰
          </div>
          <h1 className="slot-shell-title truncate">GOLDEN SLOT MACHINE</h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {headerExtras}
          <button
            type="button"
            onClick={() => setShowPaytable(true)}
            className="slot-shell-btn slot-shell-btn--ghost"
          >
            {t('casino.paytable')}
          </button>

          <div className="slot-shell-assets">
            <span className="slot-shell-assets-label">{t('casino.userAssets')}</span>
            <span className="slot-shell-assets-value">${userAssets.toLocaleString()}</span>
          </div>

          <button type="button" onClick={handleShellClose} className="slot-shell-btn slot-shell-btn--exit" aria-label={t('casino.exit')}>
            ✕
          </button>
        </div>
      </div>

      {/* STAGE */}
      <div className="slot-stage relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
        <img
          src={SLOT_UI_ASSETS.stageBg}
          alt=""
          draggable={false}
          className="slot-stage-bg"
        />
        <div className="slot-stage-dim" aria-hidden />
        <div className="slot-stage-grid relative z-[1] grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-2 lg:gap-3 items-center flex-1 min-h-0 overflow-hidden">
          
          {/* LEFT: CCTV — 릴 패널에 가깝게 */}
          <div className="slot-cctv-col hidden lg:flex flex-col justify-center items-end font-mono text-xs overflow-hidden bg-transparent border-none shadow-none h-full min-h-0">
            <div className="slot-cctv-monitor relative w-full aspect-[3/4] min-h-0 max-h-[min(88vh,740px)] group">
              <div className="slot-cctv-feed absolute overflow-hidden rounded-[0.35rem] bg-slate-950">
                <div className="cctv-scanline slot-cctv-fx-scanline" />
                <div className="cctv-noise slot-cctv-fx-noise" />

                <div className="pointer-events-none absolute top-2 left-2 z-20 flex items-center gap-1.5 font-mono">
                  <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded border border-rose-500/60 shadow">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[9px] font-black text-rose-400 tracking-wider">REC</span>
                  </div>
                  <div className="bg-black/75 px-2 py-0.5 rounded text-[9px] text-slate-200/90 tracking-wider font-bold">
                    CAM-01
                  </div>
                  <div className="bg-black/75 px-2 py-0.5 rounded text-[9px] text-amber-300/90 tracking-wider font-bold">
                    T{currentTurn}/3
                  </div>
                </div>
                <div className="pointer-events-none absolute bottom-2 right-2 z-20 font-mono">
                  <SlotCctvClock locale={locale} />
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
                      alt={dealerConfig.dealerName}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-300">
                    <div className="w-16 h-16 rounded-full border border-slate-500/70 p-1 mb-1 bg-black flex items-center justify-center">
                      <span className="text-3xl">🎩</span>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest font-mono">
                      {dealerConfig.dealerName}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold font-mono">
                      {dealerConfig.dealerTitle}
                    </span>
                  </div>
                )}
              </div>

              <img
                src={SLOT_UI_ASSETS.cctvFrame}
                alt=""
                draggable={false}
                className="slot-cctv-bezel pointer-events-none absolute inset-0 z-30 h-full w-full object-fill"
              />
            </div>
          </div>

          {/* CENTER: screen panel (no cabinet) */}
          <div className="relative flex flex-col items-center justify-center w-full h-full min-h-0 overflow-visible py-1">
            <div className={`slot-screen-panel ${machineToneClass}`}>
              {/* Reels behind punched window */}
              <div className="slot-reel-viewport">
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
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
                  const landOffset = '-75%'

                  return (
                    <div key={colIdx} className="pachislot-reel-column slot-panel-reel-column">
                      <div
                        className={`pachislot-reel-strip ${
                          isColumnSpinning ? 'is-spinning' : 'is-stopped'
                        }`}
                        style={{
                          ['--reel-land' as string]: landOffset,
                        }}
                      >
                        {stripSymbols.map((symId, idx) => {
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
                              <SlotSymbolImg
                                symId={symId}
                                sizeClass="w-full h-full"
                                className={symId === 'seven' || isWinningCell ? 'slot-symbol-img--hot' : ''}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {isOutOfSpins && !isSpinning && (
                  <div className="slot-reel-closed" aria-live="assertive">
                    <span className="slot-reel-closed-text">CLOSE</span>
                  </div>
                )}
              </div>

              <img
                src={SLOT_UI_ASSETS.screenPanelPunch}
                alt=""
                draggable={false}
                className="slot-screen-panel-frame"
              />

              <div className="slot-led-text" aria-live="polite">
                {isOutOfSpins && !isSpinning ? (
                  <span className="slot-digital-text is-closed">CLOSE</span>
                ) : isSpinning ? (
                  <span className="slot-digital-text is-spin">{t('casino.spinning')}</span>
                ) : lastResult ? (
                  lastResult.totalWinAmount > 0 ? (
                    <span className={`slot-digital-text is-win ${isCountingUp ? 'is-counting' : ''}`}>
                      {(winTier === 'big' || winTier === 'jackpot'
                        ? t('casino.megaWin')
                        : winTier === 'medium'
                        ? t('casino.bigWin')
                        : t('casino.win'))}{' '}
                      <span ref={winAmountTextRef}>
                        +${(isCountingUp ? animWinAmount : lastResult.totalWinAmount).toLocaleString()}
                      </span>
                    </span>
                  ) : (
                    <span className="slot-digital-text is-miss">{t('casino.tryNext')}</span>
                  )
                ) : (
                  <span className="slot-digital-text is-ready">{t('casino.startPrompt')}</span>
                )}
              </div>

              {coinParticles.length > 0 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
                  {coinParticles.map((p) => (
                    <div
                      key={p.id}
                      style={{ left: `${p.x}%`, bottom: '22%', animationDelay: `${p.delay}s` }}
                      className="absolute text-2xl sm:text-3xl animate-coin-float"
                    >
                      {p.icon}
                    </div>
                  ))}
                </div>
              )}
              {confettiParticles.length > 0 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
                  {confettiParticles.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        left: `${p.x}%`,
                        top: '18%',
                        backgroundColor: p.color,
                        animationDelay: `${p.delay}s`,
                      }}
                      className="absolute w-2.5 h-2.5 rounded-sm animate-confetti-fall shadow-md"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM DOCK: spins · TOTAL WIN · stop lamps · large SPIN */}
        <div className="slot-bottom-dock relative z-[2] shrink-0">
          <div
            className={`slot-dock-spins ${freeSpinsLeft > 0 ? 'is-bonus' : ''}`}
            aria-live="polite"
            aria-label={
              freeSpinsLeft > 0
                ? t('casino.bonusSpin').replace('{spins}', String(freeSpinsLeft))
                : t('casino.spinsRemaining', { spins: spinsLeft })
            }
          >
            <span className="slot-dock-spins-label">
              {freeSpinsLeft > 0 ? 'BONUS' : 'SPINS'}
            </span>
            <span className="slot-dock-spins-count">
              {freeSpinsLeft > 0 ? freeSpinsLeft : spinsLeft}
            </span>
          </div>

          <div
            className={`slot-dock-wintray ${
              lastResult && lastResult.totalWinAmount > 0 && !isSpinning ? 'is-punch' : ''
            }`}
          >
            <img
              src={SLOT_UI_ASSETS.wintray}
              alt=""
              draggable={false}
              className="slot-dock-wintray-frame"
            />
            <div className="slot-dock-wintray-text">
              <span className="slot-digital-text slot-device-wintray-label">
                {t('casino.accumulatedWin')}
              </span>
              <span className="slot-digital-text slot-device-wintray-value">
                +${sessionTotalWon.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="slot-dock-controls">
            <div className="slot-dock-stops" role="group" aria-label={t('casino.stop')}>
              {[0, 1, 2].map((idx) => {
                const isStopped = stoppedCount > idx
                const canStop = isSpinning && stoppedCount === idx
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!canStop}
                    onClick={() => handleStopColumn(idx)}
                    aria-label={`${t('casino.stop')} ${idx + 1}`}
                    className={`slot-stop-lamp ${isStopped ? 'is-red' : 'is-green'} ${
                      canStop ? 'is-active' : ''
                    }`}
                  />
                )
              })}
            </div>
            <button
              type="button"
              data-casino-coach="spin"
              disabled={isSpinning || isOutOfSpins || (practice && practiceStep !== 'spin')}
              onClick={handleSpin}
              aria-label={
                isSpinning
                  ? t('casino.spinning')
                  : isOutOfSpins
                  ? t('casino.spinsExhausted')
                  : freeSpinsLeft > 0
                  ? t('casino.bonusSpin').replace('{spins}', String(freeSpinsLeft))
                  : t('casino.spin').replace('{spins}', String(spinsLeft))
              }
              className={`slot-dock-spin ${
                isSpinning || isLeverPulled ? 'is-pressed' : ''
              } ${isSpinning || isOutOfSpins ? 'is-disabled' : ''} ${
                !isSpinning && !isOutOfSpins && freeSpinsLeft > 0 ? 'is-bonus' : ''
              }`}
            >
              <img
                src={SLOT_UI_ASSETS.btnCapGlow}
                alt=""
                draggable={false}
                className="slot-dock-spin-glow"
              />
              <img
                src={SLOT_UI_ASSETS.spinBtn}
                alt=""
                draggable={false}
                className="slot-dock-spin-face is-normal"
              />
              <img
                src={SLOT_UI_ASSETS.spinBtnPressed}
                alt=""
                draggable={false}
                className="slot-dock-spin-face is-pressed-face"
              />
            </button>
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
                      <SlotSymbolImg symId={sym.id} sizeClass="w-9 h-9" />
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
          onClose={() => {
            const wasLoss = Boolean(dealerDialoguePlay.isLoss)
            setDealerDialoguePlay(null)
            if (wasLoss) leaveAfterDefeat()
          }}
        />
      )}
      {practice && practiceStep !== 'rolling' ? (
        <CasinoPracticeCoach
          titleKey="casino.tutorial.slotTitle"
          bodyKey={
            practiceStep === 'result'
              ? practiceReplay
                ? 'casino.tutorial.slotResultReplay'
                : 'casino.tutorial.slotResult'
              : 'casino.tutorial.slotSpin'
          }
          selector={practiceStep === 'spin' ? '[data-casino-coach="spin"]' : null}
          onSkip={() => onPracticeDone?.()}
          onNext={practiceStep === 'result' ? () => onPracticeDone?.() : undefined}
        />
      ) : null}
    </div>
  )
}
