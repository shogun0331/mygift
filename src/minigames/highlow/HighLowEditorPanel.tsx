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
import { HighLowMinigame } from './HighLowMinigame'

export function HighLowEditorPanel() {
  const [configs, setConfigs] = useState<HighLowConfigMap>(loadHighLowConfig())
  const [activeRoomId, setActiveRoomId] = useState<HighLowRoomId>('legend')
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

  const handleAddChips = (roomId: HighLowRoomId, amount: number) => {
    const current = userChipsMap[roomId] ?? configs[roomId].startChips
    handleUpdateChips(roomId, current + amount)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    const url = URL.createObjectURL(file)
    handleUpdateConfigField(activeRoomId, 'dealerMediaUrl', url)
    handleUpdateConfigField(activeRoomId, 'dealerMediaType', isVideo ? 'video' : 'image')
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

        {/* POPUP SIMULATOR BUTTON */}
        <button
          onClick={() => setShowModalSimulator(true)}
          className="group relative px-6 py-4 rounded-2xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 hover:from-pink-500 hover:to-rose-500 text-white shadow-xl shadow-pink-600/40 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-3"
        >
          <span className="text-xl animate-bounce">🎮</span>
          <span>[ 🎮 하이-로우 시뮬레이터 팝업 실행 ]</span>
        </button>
      </div>

      {/* Main Grid: Room & Dealer Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Room Tier Selectors */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            티어 룸 선택
          </h3>

          {(['local', 'star', 'legend'] as HighLowRoomId[]).map((rId) => {
            const conf = configs[rId]
            const isSelected = activeRoomId === rId

            return (
              <div
                key={rId}
                onClick={() => setActiveRoomId(rId)}
                className={`p-4.5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-pink-500 bg-slate-900/90 shadow-[0_0_25px_rgba(236,72,153,0.25)] scale-[1.02]'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-slate-100">{conf.name}</span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase text-white shadow"
                    style={{ backgroundColor: conf.badgeColor }}
                  >
                    {rId}
                  </span>
                </div>
                <div className="mt-2.5 text-xs font-mono text-slate-400 space-y-1">
                  <div>Ante (기본 배팅): <span className="text-pink-400 font-bold">${conf.ante.toLocaleString()}</span></div>
                  <div>Start Chips (초기 칩): <span className="text-cyan-400 font-bold">${conf.startChips.toLocaleString()}</span></div>
                  <div>Dealer: <span className="text-slate-200">{conf.dealerName}</span></div>
                </div>
              </div>
            )
          })}

          <div className="pt-4 space-y-2 border-t border-slate-800">
            <button
              onClick={handleSaveConfigs}
              className="w-full py-3 rounded-xl font-bold text-sm bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2"
            >
              💾 밸런스 & 미디어 설정 저장
            </button>

            {saveSuccessMsg && (
              <p className="text-center text-xs text-cyan-300 font-mono animate-pulse">
                ✓ 설정이 저장되었습니다!
              </p>
            )}

            <button
              onClick={handleResetDefaults}
              className="w-full py-2.5 rounded-xl font-semibold text-xs border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              🔄 기본 설정으로 초기화
            </button>
          </div>
        </div>

        {/* Right Side: Dealer Media Upload & Room Balance Detail */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: 딜러 미디어 슬롯 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border-2 border-pink-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-pink-500/20 pb-3">
              <h3 className="text-base font-black text-pink-400 flex items-center gap-2">
                📸 [{currentRoomConfig.name}] 딜러 미디어 슬롯
              </h3>
              <span className="text-xs font-mono text-cyan-300">
                Drag & Drop 또는 파일 선택 지원
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-950/90 border border-pink-500/20">
              {/* Dealer Slot Avatar Display */}
              <HighLowDealerSlot
                dealerName={currentRoomConfig.dealerName}
                dealerTitle={currentRoomConfig.dealerTitle}
                mediaUrl={currentRoomConfig.dealerMediaUrl}
                mediaType={currentRoomConfig.dealerMediaType}
                editable={true}
                onMediaChange={(url, type) => {
                  handleUpdateConfigField(activeRoomId, 'dealerMediaUrl', url)
                  handleUpdateConfigField(activeRoomId, 'dealerMediaType', type)
                }}
                statusMessage="미디어를 여기에 클릭/드롭하세요!"
              />

              {/* Upload Action Guide & Buttons */}
              <div className="flex-1 flex flex-col justify-between space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-slate-300">
                  <p className="font-bold text-pink-300">📁 딜러 미디어 업로드 가이드:</p>
                  <p>• 지원 포맷: PNG, JPG, WEBP, GIF (이미지) / MP4, WEBM (동영상)</p>
                  <p>• 딜러 원형 아바타 슬롯에 자동으로 맞추어 렌더링됩니다.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-600/30 transition-all flex items-center gap-2"
                  >
                    📁 이미지 / 동영상 파일 선택
                  </button>

                  {currentRoomConfig.dealerMediaUrl && (
                    <button
                      onClick={() => {
                        handleUpdateConfigField(activeRoomId, 'dealerMediaUrl', '')
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-500/40 hover:bg-rose-900 transition-all text-xs font-semibold"
                    >
                      🗑️ 미디어 삭제 (기본 아바타 사용)
                    </button>
                  )}
                </div>
              </div>
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
          </div>
        </div>
      </div>

      {/* FULLSCREEN POPUP SIMULATOR MODAL (createPortal via document.body) */}
      {showModalSimulator &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none">
            <div className="w-full max-w-5xl h-[92vh] max-h-[92vh] rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.4)] border-2 border-pink-500/60 bg-slate-950 relative flex flex-col">
              {/* Modal Quick Debug Top Header */}
              <div className="flex shrink-0 items-center justify-between px-5 py-3 bg-slate-900 border-b border-pink-500/30 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-base animate-pulse">🎮</span>
                  <span className="text-pink-400 font-bold tracking-wide">
                    HIGH-LOW DUEL POPUP SIMULATOR
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAddChips(activeRoomId, 100000)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 transition-all text-xs font-bold"
                  >
                    + $100,000 칩 충전
                  </button>
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
