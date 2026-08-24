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

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[4px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-slot-title"
      onClick={onCancel}
    >
      <div
        className="game-panel-strong relative w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-400/25 shadow-[0_0_48px_rgba(16,185,129,0.18),0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
        <div className="border-b border-emerald-400/15 bg-gradient-to-br from-emerald-500/18 via-cyan-500/5 to-transparent px-6 pb-5 pt-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-3xl font-black text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.35)]">
            ＋
          </div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-emerald-300/75 uppercase">
            STUDIO EXPAND
          </p>
          <h2
            id="unlock-slot-title"
            className="mt-1.5 text-xl font-black tracking-tight text-slate-50"
          >
            {t('studio.unlockConfirmTitle')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed font-semibold text-slate-300">
            {t('studio.unlockConfirmBody')}
          </p>
          <div className="mt-4 rounded-xl border border-emerald-400/25 bg-black/35 px-4 py-3">
            <p className="text-[10px] font-bold tracking-wide text-emerald-400/70 uppercase">
              {t('studio.unlockCostLabel')}
            </p>
            <p
              className={`mt-1 text-2xl font-black tabular-nums ${
                canAfford ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {formatMoney(price)}
            </p>
          </div>
          {!canAfford ? (
            <p className="mt-3 text-xs font-semibold text-rose-300">{t('studio.unlockNeedAssets')}</p>
          ) : null}
        </div>

        <div className="flex justify-center gap-2.5 px-6 py-5">
          <button
            type="button"
            onClick={onCancel}
            className="game-btn min-w-[108px] rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            {t('studio.unlockConfirmCancel')}
          </button>
          <button
            type="button"
            disabled={!canAfford}
            onClick={onConfirm}
            className="min-w-[108px] rounded-xl border border-emerald-400/45 bg-emerald-500/25 px-5 py-2.5 text-sm font-bold text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition hover:bg-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {t('studio.unlockConfirmOk')}
          </button>
        </div>
      </div>
    </div>
  )
}
