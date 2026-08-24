import { useState } from 'react'
import { useTranslation } from '../locales/i18n'
import { formatMoney } from '../game/money'
import { formatPlaytime, type SaveMeta } from '../game/save'
import { deleteGame, listSaveMetas } from '../game/saveService'

type LoadGameModalProps = {
  onLoad: (id: string) => void
  onClose: () => void
}

function gradeClass(grade?: string) {
  if (grade === 'S') return 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
  if (grade === 'A') return 'bg-gradient-to-r from-purple-400 to-indigo-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.6)]'
  if (grade === 'B') return 'bg-gradient-to-r from-blue-400 to-cyan-500 text-slate-950'
  return 'bg-slate-700 text-slate-200'
}

export function LoadGameModal({ onLoad, onClose }: LoadGameModalProps) {
  const { t } = useTranslation()
  const [saves, setSaves] = useState<SaveMeta[]>(() => listSaveMetas())
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const remove = (id: string) => {
    deleteGame(id)
    setSaves(listSaveMetas())
    setPendingDelete(null)
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-game-title"
    >
      <div className="game-panel flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-indigo-500/30 bg-slate-950/90 p-5 sm:p-6 shadow-[0_0_50px_rgba(79,70,229,0.25)]">
        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3.5">
          <div>
            <p className="text-[11px] font-extrabold tracking-widest text-indigo-400 uppercase">
              SAVE DATA
            </p>
            <h2 id="load-game-title" className="mt-0.5 text-xl font-black tracking-tight text-slate-100 sm:text-2xl">
              {t('save.loadTitle')}
            </h2>
          </div>
          <span className="rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
            {saves.length} {t('save.savedCount') || '개 저장됨'}
          </span>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          {saves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl">💾</span>
              <p className="mt-3 text-sm font-bold text-slate-400">{t('save.emptySaves')}</p>
            </div>
          ) : (
            saves.map((save) => {
              const topChar = save.topCharacter
              return (
                <div
                  key={save.id}
                  className="group relative flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3.5 sm:p-4 backdrop-blur-sm transition-all hover:border-indigo-400/60 hover:bg-indigo-950/40 hover:shadow-[0_0_24px_rgba(99,102,241,0.25)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3.5 text-left outline-none"
                    onClick={() => onLoad(save.id)}
                  >
                    {/* Top Character Avatar / Icon Frame */}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-indigo-400/30 bg-slate-900 shadow-md">
                      {topChar?.imageUrl ? (
                        <img
                          src={topChar.imageUrl}
                          alt={topChar.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-indigo-950/80 font-black text-indigo-300 text-lg">
                          {save.companyName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      {topChar ? (
                        <span
                          className={`absolute bottom-0.5 right-0.5 font-black text-[9px] px-1 py-0.2 leading-none rounded ${gradeClass(topChar.grade)}`}
                        >
                          {topChar.grade}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-black tracking-wide text-slate-100 group-hover:text-indigo-300 transition-colors">
                          {save.companyName}
                        </p>
                        {topChar ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                            ★ {topChar.name}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">📅 {save.date}</span>
                        <span>·</span>
                        <span className="font-bold text-amber-300">💰 {formatMoney(save.assets)}</span>
                        <span>·</span>
                        <span className="font-semibold text-indigo-300">
                          👥 {save.viewers.toLocaleString('en-US')}{t('ranking.viewersUnit')}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span className="shrink-0 text-xs font-bold text-slate-400">
                      ⏱️ {formatPlaytime(save.playtimeMs)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(save.id)}
                      className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-500/25"
                    >
                      {t('save.delete')}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="mt-5 flex justify-end border-t border-white/10 pt-3.5">
          <button
            type="button"
            onClick={onClose}
            className="game-btn rounded-xl px-5 py-2 text-sm font-bold text-slate-300 hover:text-white"
          >
            {t('save.cancel')}
          </button>
        </div>
      </div>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[96] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="game-panel w-full max-w-xs rounded-2xl border border-rose-500/40 bg-slate-950 p-6 text-center shadow-[0_0_40px_rgba(244,63,94,0.3)]">
            <span className="text-3xl">⚠️</span>
            <p className="mt-2 text-sm font-bold text-slate-100">{t('save.deleteConfirm')}</p>
            <div className="mt-5 flex justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="game-btn rounded-xl px-4 py-2 text-xs font-bold"
              >
                {t('save.cancel')}
              </button>
              <button
                type="button"
                onClick={() => remove(pendingDelete)}
                className="game-btn rounded-xl border border-rose-500/50 bg-rose-600/30 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-600/60 shadow-[0_0_15px_rgba(225,29,72,0.4)]"
              >
                {t('save.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
