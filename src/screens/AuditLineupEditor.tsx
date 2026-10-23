import { useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveMediaSrc } from '../game/mediaUrl'
import {
  STATION_TIER_LABEL,
  VIP_TIER_IDS,
  type AuditLineupMember,
  type PromotionAuditConfig,
  type VipTierId,
} from '../game/stationGradeConfig'
import { MediaDropBox } from './AuditEditorPanel'

const fieldClassName =
  'mt-1.5 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-400/50'

export function AuditLineupEditor({
  auditConfig,
  onChange,
}: {
  auditConfig: PromotionAuditConfig
  onChange: (next: PromotionAuditConfig) => void
}) {
  const [editing, setEditing] = useState<{ tier: VipTierId; index: number } | null>(null)
  const updateTier = (tier: VipTierId, patch: Partial<PromotionAuditConfig['stageSettings'][VipTierId]>) => {
    onChange({
      ...auditConfig,
      stageSettings: {
        ...auditConfig.stageSettings,
        [tier]: { ...auditConfig.stageSettings[tier], ...patch },
      },
    })
  }
  const updateMember = (tier: VipTierId, index: number, patch: Partial<AuditLineupMember>) => {
    const members = auditConfig.stageSettings[tier].members.map((member, i) =>
      i === index ? { ...member, ...patch } : member,
    )
    updateTier(tier, { members })
  }
  const member = editing ? auditConfig.stageSettings[editing.tier].members[editing.index] : null

  return (
    <>
    <div className="mt-6 space-y-4">
        {VIP_TIER_IDS.map((tier) => {
          const stage = auditConfig.stageSettings[tier]
          return (
            <section key={tier} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <h4 className="text-sm font-bold text-purple-100">{STATION_TIER_LABEL[tier]} 심사위원 4명</h4>
              <p className="mt-1 text-xs text-slate-400">카드를 누르면 대기, 중앙, 만족 이미지 3장을 넣습니다. 네 장이 모두 있어야 심사가 열립니다.</p>
              <div className="mt-3 grid max-w-4xl gap-4 md:grid-cols-2">
                <MediaDropBox
                  label="배경"
                  description={`${STATION_TIER_LABEL[tier]} 심사 무대. 16:9 이미지`}
                  slot={{ url: stage.backgroundUrl ?? '', blurRegions: stage.backgroundBlurRegions ?? [] }}
                  onUpdateSlot={(next) => updateTier(tier, { backgroundUrl: next.url || '', backgroundBlurRegions: next.blurRegions })}
                />
                <MediaDropBox
                  label="입장 영상"
                  description={`${STATION_TIER_LABEL[tier]} 심사가 열릴 때 한 번 재생`}
                  slot={{ url: stage.openingUrl ?? '', blurRegions: stage.openingBlurRegions ?? [] }}
                  onUpdateSlot={(next) => updateTier(tier, { openingUrl: next.url || '', openingBlurRegions: next.blurRegions })}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stage.members.slice(0, 4).map((person, index) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setEditing({ tier, index })}
                    className="overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-950/20 text-left"
                  >
                    <div className="relative aspect-video bg-black/70">
                      {person.imageUrl ? (
                        <img src={resolveMediaSrc(person.imageUrl)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] font-bold text-purple-200">대기 이미지 없음</div>
                      )}
                    </div>
                    <p className="truncate px-2 py-1.5 text-xs font-bold text-slate-200">{person.name || `심사위원 ${index + 1}`}</p>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                <label className="text-[11px] font-semibold text-slate-400">
                  만족도 min
                  <input className={fieldClassName} type="number" value={stage.satisfactionMin} onChange={(event) => updateTier(tier, { satisfactionMin: Number(event.target.value) || 0 })} />
                </label>
                <label className="text-[11px] font-semibold text-slate-400">
                  만족도 max
                  <input className={fieldClassName} type="number" value={stage.satisfactionMax} onChange={(event) => updateTier(tier, { satisfactionMax: Number(event.target.value) || 0 })} />
                </label>
                <label className="text-[11px] font-semibold text-slate-400">
                  철벽 min
                  <input className={fieldClassName} type="number" value={stage.ironWallMin} onChange={(event) => updateTier(tier, { ironWallMin: Number(event.target.value) || 0 })} />
                </label>
                <label className="text-[11px] font-semibold text-slate-400">
                  철벽 max
                  <input className={fieldClassName} type="number" value={stage.ironWallMax} onChange={(event) => updateTier(tier, { ironWallMax: Number(event.target.value) || 0 })} />
                </label>
                <label className="text-[11px] font-semibold text-slate-400">
                  압박 min
                  <input className={fieldClassName} type="number" value={stage.pressureMin} onChange={(event) => updateTier(tier, { pressureMin: Number(event.target.value) || 0 })} />
                </label>
                <label className="text-[11px] font-semibold text-slate-400">
                  압박 max
                  <input className={fieldClassName} type="number" value={stage.pressureMax} onChange={(event) => updateTier(tier, { pressureMax: Number(event.target.value) || 0 })} />
                </label>
              </div>
            </section>
          )
        })}
      </div>

      {editing && member ? createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true">
          <div className="game-panel max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-purple-500/40 bg-slate-950 p-6">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
              <h3 className="text-lg font-black text-slate-100">이미지 3장</h3>
              <button type="button" onClick={() => setEditing(null)} className="text-xs font-bold text-slate-400 hover:text-white">닫기 ✕</button>
            </div>
            <label className="mt-4 block text-[11px] font-semibold text-slate-400">
              이름
              <input className={fieldClassName} value={member.name} onChange={(event) => updateMember(editing.tier, editing.index, { name: event.target.value })} />
            </label>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MediaDropBox label="1. 대기" description="자기 차례가 아닐 때" slot={{ url: member.imageUrl, blurRegions: member.blurRegions ?? [] }} onUpdateSlot={(next) => updateMember(editing.tier, editing.index, { imageUrl: next.url || '', blurRegions: next.blurRegions })} />
              <MediaDropBox label="2. 중앙" description="자기 차례일 때" slot={{ url: member.centerImageUrl ?? '', blurRegions: member.centerBlurRegions ?? [] }} onUpdateSlot={(next) => updateMember(editing.tier, editing.index, { centerImageUrl: next.url || '', centerBlurRegions: next.blurRegions })} />
              <MediaDropBox label="3. 만족" description="만족한 뒤 사라지기 전" slot={{ url: member.satisfiedImageUrl ?? '', blurRegions: member.satisfiedBlurRegions ?? [] }} onUpdateSlot={(next) => updateMember(editing.tier, editing.index, { satisfiedImageUrl: next.url || '', satisfiedBlurRegions: next.blurRegions })} />
            </div>
            <div className="mt-6 flex justify-end border-t border-purple-500/20 pt-4">
              <button type="button" onClick={() => setEditing(null)} className="game-btn game-btn-primary rounded-xl px-5 py-2 text-xs font-bold">완료 및 닫기</button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
