import type { DatePending, DateStepKey } from '../game/social'
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
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-pink-400/40 bg-pink-500/20 text-sm font-black text-pink-100">
      {name.slice(0, 1)}
    </div>
  )
}

function titleKey(step: DateStepKey) {
  if (step === 'date1') return 'date.offerTitle1'
  if (step === 'date2') return 'date.offerTitle2'
  return 'date.offerTitleH'
}

export function DateOfferModal({
  pending,
  onStart,
}: {
  pending: DatePending
  onStart: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="date-offer-title"
    >
      <div className="game-panel w-full max-w-md rounded-2xl border border-pink-400/30 px-5 py-6 shadow-[0_0_40px_rgba(244,114,182,0.18)]">
        <p className="game-stat-label text-pink-300/85">DATE EVENT</p>
        <h2 id="date-offer-title" className="mt-1 text-xl font-black text-slate-100">
          {t(titleKey(pending.step))}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {t('date.offerBody').replace('{name}', pending.creatorName)}
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
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onStart}
            className="game-btn game-btn-primary min-w-[132px] px-4 py-2.5 text-sm"
          >
            {t('date.start')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DateResultModal({
  pending,
  onConfirm,
}: {
  pending: DatePending
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="date-result-title"
    >
      <div className="game-panel w-full max-w-md rounded-2xl border border-pink-400/25 px-5 py-6 shadow-[0_0_40px_rgba(244,114,182,0.14)]">
        <p className="game-stat-label">DATE COMPLETE</p>
        <h2 id="date-result-title" className="mt-1 text-xl font-black text-slate-100">
          {t('date.resultTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {t('date.resultBody').replace('{name}', pending.creatorName)}
        </p>
        {pending.step === 'h' && (
          <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-950/40 p-3 text-center">
            <p className="text-xs font-bold text-emerald-300">💖 체력 & 컨디션 100% 풀 회복!</p>
          </div>
        )}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[132px] px-4 py-2.5 text-sm"
          >
            {t('date.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
