import { useState } from 'react'
import { useTranslation } from '../locales/i18n'
import { formatMoney } from '../game/money'
import { formatPlaytime, type SaveMeta } from '../game/save'
import { deleteGame, listSaveMetas } from '../game/saveService'

type LoadGameModalProps = {
  onLoad: (id: string) => void
  onClose: () => void
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
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-game-title"
    >
      <div className="game-panel flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-indigo-400/25 px-5 py-6">
        <h2 id="load-game-title" className="text-xl font-black text-slate-100">
          {t('save.loadTitle')}
        </h2>

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
          {saves.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">{t('save.emptySaves')}</p>
          ) : (
            saves.map((save) => (
              <div
                key={save.id}
                className="group rounded-xl border border-white/10 bg-white/[0.05] p-3 transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => onLoad(save.id)}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-black text-slate-100">
                      {save.companyName}
                    </p>
                    <p className="shrink-0 text-[10px] font-bold text-slate-500">
                      {t('save.playtime')} {formatPlaytime(save.playtimeMs)}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {save.date} · {t('save.assets')} {formatMoney(save.assets)} ·{' '}
                    {t('save.viewers')} {save.viewers.toLocaleString('en-US')}
                    {t('ranking.viewersUnit')}
                  </p>
                </button>
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPendingDelete(save.id)}
                    className="rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300 transition hover:bg-rose-500/25"
                  >
                    {t('save.delete')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="game-btn rounded-full px-4 py-2 text-sm font-bold"
          >
            {t('save.cancel')}
          </button>
        </div>
      </div>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[96] flex items-center justify-center bg-black/80 p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="game-panel w-full max-w-xs rounded-2xl border border-rose-400/30 px-5 py-6 text-center">
            <p className="text-sm font-bold text-slate-100">{t('save.deleteConfirm')}</p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="game-btn rounded-full px-4 py-2 text-sm font-bold"
              >
                {t('save.cancel')}
              </button>
              <button
                type="button"
                onClick={() => remove(pendingDelete)}
                className="game-btn rounded-full border border-rose-400/40 bg-rose-600/20 px-4 py-2 text-sm font-bold text-rose-200 hover:bg-rose-600/40"
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
