import { stationGradeLabel, type StationReviewStatus } from '../game/station'
import { useTranslation } from '../locales/i18n'

type StationReviewModalProps = {
  promoted: boolean
  status: StationReviewStatus
  onConfirm: () => void
}

export function StationReviewModal({ promoted, status, onConfirm }: StationReviewModalProps) {
  const { t } = useTranslation()
  const maxed = status.next == null

  return (
    <div
      className="fixed inset-0 z-[86] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="station-review-title"
    >
      <div className="game-panel w-full max-w-md rounded-2xl border border-amber-400/25 px-5 py-6 shadow-[0_0_40px_rgba(245,158,11,0.18)]">
        <p className="game-stat-label">{t('station.reviewKicker')}</p>
        <h2 id="station-review-title" className="mt-1 text-xl font-black text-slate-100">
          {maxed
            ? t('station.reviewMax')
            : promoted
              ? t('station.reviewPass')
              : t('station.reviewFail')}
        </h2>
        <p className="mt-3 text-2xl font-black tabular-nums text-amber-200">
          {stationGradeLabel(status.current)}
          {promoted && status.next ? (
            <>
              <span className="mx-2 text-slate-500">→</span>
              {stationGradeLabel(status.next)}
            </>
          ) : null}
        </p>

        {!maxed ? (
          <ul className="mt-4 space-y-1.5">
            {status.checks.map((check) => (
              <li
                key={check.id}
                className={`rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${
                  check.met
                    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                }`}
              >
                <span className="mr-1">{check.met ? '[v]' : '[x]'}</span>
                {check.label} ({check.detail})
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-300">
            {t('station.reviewMaxBody')}
          </p>
        )}

        {promoted && status.next ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
            <p className="text-[10px] font-bold tracking-wide text-slate-500">
              {t('station.rewardTitle')}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-200">
              - {t(`station.rewardScout.${status.next}` as 'station.rewardScout.sme')}
            </p>
          </div>
        ) : null}

        {!promoted && !maxed ? (
          <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-400">
            {t('station.reviewFailBody')}
          </p>
        ) : null}

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[132px] px-4 py-2.5 text-sm"
          >
            {t('station.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
