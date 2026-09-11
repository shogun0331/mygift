import { useState } from 'react'
import { useTranslation } from '../locales/i18n'
import { formatMoney } from '../game/money'
import { formatPlaytime, type SaveMeta } from '../game/save'
import { deleteGame, listSaveMetas } from '../game/saveService'
import { playSfx } from '../game/uiSfx'
import type { StationGrade } from '../game/station'
import { companyTierLabelKey } from '../game/ranking'
import { characterDisplayName } from '../game/characterLocales'

type SaveListPanelProps = {
  onLoad: (id: string) => void
  onClose: () => void
  onSavesChange?: () => void
}

function stationGradeBadge(grade: StationGrade | undefined, label: string) {
  if (!grade) return null
  const icon =
    grade === 'top'
      ? '👑'
      : grade === 'large'
        ? '🏢'
        : grade === 'mid'
          ? '📡'
          : grade === 'sme'
            ? '🌱'
            : '📻'
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-slate-800/60 px-2 py-0.5 text-xs font-medium text-slate-300">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  )
}

export function SaveListPanel({ onLoad, onClose, onSavesChange }: SaveListPanelProps) {
  const { t, locale } = useTranslation()
  const [saves, setSaves] = useState<SaveMeta[]>(() => listSaveMetas())
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const remove = (id: string) => {
    playSfx('ui-click')
    deleteGame(id)
    setSaves(listSaveMetas())
    setPendingDelete(null)
    onSavesChange?.()
  }

  return (
    <div className="save-panel-slide-in relative z-20 flex flex-col h-[84vh] max-h-[720px] w-[clamp(480px,50vw,800px)] rounded-2xl border border-slate-800 bg-slate-950/95 p-6 backdrop-blur-xl shadow-2xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-white">
            {t('save.loadTitle') || '세이브 목록'}
          </h2>
          <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-mono text-slate-400">
            {saves.length} {t('save.savedCount') || '개 저장됨'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            playSfx('ui-click')
            onClose()
          }}
          className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Save Items List */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1.5 custom-scrollbar">
        {saves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-2xl text-slate-400">
              💾
            </div>
            <p className="mt-4 text-base font-medium text-slate-300">
              {t('save.emptySaves') || '저장된 세이브 데이터가 없습니다.'}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">
              NEW GAME으로 새로운 방송국을 시작해보세요.
            </p>
          </div>
        ) : (
          saves.map((save) => {
            const topChar = save.topCharacter
            const topCharName = topChar ? characterDisplayName(topChar, locale) : ''
            return (
              <div
                key={save.id}
                className="group relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-all duration-150 hover:border-slate-700 hover:bg-slate-900/80"
              >
                {/* Main Content Click Area */}
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-4 text-left outline-none cursor-pointer"
                  onClick={() => {
                    playSfx('ui-click')
                    onLoad(save.id)
                  }}
                >
                  {/* Avatar Frame */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950">
                    {topChar?.imageUrl ? (
                      <img
                        src={topChar.imageUrl}
                        alt={topCharName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-900 font-bold text-slate-400 text-lg">
                        {save.companyName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {topChar ? (
                      <span className="absolute bottom-1 right-1 font-bold text-[10px] px-1.5 py-0.5 leading-none rounded bg-black/80 text-white border border-slate-700 font-mono">
                        {topChar.grade}
                      </span>
                    ) : null}
                  </div>

                  {/* Info Details & Partitioned Grid */}
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Row 1: Station Name + Tier Badge + Star Creator Tag */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-bold text-white group-hover:text-slate-200">
                        {save.companyName}
                      </h3>
                      {save.stationGrade
                        ? stationGradeBadge(
                            save.stationGrade,
                            t(companyTierLabelKey(save.stationGrade)),
                          )
                        : null}
                      {topChar ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 text-xs text-slate-400">
                          ★ {topCharName}
                        </span>
                      ) : null}
                    </div>

                    {/* Row 2: Partitioned Metric Boxes */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {/* Box 1: Date */}
                      <div className="flex flex-col justify-center rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                          DATE
                        </span>
                        <span className="font-mono text-slate-300 truncate mt-0.5 flex items-center gap-1">
                          <span>📅</span>
                          <span>{save.date}</span>
                        </span>
                      </div>

                      {/* Box 2: Assets */}
                      <div className="flex flex-col justify-center rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                          ASSETS
                        </span>
                        <span className="font-mono text-slate-300 truncate mt-0.5 flex items-center gap-1">
                          <span>💰</span>
                          <span>{formatMoney(save.assets)}</span>
                        </span>
                      </div>

                      {/* Box 3: Viewers */}
                      <div className="flex flex-col justify-center rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                          VIEWERS
                        </span>
                        <span className="font-mono text-slate-300 truncate mt-0.5 flex items-center gap-1">
                          <span>👥</span>
                          <span>{save.viewers.toLocaleString('en-US')}{t('ranking.viewersUnit')}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Right Side: Playtime + Load & Delete Buttons */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 shrink-0 pt-2 sm:pt-0 sm:pl-3 border-t sm:border-t-0 sm:border-l border-slate-800/80">
                  {/* Playtime */}
                  <div className="inline-flex items-center gap-1 text-xs font-mono text-slate-400">
                    <span>⏱️</span>
                    <span>{formatPlaytime(save.playtimeMs)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSfx('ui-click')
                        onLoad(save.id)
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer shadow-sm"
                    >
                      <span>{t('save.loadAction') || '불러오기'}</span>
                      <span className="text-[9px]">▶</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        playSfx('ui-click')
                        setPendingDelete(save.id)
                      }}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all"
                      title={t('save.delete') || '삭제'}
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Delete Confirmation Alert Dialog */}
      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-100"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center space-y-4 shadow-2xl">
            <span className="text-3xl">⚠️</span>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
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
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
              >
                {t('save.cancel') || '취소'}
              </button>
              <button
                type="button"
                onClick={() => remove(pendingDelete)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
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
