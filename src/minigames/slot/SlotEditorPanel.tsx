import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { StationGrade } from '../../game/stationGradeConfig'
import {
  type SlotMachineConfig,
  type SlotSymbolId,
  DEFAULT_SLOT_CONFIG,
  loadSlotConfig,
  saveSlotConfig,
  resetSlotConfig,
  SLOT_SYMBOL_KEYS,
} from './slotConfig'
import { CasinoSlotMachine } from './CasinoSlotMachine'

export function SlotEditorPanel() {
  const [config, setConfig] = useState<SlotMachineConfig>(() => loadSlotConfig())
  const [activeStationGrade, setActiveStationGrade] = useState<StationGrade>('sme')
  const [simAssets, setSimAssets] = useState<number>(500000)
  const [showSimulator, setShowSimulator] = useState<boolean>(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<boolean>(false)

  useEffect(() => {
    setConfig(loadSlotConfig())
  }, [])

  const handleSave = () => {
    saveSlotConfig(config)
    setSaveSuccessMsg(true)
    setTimeout(() => setSaveSuccessMsg(false), 2000)
  }

  const handleReset = () => {
    if (confirm('슬롯머신 밸런스 및 확률 설정을 기본값으로 초기화하시겠습니까?')) {
      resetSlotConfig()
      setConfig(DEFAULT_SLOT_CONFIG)
      setSaveSuccessMsg(true)
      setTimeout(() => setSaveSuccessMsg(false), 2000)
    }
  }

  const handleUpdateSymbol = (
    symId: SlotSymbolId,
    field: 'weight' | 'multiplier',
    val: number,
  ) => {
    const num = Math.max(0, val)
    setConfig((prev) => ({
      ...prev,
      symbols: {
        ...prev.symbols,
        [symId]: {
          ...prev.symbols[symId],
          [field]: num,
        },
      },
    }))
  }

  const handleUpdateBet = (grade: StationGrade, val: number) => {
    const num = Math.max(0, val)
    setConfig((prev) => ({
      ...prev,
      stationBetAmounts: {
        ...prev.stationBetAmounts,
        [grade]: num,
      },
    }))
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Header Banner & Live Simulator Trigger */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border-2 border-amber-500/40 shadow-[0_0_35px_rgba(245,158,11,0.18)] mb-8">
        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest text-amber-400 bg-amber-950 border border-amber-500/40 uppercase">
            CASINO SLOT MACHINE EDITOR
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-100 mt-2 flex items-center gap-2">
            🎰 카지노 슬롯머신 밸런스 & 확률 설정 🎰
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            기본 당첨 확률(RTP), 잭팟/스캐터 비율, 심볼 가중치/배율을 자유롭게 조작하고 인게임 팝업 시뮬레이터로 즉시 테스트하세요.
          </p>
        </div>

        {/* POPUP SIMULATOR BUTTON */}
        <button
          onClick={() => setShowSimulator(true)}
          className="group relative px-6 py-4 rounded-2xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-xl shadow-amber-500/30 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-3 border border-yellow-200 cursor-pointer"
        >
          <span className="text-xl animate-bounce">🎰</span>
          <span>[ 🎮 슬롯머신 시뮬레이터 팝업 실행 ]</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: WIN RATE & TIER BALANCING */}
        <div className="space-y-6">
          {/* Main Win Rate Slider */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-amber-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                🎯 기본 당첨 확률 (Base Win Rate)
              </h3>
              <span className="text-lg font-black font-mono text-amber-400 bg-amber-950 px-3 py-1 rounded-xl border border-amber-500/40">
                {config.winRate}%
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>0% (전패)</span>
                <span className="text-amber-300 font-bold">권장: 40% ~ 50%</span>
                <span>100% (전승)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.winRate}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, winRate: Number(e.target.value) || 0 }))
                }
                className="w-full h-3 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                • 슬롯머신 회전 시 시스템이 당첨/꽝 여부를 먼저 판정합니다.<br />
                • 기존 순수 무작위 방식(~12%)에서 <strong>{config.winRate}%</strong>로 당첨률을 극적으로 조절합니다.
              </p>
            </div>
          </div>

          {/* Win Distribution Shares */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <span>📊</span>
              <span>당첨 시 세부 유형 비중 (Win Roll Distribution %)</span>
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-cyan-300 font-bold">👑 잭팟 (3x3 올매칭/Wild)</span>
                  <span className="text-cyan-200 font-bold">{config.jackpotShare}%</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.jackpotShare}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, jackpotShare: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-bold focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-yellow-300 font-bold">🎰 스캐터 3개 (프리스핀 3회)</span>
                  <span className="text-yellow-200 font-bold">{config.scatterShare}%</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.scatterShare}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, scatterShare: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-yellow-300 font-bold focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-300 font-bold">⭐ 빅 윈 (다중 라인/고배율)</span>
                  <span className="text-amber-200 font-bold">{config.bigWinShare}%</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.bigWinShare}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, bigWinShare: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-bold focus:border-amber-400 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Station Grade Bet Amounts */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <span>💰</span>
              <span>방송국 등급별 스핀당 기본 베팅금 ($)</span>
            </h3>

            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              {(
                [
                  ['black', '블랙'],
                  ['tiny', '새싹'],
                  ['sme', '중소'],
                  ['mid', '중견'],
                  ['large', '대기업'],
                  ['top', '일등'],
                ] as [StationGrade, string][]
              ).map(([grade, label]) => (
                <div key={grade} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">{label} ({grade})</span>
                  <input
                    type="number"
                    value={config.stationBetAmounts[grade] ?? 1000}
                    onChange={(e) => handleUpdateBet(grade, Number(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-bold text-xs outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              onClick={handleSave}
              className="w-full py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              💾 슬롯 밸런스 설정 저장
            </button>

            {saveSuccessMsg && (
              <p className="text-center text-xs text-emerald-400 font-mono animate-pulse">
                ✓ 슬롯머신 설정이 저장되었습니다!
              </p>
            )}

            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl font-semibold text-xs border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              🔄 기본 설정으로 초기화
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: SYMBOL WEIGHTS & MULTIPLIERS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                  🍒 심볼 출현 가중치 (Weight) & 당첨 배율 (Multiplier)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  각 심볼의 릴 생성 출현 가중치와 3개 연속 매칭 시 지급되는 배율을 개별 조작합니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {SLOT_SYMBOL_KEYS.map((symId) => {
                const sym = config.symbols[symId]
                return (
                  <div
                    key={symId}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                      <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
                        {sym.icon}
                      </span>
                      <div>
                        <span className="font-bold text-sm text-slate-100 block">{sym.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">{sym.id}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">출현 가중치</label>
                        <input
                          type="number"
                          min="0"
                          value={sym.weight}
                          onChange={(e) => handleUpdateSymbol(symId, 'weight', Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-xs outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">매칭 배율</label>
                        <input
                          type="number"
                          min="0"
                          value={sym.multiplier}
                          onChange={(e) => handleUpdateSymbol(symId, 'multiplier', Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-bold text-xs outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN POPUP SIMULATOR MODAL (createPortal via document.body) */}
      {showSimulator &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none">
            <div className="w-full max-w-4xl h-[92vh] max-h-[92vh] rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.4)] border-2 border-amber-500/60 bg-slate-950 relative flex flex-col">
              {/* Modal Debug Header */}
              <div className="flex shrink-0 items-center justify-between px-5 py-3 bg-slate-900 border-b border-amber-500/30 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-base animate-pulse">🎰</span>
                  <span className="text-amber-400 font-bold tracking-wide">
                    CASINO SLOT MACHINE LIVE SIMULATOR
                  </span>
                  <select
                    value={activeStationGrade}
                    onChange={(e) => setActiveStationGrade(e.target.value as StationGrade)}
                    className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-bold text-xs"
                  >
                    <option value="sme">중소기업 ($2,000)</option>
                    <option value="mid">중견기업 ($10,000)</option>
                    <option value="large">대기업 ($50,000)</option>
                    <option value="top">일등기업 ($200,000)</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSimAssets((prev) => prev + 1000000)}
                    className="px-3 py-1.5 rounded-lg bg-amber-950 border border-amber-500/50 text-amber-300 hover:bg-amber-900 transition-all text-xs font-bold cursor-pointer"
                  >
                    + $1,000,000 자산 충전
                  </button>
                  <button
                    onClick={() => setShowSimulator(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all text-xs font-bold shadow-md shadow-rose-600/30 cursor-pointer"
                  >
                    ✕ 시뮬레이터 닫기
                  </button>
                </div>
              </div>

              {/* Minigame Instance Container */}
              <div className="flex-1 min-h-0 overflow-hidden p-2 flex items-center justify-center">
                <CasinoSlotMachine
                  stationGrade={activeStationGrade}
                  userAssets={simAssets}
                  onUpdateAssets={(newAssets) => setSimAssets(newAssets)}
                  onClose={() => setShowSimulator(false)}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
