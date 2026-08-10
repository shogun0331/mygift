import { formatMoney } from '../game/money'
import { useTranslation } from '../locales/i18n'

type UnlockSlotModalProps = {
  price: number
  canAfford: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function UnlockSlotModal({
  price,
  canAfford,
  onConfirm,
  onCancel,
}: UnlockSlotModalProps) {
  const { t } = useTranslation()
  const body = t('studio.unlockConfirmBody').replace('{price}', formatMoney(price))

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-slot-title"
    >
      <div className="game-panel-strong w-full max-w-sm overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-indigo-400/20 bg-gradient-to-br from-indigo-500/15 via-transparent to-transparent px-6 pb-5 pt-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-indigo-400/35 bg-indigo-500/15 text-2xl font-black text-indigo-200">
            ＋
          </div>
          <p className="game-stat-label text-indigo-300/80">STUDIO SLOT</p>
          <h2
            id="unlock-slot-title"
            className="mt-1.5 text-lg font-bold tracking-tight text-slate-100"
          >
            {t('studio.unlockConfirmTitle')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed font-semibold text-slate-200">{body}</p>
          {!canAfford ? (
            <p className="mt-2 text-xs font-semibold text-rose-300">{t('studio.unlockNeedAssets')}</p>
          ) : null}
        </div>

        <div className="flex justify-center gap-2 px-6 py-5">
          <button
            type="button"
            onClick={onCancel}
            className="game-btn min-w-[100px] px-5 py-2.5 text-sm"
          >
            {t('studio.unlockConfirmCancel')}
          </button>
          <button
            type="button"
            disabled={!canAfford}
            onClick={onConfirm}
            className="game-btn-pink min-w-[100px] px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('studio.unlockConfirmOk')}
          </button>
        </div>
      </div>
    </div>
  )
}
