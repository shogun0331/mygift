import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  type HighLowConfigMap,
  type HighLowRoomId,
  type HighLowRoomConfig,
  DEFAULT_HIGH_LOW_CONFIG,
} from './highLowConfig'
import {
  loadHighLowConfig,
  saveHighLowConfig,
  loadUserChips,
  saveUserChips,
  resetHighLowData,
} from './highLowStore'
import { HighLowDealerSlot } from './HighLowDealerSlot'
import { saveHighLowMediaFile } from './highLowAssetService'
import { HighLowMinigame } from './HighLowMinigame'
import { NumericInput } from '../../components/NumericInput'
import {
  STATION_TIER_LABEL,
  STATION_TIER_ORDER,
  getHighLowAnteForGrade,
  type StationGradeConfig,
  type StationTierId,
} from '../../game/stationGradeConfig'

export interface HighLowEditorPanelProps {
  stationGradeConfig?: StationGradeConfig
  onStationGradeConfigChange?: (config: StationGradeConfig) => void
  onSaveStationGradeManual?: () => void
}

export function HighLowEditorPanel({
  stationGradeConfig,
  onStationGradeConfigChange,
  onSaveStationGradeManual,
}: HighLowEditorPanelProps = {}) {
  const [configs, setConfigs] = useState<HighLowConfigMap>(loadHighLowConfig())
  const activeRoomId: HighLowRoomId = 'local'
  const [selectedSimGrade, setSelectedSimGrade] = useState<StationTierId>('sme')
  const [userChipsMap, setUserChipsMap] = useState<Record<HighLowRoomId, number>>({
    local: 50000,
    star: 250000,
    legend: 2000000,
  })
  const [showModalSimulator, setShowModalSimulator] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const loadedConfigs = loadHighLowConfig()
    setConfigs(loadedConfigs)
    setUserChipsMap({
      local: loadUserChips('local', loadedConfigs.local.startChips),
      star: loadUserChips('star', loadedConfigs.star.startChips),
      legend: loadUserChips('legend', loadedConfigs.legend.startChips),
    })
  }, [])

  const handleUpdateConfigField = <K extends keyof HighLowRoomConfig>(
    roomId: HighLowRoomId,
    field: K,
    val: HighLowRoomConfig[K]
  ) => {
    setConfigs((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: val,
      },
    }))
  }

  const handleSaveConfigs = () => {
    saveHighLowConfig(configs)
    onSaveStationGradeManual?.()
    setSaveSuccessMsg(true)
    setTimeout(() => setSaveSuccessMsg(false), 2000)
  }

  const handleResetDefaults = () => {
    if (confirm('룸 밸런스 및 미디어 설정을 초기 기본값으로 리셋하시겠습니까?')) {
      resetHighLowData()
      setConfigs(DEFAULT_HIGH_LOW_CONFIG)
      setUserChipsMap({
        local: DEFAULT_HIGH_LOW_CONFIG.local.startChips,
        star: DEFAULT_HIGH_LOW_CONFIG.star.startChips,
        legend: DEFAULT_HIGH_LOW_CONFIG.legend.startChips,
      })
      saveHighLowConfig(DEFAULT_HIGH_LOW_CONFIG)
    }
  }

  const handleUpdateChips = (roomId: HighLowRoomId, newChips: number) => {
    setUserChipsMap((prev) => ({
      ...prev,
      [roomId]: newChips,
    }))
    saveUserChips(roomId, newChips)
  }

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const saved = await saveHighLowMediaFile(file, 'dealer')
    handleUpdateConfigField(activeRoomId, 'dealerMediaUrl', saved.url)
    handleUpdateConfigField(activeRoomId, 'dealerMediaType', saved.type)
  }

  const currentRoomConfig = configs[activeRoomId]

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header Banner & Simulator Popup Trigger */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-pink-950/60 via-slate-900 to-slate-900 border-2 border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.15)] mb-8">
        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest text-pink-400 bg-pink-950 border border-pink-500/40 uppercase">
            VIP MINIGAME EDITOR & SIMULATOR
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-100 mt-2 flex items-center gap-2">
            ♠ VIP 하이-로우 듀얼 (High-Low Duel) ♣
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            룸 밸런스 설정, 딜러 프로필 미디어 등록 및 1:1 독립 팝업 시뮬레이터 테스트를 진행합니다.
          </p>
        </div>

        {/* POPUP SIMULATOR CONTROLS */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2.5 rounded-2xl border border-amber-400/40">
            <span className="text-xs font-bold text-amber-300">입장 등급:</span>
            <select
              value={selectedSimGrade}
              onChange={(e) => setSelectedSimGrade(e.target.value as StationTierId)}
              className="bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100 rounded-xl px-2.5 py-1.5 outline-none focus:border-amber-400 cursor-pointer"
            >
              {STATION_TIER_ORDER.map((tier) => (
                <option key={tier} value={tier}>
                  {STATION_TIER_LABEL[tier]} (${getHighLowAnteForGrade(stationGradeConfig, tier).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowModalSimulator(true)}
            className="group relative px-5 py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 hover:from-pink-500 hover:to-rose-500 text-white shadow-xl shadow-pink-600/40 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2.5 cursor-pointer"
          >
            <span className="text-lg animate-bounce">🎮</span>
            <span>[{STATION_TIER_LABEL[selectedSimGrade]} 등급으로 시뮬레이터 실행]</span>
          </button>
        </div>
      </div>

      {/* 방송국 등급별 하이로우 무료 배팅금 (Ante $) 설정 카드 */}
      {stationGradeConfig && onStationGradeConfigChange && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.15)] mb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/30 pb-3">
            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest text-amber-300 bg-amber-950 border border-amber-400/40 uppercase">
                STATION GRADE ANTE CONFIG
              </span>
              <h3 className="text-lg font-black text-amber-200 mt-1 flex items-center gap-2">
                🏢 방송국 등급별 하이-로우 무료 배팅금 (Ante $) 설정
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              인게임 플레이 시 방송국 등급별로 자동 적용되는 무료 판돈(Ante) 금액입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {STATION_TIER_ORDER.map((tier) => {
              const currentAnte = getHighLowAnteForGrade(stationGradeConfig, tier)
              return (
                <div
                  key={tier}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-400/30 flex flex-col justify-between space-y-2 shadow-inner"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300">
                      {STATION_TIER_LABEL[tier]}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-amber-400/80 uppercase">
                      {tier}
                    </span>
                  </div>

                  <div className="mt-1">
                    <NumericInput
                      value={currentAnte}
                      min={0}
                      unitLabel="$"
                      quickPresets={[
                        { label: '+$500', amount: 500 },
                        { label: '+$1천', amount: 1000 },
                        { label: '+$5천', amount: 5000 },
                        { label: '+$1만', amount: 10000 },
                        { label: '초기화', amount: 'reset' },
                      ]}
                      onChange={(nextVal) => {
                        onStationGradeConfigChange({
                          ...stationGradeConfig,
                          tiers: {
                            ...stationGradeConfig.tiers,
                            [tier]: {
                              ...stationGradeConfig.tiers[tier],
                              highLowAnte: nextVal,
                            },
                          },
                        })
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSimGrade(tier)
                      setShowModalSimulator(true)
                    }}
                    className="mt-2 w-full py-1.5 rounded-xl text-[11px] font-bold bg-amber-500/20 border border-amber-400/40 text-amber-200 hover:bg-amber-500/40 transition-all cursor-pointer"
                  >
                    🎮 이 등급으로 입장
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dealer Media & Round Balance Settings */}
      <div className="space-y-6">
          {/* SECTION 1: 딜러 3단계 수위 미디어 슬롯 (연승에 따른 수위 변신) */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border-2 border-pink-500/30 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between border-b border-pink-500/20 pb-3 gap-2">
              <div>
                <h3 className="text-base font-black text-pink-400 flex items-center gap-2">
                  📸 딜러 연승 미디어 3단계 설정 (수위 1 ~ 수위 3)
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  플레이어가 3연승할 때마다 딜러 미디어가 수위1 ➔ 수위2(3연승) ➔ 수위3(6연승)으로 변신합니다.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-300">
                각 수위별 이미지/동영상 (MP4, WEBM) 등록 가능
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 수위 1 (기본 / 0~2연승) */}
              {(() => {
                const mediaSlot = currentRoomConfig.dealerMediaStages?.tier1 || {
                  url: currentRoomConfig.dealerMediaUrl || '',
                  type: currentRoomConfig.dealerMediaType || 'image',
                }

                const handleUpdateStage = (url: string, type: 'image' | 'video') => {
                  const updatedStages = {
                    ...currentRoomConfig.dealerMediaStages,
                    tier1: { url, type },
                  }
                  handleUpdateConfigField(activeRoomId, 'dealerMediaStages', updatedStages)
                  handleUpdateConfigField(activeRoomId, 'dealerMediaUrl', url)
                  handleUpdateConfigField(activeRoomId, 'dealerMediaType', type)
                }

                return (
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-700 flex flex-col items-center space-y-3 relative group">
                    <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-black text-cyan-300">
                        🔞 수위 1 (기본)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        0 ~ 2연승 시
                      </span>
                    </div>

                    <HighLowDealerSlot
                      dealerName={currentRoomConfig.dealerName}
                      dealerTitle="수위 1 (기본 딜러)"
                      mediaUrl={mediaSlot.url}
                      mediaType={mediaSlot.type}
                      editable={true}
                      stagePrefix="tier1"
                      onMediaChange={handleUpdateStage}
                      statusMessage="수위 1 미디어 등록"
                    />

                    <div className="w-full flex flex-col gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'image/*,video/*'
                          input.onchange = async (e: any) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const saved = await saveHighLowMediaFile(file, 'tier1')
                              handleUpdateStage(saved.url, saved.type)
                            }
                          }
                          input.click()
                        }}
                        className="w-full py-2 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow transition-all cursor-pointer"
                      >
                        📁 수위 1 파일 선택
                      </button>
                      {mediaSlot.url && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStage('', 'image')}
                          className="w-full py-1.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-500/40 text-[11px] font-semibold cursor-pointer"
                        >
                          🗑️ 삭제
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* 수위 2 (3연승 달성 시) */}
              {(() => {
                const mediaSlot = currentRoomConfig.dealerMediaStages?.tier2 || { url: '', type: 'image' }

                const handleUpdateStage = (url: string, type: 'image' | 'video') => {
                  const updatedStages = {
                    ...currentRoomConfig.dealerMediaStages,
                    tier2: { url, type },
                  }
                  handleUpdateConfigField(activeRoomId, 'dealerMediaStages', updatedStages)
                }

                return (
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/50 flex flex-col items-center space-y-3 relative group">
                    <div className="w-full flex items-center justify-between border-b border-amber-500/30 pb-2">
                      <span className="text-xs font-black text-amber-300">
                        🔥 수위 2 (3연승)
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        3 ~ 5연승 달성 시
                      </span>
                    </div>

                    <HighLowDealerSlot
                      dealerName={currentRoomConfig.dealerName}
                      dealerTitle="수위 2 (3연승 변신)"
                      mediaUrl={mediaSlot.url}
                      mediaType={mediaSlot.type}
                      editable={true}
                      stagePrefix="tier2"
                      onMediaChange={handleUpdateStage}
                      statusMessage="수위 2 미디어 등록"
                    />

                    <div className="w-full flex flex-col gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'image/*,video/*'
                          input.onchange = async (e: any) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const saved = await saveHighLowMediaFile(file, 'tier2')
                              handleUpdateStage(saved.url, saved.type)
                            }
                          }
                          input.click()
                        }}
                        className="w-full py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 shadow transition-all cursor-pointer"
                      >
                        📁 수위 2 파일 선택
                      </button>
                      {mediaSlot.url && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStage('', 'image')}
                          className="w-full py-1.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-500/40 text-[11px] font-semibold cursor-pointer"
                        >
                          🗑️ 삭제
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* 수위 3 (6연승 이상 달성 시) */}
              {(() => {
                const mediaSlot = currentRoomConfig.dealerMediaStages?.tier3 || { url: '', type: 'image' }

                const handleUpdateStage = (url: string, type: 'image' | 'video') => {
                  const updatedStages = {
                    ...currentRoomConfig.dealerMediaStages,
                    tier3: { url, type },
                  }
                  handleUpdateConfigField(activeRoomId, 'dealerMediaStages', updatedStages)
                }

                return (
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-pink-500/60 flex flex-col items-center space-y-3 relative group">
                    <div className="w-full flex items-center justify-between border-b border-pink-500/30 pb-2">
                      <span className="text-xs font-black text-pink-300">
                        💥 수위 3 (6연승 이상)
                      </span>
                      <span className="text-[10px] font-mono text-pink-400 font-bold">
                        6연승+ 최고수위
                      </span>
                    </div>

                    <HighLowDealerSlot
                      dealerName={currentRoomConfig.dealerName}
                      dealerTitle="수위 3 (최고 수위)"
                      mediaUrl={mediaSlot.url}
                      mediaType={mediaSlot.type}
                      editable={true}
                      stagePrefix="tier3"
                      onMediaChange={handleUpdateStage}
                      statusMessage="수위 3 미디어 등록"
                    />

                    <div className="w-full flex flex-col gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'image/*,video/*'
                          input.onchange = async (e: any) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const saved = await saveHighLowMediaFile(file, 'tier3')
                              handleUpdateStage(saved.url, saved.type)
                            }
                          }
                          input.click()
                        }}
                        className="w-full py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow transition-all cursor-pointer"
                      >
                        📁 수위 3 파일 선택
                      </button>
                      {mediaSlot.url && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStage('', 'image')}
                          className="w-full py-1.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-500/40 text-[11px] font-semibold cursor-pointer"
                        >
                          🗑️ 삭제
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* SECTION 2: 룸 밸런스 상세 데이터 */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-3">
              ⚙️ [{currentRoomConfig.name}] 룸 밸런스 설정
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">룸 명칭 (Name)</label>
                <input
                  type="text"
                  value={currentRoomConfig.name}
                  onChange={(e) => handleUpdateConfigField(activeRoomId, 'name', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:border-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">룸 설명 (Subtitle)</label>
                <input
                  type="text"
                  value={currentRoomConfig.subtitle}
                  onChange={(e) =>
                    handleUpdateConfigField(activeRoomId, 'subtitle', e.target.value)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:border-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">기본 배팅금 (Ante $)</label>
                <input
                  type="number"
                  value={currentRoomConfig.ante}
                  onChange={(e) =>
                    handleUpdateConfigField(activeRoomId, 'ante', Number(e.target.value) || 0)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-pink-400 font-bold focus:border-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">초기 지급 칩 (Start Chips $)</label>
                <input
                  type="number"
                  value={currentRoomConfig.startChips}
                  onChange={(e) =>
                    handleUpdateConfigField(
                      activeRoomId,
                      'startChips',
                      Number(e.target.value) || 0
                    )
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-400 font-bold focus:border-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">딜러 이름 (Dealer Name)</label>
                <input
                  type="text"
                  value={currentRoomConfig.dealerName}
                  onChange={(e) =>
                    handleUpdateConfigField(activeRoomId, 'dealerName', e.target.value)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:border-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">딜러 직함 (Dealer Title)</label>
                <input
                  type="text"
                  value={currentRoomConfig.dealerTitle}
                  onChange={(e) =>
                    handleUpdateConfigField(activeRoomId, 'dealerTitle', e.target.value)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:border-pink-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-400 mb-1">
                  수수료율 House Edge (0.03 = 3%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.2"
                  value={currentRoomConfig.houseEdge}
                  onChange={(e) =>
                    handleUpdateConfigField(
                      activeRoomId,
                      'houseEdge',
                      Number(e.target.value) || 0.03
                    )
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-yellow-400 font-bold focus:border-pink-500 outline-none"
                />
              </div>
            </div>

            {/* 4가지 아이템 개별 등장 확률 (%) 설정 */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <span>🎁</span>
                <span>아이템별 개별 등장 확률 설정 (Item Drop Rates %)</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <label className="block text-cyan-300 font-bold mb-1">👁️ 카드 엿보기 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentRoomConfig.itemDropRates?.peek_card ?? 20}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      handleUpdateConfigField(activeRoomId, 'itemDropRates', {
                        ...currentRoomConfig.itemDropRates,
                        peek_card: val,
                      })
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-200 font-bold focus:border-cyan-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-yellow-300 font-bold mb-1">⚡ 배당 2배 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentRoomConfig.itemDropRates?.double_payout ?? 15}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      handleUpdateConfigField(activeRoomId, 'itemDropRates', {
                        ...currentRoomConfig.itemDropRates,
                        double_payout: val,
                      })
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-yellow-200 font-bold focus:border-yellow-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-pink-300 font-bold mb-1">🛡️ 패배 쉴드 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentRoomConfig.itemDropRates?.loss_shield ?? 10}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      handleUpdateConfigField(activeRoomId, 'itemDropRates', {
                        ...currentRoomConfig.itemDropRates,
                        loss_shield: val,
                      })
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-pink-200 font-bold focus:border-pink-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-purple-300 font-bold mb-1">🎩 스태프 영입 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentRoomConfig.itemDropRates?.staff_hire ?? 5}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      handleUpdateConfigField(activeRoomId, 'itemDropRates', {
                        ...currentRoomConfig.itemDropRates,
                        staff_hire: val,
                      })
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-purple-200 font-bold focus:border-purple-400 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: Save & Reset */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleSaveConfigs}
              className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              💾 밸런스 & 미디어 설정 저장
            </button>

            {saveSuccessMsg && (
              <span className="text-xs text-cyan-300 font-mono animate-pulse">
                ✓ 설정이 저장되었습니다!
              </span>
            )}

            <button
              onClick={handleResetDefaults}
              className="px-4 py-3 rounded-2xl font-semibold text-xs border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer ml-auto"
            >
              🔄 기본 설정으로 초기화
            </button>
          </div>
        </div>

      {/* FULLSCREEN POPUP SIMULATOR MODAL (createPortal via document.body) */}
      {showModalSimulator &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-3 animate-fade-in select-none">
            <div className="w-full max-w-[96vw] h-[95vh] max-h-[95vh] rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.4)] border-2 border-pink-500/60 bg-slate-950 relative flex flex-col">
              {/* Modal Quick Debug Top Header */}
              <div className="flex shrink-0 items-center justify-between px-5 py-3 bg-slate-900 border-b border-pink-500/30 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-base animate-pulse">🎮</span>
                  <span className="text-pink-400 font-bold tracking-wide">
                    HIGH-LOW DUEL POPUP SIMULATOR
                  </span>
                  <span className="text-amber-300 font-bold bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                    {STATION_TIER_LABEL[selectedSimGrade]} (${getHighLowAnteForGrade(stationGradeConfig, selectedSimGrade).toLocaleString()})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowModalSimulator(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all text-xs font-bold shadow-md shadow-rose-600/30"
                  >
                    ✕ 팝업 닫기
                  </button>
                </div>
              </div>

              {/* Minigame Instance Container (스크롤 없는 팝업 핏팅) */}
              <div className="flex-1 min-h-0 overflow-hidden p-1">
                <HighLowMinigame
                  configs={configs}
                  customAnte={getHighLowAnteForGrade(stationGradeConfig, selectedSimGrade)}
                  userChipsMap={userChipsMap}
                  onUpdateChips={handleUpdateChips}
                  onClose={() => setShowModalSimulator(false)}
                  initialRoomId={activeRoomId}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
