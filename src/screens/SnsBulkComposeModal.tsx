import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { OwnedCreator } from '../game/characters'
import { formatMoney } from '../game/money'
import { planBulkSnsCompose, type BulkSnsRevealEntry } from '../game/sns'
import { useTranslation } from '../locales/i18n'

type SnsBulkComposeModalProps = {
  creators: OwnedCreator[]
  assets: number
  onClose: () => void
  onCompose: () => BulkSnsRevealEntry[]
}

export function SnsBulkComposeModal({
  creators,
  assets,
  onClose,
  onCompose,
}: SnsBulkComposeModalProps) {
  const { t } = useTranslation()

  const plan = useMemo(() => planBulkSnsCompose(creators, assets), [creators, assets])

  const canSubmit = plan.affordableIds.length > 0

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit() {
    if (!canSubmit) return
    const posted = onCompose()
    if (posted.length > 0) onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[4px]">
      <div
        role="dialog"
        aria-labelledby="sns-bulk-compose-title"
        className="game-panel flex max-h-[min(92dvh,40rem)] w-[min(92vw,28rem)] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div className="min-w-0">
            <p className="game-kicker">SNS</p>
            <h2 id="sns-bulk-compose-title" className="truncate text-base font-semibold text-slate-100">
              {t('sns.bulkComposeTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="game-btn shrink-0 rounded-lg px-3 py-1.5 text-xs"
          >
            {t('sns.close')}
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
          <p className="text-[12px] leading-5 text-slate-400">{t('sns.bulkComposeHint')}</p>

          <div className="mt-4 rounded-xl border border-white/8 bg-black/25 px-3 py-3 text-[12px] leading-5 text-slate-300">
            {plan.skippedNoFunds > 0 && plan.affordableIds.length > 0 ? (
              <p className="font-semibold text-amber-200">
                {t('sns.bulkComposeAffordableTarget')
                  .replace('{total}', String(plan.eligibleIds.length))
                  .replace('{count}', String(plan.affordableIds.length))}
              </p>
            ) : (
              <p className="font-semibold text-slate-100">
                {t('sns.bulkComposeTarget').replace('{count}', String(plan.eligibleIds.length))}
              </p>
            )}
            {plan.skippedPending > 0 ? (
              <p className="mt-1 text-slate-400">
                {t('sns.bulkComposeSkippedPending').replace('{count}', String(plan.skippedPending))}
              </p>
            ) : null}
            {plan.skippedNoStock > 0 ? (
              <p className="mt-1 text-slate-500">
                {t('sns.bulkComposeSkippedNoStock').replace('{count}', String(plan.skippedNoStock))}
              </p>
            ) : null}
            {plan.skippedNoFunds > 0 ? (
              <p className="mt-1 text-rose-300/90">
                {t('sns.bulkComposeSkippedNoFunds').replace('{count}', String(plan.skippedNoFunds))}
              </p>
            ) : null}
            <p className="mt-2 flex items-baseline justify-between gap-2 border-t border-white/8 pt-2">
              <span className="text-slate-400">{t('sns.bulkComposeTotalCost')}</span>
              <span className="text-base font-black tabular-nums text-amber-300">
                {formatMoney(plan.totalCost)}
              </span>
            </p>
            {plan.eligibleIds.length > 0 && plan.affordableIds.length === 0 ? (
              <p className="mt-1 text-right text-[11px] font-semibold text-rose-300">
                {t('sns.needAssets')}
              </p>
            ) : null}
            {plan.eligibleIds.length === 0 ? (
              <p className="mt-2 text-center text-[11px] text-slate-500">{t('sns.bulkComposeNone')}</p>
            ) : null}
          </div>
        </div>

        <footer className="flex shrink-0 gap-2 border-t border-white/8 px-4 py-3">
          <button type="button" onClick={onClose} className="game-btn flex-1 rounded-xl py-2.5 text-sm">
            {t('sns.cancel')}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="game-btn game-btn-primary flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-35"
          >
            {t('sns.bulkComposeConfirm')}
            <span className="ml-1.5 tabular-nums text-amber-200">{formatMoney(plan.totalCost)}</span>
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
