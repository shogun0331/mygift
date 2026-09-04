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
  const betAmount = getBetAmountByGrade(stationGrade)

  const [spinsLeft, setSpinsLeft] = useState(5)
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0)
  const [sessionTotalWon, setSessionTotalWon] = useState(0)
  const [sessionTotalBet, setSessionTotalBet] = useState(0)

  // 릴 회전 멈춤 스태거 상태 (0: 3개 모두 회전, 1: 1번릴 멈춤, 2: 2번릴 멈춤, 3: 3개 모두 멈춤)
  const [stoppedCount, setStoppedCount] = useState(3)
  const isSpinning = stoppedCount < 3

  const [currentGrid, setCurrentGrid] = useState<SlotSymbolId[][]>(() => generateRandomSlotGrid())
  const [lastResult, setLastResult] = useState<SlotSpinResult | null>(null)
  const [isLeverPulled, setIsLeverPulled] = useState(false)

  const [showPaytable, setShowPaytable] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
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

  // 레버 당기기 & 스핀 동작
  const handleSpin = () => {
    if (isSpinning) return
    const isFreeSpin = freeSpinsLeft > 0

    if (!isFreeSpin) {
      if (spinsLeft <= 0) {
        setShowSummary(true)
        return
      }
      if (userAssetsRef.current < betAmount) {
        alert(`베팅 금액($${betAmount.toLocaleString()})이 부족합니다!`)
        return
      }
      onUpdateAssets(userAssetsRef.current - betAmount)
      setSessionTotalBet((prev) => prev + betAmount)
      setSpinsLeft((prev) => prev - 1)
    } else {
      setFreeSpinsLeft((prev) => prev - 1)
    }

    // 레버 애니메이션 트리거
    setIsLeverPulled(true)
    setTimeout(() => setIsLeverPulled(false), 500)

    // 최종 타겟 그리드 & 평가 생성
    const targetGrid = generateRandomSlotGrid()
    const result = evaluateSlotSpin(targetGrid, betAmount)

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

      // 당첨 처리
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

      // 기회 소진 시 결과 요약
      setTimeout(() => {
        setFreeSpinsLeft((f) => {
          setSpinsLeft((s) => {
            if (s <= 0 && f <= 0) {
              setShowSummary(true)
            }
            return s
          })
          return f
        })
      }, 1400)
    }, 1900)
  }

  // 5개 페이라인 SVG Coordinate 계산 (3x3 Grid)
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

  const machineToneClass =
    stoppedCount < 3
      ? 'is-spinning'
      : lastResult?.isJackpot
      ? 'is-jackpot'
      : (lastResult?.totalWinAmount ?? 0) > 0
      ? 'is-win'
      : ''

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-3 sm:p-5 text-white select-none overflow-hidden font-sans">
      {/* HEADER BAR */}
      <div className="w-full flex items-center justify-between px-6 py-2.5 bg-slate-900/90 border-2 border-amber-400/70 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-200 flex items-center justify-center text-2xl font-black text-slate-950 shadow-lg shadow-amber-500/40 animate-pulse">
            🎰
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              LAS VEGAS VIP 3x3 REEL SLOT MACHINE
            </div>
            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-md">
              GOLDEN CASINO REEL
            </h1>
          </div>
        </div>

        {/* STATS BADGES & EXIT */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPaytable(true)}
            className="px-3.5 py-1.5 rounded-xl border border-amber-400/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-300 text-xs font-bold transition-all"
          >
            📖 배당표 안내
          </button>

          <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-950 border border-amber-400/40 text-xs font-mono">
            <span className="text-amber-400 font-bold">보유 자산:</span>
            <span className="text-amber-300 font-black text-sm">
              ${userAssets.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => setShowSummary(true)}
            className="px-4 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-500 border border-red-400 text-white font-bold text-xs shadow-lg shadow-red-900/50 transition-all active:scale-95"
          >
            🚪 게임 종료
          </button>
        </div>
      </div>

      {/* MAIN SLOT MACHINE CABINET BODY */}
      <div className="relative my-auto flex items-center justify-center w-full max-w-4xl px-4">
        {/* CABINET PANEL FRAME */}
        <div className={`casino-slot-cabinet-panel ${machineToneClass} flex flex-col overflow-hidden relative z-10`}>
          {/* TOP LED MARQUEE LAMPS */}
          <div className="casino-slot-lamps">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} style={{ animationDelay: `${index * 80}ms` }} />
            ))}
          </div>

          {/* LCD DISPLAY SCREEN AREA */}
          <div className="p-4 sm:p-5 flex flex-col gap-4">
            {/* DIGITAL STATUS LED BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-amber-400/40 shadow-inner flex flex-col items-center">
                <span className="text-[10px] text-amber-400/80 font-bold">1회 베팅금</span>
                <span className="text-sm font-black text-yellow-300 mt-0.5">
                  ${betAmount.toLocaleString()}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-amber-400/40 shadow-inner flex flex-col items-center">
                <span className="text-[10px] text-amber-400/80 font-bold">남은 스핀 기회</span>
                <span className="text-sm font-black text-amber-300 mt-0.5">
                  {spinsLeft}회 {freeSpinsLeft > 0 && <span className="text-yellow-400 text-xs">(+FREE {freeSpinsLeft})</span>}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-amber-400/40 shadow-inner flex flex-col items-center">
                <span className="text-[10px] text-amber-400/80 font-bold">누적 당첨금</span>
                <span className="text-sm font-black text-green-400 mt-0.5">
                  ${sessionTotalWon.toLocaleString()}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-amber-400/40 shadow-inner flex flex-col items-center">
                <span className="text-[10px] text-amber-400/80 font-bold">방송국 등급</span>
                <span className="text-sm font-black text-amber-200 mt-0.5 uppercase">
                  {stationGrade ?? 'SME'} TIER
                </span>
              </div>
            </div>

            {/* 3x3 REEL WINDOW WITH PAYLINE SIDE BADGES */}
            <div className="relative flex items-center justify-between gap-2">
              {/* LEFT PAYLINE BADGES (L2, L1, L3) */}
              <div className="flex flex-col gap-8 text-[10px] font-mono font-bold shrink-0">
                {PAYLINES.slice(0, 3).map((line) => {
                  const isWon = lastResult?.winningLines.some((w) => w.payline.id === line.id)
                  return (
                    <div
                      key={line.id}
                      style={{ borderColor: line.color, color: isWon ? '#000' : line.color }}
                      className={`px-2 py-1 rounded-md border-2 ${
                        isWon
                          ? 'bg-amber-400 animate-bounce shadow-[0_0_12px_currentColor]'
                          : 'bg-slate-950/80'
                      } transition-all`}
                    >
                      L{line.id}
                    </div>
                  )
                })}
              </div>

              {/* REEL DISPLAY WINDOW CONTAINER */}
              <div className="casino-lcd-display flex-1 p-3">
                <div className="casino-reel-window">
                  {/* PAYLINES SVG NEON LASERS OVERLAY */}
                  <svg className="absolute inset-3 w-[calc(100%-24px)] h-[calc(100%-24px)] pointer-events-none z-30">
                    {PAYLINES.map((line) => {
                      const isWon = lastResult?.winningLines.some((w) => w.payline.id === line.id)
                      return (
                        <path
                          key={line.id}
                          d={getLineSvgCoords(line.coords)}
                          fill="none"
                          stroke={isWon ? line.color : 'transparent'}
                          strokeWidth={isWon ? 6 : 0}
                          className={isWon ? 'animate-pulse filter drop-shadow-[0_0_12px_currentColor]' : ''}
                        />
                      )
                    })}
                  </svg>

                  {/* 3 REEL COLUMNS */}
                  {[0, 1, 2].map((colIdx) => {
                    const isColumnSpinning = stoppedCount <= colIdx
                    const stripSymbols = colStrips[colIdx] ?? []
                    const landOffsetPx = 9 * 84 // 9 dummy items * 84px cell height = 756px offset

                    return (
                      <div key={colIdx} className="casino-reel-column">
                        <div
                          className={`casino-reel-strip ${
                            isColumnSpinning ? 'is-spinning' : 'is-stopped'
                          }`}
                          style={{
                            ['--reel-land' as string]: `-${landOffsetPx}px`,
                          }}
                        >
                          {stripSymbols.map((symId, idx) => {
                            const sym = SLOT_SYMBOLS[symId] ?? SLOT_SYMBOLS.cherry
                            // 멈췄을 때 최종 타겟 셀 여부 및 당첨 강조
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
                                className={`casino-reel-cell ${isWinningCell ? 'is-winner' : ''}`}
                              >
                                <span className="text-4xl sm:text-5xl filter drop-shadow-md">
                                  {sym.icon}
                                </span>
                                <span className="text-[10px] font-bold text-slate-300 mt-0.5 font-mono">
                                  {sym.name}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* RIGHT PAYLINE BADGES (L4, L5) */}
              <div className="flex flex-col gap-12 text-[10px] font-mono font-bold shrink-0">
                {PAYLINES.slice(3, 5).map((line) => {
                  const isWon = lastResult?.winningLines.some((w) => w.payline.id === line.id)
                  return (
                    <div
                      key={line.id}
                      style={{ borderColor: line.color, color: isWon ? '#000' : line.color }}
                      className={`px-2 py-1 rounded-md border-2 ${
                        isWon
                          ? 'bg-amber-400 animate-bounce shadow-[0_0_12px_currentColor]'
                          : 'bg-slate-950/80'
                      } transition-all`}
                    >
                      L{line.id}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SPIN RESULTS MESSAGE BANNER */}
            <div className="min-h-[46px] flex items-center justify-center px-4 py-2 bg-slate-950/90 rounded-xl border border-amber-400/40 text-center font-mono">
              {isSpinning ? (
                <span className="text-amber-400 font-bold animate-pulse text-sm">
                  🎰 릴 회전 중... (대박 당첨 기원!)
                </span>
              ) : lastResult ? (
                lastResult.totalWinAmount > 0 ? (
                  <div className="flex items-center gap-2 text-yellow-300 font-black text-base animate-bounce">
                    <span>🎉 당첨!</span>
                    <span className="text-amber-400 text-lg">
                      +${lastResult.totalWinAmount.toLocaleString()}
                    </span>
                    {lastResult.freeSpinsAwarded > 0 && (
                      <span className="text-xs text-yellow-200 bg-yellow-600/70 px-2.5 py-0.5 rounded-full">
                        🎁 FREE SPIN +3회!
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">
                    아쉽습니다! 다음 스핀 기회를 도전하세요.
                  </span>
                )
              ) : (
                <span className="text-amber-300/80 text-xs">
                  하단의 스핀 버튼 또는 오른쪽 레버를 당겨 스핀하세요!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* PHYSICAL MECHANICAL PULL LEVER (RIGHT SIDE) */}
        <div className="hidden lg:flex flex-col items-center justify-center ml-4 relative select-none">
          <div className="w-6 h-36 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-800 rounded-full border border-slate-950 shadow-2xl relative flex flex-col items-center">
            {/* LEVER HANDLE ROD */}
            <div
              className={`w-3 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 rounded-full transition-all duration-300 origin-bottom ${
                isLeverPulled ? 'h-16 transform rotate-[45deg]' : 'h-28'
              }`}
            >
              {/* LEVER KNOB BALL */}
              <button
                type="button"
                disabled={isSpinning || (spinsLeft <= 0 && freeSpinsLeft <= 0)}
                onClick={handleSpin}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 via-red-500 to-amber-400 border-2 border-yellow-200 shadow-[0_0_20px_rgba(239,68,68,0.8)] -translate-x-3.5 -translate-y-4 hover:scale-110 active:scale-95 transition-transform"
                title="레버 당기기!"
              />
            </div>
          </div>
          <span className="text-[9px] font-mono font-bold text-amber-400 mt-2 uppercase tracking-widest">
            PULL LEVER
          </span>
        </div>
      </div>

      {/* BIG PUSH BUTTON FOOTER */}
      <div className="w-full max-w-xl mt-3 flex items-center justify-center">
        <button
          disabled={isSpinning || (spinsLeft <= 0 && freeSpinsLeft <= 0)}
          onClick={handleSpin}
          className={`w-full py-4 rounded-2xl font-black text-xl tracking-wider shadow-2xl transition-all duration-150 transform flex items-center justify-center gap-3 ${
            isSpinning || (spinsLeft <= 0 && freeSpinsLeft <= 0)
              ? 'bg-slate-800 border-2 border-slate-700 text-slate-500 cursor-not-allowed opacity-60'
              : freeSpinsLeft > 0
              ? 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 border-2 border-yellow-200 text-slate-950 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(250,204,21,0.9)] animate-pulse'
              : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-2 border-yellow-300 text-slate-950 hover:scale-105 active:scale-95 shadow-[0_0_35px_rgba(245,158,11,0.7)]'
          }`}
        >
          <span className="text-2xl">🎰</span>
          <span>
            {isSpinning
              ? '릴 회전 중...'
              : freeSpinsLeft > 0
              ? `FREE SPIN (${freeSpinsLeft}회 남음)`
              : 'SPIN! (슬롯 돌리기)'}
          </span>
        </button>
      </div>

      {/* PAYTABLE MODAL */}
      {showPaytable && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-3">
              <h2 className="text-xl font-black text-amber-300 flex items-center gap-2">
                <span>📖</span> 3x3 슬롯머신 배당표 & 심볼 규칙
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

            {/* PAYLINES GUIDE */}
            <div className="space-y-2 border-t border-amber-400/20 pt-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                5개 페이라인 (Paylines)
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
            3x3 9개 칸 올 매칭! 베팅금 100배 당첨!
          </p>
          <div className="my-6 text-3xl sm:text-4xl font-black text-yellow-300 font-mono bg-amber-950/80 px-8 py-4 rounded-3xl border-2 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.6)]">
            +${(betAmount * 100).toLocaleString()}
          </div>
          <button
            onClick={() => setJackpotBanner(false)}
            className="px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg shadow-2xl transition-all"
          >
            잭팟 당첨금 수령하기
          </button>
        </div>
      )}

      {/* SESSION SUMMARY END MODAL */}
      {showSummary && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="text-5xl">🎰</div>
            <h2 className="text-2xl font-black text-amber-300">카지노 슬롯 세션 종료</h2>
            <p className="text-xs text-slate-400">
              슬롯머신 기회를 모두 소진했습니다. 카지노는 3턴 후 다시 이용할 수 있습니다.
            </p>

            <div className="bg-slate-950 p-4 rounded-2xl border border-amber-400/30 space-y-2 text-sm font-mono">
              <div className="flex justify-between text-slate-300">
                <span>총 베팅 금액:</span>
                <span className="text-red-400 font-bold">-${sessionTotalBet.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>총 획득 당첨금:</span>
                <span className="text-yellow-300 font-bold">
                  +${sessionTotalWon.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-base font-bold">
                <span className="text-amber-400">순 손익:</span>
                <span
                  className={
                    sessionTotalWon >= sessionTotalBet
                      ? 'text-green-400 font-black'
                      : 'text-red-400 font-black'
                  }
                >
                  {sessionTotalWon >= sessionTotalBet ? '+' : ''}$
                  {(sessionTotalWon - sessionTotalBet).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowSummary(false)
                onClose()
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-base shadow-xl transition-all"
            >
              결과 확인 및 카지노 퇴장
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
