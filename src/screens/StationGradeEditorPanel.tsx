import type { Grade } from '../game/characters'
import { formatMoney } from '../game/money'
import {
  DEFAULT_SLOT_UNLOCK_MIN_GRADES,
  DEFAULT_SLOT_UNLOCK_PRICES,
  STATION_TIER_LABEL,
  STATION_TIER_ORDER,
  defaultAuditConfig,
  tierMaxRank,
  tierViewerCap,
  type AuditJudgeConfig,
  type CreatorCountRequirement,
  type PromotionAuditConfig,
  type StationGradeConfig,
  type StationPromotionRule,
  type StationTierId,
} from '../game/stationGradeConfig'

type StationGradeEditorPanelProps = {
  config: StationGradeConfig
  onConfigChange: (config: StationGradeConfig) => void
  onSaveManual?: () => void
  onReloadFromFile?: () => void | Promise<void>
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
                  <input
                    type="number"
                    min={0}
                    className={fieldClassName}
                    value={price}
                    onChange={(event) =>
                      setSlotUnlockPrice(index, Number(event.target.value) || 0)
                    }
                  />
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

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-xs font-semibold text-slate-400">
                  스카우트 인원 상한
                  <input
                    type="number"
                    min={1}
                    max={12}
                    className={fieldClassName}
                    value={config.tiers[tier].maxScoutCreators}
                    onChange={(event) =>
                      setTierField(tier, {
                        maxScoutCreators: Math.max(
                          1,
                          Math.min(12, Math.round(Number(event.target.value) || 1)),
                        ),
                      })
                    }
                  />
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
                      <input
                        type="number"
                        min={0}
                        className={fieldClassName}
                        value={promotion.requiredViewers}
                        onChange={(event) =>
                          setPromotion(promotion.to, {
                            requiredViewers: Math.max(0, Math.round(Number(event.target.value) || 0)),
                          })
                        }
                      />
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
                      <input
                        type="number"
                        min={0}
                        className={fieldClassName}
                        value={config.topClearViewers ?? 750_000}
                        onChange={(event) =>
                          onChange({
                            ...config,
                            topClearViewers: Math.max(
                              0,
                              Math.round(Number(event.target.value) || 0),
                            ),
                          })
                        }
                      />
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
        onChange={(nextAudit) => onChange({ ...config, auditConfig: nextAudit })}
      />
    </div>
  )
}

function AuditEditorSection({
  auditConfig,
  onChange,
}: {
  auditConfig: PromotionAuditConfig
  onChange: (next: PromotionAuditConfig) => void
}) {
  const updateJudge = (idx: number, patch: Partial<AuditJudgeConfig>) => {
    const nextJudges = auditConfig.judges.map((j, i) => (i === idx ? { ...j, ...patch } : j))
    onChange({ ...auditConfig, judges: nextJudges })
  }

  const addJudge = () => {
    const nextIdx = auditConfig.judges.length + 1
    const newJudge: AuditJudgeConfig = {
      id: `judge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `신규 심사관 ${nextIdx}`,
      avatarUrl: '',
      attackPower: 10,
      satisfactionMod: 1.0,
      description: '새로 등록된 승급 심사관',
    }
    onChange({ ...auditConfig, judges: [...auditConfig.judges, newJudge] })
  }

  const removeJudge = (idx: number) => {
    if (auditConfig.judges.length <= 1) return
    const nextJudges = auditConfig.judges.filter((_, i) => i !== idx)
    onChange({ ...auditConfig, judges: nextJudges })
  }

  const updateStage = (
    tierKey: Exclude<StationTierId, 'black' | 'tiny'>,
    patch: Partial<PromotionAuditConfig['stageSettings'][typeof tierKey]>,
  ) => {
    onChange({
      ...auditConfig,
      stageSettings: {
        ...auditConfig.stageSettings,
        [tierKey]: { ...auditConfig.stageSettings[tierKey], ...patch },
      },
    })
  }

  const grades: Grade[] = ['B', 'A', 'S']

  return (
    <div className="mt-8 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-5 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
      <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
        <div>
          <h3 className="text-base font-bold text-purple-200">⚖️ 승급 심사 미니게임 밸런스 & 심사관 세팅</h3>
          <p className="text-xs text-slate-400">
            승급 심사관을 새로 생성/편집하고, 공격력(데미지 계수) 및 기업 단계별 권장 등급과 메인 스테미나 소모량을 관리합니다.
          </p>
        </div>
      </div>

      {/* 심사관 등록, 추가 및 편집 */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs font-bold text-purple-300">
            👥 등록된 심사관 ({auditConfig.judges.length}명)
          </h4>
          <button
            type="button"
            className="game-btn border border-purple-400/40 bg-purple-900/60 px-3 py-1 text-xs font-bold text-purple-200 hover:bg-purple-800"
            onClick={addJudge}
          >
            ＋ 심사관 추가
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {auditConfig.judges.map((judge, idx) => (
            <div
              key={judge.id || `judge-${idx}`}
              className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="rounded bg-purple-900/60 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                  심사관 #{idx + 1}
                </span>
                {auditConfig.judges.length > 1 ? (
                  <button
                    type="button"
                    className="game-btn px-2 py-0.5 text-[10px] text-rose-300 hover:text-rose-100"
                    onClick={() => removeJudge(idx)}
                  >
                    삭제
                  </button>
                ) : null}
              </div>

              <label className="block text-[11px] font-semibold text-slate-400">
                심사관 이름
                <input
                  type="text"
                  className={fieldClassName}
                  value={judge.name}
                  onChange={(e) => updateJudge(idx, { name: e.target.value })}
                />
              </label>

              <label className="block text-[11px] font-semibold text-slate-400">
                초상화 미디어 URL (기본)
                <input
                  type="text"
                  className={fieldClassName}
                  placeholder="/assets/judges/judge_1.png"
                  value={judge.avatarUrl}
                  onChange={(e) => updateJudge(idx, { avatarUrl: e.target.value })}
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="block text-[10px] font-semibold text-amber-300">
                  🌟 A 영상 (고만족 80%↑)
                  <input
                    type="text"
                    className={fieldClassName}
                    placeholder="/assets/judges/judge_1_high.mp4"
                    value={judge.auditMedia?.A || ''}
                    onChange={(e) =>
                      updateJudge(idx, {
                        auditMedia: {
                          ...(judge.auditMedia || {}),
                          A: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="block text-[10px] font-semibold text-cyan-300">
                  ⚡ B 영상 (중만족 30~79%)
                  <input
                    type="text"
                    className={fieldClassName}
                    placeholder="/assets/judges/judge_1_mid.mp4"
                    value={judge.auditMedia?.B || ''}
                    onChange={(e) =>
                      updateJudge(idx, {
                        auditMedia: {
                          ...(judge.auditMedia || {}),
                          B: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="block text-[10px] font-semibold text-rose-300">
                  💧 C 영상 (저만족 0~29%)
                  <input
                    type="text"
                    className={fieldClassName}
                    placeholder="/assets/judges/judge_1_low.mp4"
                    value={judge.auditMedia?.C || ''}
                    onChange={(e) =>
                      updateJudge(idx, {
                        auditMedia: {
                          ...(judge.auditMedia || {}),
                          C: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px] font-semibold text-slate-400">
                  공격력 (데미지)
                  <input
                    type="number"
                    min={0}
                    className={fieldClassName}
                    value={judge.attackPower}
                    onChange={(e) =>
                      updateJudge(idx, {
                        attackPower: Math.max(0, Math.round(Number(e.target.value) || 0)),
                      })
                    }
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-400">
                  만족도 계수
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    className={fieldClassName}
                    value={judge.satisfactionMod}
                    onChange={(e) =>
                      updateJudge(idx, {
                        satisfactionMod: Math.max(0.1, Number(e.target.value) || 1.0),
                      })
                    }
                  />
                </label>
              </div>

              <label className="block text-[11px] font-semibold text-slate-400">
                설명/특징
                <input
                  type="text"
                  className={fieldClassName}
                  value={judge.description}
                  onChange={(e) => updateJudge(idx, { description: e.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 기업 단계별 심사 밸런스 */}
      <div className="mt-6">
        <h4 className="text-xs font-bold text-purple-300">🏢 기업 단계별 심사 목표 & 밸런스</h4>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['sme', 'mid', 'large', 'top'] as const).map((tierKey) => {
            const stage = auditConfig.stageSettings[tierKey]
            return (
              <div
                key={tierKey}
                className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2.5"
              >
                <h5 className="text-xs font-bold text-amber-300">{STATION_TIER_LABEL[tierKey]}</h5>

                <label className="block text-[11px] font-semibold text-slate-400">
                  목표 만족도 (점수)
                  <input
                    type="number"
                    min={10}
                    className={fieldClassName}
                    value={stage.targetSatisfaction}
                    onChange={(e) =>
                      updateStage(tierKey, {
                        targetSatisfaction: Math.max(10, Math.round(Number(e.target.value) || 10)),
                      })
                    }
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-400">
                  권장 크리에이터 등급
                  <select
                    className={fieldClassName}
                    value={stage.recommendedGrade}
                    onChange={(e) =>
                      updateStage(tierKey, { recommendedGrade: e.target.value as Grade })
                    }
                  >
                    {grades.map((g) => (
                      <option key={g} value={g}>
                        {g} 등급 이상
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    메인 스테미나 소모
                    <input
                      type="number"
                      min={0}
                      className={fieldClassName}
                      value={stage.staminaCost}
                      onChange={(e) =>
                        updateStage(tierKey, {
                          staminaCost: Math.max(0, Math.round(Number(e.target.value) || 0)),
                        })
                      }
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-400">
                    심사관 공격 계수
                    <input
                      type="number"
                      step={0.1}
                      min={0.1}
                      className={fieldClassName}
                      value={stage.judgeAttackMod}
                      onChange={(e) =>
                        updateStage(tierKey, {
                          judgeAttackMod: Math.max(0.1, Number(e.target.value) || 1.0),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type OptionalNumberFieldProps = {
  label: string
  value: { enabled: boolean; value: number }
  onChange: (next: { enabled: boolean; value: number }) => void
}

function OptionalNumberField({ label, value, onChange }: OptionalNumberFieldProps) {
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
        <input
          type="number"
          min={0}
          className={fieldClassName}
          value={value.value}
          onChange={(event) =>
            onChange({ ...value, value: Math.max(0, Math.round(Number(event.target.value) || 0)) })
          }
        />
      ) : null}
    </div>
  )
}
