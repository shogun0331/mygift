import { useState, useRef } from 'react'
import type { StationGrade } from '../../game/stationGradeConfig'
import {
  SLOT_SYMBOLS,
  PAYLINES,
  getBetAmountByGrade,
  generateRandomSlotGrid,
  evaluateSlotSpin,
  type SlotSymbolId,
  type SlotSpinResult,
} from './slotConfig'

export type CasinoSlotMachineProps = {
  stationGrade?: StationGrade | null
  userAssets: number
  onUpdateAssets: (newAssets: number) => void
  onClose: () => void
}

/** Web Audio 기반 슬롯머신 SFX 효과음 생성 */
function playSlotSound(type: 'spin' | 'win' | 'scatter' | 'jackpot') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    if (type === 'spin') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(180, now)
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.15)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.15)
      setTimeout(() => ctx.close().catch(() => {}), 200)
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + idx * 0.08)
        gain.gain.setValueAtTime(0.2, now + idx * 0.08)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.08)
        osc.stop(now + idx * 0.08 + 0.25)
      })
      setTimeout(() => ctx.close().catch(() => {}), 600)
    } else if (type === 'scatter') {
      const notes = [440, 554.37, 659.25, 880, 1108.73]
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.07)
        gain.gain.setValueAtTime(0.3, now + idx * 0.07)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.07)
        osc.stop(now + idx * 0.07 + 0.3)
      })
      setTimeout(() => ctx.close().catch(() => {}), 800)
    } else if (type === 'jackpot') {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0]
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(freq, now + idx * 0.06)
        gain.gain.setValueAtTime(0.25, now + idx * 0.06)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.06)
        osc.stop(now + idx * 0.06 + 0.4)
      })
      setTimeout(() => ctx.close().catch(() => {}), 1200)
    }
  } catch {
    // Audio Context not allowed or failed
  }
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

  const [isSpinning, setIsSpinning] = useState(false)
  const [currentGrid, setCurrentGrid] = useState<SlotSymbolId[][]>(() => generateRandomSlotGrid())
  const [lastResult, setLastResult] = useState<SlotSpinResult | null>(null)

  const [showPaytable, setShowPaytable] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [jackpotBanner, setJackpotBanner] = useState(false)

  const userAssetsRef = useRef(userAssets)
  userAssetsRef.current = userAssets

  // 스핀 액션
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
      // 일반 스핀: 베팅금 차감
      onUpdateAssets(userAssetsRef.current - betAmount)
      setSessionTotalBet((prev) => prev + betAmount)
      setSpinsLeft((prev) => prev - 1)
    } else {
      // 프리 스핀: 기회 차감 (베팅금 0)
      setFreeSpinsLeft((prev) => prev - 1)
    }

    setIsSpinning(true)
    setLastResult(null)
    playSlotSound('spin')

    // 릴 애니메이션
    let spinCount = 0
    const interval = setInterval(() => {
      setCurrentGrid(generateRandomSlotGrid())
      playSlotSound('spin')
      spinCount += 1
      if (spinCount > 10) {
        clearInterval(interval)

        // 최종 스핀 결과 산출
        const finalGrid = generateRandomSlotGrid()
        const result = evaluateSlotSpin(finalGrid, betAmount)

        setCurrentGrid(result.grid)
        setLastResult(result)
        setIsSpinning(false)

        // 당첨금 처리
        if (result.totalWinAmount > 0) {
          onUpdateAssets(userAssetsRef.current + result.totalWinAmount)
          setSessionTotalWon((prev) => prev + result.totalWinAmount)

          if (result.isJackpot) {
            setJackpotBanner(true)
            playSlotSound('jackpot')
          } else if (result.isScatterWon) {
            playSlotSound('scatter')
          } else {
            playSlotSound('win')
          }
        }

        // 프리 스핀 지급
        if (result.freeSpinsAwarded > 0) {
          setFreeSpinsLeft((prev) => prev + result.freeSpinsAwarded)
        }

        // 스핀 종료 후 남은 기회가 전혀 없으면 결과 요약창 팝업
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
        }, 1200)
      }
    }, 100)
  }

  // 5개 페이라인 SVG Coordinate 계산 (3x3 Grid)
  const getLineSvgCoords = (coords: [number, number][]) => {
    // 3x3 셀의 센터 % 좌표 (0->16.6%, 1->50%, 2->83.3%)
    const getPosPercent = (row: number, col: number) => ({
      x: col * 33.333 + 16.666,
      y: row * 33.333 + 16.666,
    })
    const p0 = getPosPercent(coords[0][0], coords[0][1])
    const p1 = getPosPercent(coords[1][0], coords[1][1])
    const p2 = getPosPercent(coords[2][0], coords[2][1])

    return `M ${p0.x}% ${p0.y}% L ${p1.x}% ${p1.y}% L ${p2.x}% ${p2.y}%`
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 text-white select-none overflow-hidden font-sans">
      {/* HEADER BAR */}
      <div className="w-full flex items-center justify-between px-6 py-3 bg-slate-900/90 border-2 border-amber-400/70 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-200 flex items-center justify-center text-2xl font-black text-slate-950 shadow-lg shadow-amber-500/40 animate-pulse">
            🎰
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              LAS VEGAS 3x3 REEL SLOT MACHINE
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

      {/* MAIN SLOT CABINET STAGE */}
      <div className="relative my-auto flex flex-col items-center justify-center w-full max-w-2xl">
        {/* TOP CABINET BANNER */}
        <div className="w-full max-w-lg bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 p-[2px] rounded-t-3xl shadow-[0_0_40px_rgba(245,158,11,0.5)]">
          <div className="bg-slate-950 px-6 py-2.5 rounded-t-[22px] flex items-center justify-between border-b border-amber-400/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400">1회 베팅금:</span>
              <span className="text-sm font-black font-mono text-yellow-300">
                ${betAmount.toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-400/70 border border-amber-400/40 px-1.5 py-0.5 rounded uppercase">
                {stationGrade ?? 'SME'} TIER
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400">남은 스핀: </span>
                <span className="text-amber-300 font-black text-sm">{spinsLeft}회</span>
              </div>
              {freeSpinsLeft > 0 && (
                <div className="animate-bounce">
                  <span className="text-yellow-400 font-bold">⭐ 프리 스핀: </span>
                  <span className="text-yellow-300 font-black text-sm">{freeSpinsLeft}회</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3x3 REEL DISPLAY CABINET */}
        <div className="relative w-full max-w-lg bg-slate-900/95 border-4 border-amber-400 rounded-b-3xl p-5 shadow-[0_0_60px_rgba(245,158,11,0.4),inset_0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          {/* PAYLINES SVG OVERLAY */}
          <svg className="absolute inset-5 w-[calc(100%-40px)] h-[calc(100%-40px)] pointer-events-none z-10">
            {PAYLINES.map((line) => {
              const isWon = lastResult?.winningLines.some((w) => w.payline.id === line.id)
              return (
                <path
                  key={line.id}
                  d={getLineSvgCoords(line.coords)}
                  fill="none"
                  stroke={isWon ? line.color : 'rgba(255,255,255,0.06)'}
                  strokeWidth={isWon ? 6 : 2}
                  strokeDasharray={isWon ? undefined : '4 4'}
                  className={isWon ? 'animate-pulse filter drop-shadow-[0_0_10px_currentColor]' : ''}
                />
              )
            })}
          </svg>

          {/* 3x3 GRID CELLS */}
          <div className="grid grid-cols-3 gap-3 relative z-0">
            {currentGrid.map((row, rIdx) =>
              row.map((symId, cIdx) => {
                const sym = SLOT_SYMBOLS[symId] ?? SLOT_SYMBOLS.cherry
                const isWinningCell = lastResult?.winningLines.some((w) =>
                  w.payline.coords.some(([r, c]) => r === rIdx && c === cIdx),
                )

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950 border-2 ${
                      isWinningCell
                        ? 'border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.8)] scale-105 z-20 bg-amber-950/40'
                        : 'border-amber-500/30 shadow-inner'
                    } transition-all duration-200 overflow-hidden select-none`}
                  >
                    <span
                      className={`text-5xl sm:text-6xl transition-transform duration-100 ${
                        isSpinning ? 'blur-[2px] scale-90 animate-pulse' : 'scale-100 hover:scale-110'
                      }`}
                    >
                      {sym.icon}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300 mt-1 font-mono tracking-tight">
                      {sym.name}
                    </span>

                    {/* Cell Highlight Glow */}
                    {isWinningCell && (
                      <div className="absolute inset-0 bg-yellow-400/10 pointer-events-none animate-pulse rounded-2xl" />
                    )}
                  </div>
                )
              }),
            )}
          </div>

          {/* SPIN DISPLAY RESULTS BANNER */}
          <div className="mt-4 min-h-[48px] flex items-center justify-center px-4 py-2 bg-slate-950/80 rounded-xl border border-amber-400/30 text-center font-mono">
            {isSpinning ? (
              <span className="text-amber-400 font-bold animate-pulse text-sm">
                🎰 릴 스핀 중... 대박 당첨을 기원합니다!
              </span>
            ) : lastResult ? (
              lastResult.totalWinAmount > 0 ? (
                <div className="flex items-center gap-2 text-yellow-300 font-black text-base animate-bounce">
                  <span>🎉 당첨!</span>
                  <span className="text-amber-400 text-lg">
                    +${lastResult.totalWinAmount.toLocaleString()}
                  </span>
                  {lastResult.freeSpinsAwarded > 0 && (
                    <span className="text-xs text-yellow-200 bg-yellow-600/60 px-2 py-0.5 rounded-full">
                      🎁 프리 스핀 +3회!
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
                하단의 레버/스핀 버튼을 눌러 게임을 시작하세요!
              </span>
            )}
          </div>
        </div>

        {/* SPIN CONTROLS FOOTER */}
        <div className="w-full max-w-lg mt-4 flex items-center justify-between gap-4 px-2">
          {/* TOTAL SESSION WIN COUNTER */}
          <div className="flex-1 px-4 py-3 bg-slate-900/90 border border-amber-400/40 rounded-2xl backdrop-blur-md flex flex-col justify-center">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              누적 획득 당첨금
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-yellow-300">
              ${sessionTotalWon.toLocaleString()}
            </span>
          </div>

          {/* BIG SPIN BUTTON */}
          <button
            disabled={isSpinning || (spinsLeft <= 0 && freeSpinsLeft <= 0)}
            onClick={handleSpin}
            className={`px-8 py-4 rounded-2xl font-black text-lg sm:text-xl tracking-wider shadow-2xl transition-all duration-150 transform flex items-center justify-center gap-2 ${
              isSpinning || (spinsLeft <= 0 && freeSpinsLeft <= 0)
                ? 'bg-slate-800 border-2 border-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                : freeSpinsLeft > 0
                ? 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 border-2 border-yellow-200 text-slate-950 hover:scale-105 active:scale-95 shadow-[0_0_35px_rgba(250,204,21,0.8)] animate-pulse'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-2 border-yellow-300 text-slate-950 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.6)]'
            }`}
          >
            <span>🎰</span>
            <span>
              {isSpinning
                ? '스핀 중...'
                : freeSpinsLeft > 0
                ? `FREE SPIN (${freeSpinsLeft})`
                : 'SPIN! (돌리기)'}
            </span>
          </button>
        </div>
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
                      {line.name}
                    </span>
                    : row/col 연결선 3칸 동일 매칭 판정
                  </li>
                ))}
              </ul>
            </div>

            {/* SPECIAL RULES */}
            <div className="space-y-1.5 border-t border-amber-400/20 pt-3 text-xs text-slate-300">
              <p>
                <span className="text-amber-400 font-bold">🎰 Scatter (스캐터):</span> 위치 상관없이 3개
                이상 등장 시 베팅금 10배 지급 + 프리 스핀 3회 부여!
              </p>
              <p>
                <span className="text-yellow-400 font-bold">🃏 Wild (와일드):</span> 스캐터를 제외한 모든
                심볼 대신 적용 (조커 역할).
              </p>
              <p>
                <span className="text-red-400 font-bold">💥 JACKPOT (잭팟):</span> 3x3 9개 칸 전체 동일
                심볼 완성 시 베팅금 100배 초대형 잭팟!
              </p>
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
                    sessionTotalWon >= sessionTotalBet ? 'text-green-400 font-black' : 'text-red-400 font-black'
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
