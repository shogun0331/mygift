import { formatMoney } from '../game/money'
import { useTranslation } from '../locales/i18n'
import { UiDialogBtn, UiDialogShell } from '../ui/UiDialogShell'

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
    <UiDialogShell
      labelledBy="unlock-slot-title"
      size="sm"
      tone="cyan"
      zClassName="z-[95]"
      onBackdropClick={onCancel}
    >
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-3xl font-black text-emerald-200">
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

      <div className="mt-5 flex justify-center gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="game-btn min-w-[108px] rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          {t('studio.unlockConfirmCancel')}
        </button>
        <UiDialogBtn
          disabled={!canAfford}
          onClick={onConfirm}
          className="min-w-[108px]"
        >
          {t('studio.unlockConfirmOk')}
        </UiDialogBtn>
      </div>
    </UiDialogShell>
  )
}
