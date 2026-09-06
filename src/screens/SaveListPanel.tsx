import { useState } from 'react'
import { useTranslation } from '../locales/i18n'
import { formatMoney } from '../game/money'
import { formatPlaytime, type SaveMeta } from '../game/save'
import { deleteGame, listSaveMetas } from '../game/saveService'
import { playSfx } from '../game/uiSfx'
import { STATION_TIER_LABEL, type StationGrade } from '../game/station'

type SaveListPanelProps = {
  onLoad: (id: string) => void
  onClose: () => void
}

function gradeBadgeClass(grade?: string) {
  if (grade === 'S') return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.8)] border border-amber-300'
  if (grade === 'A') return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_12px_rgba(217,70,239,0.8)] border border-pink-300'
  if (grade === 'B') return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.6)] border border-cyan-300'
  return 'bg-slate-700 text-slate-200 border border-slate-600'
}

function stationGradeBadge(grade?: StationGrade) {
  if (!grade) return null
  const label = STATION_TIER_LABEL[grade] || grade
  if (grade === 'top') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/60 bg-gradient-to-r from-amber-500/25 to-yellow-500/25 px-2.5 py-0.5 text-xs font-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] font-mono">
        👑 {label}
      </span>
    )
  }
  if (grade === 'large') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-purple-400/50 bg-purple-950/50 px-2.5 py-0.5 text-xs font-black text-purple-300 shadow-sm font-mono">
        🏢 {label}
      </span>
    )
  }
  if (grade === 'mid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-blue-400/40 bg-blue-950/40 px-2.5 py-0.5 text-xs font-bold text-cyan-300 font-mono">
        📡 {label}
      </span>
    )
  }
  if (grade === 'sme') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-bold text-emerald-300 font-mono">
        🌱 {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-slate-400 font-mono">
      📻 {label}
    </span>
  )
}

export function SaveListPanel({ onLoad, onClose }: SaveListPanelProps) {
  const { t } = useTranslation()
  const [saves, setSaves] = useState<SaveMeta[]>(() => listSaveMetas())
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const remove = (id: string) => {
    playSfx('ui-click')
    deleteGame(id)
    setSaves(listSaveMetas())
    setPendingDelete(null)
  }

  return (
    <div className="save-panel-slide-in relative z-20 flex flex-col h-[84vh] max-h-[720px] w-[clamp(440px,48vw,780px)] rounded-3xl border-2 border-indigo-500/40 bg-slate-950/95 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_0_90px_rgba(79,70,229,0.35)] select-none">
      {/* Background Cyber Scanlines & Ambient Radial Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-40 rounded-3xl" />
      <div className="pointer-events-none absolute -top-12 -left-12 h-48 w-48 rounded-full bg-indigo-500/15 blur-[60px]" />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-indigo-500/25 pb-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            <p className="text-[10px] font-mono font-black tracking-widest text-indigo-400 uppercase">
              ARCHIVED TRANSMISSIONS // SAVE DATA
            </p>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            {t('save.loadTitle') || '세이브 목록'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-indigo-400/30 bg-indigo-950/60 px-3.5 py-1.5 text-xs font-mono font-bold text-indigo-300 shadow-inner">
            {saves.length} {t('save.savedCount') || 'SLOTS SAVED'}
          </span>
          <button
            type="button"
            onClick={() => {
              playSfx('ui-click')
              onClose()
            }}
            className="h-9 w-9 rounded-xl flex items-center justify-center border border-slate-700/80 bg-slate-900 text-slate-400 hover:text-white hover:border-pink-500 hover:bg-pink-950/30 transition-all shadow-md"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Save Items Scrollable List */}
      <div className="mt-3 min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-2 custom-scrollbar">
        {saves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-3xl text-indigo-300">
              💾
            </div>
            <p className="mt-4 text-base font-bold text-slate-300">
              {t('save.emptySaves') || '저장된 세이브 데이터가 없습니다.'}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">
              NEW GAME으로 새로운 방송국을 시작해보세요.
            </p>
          </div>
        ) : (
          saves.map((save) => {
            const topChar = save.topCharacter
            return (
              <div
                key={save.id}
                className="group relative flex items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md transition-all duration-200 hover:border-indigo-400/80 hover:bg-gradient-to-r hover:from-slate-900/90 hover:via-indigo-950/60 hover:to-slate-900/90 hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:translate-x-1"
              >
                {/* Main Click Area */}
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-4 text-left outline-none cursor-pointer"
                  onClick={() => {
                    playSfx('ui-click')
                    onLoad(save.id)
                  }}
                >
                  {/* Top Character Avatar Frame */}
                  <div className="relative h-16 w-16 sm:h-18 sm:w-18 shrink-0 overflow-hidden rounded-2xl border-2 border-indigo-400/40 bg-slate-950 shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:border-indigo-300 transition-colors">
                    {topChar?.imageUrl ? (
                      <img
                        src={topChar.imageUrl}
                        alt={topChar.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-indigo-950/80 font-black text-indigo-300 text-xl">
                        {save.companyName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {topChar ? (
                      <span
                        className={`absolute bottom-1 right-1 font-black text-[10px] px-1.5 py-0.5 leading-none rounded-md ${gradeBadgeClass(topChar.grade)}`}
                      >
                        {topChar.grade}
                      </span>
                    ) : null}
                  </div>

                  {/* Info Details */}
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Title + Station Grade Badge + Star Creator Tag */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="truncate text-base sm:text-lg font-black tracking-wide text-white group-hover:text-indigo-200 transition-colors">
                        {save.companyName}
                      </h3>
                      {stationGradeBadge(save.stationGrade)}
                      {topChar ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-xs font-black text-amber-300 shadow-sm">
                          ★ {topChar.name}
                        </span>
                      ) : null}
                    </div>

                    {/* HUD Stats Row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/60 px-2.5 py-1 font-semibold text-slate-300 font-mono">
                        <span className="text-indigo-400">📅</span>
                        <span>{save.date}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/40 px-2.5 py-1 font-bold text-amber-300 font-mono shadow-sm">
                        <span>💰</span>
                        <span>{formatMoney(save.assets)}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-1 font-semibold text-indigo-200 font-mono">
                        <span className="text-pink-400">👥</span>
                        <span>{save.viewers.toLocaleString('en-US')}{t('ranking.viewersUnit')}</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Right Actions & Playtime */}
                <div className="flex shrink-0 flex-col items-end justify-between gap-3 pl-2">
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 font-mono">
                    <span className="text-teal-400">⏱️</span>
                    <span>{formatPlaytime(save.playtimeMs)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      playSfx('ui-click')
                      setPendingDelete(save.id)
                    }}
                    className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 text-xs font-bold text-rose-300 hover:border-rose-400 hover:bg-rose-600/30 hover:text-white transition-all shadow-sm"
                  >
                    {t('save.delete') || '삭제'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Delete Confirmation Alert Dialog */}
      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-150"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="game-panel w-full max-w-sm rounded-3xl border-2 border-rose-500/50 bg-slate-950 p-6 text-center shadow-[0_0_50px_rgba(244,63,94,0.35)] space-y-4">
            <span className="text-4xl">⚠️</span>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-100">
                {t('save.deleteConfirm') || '이 세이브 데이터를 삭제할까요?'}
              </h3>
              <p className="text-xs text-slate-400">
                삭제된 데이터는 영구적으로 복구할 수 없습니다.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  playSfx('ui-click')
                  setPendingDelete(null)
                }}
                className="game-btn rounded-xl px-5 py-2.5 text-xs font-bold text-slate-300 hover:text-white"
              >
                {t('save.cancel') || '취소'}
              </button>
              <button
                type="button"
                onClick={() => remove(pendingDelete)}
                className="game-btn rounded-xl border border-rose-500/50 bg-rose-600/40 px-5 py-2.5 text-xs font-bold text-rose-100 hover:bg-rose-600/70 shadow-[0_0_20px_rgba(225,29,72,0.4)]"
              >
                {t('save.delete') || '삭제'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
