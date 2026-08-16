import type { WeeklyStatement } from '../game/weeklyReport'
import { formatStatementWon } from '../game/weeklyReport'
import { formatMoneySigned } from '../game/money'
import { useTranslation } from '../locales/i18n'

type WeeklySettlementModalProps = {
  statement: WeeklyStatement
  onConfirm: () => void
}

function signedWon(amount: number) {
  return formatMoneySigned(amount)
}

export function WeeklySettlementModal({ statement, onConfirm }: WeeklySettlementModalProps) {
  const { t } = useTranslation()
  const change = statement.profitChangePct
  const changeLabel =
    change == null
      ? null
      : change > 0
        ? `▲ +${change}%`
        : change < 0
          ? `▼ ${change}%`
          : `━ 0%`
  const changeClass =
    change == null
      ? 'text-slate-500'
      : change > 0
        ? 'text-emerald-400'
        : change < 0
          ? 'text-rose-400'
          : 'text-slate-500'
  const netPositive = statement.netProfitWon >= 0
  const monthLabel = String(statement.monthNumber).padStart(2, '0')

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-settlement-title"
    >
      <div className="statement-sheet relative max-h-[min(92dvh,720px)] w-full max-w-lg overflow-auto rounded-2xl">
        <div className="statement-inner px-5 py-6 sm:px-7 sm:py-7">
          <header className="border-b border-white/8 pb-4">
            <p className="game-stat-label">
              MONTH {monthLabel} · CLOSING REPORT
            </p>
            <h2
              id="weekly-settlement-title"
              className="mt-1.5 text-xl font-bold tracking-tight text-slate-100"
            >
              {t('settlement.title')}
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              {statement.stationName}
              <span className="mx-1.5 text-slate-600">·</span>
              {statement.issuedDate}
              <span className="mx-1.5 text-slate-600">·</span>
              {statement.monthNumber}
              {t('settlement.monthSuffix')}
            </p>
          </header>

          <section className="statement-hero mt-5 rounded-xl px-4 py-4">
            <p className="game-stat-label">{t('settlement.netProfit')}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p
                className={`text-2xl font-black tabular-nums tracking-tight sm:text-3xl ${
                  netPositive ? 'text-amber-300' : 'text-rose-400'
                }`}
                style={
                  netPositive
                    ? { textShadow: '0 0 18px rgba(251, 191, 36, 0.35)' }
                    : undefined
                }
              >
                {signedWon(statement.netProfitWon)}
              </p>
              {changeLabel ? (
                <span className={`text-sm font-semibold tabular-nums ${changeClass}`}>
                  {changeLabel}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/8 pt-3 text-xs">
              <div className="flex items-baseline gap-2">
                <span className="text-slate-500">{t('settlement.totalRevenue')}</span>
                <span className="font-semibold tabular-nums text-emerald-300/90">
                  {formatStatementWon(statement.totalRevenueWon)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-slate-500">{t('settlement.totalExpense')}</span>
                <span className="font-semibold tabular-nums text-rose-300/90">
                  -{formatStatementWon(statement.totalExpenseWon)}
                </span>
              </div>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="game-stat-label">{t('settlement.revenueSection')}</h3>
            <ul className="mt-2 divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8 bg-black/20">
              {statement.lines.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-slate-500">
                  {t('settlement.noBroadcast')}
                </li>
              ) : (
                statement.lines.map((line) => (
                  <li
                    key={line.creatorId}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{line.name}</p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                        {line.broadcastHours}
                        {t('settlement.hoursUnit')}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-emerald-300/90">
                      {formatStatementWon(line.revenueWon)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="mt-5">
            <h3 className="game-stat-label">{t('settlement.expenseSection')}</h3>
            <ul className="mt-2 divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8 bg-black/20">
              {statement.expenses.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-slate-500">
                  {t('settlement.noExpense')}
                </li>
              ) : (
                statement.expenses.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{row.label}</p>
                      {row.detail ? (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{row.detail}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-rose-300/90">
                      -{formatStatementWon(row.amountWon)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="mt-5">
            <h3 className="game-stat-label">{t('settlement.highlightsSection')}</h3>
            <ul className="mt-2 space-y-1.5">
              {statement.highlights.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 rounded-lg border border-white/6 bg-black/15 px-2.5 py-2 text-xs leading-snug text-slate-300"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400/80" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-6 flex justify-center border-t border-white/8 pt-5">
            <button
              type="button"
              onClick={onConfirm}
              className="game-btn game-btn-primary min-w-[148px] px-6 py-2.5 text-sm"
            >
              {t('settlement.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
