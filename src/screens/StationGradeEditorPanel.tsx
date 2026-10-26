import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Grade, RegisteredCharacter } from '../game/characters'
import { formatMoney } from '../game/money'
import { resolveMediaSrc } from '../game/mediaUrl'
import { NumericInput, type QuickPreset } from '../components/NumericInput'
import { MediaDropBox } from './AuditEditorPanel'
import { AuditLineupEditor } from './AuditLineupEditor'
import { FanMeetingModal } from './FanMeetingModal'
import { AuditSimulatorDeckModal } from './AuditSimulatorDeckModal'
import { FanMeetingStatement } from './FanMeetingStatement'
import type { FanCardState } from '../game/fanMeeting'
import { hasPlayableFan } from '../game/vip'
import {
  DEFAULT_SLOT_UNLOCK_MIN_GRADES,
  DEFAULT_SLOT_UNLOCK_PRICES,
  STATION_TIER_LABEL,
  STATION_TIER_ORDER,
  defaultAuditConfig,
  defaultVipConfig,
  getHighLowAnteForGrade,
  tierMaxRank,
  tierViewerCap,
  type CreatorCountRequirement,
  type OptionalNumberCondition,
  type PromotionAuditConfig,
  type StationGradeConfig,
  type StationPromotionRule,
  type StationTierId,
  type VipCharacterConfig,
  type VipRewardLine,
  type VipTierId,
  type VipVisitConfig,
  VIP_TIER_IDS,
} from '../game/stationGradeConfig'

type StationGradeEditorPanelProps = {
  config: StationGradeConfig
  onConfigChange: (config: StationGradeConfig) => void
  onSaveManual?: () => void
  onReloadFromFile?: () => void | Promise<void>
  currentViewers?: number
  onCurrentViewersChange?: (nextViewers: number) => void
}

const fieldClassName =
  'mt-1.5 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400/50'

const GRADES: Grade[] = ['C', 'B', 'A', 'S']

function createCreatorReq(): CreatorCountRequirement {
  return {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    minGrade: 'B',
    count: 1,
    enabled: true,
  }
}

function updatePromotion(
  config: StationGradeConfig,
  tier: keyof StationGradeConfig['promotions'],
  patch: Partial<StationPromotionRule>,
): StationGradeConfig {
  return {
    ...config,
    promotions: {
      ...config.promotions,
      [tier]: { ...config.promotions[tier], ...patch },
    },
  }
}

function formatCap(value: number | null): string {
  if (value == null) return '없음'
  return value.toLocaleString()
}

export function StationGradeEditorPanel({
  config,
  onConfigChange,
  onSaveManual,
  onReloadFromFile,
  currentViewers,
  onCurrentViewersChange,
}: StationGradeEditorPanelProps) {
  function setTierField(
    tier: StationTierId,
    patch: Partial<StationGradeConfig['tiers'][StationTierId]>,
  ) {
    onConfigChange({
      ...config,
      tiers: {
        ...config.tiers,
        [tier]: {
          ...config.tiers[tier],
          ...patch,
        },
      },
    })
  }

  function setPromotion(
    tier: keyof StationGradeConfig['promotions'],
    patch: Partial<StationPromotionRule>,
  ) {
    onConfigChange(updatePromotion(config, tier, patch))
  }

  function setCreatorRequirements(
    tier: keyof StationGradeConfig['promotions'],
    requirements: CreatorCountRequirement[],
  ) {
    setPromotion(tier, { creatorRequirements: requirements })
  }

  function setSlotUnlockPrice(index: number, value: number) {
    const next = [...config.slotUnlockPrices]
    while (next.length < 5) next.push(DEFAULT_SLOT_UNLOCK_PRICES[next.length] ?? 0)
    next[index] = Math.max(0, Math.round(value))
    onConfigChange({ ...config, slotUnlockPrices: next.slice(0, 5) })
  }

  function setSlotUnlockMinGrade(index: number, grade: StationTierId) {
    const next = [...(config.slotUnlockMinGrades ?? DEFAULT_SLOT_UNLOCK_MIN_GRADES)]
    while (next.length < 5) {
      next.push(DEFAULT_SLOT_UNLOCK_MIN_GRADES[next.length] ?? 'tiny')
    }
    next[index] = grade
    onConfigChange({ ...config, slotUnlockMinGrades: next.slice(0, 5) })
  }

  return (
    <div className="game-panel rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="game-kicker">STATION GRADE</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">방송국 등급 심사</h2>
          <p className="mt-2 text-sm text-slate-400">
            각 등급의 <span className="text-slate-200">스카우트 인원</span>과{' '}
            <span className="text-slate-200">다음 등급 승급 조건</span>을 설정합니다. 스튜디오 슬롯은 상단
            해금 조건(가격·필요 기업 등급)으로만 제어됩니다. 시청자·순위 상한은 자동 계산됩니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onReloadFromFile && (
            <button
              type="button"
              onClick={() => onReloadFromFile()}
              className="game-btn shrink-0 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/25 transition shadow-[0_0_12px_rgba(34,211,238,0.2)]"
            >
              🔄 최신 JSON 설정 새로고침 (즉시 반영)
            </button>
          )}
          {onSaveManual && (
            <button
              type="button"
              onClick={onSaveManual}
              className="game-btn shrink-0 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-sm font-bold text-indigo-300 hover:bg-indigo-500/35 transition"
            >
              💾 등급 설정 저장
            </button>
          )}
        </div>
      </div>

      {/* 현재 시청자 수 조절 (방송국 등급 최상단) */}
      <section className="mt-5 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/60 p-4 shadow-[0_0_16px_rgba(99,102,241,0.15)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">📺</span>
              <h3 className="text-sm font-bold text-indigo-200">현재 시청자 수 조절 (실시간 반영)</h3>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              현재 인게임 플레이어의 시청자 수입니다. 조절 시 승급 심사 조건 판단 및 게임 데이터에 즉시 반영됩니다.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <NumericInput
            value={currentViewers ?? 1500}
            min={0}
            quickPresets={[
              { label: '+$1천', amount: 1000 },
              { label: '+$1만', amount: 10000 },
              { label: '+$10만', amount: 100000 },
              { label: '+$100만', amount: 1000000 },
              { label: '초기화', amount: 'reset' },
            ]}
            onChange={(val) => onCurrentViewersChange?.(val)}
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-bold text-cyan-200">슬롯 해금 조건 (공통)</h3>
        <p className="mt-1 text-[11px] text-slate-500">
          현재 열린 슬롯 수 기준으로 다음 칸 해금 비용·필요 기업 등급(랭킹)입니다. (2번째 칸 ~ 6번째 칸)
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => {
            const slotNumber = index + 2
            const price = config.slotUnlockPrices[index] ?? DEFAULT_SLOT_UNLOCK_PRICES[index] ?? 0
            const minGrade =
              config.slotUnlockMinGrades?.[index] ??
              DEFAULT_SLOT_UNLOCK_MIN_GRADES[index] ??
              'tiny'
            return (
              <div
                key={slotNumber}
                className="rounded-xl border border-white/8 bg-black/25 p-3"
              >
                <p className="text-xs font-bold text-slate-200">{slotNumber}칸 해금</p>
                <label className="mt-2 block text-[10px] font-semibold text-slate-500">
                  가격 ($)
                  <div className="mt-1">
                    <NumericInput
                      value={price}
                      min={0}
                      quickPresets={[
                        { label: '+$1천', amount: 1000 },
                        { label: '+$1만', amount: 10000 },
                        { label: '초기화', amount: 'reset' },
                      ]}
                      onChange={(val) => setSlotUnlockPrice(index, val)}
                    />
                  </div>
                  <span className="mt-1 block text-[10px] font-normal text-slate-500">
                    {formatMoney(price)}
                  </span>
                </label>
                <label className="mt-2 block text-[10px] font-semibold text-slate-500">
                  필요 기업 등급(랭킹)
                  <select
                    className={fieldClassName}
                    value={minGrade}
                    onChange={(event) =>
                      setSlotUnlockMinGrade(index, event.target.value as StationTierId)
                    }
                  >
                    {STATION_TIER_ORDER.map((tier) => (
                      <option key={tier} value={tier}>
                        {STATION_TIER_LABEL[tier]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )
          })}
        </div>
      </section>

      <div className="mt-6 space-y-6">
        {STATION_TIER_ORDER.map((tier) => {
          const next = STATION_TIER_ORDER[STATION_TIER_ORDER.indexOf(tier) + 1] as
            | Exclude<StationTierId, 'black'>
            | undefined
          const promotion = next ? config.promotions[next] : null
          const viewerCap = tierViewerCap(config, tier)
          const maxRank = tierMaxRank(tier)

          return (
            <section key={tier} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h3 className="text-sm font-bold text-amber-200">{STATION_TIER_LABEL[tier]}</h3>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-xs font-semibold text-slate-400">
                  스카우트 인원 상한
                  <div className="mt-1.5">
                    <NumericInput
                      value={config.tiers[tier].maxScoutCreators}
                      min={1}
                      max={12}
                      unitLabel="명"
                      quickPresets={[
                        { label: '+1명', amount: 1 },
                        { label: '+3명', amount: 3 },
                        { label: '최대(12)', amount: 12 },
                      ]}
                      onChange={(nextVal) =>
                        setTierField(tier, {
                          maxScoutCreators: nextVal,
                        })
                      }
                    />
                  </div>
                </label>
                <label className="block text-xs font-semibold text-amber-300">
                  하이로우 무료 판돈 ($)
                  <div className="mt-1.5">
                    <NumericInput
                      value={getHighLowAnteForGrade(config, tier)}
                      min={0}
                      unitLabel="$"
                      quickPresets={[
                        { label: '+$500', amount: 500 },
                        { label: '+$1천', amount: 1000 },
                        { label: '+$5천', amount: 5000 },
                        { label: '+$1만', amount: 10000 },
                        { label: '초기화', amount: 'reset' },
                      ]}
                      onChange={(nextVal) =>
                        setTierField(tier, {
                          highLowAnte: nextVal,
                        })
                      }
                    />
                  </div>
                </label>
                <div className="block text-xs font-semibold text-slate-500">
                  시청자 상한 (자동)
                  <p className="mt-1.5 rounded-xl border border-white/5 bg-black/25 px-3 py-2 text-sm tabular-nums text-slate-300">
                    {formatCap(viewerCap)}
                    {viewerCap != null && next ? (
                      <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                        = {STATION_TIER_LABEL[next]} 승급 필요 시청자
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                        최고 등급 — 상한 없음
                      </span>
                    )}
                  </p>
                </div>
                <div className="block text-xs font-semibold text-slate-500">
                  순위 상한 (자동)
                  <p className="mt-1.5 rounded-xl border border-white/5 bg-black/25 px-3 py-2 text-sm tabular-nums text-slate-300">
                    {maxRank}위
                    <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                      랭킹 {STATION_TIER_LABEL[tier]} 구간
                    </span>
                  </p>
                </div>
              </div>

              {promotion ? (
                <div className="mt-5 rounded-lg border border-indigo-400/20 bg-indigo-500/5 p-4">
                  <h4 className="text-xs font-bold text-indigo-200">
                    → {STATION_TIER_LABEL[promotion.to]} 승급 심사 조건
                  </h4>

                  <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-400">
                      필수 시청자 수
                      <div className="mt-1.5">
                        <NumericInput
                          value={promotion.requiredViewers}
                          min={0}
                          unitLabel="명"
                          quickPresets={[
                            { label: '+1천', amount: 1000 },
                            { label: '+5천', amount: 5000 },
                            { label: '+1만', amount: 10000 },
                            { label: '+5만', amount: 50000 },
                            { label: '초기화', amount: 'reset' },
                          ]}
                          onChange={(nextVal) =>
                            setPromotion(promotion.to, {
                              requiredViewers: nextVal,
                            })
                          }
                        />
                      </div>
                      <span className="mt-1 block text-[10px] font-normal text-slate-500">
                        이 값이 {STATION_TIER_LABEL[tier]} 등급의 시청자 상한이 됩니다
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <OptionalNumberField
                      label="오픈 슬롯 수"
                      value={promotion.minUnlockedSlots}
                      onChange={(next) => setPromotion(promotion.to, { minUnlockedSlots: next })}
                    />
                    <OptionalNumberField
                      label="보유 자산 ($)"
                      value={promotion.minAssets}
                      onChange={(next) => setPromotion(promotion.to, { minAssets: next })}
                    />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-slate-300">캐릭터 등급 조건 (선택)</p>
                      <button
                        type="button"
                        className="game-btn rounded-lg px-2.5 py-1 text-[11px]"
                        onClick={() =>
                          setCreatorRequirements(promotion.to, [
                            ...promotion.creatorRequirements,
                            createCreatorReq(),
                          ])
                        }
                      >
                        조건 추가
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {promotion.creatorRequirements.length === 0 ? (
                        <p className="text-[11px] text-slate-500">캐릭터 조건 없음</p>
                      ) : (
                        promotion.creatorRequirements.map((req, index) => (
                          <div
                            key={req.id}
                            className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-black/25 p-2.5"
                          >
                            <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
                              <input
                                type="checkbox"
                                checked={req.enabled}
                                onChange={(event) => {
                                  const next = promotion.creatorRequirements.map((row, i) =>
                                    i === index ? { ...row, enabled: event.target.checked } : row,
                                  )
                                  setCreatorRequirements(promotion.to, next)
                                }}
                              />
                              사용
                            </label>
                            <label className="text-[11px] font-semibold text-slate-400">
                              등급
                              <select
                                className={`${fieldClassName} mt-1 min-w-[72px]`}
                                value={req.minGrade}
                                onChange={(event) => {
                                  const next = promotion.creatorRequirements.map((row, i) =>
                                    i === index
                                      ? { ...row, minGrade: event.target.value as Grade }
                                      : row,
                                  )
                                  setCreatorRequirements(promotion.to, next)
                                }}
                              >
                                {GRADES.map((grade) => (
                                  <option key={grade} value={grade}>
                                    {grade}+
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-[11px] font-semibold text-slate-400">
                              인원
                              <input
                                type="number"
                                min={0}
                                className={`${fieldClassName} mt-1 w-20`}
                                value={req.count}
                                onChange={(event) => {
                                  const next = promotion.creatorRequirements.map((row, i) =>
                                    i === index
                                      ? {
                                          ...row,
                                          count: Math.max(0, Math.round(Number(event.target.value) || 0)),
                                        }
                                      : row,
                                  )
                                  setCreatorRequirements(promotion.to, next)
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              className="game-btn rounded-lg px-2 py-1 text-[11px] text-rose-200"
                              onClick={() =>
                                setCreatorRequirements(
                                  promotion.to,
                                  promotion.creatorRequirements.filter((_, i) => i !== index),
                                )
                              }
                            >
                              삭제
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {tier === 'top' ? (
                <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-500/5 p-4">
                  <h4 className="text-xs font-bold text-amber-200">
                    → 최종 1위 (1등 클리어) 달성 심사 조건
                  </h4>

                  <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-400">
                      1위 달성 필수 시청자 수
                      <div className="mt-1.5">
                        <NumericInput
                          value={config.topClearViewers ?? 750_000}
                          min={0}
                          unitLabel="명"
                          quickPresets={[
                            { label: '+1만', amount: 10000 },
                            { label: '+10만', amount: 100000 },
                            { label: '+50만', amount: 500000 },
                            { label: '초기화', amount: 'reset' },
                          ]}
                          onChange={(nextVal) =>
                            onConfigChange({
                              ...config,
                              topClearViewers: nextVal,
                            })
                          }
                        />
                      </div>
                      <span className="mt-1 block text-[10px] font-normal text-slate-500">
                        일등기업 등급에서 랭킹 1위(1등)를 달성하고 엔딩 클리어가 되는 시청자 목표치입니다
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}
            </section>
          )
        })}
      </div>

      {/* 승급 심사 미니게임 4인 심사관 및 밸런스 설정 */}
      <AuditEditorSection
        auditConfig={config.auditConfig ?? defaultAuditConfig()}
        onChange={(nextAudit) => onConfigChange({ ...config, auditConfig: nextAudit })}
      />

    </div>
  )
}

export function VipVisitEditorPanel({
  config,
  onConfigChange,
  onSaveManual,
  registeredCharacters,
}: {
  config: StationGradeConfig
  onConfigChange: (config: StationGradeConfig) => void
  onSaveManual?: () => void
  registeredCharacters: RegisteredCharacter[]
}) {
  const vipConfig = config.vipConfig ?? defaultVipConfig()
  const [deckOpen, setDeckOpen] = useState(false)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [simGrade, setSimGrade] = useState<VipTierId | null>(null)
  const [simCards, setSimCards] = useState<FanCardState[] | null>(null)
  const [simResult, setSimResult] = useState<{
    earned: number
    satisfiedCount: number
    lastRewardText: string
  } | null>(null)
  const [simNotice, setSimNotice] = useState('')
  const playable = hasPlayableFan(vipConfig)

  function closeSim() {
    setDeckOpen(false)
    setSimGrade(null)
    setSimCards(null)
    setSimResult(null)
    setSimNotice('')
  }

  function openDeck() {
    if (!playable) {
      setSimNotice('팬 이미지를 먼저 넣어야 시뮬레이터가 열립니다.')
      return
    }
    if (registeredCharacters.length === 0) {
      setSimNotice('출전할 크리에이터가 없습니다.')
      return
    }
    setSimNotice('')
    setSimResult(null)
    setDeckOpen(true)
  }

  return (
    <div className="game-panel rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">팬미팅</h2>
          <p className="mt-1 text-sm text-slate-400">
            팬마다 대기·중앙·만족 이미지 3장을 넣습니다. 만족도, 철벽, 압박은 방송국 등급에서 굴립니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openDeck}
            className="rounded-xl border border-pink-400/40 bg-pink-950/80 px-4 py-2 text-sm font-bold text-pink-100 shadow-[0_0_15px_rgba(244,114,182,0.25)] transition hover:bg-pink-900"
          >
            팬미팅 시뮬레이터
          </button>
          {onSaveManual ? (
            <button
              type="button"
              onClick={onSaveManual}
              className="game-btn game-btn-primary rounded-xl px-4 py-2 text-sm font-bold"
            >
              수동 저장
            </button>
          ) : null}
        </div>
      </div>
      <VipEditorSection
        vipConfig={vipConfig}
        onChange={(nextVip) => onConfigChange({ ...config, vipConfig: nextVip })}
      />
      {simNotice ? simPopup(
        <div className="w-full max-w-md rounded-3xl border border-pink-400/40 bg-slate-950 p-6">
          <p className="text-sm text-slate-200">{simNotice}</p>
          <button type="button" onClick={closeSim} className="game-btn game-btn-primary mt-4 rounded-xl px-4 py-2 text-xs font-bold">
            닫기
          </button>
        </div>,
      ) : null}
      {deckOpen ? createPortal(
        <AuditSimulatorDeckModal
          tierKey={simGrade ?? 'sme'}
          registeredCharacters={registeredCharacters}
          isSimulator
          titleKey="audit.fanDeckModalTitle"
          startLabelKey="audit.startFanMeetingBtn"
          onClose={() => setDeckOpen(false)}
          onReplayTutorial={() => {
            if (registeredCharacters.length === 0) {
              setSimNotice('출전할 크리에이터가 없습니다.')
              return
            }
            setPracticeOpen(true)
          }}
          onStartSimulation={(selected) => {
            setDeckOpen(false)
            setSimCards(selected.map((creator) => toFanCard(creator as RegisteredCharacter)))
            setSimGrade((grade) => grade ?? 'sme')
          }}
        />,
        document.body,
      ) : null}
      {practiceOpen ? createPortal(
        <FanMeetingModal
          practice
          config={vipConfig}
          grade={simGrade ?? 'sme'}
          cards={registeredCharacters.slice(0, 4).map(toFanCard)}
          onAbort={() => setPracticeOpen(false)}
          onFinish={() => setPracticeOpen(false)}
        />,
        document.body,
      ) : null}
      {simGrade && simCards
        ? createPortal(
            <FanMeetingModal
              key={simGrade}
              config={vipConfig}
              grade={simGrade}
              cards={simCards}
              onAbort={closeSim}
              headerExtra={<SimGradeBar grade={simGrade} onChange={setSimGrade} />}
              onFinish={(result) => {
                setSimCards(null)
                setSimResult({
                  earned: result.earned,
                  satisfiedCount: result.satisfiedCount,
                  lastRewardText: result.lastRewardText,
                })
              }}
            />,
            document.body,
          )
        : null}
      {simResult ? (
        <FanMeetingStatement
          fanCount={simResult.satisfiedCount}
          pay={simResult.earned}
          rewardText={simResult.lastRewardText}
          note="시뮬레이터 결과는 저장되지 않습니다."
          confirmLabel="닫기"
          onConfirm={closeSim}
          zClass="z-[210]"
        />
      ) : null}
    </div>
  )
}

function simPopup(node: ReactNode) {
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 p-4">{node}</div>,
    document.body,
  )
}

function SimGradeBar({ grade, onChange }: { grade: VipTierId; onChange: (grade: VipTierId) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {VIP_TIER_IDS.map((tier) => (
        <button
          key={tier}
          type="button"
          onClick={() => onChange(tier)}
          className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
            tier === grade ? 'border-pink-300 bg-pink-500/30 text-pink-50' : 'border-white/15 text-slate-300'
          }`}
        >
          {STATION_TIER_LABEL[tier]}
        </button>
      ))}
    </div>
  )
}

function toFanCard(creator: RegisteredCharacter): FanCardState {
  const row = creator as RegisteredCharacter & { stamina?: number; staminaMax?: number; statPerformance?: number; statMental?: number }
  const hp = Math.max(1, Math.round(row.stamina ?? row.staminaMax ?? 100))
  return {
    id: creator.id,
    name: creator.name,
    grade: creator.grade ?? 'B',
    statType: creator.statType,
    statPerformance: Math.round(row.statPerformance ?? 70),
    statMental: Math.round(row.statMental ?? 70),
    hp,
    hpMax: hp,
    auditMedia: creator.auditMedia,
    profileImageUrl: creator.profileImageUrl,
  }
}

function AuditEditorSection({
  auditConfig,
  onChange,
}: {
  auditConfig: PromotionAuditConfig
  onChange: (next: PromotionAuditConfig) => void
}) {
  return <AuditLineupEditor auditConfig={auditConfig} onChange={onChange} />
}

type OptionalNumberFieldProps = {
  label: string
  value: OptionalNumberCondition
  onChange: (next: OptionalNumberCondition) => void
}

function OptionalNumberField({ label, value, onChange }: OptionalNumberFieldProps) {
  const isAsset = label.includes('자산')
  const presets: QuickPreset[] = isAsset
    ? [
        { label: '+$1만', amount: 10000 },
        { label: '+$10만', amount: 100000 },
        { label: '+$100만', amount: 1000000 },
        { label: '초기화', amount: 'reset' },
      ]
    : [
        { label: '+1개', amount: 1 },
        { label: '+5개', amount: 5 },
        { label: '초기화', amount: 'reset' },
      ]

  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(event) => onChange({ ...value, enabled: event.target.checked })}
        />
        {label} 조건 사용
      </label>
      {value.enabled ? (
        <div className="mt-2">
          <NumericInput
            value={value.value}
            min={0}
            quickPresets={presets}
            onChange={(next) => onChange({ ...value, value: next })}
          />
        </div>
      ) : null}
    </div>
  )
}

function VipEditorSection({
  vipConfig,
  onChange,
}: {
  vipConfig: VipVisitConfig
  onChange: (next: VipVisitConfig) => void
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const updateCharacter = (index: number, patch: Partial<VipCharacterConfig>) => {
    const characters = vipConfig.characters.map((character, i) =>
      i === index ? { ...character, ...patch } : character,
    )
    onChange({ ...vipConfig, characters })
  }

  const updateTier = (tier: VipTierId, patch: Partial<VipVisitConfig['tiers'][VipTierId]>) => {
    onChange({
      ...vipConfig,
      tiers: {
        ...vipConfig.tiers,
        [tier]: { ...vipConfig.tiers[tier], ...patch },
      },
    })
  }

  const updateReward = (tier: VipTierId, index: number, text: string) => {
    const rewards = vipConfig.tiers[tier].rewards.map((reward, i) =>
      i === index ? { ...reward, text } : reward,
    )
    updateTier(tier, { rewards })
  }

  return (
    <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-950/15 p-5">
      <div className="border-b border-amber-500/20 pb-3">
        <h3 className="text-base font-bold text-amber-100">팬미팅</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          중소기업부터 3~5턴마다 팬미팅이 열립니다. 카드 체력이 모두 0이 될 때까지 팬이 이어지고, 만족한 팬만 지불액을 줍니다. 만족도는 그 팬의 체력이고, 철벽과 함께 높을수록 지불액이 올라갑니다. 낸 카드는 만족을 채워도 압박만큼 체력이 줄고, 멘탈이 높으면 덜 줄어듭니다.
        </p>
      </div>

      <div className="mt-4 grid max-w-4xl gap-4 md:grid-cols-2">
        <MediaDropBox
          label="배경"
          description="팬이 줄을 서는 무대. 16:9 이미지"
          slot={{ url: vipConfig.backgroundUrl ?? '', blurRegions: vipConfig.backgroundBlurRegions ?? [] }}
          onUpdateSlot={(next) =>
            onChange({
              ...vipConfig,
              backgroundUrl: next.url || '',
              backgroundBlurRegions: next.blurRegions,
            })
          }
        />
        <MediaDropBox
          label="오프닝 영상"
          description="팬미팅이 열릴 때 짧게 한 번 재생"
          slot={{ url: vipConfig.openingUrl ?? '', blurRegions: vipConfig.openingBlurRegions ?? [] }}
          onUpdateSlot={(next) =>
            onChange({
              ...vipConfig,
              openingUrl: next.url || '',
              openingBlurRegions: next.blurRegions,
            })
          }
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-amber-100">팬 명단 ({vipConfig.characters.length}명)</h4>
            <p className="text-xs text-slate-400">카드를 누르면 대기, 중앙, 만족 이미지 3장을 넣습니다.</p>
          </div>
          <button
            type="button"
            className="game-btn px-3 py-1 text-xs"
            onClick={() =>
              onChange({
                ...vipConfig,
                characters: [
                  ...vipConfig.characters,
                  {
                    id: `vip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    name: '',
                    imageUrl: '',
                  },
                ],
              })
            }
          >
            팬 추가
          </button>
        </div>
        {vipConfig.characters.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-sm text-slate-500">
            등록된 팬이 없습니다. 팬 추가로 이미지 3장을 넣으세요.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {vipConfig.characters.map((character, index) => (
              <button
                key={character.id}
                type="button"
                onClick={() => setEditingIndex(index)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-950/20 text-left shadow-md transition-all hover:scale-[1.02] hover:border-amber-300/80"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-black/70">
                  {character.imageUrl ? (
                    <img
                      src={resolveMediaSrc(character.imageUrl)}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
                      <span className="text-2xl">📁</span>
                      <span className="mt-1 text-[11px] font-bold text-amber-200">대기 이미지 없음</span>
                    </div>
                  )}
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded-xl border border-amber-300/40 bg-amber-900/90 px-3 py-1.5 text-xs font-black text-white">
                      이미지 3장
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {editingIndex != null && vipConfig.characters[editingIndex] ? (
        <VipCharacterModal
          character={vipConfig.characters[editingIndex]}
          onChange={(patch) => updateCharacter(editingIndex, patch)}
          onDelete={() => {
            onChange({
              ...vipConfig,
              characters: vipConfig.characters.filter((_, i) => i !== editingIndex),
            })
            setEditingIndex(null)
          }}
          onClose={() => setEditingIndex(null)}
        />
      ) : null}

      <div className="mt-6 space-y-4">
        {VIP_TIER_IDS.map((tier) => {
          const spec = vipConfig.tiers[tier]
          return (
            <section key={tier} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <h4 className="text-sm font-bold text-amber-100">{STATION_TIER_LABEL[tier]}</h4>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                <NumberField
                  label="만족도 min"
                  value={spec.satisfactionMin}
                  onChange={(satisfactionMin) => updateTier(tier, { satisfactionMin })}
                />
                <NumberField
                  label="만족도 max"
                  value={spec.satisfactionMax}
                  onChange={(satisfactionMax) => updateTier(tier, { satisfactionMax })}
                />
                <NumberField
                  label="철벽 min"
                  value={spec.ironWallMin}
                  onChange={(ironWallMin) => updateTier(tier, { ironWallMin })}
                />
                <NumberField
                  label="철벽 max"
                  value={spec.ironWallMax}
                  onChange={(ironWallMax) => updateTier(tier, { ironWallMax })}
                />
                <NumberField
                  label="압박 min"
                  value={spec.pressureMin}
                  onChange={(pressureMin) => updateTier(tier, { pressureMin })}
                />
                <NumberField
                  label="압박 max"
                  value={spec.pressureMax}
                  onChange={(pressureMax) => updateTier(tier, { pressureMax })}
                />
                <NumberField
                  label="지불액 min"
                  value={spec.payMin}
                  onChange={(payMin) => updateTier(tier, { payMin })}
                />
                <NumberField
                  label="지불액 max"
                  value={spec.payMax}
                  onChange={(payMax) => updateTier(tier, { payMax })}
                />
              </div>
              <div className="mt-3 space-y-2">
                {spec.rewards.map((reward, index) => (
                  <div key={reward.id} className="flex items-start gap-2">
                    <label className="block min-w-0 flex-1 text-[11px] font-semibold text-slate-400">
                      보상 문구
                      <input
                        type="text"
                        className={fieldClassName}
                        value={reward.text}
                        onChange={(event) => updateReward(tier, index, event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="mt-6 game-btn px-2 py-2 text-[10px] text-rose-300"
                      onClick={() =>
                        updateTier(tier, {
                          rewards: spec.rewards.filter((_, i) => i !== index),
                        })
                      }
                    >
                      삭제
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="game-btn px-3 py-1 text-xs"
                  onClick={() =>
                    updateTier(tier, {
                      rewards: [...spec.rewards, newReward(tier)],
                    })
                  }
                >
                  보상 문구 추가
                </button>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function VipCharacterModal({
  character,
  onChange,
  onDelete,
  onClose,
}: {
  character: VipCharacterConfig
  onChange: (patch: Partial<VipCharacterConfig>) => void
  onDelete: () => void
  onClose: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
      <div className="game-panel relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-amber-500/40 bg-slate-950 p-6 shadow-[0_0_60px_rgba(245,158,11,0.25)]">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
          <h3 className="text-lg font-black text-slate-100">이미지 3장</h3>
          <button type="button" onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-white">
            닫기 ✕
          </button>
        </div>
        <div className="mt-5 space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MediaDropBox
              label="1. 대기"
              description="자기 차례가 아닐 때"
              slot={{ url: character.imageUrl, blurRegions: character.blurRegions ?? [] }}
              onUpdateSlot={(next) => onChange({ imageUrl: next.url || '', blurRegions: next.blurRegions })}
            />
            <MediaDropBox
              label="2. 중앙"
              description="자기 차례일 때"
              slot={{ url: character.centerImageUrl ?? '', blurRegions: character.centerBlurRegions ?? [] }}
              onUpdateSlot={(next) => onChange({ centerImageUrl: next.url || '', centerBlurRegions: next.blurRegions })}
            />
            <MediaDropBox
              label="3. 만족"
              description="만족한 뒤 사라지기 전"
              slot={{ url: character.satisfiedImageUrl ?? '', blurRegions: character.satisfiedBlurRegions ?? [] }}
              onUpdateSlot={(next) => onChange({ satisfiedImageUrl: next.url || '', satisfiedBlurRegions: next.blurRegions })}
            />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-amber-500/20 pt-4">
          <button type="button" onClick={onDelete} className="game-btn px-4 py-2 text-xs font-bold text-rose-300">
            삭제
          </button>
          <button type="button" onClick={onClose} className="game-btn game-btn-primary rounded-xl px-5 py-2 text-xs font-bold">
            완료 및 닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function newReward(tier: VipTierId): VipRewardLine {
  return {
    id: `${tier}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    text: '',
  }
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (next: number) => void
}) {
  return (
    <label className="block text-[11px] font-semibold text-slate-300">
      {label}
      <input
        type="number"
        min={0}
        className={fieldClassName}
        value={value}
        onChange={(event) => onChange(Math.max(0, Math.round(Number(event.target.value) || 0)))}
      />
    </label>
  )
}
