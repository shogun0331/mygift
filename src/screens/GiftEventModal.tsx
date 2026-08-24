import { formatMoney } from '../game/money'
import type { GiftPending } from '../game/social'
import { GIFT_ACCEPT_VITALS, GIFT_SPEC_BY_GRADE } from '../game/social'
import { useTranslation } from '../locales/i18n'

function Face({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full border border-white/15 object-cover"
      />
    )
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20 text-sm font-black text-amber-100">
      {name.slice(0, 1)}
    </div>
  )
}

export function GiftOfferModal({
  pending,
  assets,
  onAccept,
  onReject,
}: {
  pending: GiftPending
  assets: number
  onAccept: () => void
  onReject: () => void
}) {
  const { t } = useTranslation()
  const spec = GIFT_SPEC_BY_GRADE[pending.grade]
  const canPay = assets >= pending.assetCost

  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-offer-title"
    >
      <div className="game-panel w-full max-w-md rounded-2xl border border-amber-400/30 px-5 py-6 shadow-[0_0_40px_rgba(251,191,36,0.16)]">
        <p className="game-stat-label text-amber-300/85">GIFT REQUEST</p>
        <h2 id="gift-offer-title" className="mt-1 text-xl font-black text-slate-100">
          {t('gift.offerTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {t('gift.offerBody').replace('{name}', pending.creatorName)}
        </p>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-3">
          <Face name={pending.creatorName} imageUrl={pending.profileImageUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-100">{pending.creatorName}</p>
            <p className="text-[11px] font-bold text-amber-300">
              {t('vip.gradeLabel').replace('{grade}', pending.grade)}
            </p>
          </div>
        </div>

        <section className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-950/30 px-3 py-3">
          <p className="text-[10px] font-black tracking-wide text-emerald-300/80">
            {t('gift.acceptHeader')}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold text-rose-100">
            {t('gift.acceptCost').replace('{price}', formatMoney(pending.assetCost))}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {t('gift.acceptCostRange').replace(
              '{range}',
              `${formatMoney(spec.costMin)} ~ ${formatMoney(spec.costMax)}`,
            )}
          </p>
          <p className="mt-1 text-[12px] font-semibold text-emerald-100">
            {t('gift.acceptVitals').replace(
              '{range}',
              `+${GIFT_ACCEPT_VITALS.min} ~ +${GIFT_ACCEPT_VITALS.max}`,
            )}
          </p>
        </section>

        <section className="mt-2.5 rounded-xl border border-rose-400/20 bg-rose-950/30 px-3 py-3">
          <p className="text-[10px] font-black tracking-wide text-rose-300/80">
            {t('gift.rejectHeader')}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold text-rose-100">{t('gift.rejectCondition')}</p>
        </section>

        {!canPay ? (
          <p className="mt-3 text-center text-[11px] text-rose-300">{t('gift.needAssets')}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={!canPay}
            onClick={onAccept}
            className="game-btn game-btn-primary min-w-[120px] px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('gift.accept')}
          </button>
          <button type="button" onClick={onReject} className="game-btn min-w-[120px] px-4 py-2.5 text-sm">
            {t('gift.reject')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function GiftResultModal({
  accepted,
  creatorName,
  assetCost,
  conditionDelta,
  staminaDelta,
  onConfirm,
}: {
  accepted: boolean
  creatorName: string
  assetCost: number
  conditionDelta: number
  staminaDelta: number
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-result-title"
    >
      <div
        className={`game-panel w-full max-w-md rounded-2xl px-5 py-6 ${
          accepted
            ? 'border border-emerald-400/25 shadow-[0_0_40px_rgba(52,211,153,0.14)]'
            : 'border border-rose-400/25 shadow-[0_0_40px_rgba(244,63,94,0.14)]'
        }`}
      >
        <p className="game-stat-label">{accepted ? 'GIFT SENT' : 'GIFT DECLINED'}</p>
        <h2 id="gift-result-title" className="mt-1 text-xl font-black text-slate-100">
          {accepted ? t('gift.resultAcceptTitle') : t('gift.resultRejectTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {accepted
            ? t('gift.resultAcceptBody').replace('{name}', creatorName)
            : t('gift.resultRejectBody').replace('{name}', creatorName)}
        </p>
        <div className="mt-4 space-y-1.5 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
          {accepted ? (
            <>
              <p className="text-[12px] font-semibold text-rose-200">
                {t('gift.resultCost').replace('{price}', formatMoney(assetCost))}
              </p>
              <p className="text-[12px] font-semibold text-emerald-200">
                {t('gift.resultCondition').replace('{n}', String(conditionDelta))}
              </p>
              <p className="text-[12px] font-semibold text-cyan-200">
                {t('gift.resultStamina').replace('{n}', String(staminaDelta))}
              </p>
            </>
          ) : (
            <p className="text-[12px] font-semibold text-rose-200">
              {t('gift.resultConditionDown').replace('{n}', String(conditionDelta))}
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[132px] px-4 py-2.5 text-sm"
          >
            {t('gift.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
