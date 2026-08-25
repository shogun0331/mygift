import { useState, useRef } from 'react'
import type { Grade } from '../game/characters'
import {
  CHARACTER_LOCALE_LABELS,
  CHARACTER_LOCALES,
  pickCharacterLocaleText,
  type CharacterLocale,
} from '../game/characterLocales'
import { resolveMediaSrc } from '../game/mediaUrl'
import {
  FIXED_JUDGES_LOCALES,
  STATION_TIER_LABEL,
  defaultAuditConfig,
  type AuditJudgeConfig,
  type PromotionAuditConfig,
  type StationGradeConfig,
  type StationTierId,
} from '../game/stationGradeConfig'

type AuditEditorPanelProps = {
  config: StationGradeConfig
  onConfigChange: (config: StationGradeConfig) => void
  onSaveManual?: () => void
  onStartSimulator?: (tierKey: Exclude<StationTierId, 'black' | 'tiny'>) => void
}

const fieldClassName =
  'mt-1.5 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-400/50'

const TARGET_TIER_LABEL: Record<Exclude<StationTierId, 'black' | 'tiny'> | 'all', string> = {
  all: '🌐 모든 기업 등급 무작위 출전',
  sme: '🏢 중소기업 승급 전담 심사관',
  mid: '🏢 중견기업 승급 전담 심사관',
  large: '🏢 대기업 승급 전담 심사관',
  top: '👑 일등기업 승급 전담 심사관',
}

export function AuditEditorPanel({
  config,
  onConfigChange,
  onSaveManual,
  onStartSimulator,
}: AuditEditorPanelProps) {
  const auditConfig: PromotionAuditConfig = config.auditConfig ?? defaultAuditConfig()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // 4인 심사관 고정 라인업
  const judges = auditConfig.judges.slice(0, 4)

  const updateAudit = (nextAudit: PromotionAuditConfig) => {
    onConfigChange({ ...config, auditConfig: nextAudit })
  }

  const updateJudge = (idx: number, patch: Partial<AuditJudgeConfig>) => {
    const nextJudges = judges.map((j, i) => (i === idx ? { ...j, ...patch } : j))
    updateAudit({ ...auditConfig, judges: nextJudges })
  }

  const updateStageSetting = (
    tierKey: Exclude<StationTierId, 'black' | 'tiny'>,
    patch: Partial<PromotionAuditConfig['stageSettings'][typeof tierKey]>,
  ) => {
    updateAudit({
      ...auditConfig,
      stageSettings: {
        ...auditConfig.stageSettings,
        [tierKey]: { ...auditConfig.stageSettings[tierKey], ...patch },
      },
    })
  }

  const editingJudge = editingIndex != null ? judges[editingIndex] ?? null : null

  return (
    <div className="game-panel rounded-2xl p-6">
      {/* 상단 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">⚖️ 승급심사 관리</h2>
          <p className="mt-1 text-sm text-slate-400">
            일본 남성 심사관 4인의 7개국어 이름/설명은 고정 적용되며, 16:9 미디어를 드래그 앤 드롭으로 세팅할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onStartSimulator ? (
            <button
              type="button"
              onClick={() => onStartSimulator('sme')}
              className="rounded-xl border border-cyan-400/40 bg-cyan-950/80 px-4 py-2 text-sm font-bold text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition hover:bg-cyan-900 hover:text-white"
            >
              🎮 승급심사 시뮬레이터
            </button>
          ) : null}
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

      {/* 1. 기업 단계별 4인 전담 심사관 16:9 카드 목록 */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-purple-300">👥 기업 승급 심사관 라인업 (4인 전담)</h3>
            <p className="text-xs text-slate-400">
              심사관 카드를 클릭하면 16:9 미디어 및 담당 기업 승급 밸런스(목표점수, 권장등급, 스테미나)를 수정할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {judges.map((judge, idx) => {
            const fixedData = FIXED_JUDGES_LOCALES[idx % 4]!
            const isVideo =
              judge.avatarUrl.startsWith('data:video') ||
              judge.avatarUrl.endsWith('.mp4') ||
              judge.avatarUrl.endsWith('.webm')

            const defaultTargetTiers = ['sme', 'mid', 'large', 'top'] as const
            const targetTierKey = (judge.targetTier && judge.targetTier !== 'all' ? judge.targetTier : defaultTargetTiers[idx % 4]) ?? 'sme'
            const displayName = fixedData.names.ko
            const displayDesc = fixedData.descriptions.ko
            const stageTierKey = targetTierKey !== 'all' ? targetTierKey : defaultTargetTiers[idx % 4]
            const stage = auditConfig.stageSettings[stageTierKey] ?? auditConfig.stageSettings.sme

            return (
              <div
                key={judge.id || `judge-${idx}`}
                onClick={() => setEditingIndex(idx)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-950/20 shadow-md transition-all hover:scale-[1.02] hover:border-purple-400/80 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] cursor-pointer"
              >
                {/* 16:9 썸네일 미디어 */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/70">
                  {judge.avatarUrl ? (
                    isVideo ? (
                      <video
                        src={resolveMediaSrc(judge.avatarUrl)}
                        className="h-full w-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={resolveMediaSrc(judge.avatarUrl)}
                        alt={displayName}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                      <span className="text-3xl">⚖️</span>
                      <span className="mt-1 text-[11px] font-bold text-purple-300">16:9 대표 미디어 미등록</span>
                    </div>
                  )}

                  {/* 오버레이 세팅 및 시뮬레이터 버튼 */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/75 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-xs p-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingIndex(idx)
                      }}
                      className="w-full rounded-xl border border-purple-300/40 bg-purple-900/90 px-3 py-1.5 text-xs font-black text-white shadow-lg hover:bg-purple-800"
                    >
                      ⚙️ 상세 세팅
                    </button>
                    {onStartSimulator ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartSimulator(stageTierKey)
                        }}
                        className="w-full rounded-xl border border-cyan-400/40 bg-cyan-950/90 px-3 py-1.5 text-xs font-black text-cyan-200 shadow-lg hover:bg-cyan-900 hover:text-white"
                      >
                        🎮 시뮬레이터 실행
                      </button>
                    ) : null}
                  </div>

                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                    <span className="rounded-md bg-purple-900/90 px-2 py-0.5 text-[10px] font-bold text-amber-200 backdrop-blur-sm border border-purple-400/40">
                      {TARGET_TIER_LABEL[targetTierKey]}
                    </span>
                  </div>
                </div>

                {/* 하단 심사관 명찰 및 밸런스 정보 요약 */}
                <div className="flex flex-col justify-between p-3.5 bg-slate-950/90 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-100 truncate">{displayName}</h4>
                    <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/60 px-1.5 py-0.5 text-[9px] font-black text-rose-300">
                      공격력 {judge.attackPower}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {displayDesc || '설명 없음'}
                  </p>

                  <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-white/5 text-[9px] text-slate-400">
                    <div>목표점수: <span className="font-bold text-amber-300">{stage.targetSatisfaction}점</span></div>
                    <div>권장등급: <span className="font-bold text-amber-300">{stage.recommendedGrade}급+</span></div>
                    <div>스테미나: <span className="font-bold text-cyan-300">-{stage.staminaCost}</span></div>
                    <div>공격계수: <span className="font-bold text-rose-300">{stage.judgeAttackMod}x</span></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. 최종 1위(1등 클리어) 달성 조건 시청자 수 세팅 */}
      <div className="mt-8 border-t border-white/10 pt-6">
        <h3 className="text-sm font-bold text-emerald-300">🏆 최종 1위(1등 클리어) 달성 조건 세팅</h3>
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <label className="block text-xs font-semibold text-slate-300">
            1위 달성 필수 시청자 수
            <input
              type="number"
              min={0}
              className={fieldClassName}
              value={config.topClearViewers ?? 750_000}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  topClearViewers: Math.max(0, Math.round(Number(e.target.value) || 0)),
                })
              }
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">
              일등기업 등급에서 랭킹 1위(1등)를 달성하고 엔딩 클리어가 되는 시청자 목표치입니다. (기본값: 750,000)
            </span>
          </label>
        </div>
      </div>

      {/* 상세 세팅 팝업 모달 */}
      {editingJudge && editingIndex != null ? (
        <JudgeDetailModal
          judge={editingJudge}
          idx={editingIndex}
          stageSettings={auditConfig.stageSettings}
          onUpdate={(patch) => updateJudge(editingIndex, patch)}
          onUpdateStageSetting={updateStageSetting}
          onClose={() => setEditingIndex(null)}
        />
      ) : null}
    </div>
  )
}

function JudgeDetailModal({
  judge,
  idx,
  stageSettings,
  onUpdate,
  onUpdateStageSetting,
  onClose,
}: {
  judge: AuditJudgeConfig
  idx: number
  stageSettings: PromotionAuditConfig['stageSettings']
  onUpdate: (patch: Partial<AuditJudgeConfig>) => void
  onUpdateStageSetting: (
    tierKey: Exclude<StationTierId, 'black' | 'tiny'>,
    patch: Partial<PromotionAuditConfig['stageSettings'][typeof tierKey]>,
  ) => void
  onClose: () => void
}) {
  const [activeLang, setActiveLang] = useState<CharacterLocale>('ko')
  const fixedData = FIXED_JUDGES_LOCALES[idx % 4]!

  const targetTierKey = (judge.targetTier !== 'all' ? judge.targetTier : (['sme', 'mid', 'large', 'top'] as const)[idx]) ?? 'sme'
  const currentStage = stageSettings[targetTierKey] ?? stageSettings.sme
  const grades: Grade[] = ['B', 'A', 'S']

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="game-panel relative flex flex-col w-full max-w-3xl overflow-hidden rounded-3xl border border-purple-500/40 bg-slate-950 p-6 shadow-[0_0_60px_rgba(168,85,247,0.3)]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-amber-400/40 bg-amber-900/60 px-3 py-1 text-xs font-black text-amber-200">
              {TARGET_TIER_LABEL[judge.targetTier ?? 'all']}
            </span>
            <h3 className="text-lg font-black text-slate-100">
              {fixedData.names.ko} ({fixedData.names.ja}) 심사관 세팅
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-white"
          >
            닫기 ✕
          </button>
        </div>

        {/* 상세 세팅 내용 (스크롤가능) */}
        <div className="mt-5 space-y-5 overflow-y-auto max-h-[72vh] pr-1.5">
          {/* 1. 7개 국어 i18n 시스템 고정 다국어 미리보기 보드 */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-purple-300">
                🔒 7개 국어 이름 & 프로필 (시스템 고정 적용 완비)
              </label>
              <span className="text-[10px] text-emerald-400 font-bold">
                ✓ 언어별 번역 자동 반영 중
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CHARACTER_LOCALES.map((langKey) => {
                const label = CHARACTER_LOCALE_LABELS[langKey]
                const isActive = activeLang === langKey
                return (
                  <button
                    key={langKey}
                    type="button"
                    onClick={() => setActiveLang(langKey)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] ring-1 ring-purple-300'
                        : 'bg-black/50 text-slate-400 hover:bg-purple-900/40 hover:text-slate-200'
                    }`}
                  >
                    {label} ({langKey.toUpperCase()})
                  </button>
                )
              })}
            </div>

            {/* 현재 선택된 언어의 고정 이름 & 설명 표시 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-purple-500/20 pt-3 bg-black/40 p-3 rounded-xl">
              <div>
                <span className="text-[11px] font-bold text-slate-400">
                  심사관 이름 [{CHARACTER_LOCALE_LABELS[activeLang]}]
                </span>
                <p className="text-sm font-bold text-purple-200 mt-0.5">
                  {fixedData.names[activeLang] || fixedData.names.ko}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400">
                  심사관 설명 [{CHARACTER_LOCALE_LABELS[activeLang]}]
                </span>
                <p className="text-xs text-slate-300 mt-0.5">
                  {fixedData.descriptions[activeLang] || fixedData.descriptions.ko}
                </p>
              </div>
            </div>
          </div>

          {/* 2. 담당 승급 심사 기업 등급 지정 & 단계별 심사 밸런스 내장 */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
            <label className="block text-xs font-bold text-amber-300">
              🏢 담당 승급 심사 기업 등급
              <select
                className={fieldClassName}
                value={judge.targetTier ?? 'all'}
                onChange={(e) =>
                  onUpdate({
                    targetTier: e.target.value as Exclude<StationTierId, 'black' | 'tiny'> | 'all',
                  })
                }
              >
                <option value="sme">🏢 중소기업 승급 전담 심사관 (사토 켄지)</option>
                <option value="mid">🏢 중견기업 승급 전담 심사관 (타나카 렌)</option>
                <option value="large">🏢 대기업 승급 전담 심사관 (야마모토 류세이)</option>
                <option value="top">👑 일등기업 승급 전담 심사관 (카와무라 다이치)</option>
                <option value="all">🌐 모든 기업 등급 무작위 출전</option>
              </select>
            </label>

            {/* 기업 단계별 승급 심사 밸런스 내장 박스 */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 mt-2 space-y-3">
              <h4 className="text-xs font-bold text-amber-200 flex items-center justify-between">
                <span>📊 [{STATION_TIER_LABEL[targetTierKey]}] 승급 심사 밸런스 수치</span>
                <span className="text-[10px] text-slate-400 font-normal">이 심사관이 주관하는 승급 심사 난이도</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="block text-[11px] font-semibold text-slate-300">
                  목표 만족도 (점수)
                  <input
                    type="number"
                    min={10}
                    className={fieldClassName}
                    value={currentStage.targetSatisfaction}
                    onChange={(e) =>
                      onUpdateStageSetting(targetTierKey, {
                        targetSatisfaction: Math.max(10, Math.round(Number(e.target.value) || 10)),
                      })
                    }
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  권장 크리에이터 등급
                  <select
                    className={fieldClassName}
                    value={currentStage.recommendedGrade}
                    onChange={(e) =>
                      onUpdateStageSetting(targetTierKey, {
                        recommendedGrade: e.target.value as Grade,
                      })
                    }
                  >
                    {grades.map((g) => (
                      <option key={g} value={g}>
                        {g} 등급 이상
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  메인 스테미나 소모
                  <input
                    type="number"
                    min={0}
                    className={fieldClassName}
                    value={currentStage.staminaCost}
                    onChange={(e) =>
                      onUpdateStageSetting(targetTierKey, {
                        staminaCost: Math.max(0, Math.round(Number(e.target.value) || 0)),
                      })
                    }
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  심사관 공격 계수
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    className={fieldClassName}
                    value={currentStage.judgeAttackMod}
                    onChange={(e) =>
                      onUpdateStageSetting(targetTierKey, {
                        judgeAttackMod: Math.max(0.1, Number(e.target.value) || 1.0),
                      })
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 3. 16:9 미디어 3종 (드래그 앤 드롭 업로드 지원) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-purple-300">
              🖼️ 16:9 미디어 등록 (드래그 앤 드롭 지원)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MediaDropBox
                label="대표 16:9 미디어"
                description="심사 무대 기본 비주얼"
                url={judge.avatarUrl}
                onUpdateUrl={(nextUrl) => onUpdate({ avatarUrl: nextUrl })}
              />
              <MediaDropBox
                label="🎉 승급 성공 16:9 미디어"
                description="심사 통과 성공 컷씬"
                url={judge.successMediaUrl}
                onUpdateUrl={(nextUrl) => onUpdate({ successMediaUrl: nextUrl })}
              />
              <MediaDropBox
                label="❌ 승급 실패 16:9 미디어"
                description="심사 탈락 실패 컷씬"
                url={judge.failMediaUrl}
                onUpdateUrl={(nextUrl) => onUpdate({ failMediaUrl: nextUrl })}
              />
            </div>
          </div>

          {/* 4. 심사관 자체 공격력 & 만족도 계수 */}
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-xs font-bold text-slate-300">
              심사관 기본 공격력 (데미지 계수)
              <input
                type="number"
                min={0}
                className={fieldClassName}
                value={judge.attackPower}
                onChange={(e) =>
                  onUpdate({ attackPower: Math.max(0, Math.round(Number(e.target.value) || 0)) })
                }
              />
            </label>

            <label className="block text-xs font-bold text-slate-300">
              만족도 계수
              <input
                type="number"
                step={0.1}
                min={0.1}
                className={fieldClassName}
                value={judge.satisfactionMod}
                onChange={(e) =>
                  onUpdate({ satisfactionMod: Math.max(0.1, Number(e.target.value) || 1.0) })
                }
              />
            </label>
          </div>
        </div>

        {/* 푸터 */}
        <div className="mt-6 flex items-center justify-end border-t border-purple-500/20 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="game-btn game-btn-primary rounded-xl px-5 py-2 text-xs font-bold"
          >
            완료 및 닫기
          </button>
        </div>
      </div>
    </div>
  )
}

function MediaDropBox({
  label,
  description,
  url,
  onUpdateUrl,
}: {
  label: string
  description: string
  url?: string
  onUpdateUrl: (nextUrl: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) onUpdateUrl(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const isVideo =
    url?.startsWith('data:video') ||
    url?.endsWith('.mp4') ||
    url?.endsWith('.webm')

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-slate-300">{label}</label>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) processFile(file)
        }}
        className={`relative aspect-[16/9] w-full overflow-hidden rounded-xl border-2 transition-all ${
          isDragging
            ? 'border-purple-400 bg-purple-950/70 scale-[1.02]'
            : 'border-dashed border-white/20 bg-black/60 hover:border-purple-400/50'
        } group`}
      >
        {url ? (
          isVideo ? (
            <video
              src={resolveMediaSrc(url)}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={resolveMediaSrc(url)}
              alt=""
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
            <span className="text-2xl mb-1">📁</span>
            <span className="text-[10px] font-bold text-slate-300">드래그 앤 드롭</span>
            <span className="text-[9px] text-slate-500">{description}</span>
          </div>
        )}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-black/75 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-xs p-2">
          <button
            type="button"
            className="game-btn game-btn-primary rounded-lg px-3 py-1.5 text-[10px] font-bold"
            onClick={() => fileInputRef.current?.click()}
          >
            📷 파일 선택
          </button>
          {url ? (
            <button
              type="button"
              className="rounded-lg border border-rose-500/40 bg-rose-950/80 px-2.5 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-900"
              onClick={() => onUpdateUrl('')}
            >
              삭제
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
