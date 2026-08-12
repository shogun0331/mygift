import { H_RETRY_BY_GRADE, type HRetryPending } from '../game/social'
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
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/20 text-sm font-black text-rose-100">
      {name.slice(0, 1)}
    </div>
  )
}

export function HRetryOfferModal({
  pending,
  onAccept,
  onReject,
}: {
  pending: HRetryPending
  onAccept: () => void
  onReject: () => void
}) {
  const { t } = useTranslation()
  const spec = H_RETRY_BY_GRADE[pending.grade]
  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hretry-offer-title"
    >
      <div className="game-panel w-full max-w-md rounded-2xl border border-rose-400/30 px-5 py-6 shadow-[0_0_40px_rgba(244,63,94,0.16)]">
        <p className="game-stat-label text-rose-300/85">H REQUEST</p>
        <h2 id="hretry-offer-title" className="mt-1 text-xl font-black text-slate-100">
          {t('hRetry.offerTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {t('hRetry.offerBody').replace('{name}', pending.creatorName)}
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
            {t('hRetry.acceptHeader')}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold text-amber-100">
            {t('hRetry.acceptSp').replace('{n}', String(spec.sp))}
          </p>
          <p className="mt-1 text-[12px] font-semibold text-rose-100">
            {t('hRetry.acceptStamina').replace('{n}', String(spec.staminaLoss))}
          </p>
        </section>
        <section className="mt-2.5 rounded-xl border border-rose-400/20 bg-rose-950/30 px-3 py-3">
          <p className="text-[10px] font-black tracking-wide text-rose-300/80">
            {t('hRetry.rejectHeader')}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold text-rose-100">{t('hRetry.rejectCondition')}</p>
        </section>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="game-btn game-btn-primary min-w-[120px] px-4 py-2.5 text-sm"
          >
            {t('hRetry.accept')}
          </button>
          <button type="button" onClick={onReject} className="game-btn min-w-[120px] px-4 py-2.5 text-sm">
            {t('hRetry.reject')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function HRetryResultModal({
  accepted,
  creatorName,
  spGain,
  staminaLoss,
  conditionLoss,
  onConfirm,
}: {
  accepted: boolean
  creatorName: string
  spGain: number
  staminaLoss: number
  conditionLoss: number
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hretry-result-title"
    >
      <div
        className={`game-panel w-full max-w-md rounded-2xl px-5 py-6 ${
          accepted
            ? 'border border-emerald-400/25 shadow-[0_0_40px_rgba(52,211,153,0.14)]'
            : 'border border-rose-400/25 shadow-[0_0_40px_rgba(244,63,94,0.14)]'
        }`}
      >
        <p className="game-stat-label">{accepted ? 'H REPLAY' : 'H DECLINED'}</p>
        <h2 id="hretry-result-title" className="mt-1 text-xl font-black text-slate-100">
          {accepted ? t('hRetry.resultAcceptTitle') : t('hRetry.resultRejectTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {accepted
            ? t('hRetry.resultAcceptBody').replace('{name}', creatorName)
            : t('hRetry.resultRejectBody').replace('{name}', creatorName)}
        </p>
        <div className="mt-4 space-y-1.5 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
          {accepted ? (
            <>
              <p className="text-[12px] font-semibold text-amber-200">
                {t('hRetry.resultSp').replace('{n}', String(spGain))}
              </p>
              <p className="text-[12px] font-semibold text-rose-200">
                {t('hRetry.resultStamina').replace('{n}', String(staminaLoss))}
              </p>
            </>
          ) : (
            <p className="text-[12px] font-semibold text-rose-200">
              {t('hRetry.resultCondition').replace('{n}', String(conditionLoss))}
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[132px] px-4 py-2.5 text-sm"
          >
            {t('hRetry.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
