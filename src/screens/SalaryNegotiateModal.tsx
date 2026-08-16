import { useTranslation } from '../locales/i18n'
import type { Grade } from '../game/characters'
import { formatMoney } from '../game/money'

type SalaryNegotiateModalProps = {
  creatorName: string
  previousGrade: Grade
  newGrade: Grade
  previousSalary: number
  proposedSalary: number
  onConfirm: () => void
}

function formatWon(value: number) {
  return formatMoney(value)
}

export function SalaryNegotiateModal({
  creatorName,
  previousGrade,
  newGrade,
  previousSalary,
  proposedSalary,
  onConfirm,
}: SalaryNegotiateModalProps) {
  const { t } = useTranslation()

  return (
    <div
      className="fixed inset-0 z-[86] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="salary-nego-title"
    >
      <div className="game-panel-strong w-full max-w-sm overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-amber-400/20 bg-gradient-to-br from-amber-500/12 via-transparent to-transparent px-6 pb-5 pt-6 text-center">
          <p className="game-stat-label text-amber-300/80">SALARY REVIEW</p>
          <h2
            id="salary-nego-title"
            className="mt-1.5 text-lg font-bold tracking-tight text-slate-100"
          >
            {t('creator.salaryNegoTitle')}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {creatorName}
            <span className="mx-1.5 text-slate-600">·</span>
            {previousGrade} → {newGrade}
          </p>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/25 px-3 py-2.5 text-sm">
            <span className="text-slate-500">{t('creator.salaryNegoPrevious')}</span>
            <span className="font-semibold tabular-nums text-slate-300">
              {formatWon(previousSalary)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-sm">
            <span className="text-amber-200/80">{t('creator.salaryNegoProposed')}</span>
            <span className="font-black tabular-nums text-amber-300">
              {formatWon(proposedSalary)}
            </span>
          </div>
          <p className="text-center text-[11px] leading-relaxed text-slate-500">
            {t('creator.salaryNegoBody')}
          </p>
        </div>

        <div className="flex justify-center border-t border-white/8 px-6 py-4">
          <button
            type="button"
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[140px] px-6 py-2.5 text-sm"
          >
            {t('creator.salaryNegoConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
