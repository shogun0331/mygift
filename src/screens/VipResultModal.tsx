import { formatViewers } from '../game/ranking'
import { useTranslation } from '../locales/i18n'

export type VipResult =
  | {
      kind: 'accept'
      creatorName: string
      spGain: number
      staminaMaxLoss: number
    }
  | {
      kind: 'reject'
      creatorName: string
      viewerLoss: number
    }

type VipResultModalProps = {
  result: VipResult
  onConfirm: () => void
}

export function VipResultModal({ result, onConfirm }: VipResultModalProps) {
  const { t } = useTranslation()
  const accepted = result.kind === 'accept'

  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vip-result-title"
    >
      <div
        className={`game-panel w-full max-w-md rounded-2xl px-5 py-6 ${
          accepted
            ? 'border border-emerald-400/25 shadow-[0_0_40px_rgba(52,211,153,0.14)]'
            : 'border border-rose-400/25 shadow-[0_0_40px_rgba(244,63,94,0.14)]'
        }`}
      >
        <p className="game-stat-label">{accepted ? 'VIP MEETING' : 'VIP DECLINED'}</p>
        <h2 id="vip-result-title" className="mt-1 text-xl font-black text-slate-100">
          {accepted ? t('vip.resultAcceptTitle') : t('vip.resultRejectTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {accepted
            ? t('vip.resultAcceptBody').replace('{name}', result.creatorName)
            : t('vip.resultRejectBody')}
        </p>

        <div className="mt-4 space-y-1.5 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
          {accepted ? (
            <>
              <p className="text-[12px] font-semibold text-amber-200">
                {t('vip.resultSp').replace('{n}', String(result.spGain))}
              </p>
              <p className="text-[12px] font-semibold text-rose-200">
                {t('vip.resultStamina').replace('{n}', String(result.staminaMaxLoss))}
              </p>
            </>
          ) : (
            <p className="text-[12px] font-semibold text-rose-200">
              {t('vip.resultViewers').replace('{n}', formatViewers(result.viewerLoss))}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[132px] px-4 py-2.5 text-sm"
          >
            {t('vip.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
