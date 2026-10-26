import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { resolveMediaSrc } from '../game/mediaUrl'
import { BlurRegionEditor, BlurRegionOverlay } from '../events/BlurRegionEditor'
import { AuditLineupEditor } from './AuditLineupEditor'
import { AuditSimulatorDeckModal } from './AuditSimulatorDeckModal'
import { ExamMeetingModal } from './FanMeetingModal'
import { FanMeetingStatement } from './FanMeetingStatement'
import type { RegisteredCharacter } from '../game/characters'
import { useTranslation } from '../locales/i18n'
import {
  STATION_TIER_LABEL,
  VIP_TIER_IDS,
  defaultAuditConfig,
  normalizeJudgeMediaSlot,
  type AuditJudgeMediaSlot,
  type StationGradeConfig,
  type StationTierId,
  type VipTierId,
} from '../game/stationGradeConfig'

type AuditEditorPanelProps = {
  config: StationGradeConfig
  onConfigChange: (config: StationGradeConfig) => void
  onSaveManual?: () => void
  registeredCharacters?: RegisteredCharacter[]
  onStartSimulator?: (tierKey: Exclude<StationTierId, 'black' | 'tiny'>) => void
}

export function AuditEditorPanel({
  config,
  onConfigChange,
  onSaveManual,
  registeredCharacters = [],
}: AuditEditorPanelProps) {
  const { t } = useTranslation()
  const auditConfig = config.auditConfig ?? defaultAuditConfig()
  const [deckOpen, setDeckOpen] = useState(false)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [simGrade, setSimGrade] = useState<VipTierId | null>(null)
  const [simCreators, setSimCreators] = useState<RegisteredCharacter[] | null>(null)
  const [simResult, setSimResult] = useState<{ success: boolean; count: number } | null>(null)
  const [simNotice, setSimNotice] = useState('')

  function closeSim() {
    setDeckOpen(false)
    setSimGrade(null)
    setSimCreators(null)
    setSimResult(null)
    setSimNotice('')
  }

  function openDeck() {
    if (registeredCharacters.length === 0) {
      setSimNotice('출전할 크리에이터가 없습니다.')
      return
    }
    setSimNotice('')
    setSimResult(null)
    setDeckOpen(true)
  }

  function beginSim(selected: RegisteredCharacter[]) {
    setDeckOpen(false)
    setSimCreators(selected.map((creator) => {
      const row = creator as RegisteredCharacter & { stamina?: number; staminaMax?: number; statPerformance?: number; statMental?: number }
      const hp = Math.max(1, Math.round(row.stamina ?? row.staminaMax ?? 100))
      return {
        ...creator,
        statPerformance: Math.round(row.statPerformance ?? 70),
        statMental: Math.round(row.statMental ?? 70),
        stamina: hp,
        staminaMax: hp,
      }
    }))
    setSimGrade((grade) => grade ?? 'sme')
  }

  return (
    <div className="game-panel rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">승급심사</h2>
          <p className="mt-1 text-sm text-slate-400">등급마다 배경과 입장 영상, 심사위원 4명의 대기·중앙·만족 이미지를 넣습니다. 카드 퍼포먼스는 팬미팅과 같은 이미지를 씁니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openDeck}
            className="rounded-xl border border-purple-400/40 bg-purple-950/80 px-4 py-2 text-sm font-bold text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.25)] transition hover:bg-purple-900"
          >
            승급심사 시뮬레이터
          </button>
          {onSaveManual ? (
            <button type="button" onClick={onSaveManual} className="game-btn game-btn-primary rounded-xl px-4 py-2 text-sm font-bold">수동 저장</button>
          ) : null}
        </div>
      </div>
      <AuditLineupEditor auditConfig={auditConfig} onChange={(next) => onConfigChange({ ...config, auditConfig: next })} />
      {simNotice ? createPortal(
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-purple-400/40 bg-slate-950 p-6">
            <p className="text-sm text-slate-200">{simNotice}</p>
            <button type="button" onClick={closeSim} className="game-btn game-btn-primary mt-4 rounded-xl px-4 py-2 text-xs font-bold">닫기</button>
          </div>
        </div>,
        document.body,
      ) : null}
      {deckOpen ? createPortal(
        <AuditSimulatorDeckModal
          tierKey={simGrade ?? 'sme'}
          registeredCharacters={registeredCharacters}
          isSimulator
          onClose={() => setDeckOpen(false)}
          onReplayTutorial={() => {
            if (registeredCharacters.length === 0) {
              setSimNotice('출전할 크리에이터가 없습니다.')
              return
            }
            setPracticeOpen(true)
          }}
          onStartSimulation={beginSim}
        />,
        document.body,
      ) : null}
      {practiceOpen ? createPortal(
        <ExamMeetingModal
          practice
          tier={simGrade ?? 'sme'}
          creators={registeredCharacters.slice(0, 4)}
          config={config}
          onAbort={() => setPracticeOpen(false)}
          onFinish={() => setPracticeOpen(false)}
        />,
        document.body,
      ) : null}
      {simGrade && simCreators && !simResult ? createPortal(
        <ExamMeetingModal
          key={simGrade}
          tier={simGrade}
          creators={simCreators}
          config={config}
          headerExtra={(
            <div className="mt-2 flex flex-wrap gap-1">
              {VIP_TIER_IDS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSimGrade(tier)}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
                    tier === simGrade ? 'border-purple-300 bg-purple-500/30 text-purple-50' : 'border-white/15 text-slate-300'
                  }`}
                >
                  {STATION_TIER_LABEL[tier]}
                </button>
              ))}
            </div>
          )}
          onAbort={closeSim}
          onFinish={(result) => {
            setSimResult({ success: result.satisfiedCount >= 4, count: result.satisfiedCount })
          }}
        />,
        document.body,
      ) : null}
      {simResult ? createPortal(
        <FanMeetingStatement
          fanCount={simResult.count}
          pay={0}
          rewardText=""
          hideIncome
          title={simResult.success ? t('audit.examPass') : t('audit.examFail')}
          bodyText={t('audit.examBody').replace('{count}', String(simResult.count))}
          note="시뮬레이터 결과는 저장되지 않습니다."
          confirmLabel="닫기"
          zClass="z-[210]"
          onConfirm={closeSim}
        />,
        document.body,
      ) : null}
    </div>
  )
}

export function MediaDropBox({
  label,
  description,
  slot,
  onUpdateSlot,
}: {
  label: string
  description: string
  slot?: AuditJudgeMediaSlot | string | null
  onUpdateSlot: (nextSlot: AuditJudgeMediaSlot) => void
}) {
  const normalizedSlot = normalizeJudgeMediaSlot(slot)
  const url = normalizedSlot.url || ''
  const blurRegions = normalizedSlot.blurRegions || []
  const [isEditingBlur, setIsEditingBlur] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) onUpdateSlot({ url: dataUrl, blurRegions })
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const isVideo =
    url.startsWith('data:video') ||
    /\.(mp4|webm|ogv|ogg|mov|mkv|m4v)$/i.test(url.split('?')[0])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-slate-300">{label}</label>
        {url ? (
          <button
            type="button"
            onClick={() => setIsEditingBlur(true)}
            className="text-[10px] font-bold text-purple-300 hover:text-purple-200 flex items-center gap-1"
          >
            🔍 모자이크 ({blurRegions.length})
          </button>
        ) : null}
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
          <>
            {isVideo ? (
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
            )}
            {blurRegions.length > 0 ? <BlurRegionOverlay regions={blurRegions} src={resolveMediaSrc(url)} kind={isVideo ? 'video' : 'image'} /> : null}
          </>
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
            <>
              <button
                type="button"
                className="rounded-lg border border-purple-400/50 bg-purple-950/90 px-2.5 py-1 text-[10px] font-bold text-purple-200 hover:bg-purple-900"
                onClick={() => setIsEditingBlur(true)}
              >
                🔍 블러 영역 편집 ({blurRegions.length})
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-500/40 bg-rose-950/80 px-2.5 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-900"
                onClick={() => onUpdateSlot({ url: null, blurRegions: [] })}
              >
                삭제
              </button>
            </>
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

      {isEditingBlur && url ? (
        <BlurRegionEditor
          asset={{ url, kind: isVideo ? 'video' : 'image' }}
          regions={blurRegions}
          blurDefault={4}
          onChange={({ blurRegions: nextRegions }) => {
            onUpdateSlot({ url, blurRegions: nextRegions })
          }}
          onClose={() => setIsEditingBlur(false)}
        />
      ) : null}
    </div>
  )
}
