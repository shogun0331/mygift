import React, { useState } from 'react'
import {
  type HighLowConfigMap,
  type HighLowRoomId,
} from './highLowConfig'
import { saveHighLowConfig } from './highLowStore'

interface CasinoRoomEditorModalProps {
  configs: HighLowConfigMap
  onSave: (newConfigs: HighLowConfigMap) => void
  onClose: () => void
}

export const CasinoRoomEditorModal: React.FC<CasinoRoomEditorModalProps> = ({
  configs,
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<HighLowRoomId>('local')
  const [tempConfigs, setTempConfigs] = useState<HighLowConfigMap>(configs)

  const currentConf = tempConfigs[activeTab]

  const handleChange = (field: string, val: any) => {
    setTempConfigs((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: val,
      },
    }))
  }

  const handleSaveAll = () => {
    saveHighLowConfig(tempConfigs)
    onSave(tempConfigs)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in font-mono">
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-amber-400/80 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.4)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-amber-400/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h3 className="text-base sm:text-lg font-black text-amber-400 tracking-wider">
              CASINO ROOM & DROP EDITOR
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-bold bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 hover:border-amber-400/50 transition-all"
          >
            ✕ 닫기
          </button>
        </div>

        {/* Room Tab Selector */}
        <div className="grid grid-cols-3 bg-slate-950 p-2 border-b border-amber-400/30 gap-2">
          {(['local', 'star', 'legend'] as HighLowRoomId[]).map((rId) => {
            const isSelected = activeTab === rId
            return (
              <button
                key={rId}
                onClick={() => setActiveTab(rId)}
                className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-0.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-[1.02]'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-amber-400/40'
                }`}
              >
                <span>{tempConfigs[rId].name}</span>
                <span className="text-[10px] opacity-80">ANTE ${tempConfigs[rId].ante.toLocaleString()}</span>
              </button>
            )
          })}
        </div>

        {/* Content Form */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          {/* ANTE Bet Setting */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-400/30 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>🪙 기본 판돈 (ANTE BET)</span>
              </label>
              <span className="text-sm font-black text-amber-400">${currentConf.ante.toLocaleString()}</span>
            </div>
            <input
              type="number"
              min={100}
              step={100}
              value={currentConf.ante}
              onChange={(e) => handleChange('ante', Math.max(100, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-amber-400/40 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-300"
            />
          </div>

          {/* ITEM DROP RATE Setting (0 ~ 100%) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-400/40 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <span>🎁 라운드 보상 아이템 등장 확률 (ITEM DROP RATE)</span>
              </label>
              <span className="text-sm font-black text-cyan-400">{currentConf.itemDropRate ?? 50}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={currentConf.itemDropRate ?? 50}
              onChange={(e) => handleChange('itemDropRate', Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              * 딜러 프로필 하단에 승리 보상 아이템(카드 엿보기, 배당 2배, 패배 무효화 쉴드, 스태프 영입권)이 등장할 확률을 세팅합니다.
            </p>
          </div>

          {/* MAX COMBO LIMIT Setting (1 ~ 10회) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-fuchsia-400/40 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-fuchsia-300 flex items-center gap-1.5">
                <span>🔥 최대 연속 콤보 배팅 제한 (MAX COMBO LIMIT)</span>
              </label>
              <span className="text-sm font-black text-fuchsia-400">{currentConf.maxComboLimit ?? 5}회 (판돈 2^{currentConf.maxComboLimit ?? 5}배)</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={currentConf.maxComboLimit ?? 5}
              onChange={(e) => handleChange('maxComboLimit', Number(e.target.value))}
              className="w-full accent-fuchsia-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              * 연속 승리 시 콤보 배팅으로 불어날 수 있는 최대 연속 승리 제한 횟수를 지정합니다.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-amber-400/30 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all"
          >
            취소
          </button>
          <button
            onClick={handleSaveAll}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-[0_0_20px_rgba(245,158,11,0.6)] transition-all hover:scale-105 active:scale-95"
          >
            💾 설정 저장 적용
          </button>
        </div>
      </div>
    </div>
  )
}
