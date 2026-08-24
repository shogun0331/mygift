import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { OwnedCreator } from '../game/characters'
import { formatMoney } from '../game/money'
import {
  calcSnsPostCost,
  nextSnsPost,
  previewBulkSnsCompose,
  snsHeatProgress,
  type BulkSnsRevealEntry,
  type SnsHeat,
} from '../game/sns'
import { useTranslation } from '../locales/i18n'

type SnsBulkComposeModalProps = {
  creators: OwnedCreator[]
  assets: number
  onClose: () => void
  onCompose: (heat: SnsHeat) => BulkSnsRevealEntry[]
}

const HEATS: SnsHeat[] = [2, 3]

export function SnsBulkComposeModal({
  creators,
  assets,
  onClose,
  onCompose,
}: SnsBulkComposeModalProps) {
  const { t } = useTranslation()
  const [pickedHeat, setPickedHeat] = useState<SnsHeat>(2)

  const preview = useMemo(
    () => previewBulkSnsCompose(creators, pickedHeat),
    [creators, pickedHeat],
  )

  const totalCost = useMemo(() => {
    return preview.eligibleIds.reduce((sum, id) => {
      const creator = creators.find((c) => c.id === id)
      const postCount = (creator?.snsPosts ?? []).length
      return sum + calcSnsPostCost(pickedHeat, postCount)
    }, 0)
  }, [creators, preview.eligibleIds, pickedHeat])

  const canAfford = assets >= totalCost
  const canSubmit = preview.eligibleIds.length > 0 && canAfford

  const aggregateProgress = useMemo(() => {
    let used = 0
    let total = 0
    for (const creator of creators) {
      const row = snsHeatProgress(
        creator.snsPosts ?? [],
        creator.snsPublishedIds ?? [],
        pickedHeat,
        creator.snsPending?.postId,
      )
      used += row.used
      total += row.total
    }
    return { used, total }
  }, [creators, pickedHeat])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit() {
    if (!canSubmit) return
    const posted = onCompose(pickedHeat)
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

          <div className="mt-4 space-y-2">
            {HEATS.map((heat) => {
              const heatPreview = previewBulkSnsCompose(creators, heat)
              const heatTotalCost = heatPreview.eligibleIds.reduce((sum, id) => {
                const creator = creators.find((c) => c.id === id)
                const postCount = (creator?.snsPosts ?? []).length
                return sum + calcSnsPostCost(heat, postCount)
              }, 0)
              const hasStock = creators.some(
                (creator) =>
                  !creator.snsPending &&
                  nextSnsPost(creator.snsPosts ?? [], creator.snsPublishedIds ?? [], heat),
              )
              const selected = pickedHeat === heat
              return (
                <button
                  key={heat}
                  type="button"
                  disabled={!hasStock}
                  onClick={() => setPickedHeat(heat)}
                  className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition disabled:opacity-40 ${
                    selected
                      ? 'border-indigo-400/50 bg-indigo-500/15'
                      : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <span>
                    <span className="block text-[13px] font-semibold text-slate-100">
                      {t(`sns.heat${heat}`)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {t(`sns.heat${heat}Desc`)}
                    </span>
                    {!hasStock ? (
                      <span className="mt-1 block text-[11px] text-rose-300/80">{t('sns.noStock')}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[12px] font-black tabular-nums text-amber-300">
                      {formatMoney(heatTotalCost)}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold tabular-nums text-slate-400">
                      {t('sns.countUnit').replace('{count}', String(heatPreview.eligibleIds.length))}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 rounded-xl border border-white/8 bg-black/25 px-3 py-3 text-[12px] leading-5 text-slate-300">
            <p className="font-semibold text-slate-100">
              {t('sns.bulkComposeTarget').replace('{count}', String(preview.eligibleIds.length))}
            </p>
            {preview.skippedPending > 0 ? (
              <p className="mt-1 text-amber-300/90">
                {t('sns.bulkComposeSkippedPending').replace('{count}', String(preview.skippedPending))}
              </p>
            ) : null}
            {preview.skippedNoStock > 0 ? (
              <p className="mt-1 text-slate-500">
                {t('sns.bulkComposeSkippedNoStock').replace('{count}', String(preview.skippedNoStock))}
              </p>
            ) : null}
            <p className="mt-2 flex items-baseline justify-between gap-2 border-t border-white/8 pt-2">
              <span className="text-slate-400">{t('sns.bulkComposeTotalCost')}</span>
              <span className="text-base font-black tabular-nums text-amber-300">
                {formatMoney(totalCost)}
              </span>
            </p>
            {!canAfford && preview.eligibleIds.length > 0 ? (
              <p className="mt-1 text-right text-[11px] font-semibold text-rose-300">
                {t('sns.needAssets')}
              </p>
            ) : null}
            {preview.eligibleIds.length === 0 ? (
              <p className="mt-2 text-center text-[11px] text-slate-500">{t('sns.bulkComposeNone')}</p>
            ) : null}
            <p className="mt-2 text-right text-[10px] tabular-nums text-slate-500">
              {aggregateProgress.used}/{aggregateProgress.total}
            </p>
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
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
