import { useState, useEffect, useRef } from 'react'
import type { StationGrade } from '../../game/stationGradeConfig'
import {
  SLOT_SYMBOLS,
  PAYLINES,
  getBetAmountByGrade,
  getRandomSlotSymbol,
  generateRandomSlotGrid,
  evaluateSlotSpin,
  type SlotSymbolId,
  type SlotSpinResult,
} from './slotConfig'
import { playSfx, stopSfx, playAuditPassFanfare } from '../../game/uiSfx'

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

export function CasinoSlotMachine({
  stationGrade,
  userAssets,
  onUpdateAssets,
  onClose,
}: CasinoSlotMachineProps) {
  // 등급별 기본 보상 기준금 (3회 무료 도전)
  const baseReward = getBetAmountByGrade(stationGrade)

  const [spinsLeft, setSpinsLeft] = useState(3)
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0)
  const [sessionTotalWon, setSessionTotalWon] = useState(0)

  // 릴 회전 멈춤 스태거 상태 (0: 3개 모두 회전, 1: 1번릴 멈춤, 2: 2번릴 멈춤, 3: 3개 모두 멈춤)
  const [stoppedCount, setStoppedCount] = useState(3)
  const isSpinning = stoppedCount < 3

  const [currentGrid, setCurrentGrid] = useState<SlotSymbolId[][]>(() => generateRandomSlotGrid())
  const [lastResult, setLastResult] = useState<SlotSpinResult | null>(null)
  const [isLeverPulled, setIsLeverPulled] = useState(false)

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

  // 레버 당기기 & 스핀 동작 (무료 3회 도전)
  const handleSpin = () => {
    if (isSpinning) return
    const isFreeSpin = freeSpinsLeft > 0

    if (!isFreeSpin) {
      if (spinsLeft <= 0) return // 기회 소진 시 더이상 회전하지 않음 (팝업 없음)
      setSpinsLeft((prev) => prev - 1)
    } else {
      setFreeSpinsLeft((prev) => prev - 1)
    }

    // 레버 애니메이션 트리거
    setIsLeverPulled(true)
    setTimeout(() => setIsLeverPulled(false), 500)

    // 최종 타겟 그리드 & 평가 생성
    const targetGrid = generateRandomSlotGrid()
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

      // 당첨 시 보상 지급 (순수 상금 획득)
      if (result.totalWinAmount > 0) {
        onUpdateAssets(userAssetsRef.current + result.totalWinAmount)
        setSessionTotalWon((prev) => prev + result.totalWinAmount)

        if (result.isJackpot) {
          setJackpotBanner(true)
          playAuditPassFanfare()
        } else if (result.isScatterWon) {
          playSfx('rank-up')
        } else {
          playSfx('live-donation')
        }
      }

      if (result.freeSpinsAwarded > 0) {
        setFreeSpinsLeft((prev) => prev + result.freeSpinsAwarded)
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
    <div className="relative w-full h-full flex flex-col items-center justify-between p-2 text-white select-none overflow-hidden font-sans">
      {/* CLEAN TOP SYSTEM BAR */}
      <div className="w-full flex items-center justify-between px-5 py-2 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-lg backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center text-xl font-black text-slate-950 shadow-md">
            🎰
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
              GOLDEN CASINO REEL (8개 페이라인 / 무료 3회)
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPaytable(true)}
            className="px-3 py-1 rounded-xl border border-amber-400/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all"
          >
            📖 배당표 안내
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono">
            <span className="text-amber-400 font-bold">보유 자산:</span>
            <span className="text-amber-300 font-black text-sm">
              ${userAssets.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-xl bg-red-600/90 hover:bg-red-500 border border-red-400 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            🚪 게임 종료
          </button>
        </div>
      </div>

      {/* REAL AUTHENTIC HIGH-GLOSS 3D PACHISLOT CABINET CONTAINER (NO SCROLLBAR) */}
      <div className="relative my-auto flex items-center justify-center w-full max-w-3xl py-1">
        <div className={`pachislot-cabinet ${machineToneClass} flex flex-col relative`}>
          {/* 1. CLEAN TOP RED ACRYLIC MARQUEE HEADER */}
          <div className="pachislot-top-marquee">
            <div className="pachislot-marquee-lamps">
              {Array.from({ length: 16 }, (_, index) => (
                <span key={index} style={{ animationDelay: `${index * 60}ms` }} />
              ))}
            </div>

            <div className="px-6 py-2.5 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="pachislot-777-box">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-yellow-300 drop-shadow-[0_2px_8px_rgba(250,204,21,0.9)] animate-pulse">
                    7️⃣ 7️⃣ 7️⃣
                  </span>
                </div>
                <div className="text-[9px] font-black font-mono tracking-widest text-amber-300 bg-amber-950/90 px-3 py-0.5 rounded-full border border-amber-400/60 mt-1 shadow-md uppercase">
                  ★ PACHISLOT 8-PAYLINE CHAMPION ★
                </div>
              </div>
            </div>
          </div>

          {/* 2. CENTRAL GLASS REEL SHOWCASE DECK WITH 8 PAYLINE SIDE BADGES */}
          <div className="pachislot-reel-showcase">
            <div className="p-2.5 sm:p-3.5 flex flex-col gap-2.5">
              {/* REEL WINDOW & SIDE PAYLINE INDICATORS */}
              <div className="relative flex items-center justify-between gap-2">
                {/* LEFT PAYLINE BADGES (L1, L2, L3, L6) */}
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
                  {/* PAYLINES SVG NEON LASERS OVERLAY (8 LINES) */}
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
                    const landOffsetPx = 9 * 70 // 9 dummy items * 70px cell height = 630px offset

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
                                <span className="text-3xl sm:text-4xl filter drop-shadow-md">
                                  {sym.icon}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* RIGHT PAYLINE BADGES (L4, L5, L7, L8) */}
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
              <div className="min-h-[38px] flex items-center justify-center px-4 py-1 bg-slate-950/95 rounded-xl border border-amber-400/50 text-center font-mono shadow-inner">
                {isSpinning ? (
                  <span className="text-amber-400 font-bold animate-pulse text-xs">
                    🎰 릴 스핀 중... (무료 스핀 대박 기원!)
                  </span>
                ) : lastResult ? (
                  lastResult.totalWinAmount > 0 ? (
                    <div className="flex items-center gap-2 text-yellow-300 font-black text-xs sm:text-sm animate-bounce">
                      <span>🎉 당첨 상금!</span>
                      <span className="text-amber-400 text-sm sm:text-base">
                        +${lastResult.totalWinAmount.toLocaleString()}
                      </span>
                      {lastResult.freeSpinsAwarded > 0 && (
                        <span className="text-[10px] text-yellow-200 bg-yellow-600/90 px-2 py-0.5 rounded-full shadow">
                          🎁 BONUS FREE SPIN +3회!
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs">
                      {isOutOfSpins ? '도전 기회를 모두 사용했습니다. 상단 [게임 종료]로 나가주세요.' : '아쉽습니다! 다음 스핀 기회를 도전하세요.'}
                    </span>
                  )
                ) : (
                  <span className="text-amber-300/90 text-xs">
                    무료 3회 스핀 기회가 제공됩니다! 하단 SPIN 버튼을 누르거나 레버를 당기세요.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. PHYSICAL SLANTED BUTTON DECK (STOP 1, STOP 2, STOP 3 & BIG SPIN BUTTON) */}
          <div className="pachislot-button-deck flex items-center justify-between gap-3">
            {/* 3 HIGH-GLOSS PHYSICAL STOP BUTTONS */}
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
                    <span>STOP</span>
                    <span className="text-[9px] font-bold text-slate-700">{idx + 1}</span>
                  </button>
                )
              })}
            </div>

            {/* HIGH-GLOSS 3D GOLDEN ARCADE SPIN BUTTON */}
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
                  ? '릴 회전 중...'
                  : isOutOfSpins
                  ? '도전 기회 소진 (0/3회)'
                  : freeSpinsLeft > 0
                  ? `FREE SPIN (${freeSpinsLeft}회)`
                  : `SPIN! (${spinsLeft}/3회)`}
              </span>
            </button>
          </div>

          {/* 4. BOTTOM GRAPHIC ARTWORK PANEL & 3D METALLIC COIN TRAY */}
          <div className="pachislot-bottom-deck">
            <div className="px-4 py-1 flex items-center justify-between border-b border-slate-700/80 bg-slate-900/90 text-xs font-mono">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                ★ PACHISLOT COIN TRAY ★
              </span>
              <span className="text-xs font-black text-green-400">
                획득 상금: +${sessionTotalWon.toLocaleString()}
              </span>
            </div>

            {/* METALLIC COIN OUTLET TRAY */}
            <div className="pachislot-coin-tray flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span className="text-2xl animate-bounce">🪙</span>
                <span className="text-xs">코인 배출구 (누적 당첨 상금)</span>
              </div>
              <div className="text-sm font-black font-mono text-yellow-300 bg-amber-950/90 px-3 py-1 rounded-lg border border-amber-400/50 shadow-md">
                +${sessionTotalWon.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 3D SIDE MECHANICAL PULL LEVER WITH SPHERE KNOB */}
        <div className="hidden lg:flex flex-col items-center justify-center ml-4 relative select-none shrink-0">
          <div className="w-6 h-36 bg-gradient-to-r from-slate-700 via-slate-400 to-slate-800 rounded-full border-2 border-slate-900 shadow-2xl relative flex flex-col items-center p-1">
            <div
              className={`w-3 bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 rounded-full transition-all duration-300 origin-bottom shadow-inner ${
                isLeverPulled ? 'h-16 transform rotate-[45deg]' : 'h-28'
              }`}
            >
              <button
                type="button"
                disabled={isSpinning || isOutOfSpins}
                onClick={handleSpin}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-700 via-red-500 to-yellow-300 border-2 border-yellow-200 shadow-[0_0_20px_rgba(239,68,68,0.9)] -translate-x-3.5 -translate-y-4 hover:scale-110 active:scale-95 transition-transform"
                title="레버 당기기!"
              />
            </div>
          </div>
          <span className="text-[9px] font-mono font-black text-amber-400 mt-2 uppercase tracking-widest drop-shadow">
            PULL LEVER
          </span>
        </div>
      </div>

      {/* PAYTABLE MODAL */}
      {showPaytable && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-3">
              <h2 className="text-xl font-black text-amber-300 flex items-center gap-2">
                <span>📖</span> 3x3 슬롯머신 배당표 & 규칙
              </h2>
              <button
                onClick={() => setShowPaytable(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* SYMBOLS MULTIPLIER TABLE */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                심볼별 당첨 배율 (3개 매칭 시)
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.values(SLOT_SYMBOLS).map((sym) => (
                  <div
                    key={sym.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-amber-400/20"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{sym.icon}</span>
                      <span className="font-bold text-slate-200">{sym.name}</span>
                    </div>
                    <span className="font-mono font-black text-amber-300">
                      {sym.isScatter
                        ? '10배 + Free Spin'
                        : sym.isWild
                        ? '15배 (Wild)'
                        : `${sym.multiplier}배`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PAYLINES GUIDE (8 PAYLINES) */}
            <div className="space-y-2 border-t border-amber-400/20 pt-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                총 8개 당첨 페이라인 (Paylines)
              </h3>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside font-mono">
                {PAYLINES.map((line) => (
                  <li key={line.id}>
                    <span style={{ color: line.color }} className="font-bold">
                      {line.name} (L{line.id})
                    </span>
                    : row/col 연결선 3칸 동일 매칭 판정
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setShowPaytable(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg transition-all"
            >
              확인 및 닫기
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN JACKPOT BANNER OVERLAY */}
      {jackpotBanner && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in text-center">
          <div className="text-8xl animate-bounce mb-4">🎰💥👑</div>
          <h1 className="text-4xl sm:text-6xl font-black bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_50px_rgba(250,204,21,1)]">
            SUPER MEGA JACKPOT!!
          </h1>
          <p className="text-xl font-bold text-amber-300 mt-2 font-mono">
            3x3 9개 칸 올 매칭! 당첨 기준금 100배 획득!
          </p>
          <div className="my-6 text-3xl sm:text-4xl font-black text-yellow-300 font-mono bg-amber-950/80 px-8 py-4 rounded-3xl border-2 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.6)]">
            +${(baseReward * 100).toLocaleString()}
          </div>
          <button
            onClick={() => setJackpotBanner(false)}
            className="px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg shadow-2xl transition-all"
          >
            잭팟 당첨금 수령하기
          </button>
        </div>
      )}
    </div>
  )
}
