import {
  companyTierLabelKey,
  companyTierOf,
  formatViewers,
  type RankSettlementResult,
} from '../game/ranking'
import { useTranslation } from '../locales/i18n'

type RankChangeModalProps = {
  result: RankSettlementResult
  onConfirm: () => void
}

export function RankChangeModal({ result, onConfirm }: RankChangeModalProps) {
  const { t } = useTranslation()
  const up = result.rankChange > 0
  const down = result.rankChange < 0
  const title = result.heldByGate
    ? t('ranking.modalHeld')
    : up
      ? t('ranking.modalUp')
      : down
        ? t('ranking.modalDown')
        : t('ranking.modalStay')
  const changeLabel = up
    ? `▲ +${result.rankChange}`
    : down
      ? `▼ ${result.rankChange}`
      : '—'

  const rewardLines: string[] = []
  if (result.rewards.subscribersBonus > 0) {
    rewardLines.push(
      `${t('ranking.rewardSubs')} +${formatViewers(result.rewards.subscribersBonus)}${t('ranking.viewersUnit')}`,
    )
  }
  if (result.rewards.revenueBonusPercent > 0) {
    rewardLines.push(`${t('ranking.rewardRevenue')} +${result.rewards.revenueBonusPercent}%`)
  }
  if (result.rewards.specialEventUnlock) rewardLines.push(t('ranking.rewardHidden'))
  if (result.rewards.isGameClear) rewardLines.push(t('ranking.rewardClear'))

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rank-change-title"
    >
      <div className="game-panel w-full max-w-md rounded-2xl border border-amber-400/25 px-5 py-6 shadow-[0_0_40px_rgba(245,158,11,0.18)]">
        <p className="game-stat-label">LEAGUE SETTLEMENT</p>
        <h2 id="rank-change-title" className="mt-1 text-xl font-black text-slate-100">
          {title}
        </h2>
        <p className="mt-3 text-2xl font-black tabular-nums text-amber-200">
          {result.previousRank}
          {t('ranking.rankUnit')}
          <span className="mx-2 text-slate-500">→</span>
          {result.currentRank}
          {t('ranking.rankUnit')}
          <span
            className={`ml-2 text-base ${
              up ? 'text-emerald-400' : down ? 'text-rose-400' : 'text-slate-500'
            }`}
          >
            {changeLabel}
          </span>
        </p>
        <p className="mt-1 text-xs font-bold text-pink-200/90">
          {t(companyTierLabelKey(companyTierOf(result.previousRank).id))}
          {companyTierOf(result.previousRank).id !== companyTierOf(result.currentRank).id ? (
            <>
              <span className="mx-1.5 text-slate-500">→</span>
              {t(companyTierLabelKey(companyTierOf(result.currentRank).id))}
            </>
          ) : null}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          {formatViewers(result.viewers)}
          {t('ranking.viewersUnit')}
        </p>

        {result.heldByGate ? (
          <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-950/50 px-3 py-3 text-xs font-semibold leading-relaxed text-rose-100">
            {t('ranking.modalHeldBody').replace('{rank}', String(result.gatedFloor))}
          </div>
        ) : null}

        {result.newMilestones.length > 0 ? (
          <ul className="mt-4 space-y-1.5">
            {result.newMilestones.map((m) => (
              <li key={m} className="text-xs font-bold text-amber-200">
                {m}
                {t('ranking.rankUnit')} {t('ranking.milestoneReached')}
              </li>
            ))}
          </ul>
        ) : null}

        {rewardLines.length > 0 ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
            <p className="text-[10px] font-bold tracking-wide text-slate-500">
              {t('ranking.rewardTitle')}
            </p>
            {rewardLines.map((line) => (
              <p key={line} className="mt-1 text-[11px] font-semibold text-slate-200">
                - {line}
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[132px] px-4 py-2.5 text-sm"
          >
            {t('ranking.modalConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
