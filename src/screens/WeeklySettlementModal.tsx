import { useEffect, useState } from 'react'
import type { WeeklyStatement } from '../game/weeklyReport'
import { formatStatementWon } from '../game/weeklyReport'
import { formatViewers } from '../game/ranking'
import { formatMoneySigned } from '../game/money'
import { resolveMediaSrc } from '../game/mediaUrl'
import { useTranslation } from '../locales/i18n'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useCountTo(target: number, delayMs: number, durationMs = 720) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    setValue(0)
    let raf = 0
    let startedAt: number | null = null
    const wait = window.setTimeout(() => {
      const tick = (now: number) => {
        if (startedAt == null) startedAt = now
        const t = Math.min(1, (now - startedAt) / durationMs)
        const eased = 1 - (1 - t) ** 3
        setValue(Math.round(target * eased))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delayMs)
    return () => {
      window.clearTimeout(wait)
      cancelAnimationFrame(raf)
    }
  }, [target, delayMs, durationMs])
  return value
}

type WeeklySettlementModalProps = {
  statement: WeeklyStatement
  assetsAfter: number
  portraitByCreatorId?: Record<string, string>
  onConfirm: () => void
}

function signedWon(amount: number) {
  return formatMoneySigned(amount)
}

function amountClass(amount: number, kind: 'plain' | 'signed' = 'signed') {
  if (amount > 0) return 'statement-amt-pos'
  if (amount < 0) return 'statement-amt-neg'
  return kind === 'plain' ? 'text-slate-300' : 'text-slate-500'
}

function creatorInitial(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 1)
}

export function WeeklySettlementModal({
  statement,
  assetsAfter,
  portraitByCreatorId,
  onConfirm,
}: WeeklySettlementModalProps) {
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
        ? 'statement-amt-pos'
        : change < 0
          ? 'statement-amt-neg'
          : 'text-slate-500'
  const netPositive = statement.netProfitWon >= 0
  const monthLabel = String(statement.monthNumber).padStart(2, '0')
  const countedRevenue = useCountTo(statement.totalRevenueWon, 180)
  const countedNet = useCountTo(statement.netProfitWon, 420)
  const countedAssets = useCountTo(assetsAfter, 520)

  return (
    <div
      className="statement-overlay fixed inset-0 z-[80] flex bg-black/78 p-3 backdrop-blur-[4px] sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-settlement-title"
    >
      <div className="statement-sheet relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="statement-inner flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-7 sm:py-6">
          <header className="statement-header flex shrink-0 flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-white/8 pb-4">
            <div className="min-w-0">
              <p className="statement-gold-label">
                MONTH {monthLabel} · CLOSING REPORT
              </p>
              <h2
                id="weekly-settlement-title"
                className="mt-1.5 text-xl font-bold tracking-tight text-slate-100 sm:text-2xl"
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
            </div>
            <div className="ml-auto flex flex-wrap items-end justify-end gap-x-8 gap-y-3 text-right">
              <div>
                <p className="game-stat-label">{t('settlement.viewersGained')}</p>
                <p
                  className={`mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${
                    statement.viewersGained > 0
                      ? 'statement-amt-pos'
                      : statement.viewersGained < 0
                        ? 'statement-amt-neg'
                        : 'text-slate-100'
                  }`}
                >
                  {statement.viewersGained > 0 ? '+' : statement.viewersGained < 0 ? '−' : ''}
                  {Math.abs(Math.round(statement.viewersGained)).toLocaleString('en-US')}
                  {t('settlement.viewersUnit')}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('settlement.viewersHeld')} {formatViewers(statement.viewersAfter)}
                  {t('settlement.viewersUnit')}
                </p>
              </div>
              <div>
                <p className="game-stat-label">{t('settlement.totalRevenue')}</p>
                <p className="statement-amt-pos mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl">
                  {formatStatementWon(countedRevenue)}
                </p>
              </div>
            </div>
          </header>

          <div className="mt-4 min-h-0 flex-1 overflow-auto">
            <table className="statement-table w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="w-10">{t('settlement.colRank')}</th>
                  <th>{t('settlement.colCreator')}</th>
                  <th className="text-right">{t('settlement.colHours')}</th>
                  <th className="text-right">{t('settlement.colViewers')}</th>
                  <th className="text-right">{t('settlement.colRevenue')}</th>
                  <th className="text-right">{t('settlement.colLabor')}</th>
                  <th className="text-right">{t('settlement.colProfit')}</th>
                </tr>
              </thead>
              <tbody>
                {statement.lines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                      {t('settlement.noBroadcast')}
                    </td>
                  </tr>
                ) : (
                  statement.lines.map((line, index) => {
                    const laborWon = line.salaryWon + line.careWon
                    const portrait = portraitByCreatorId?.[line.creatorId]
                    const portraitSrc = portrait ? resolveMediaSrc(portrait) : ''
                    const isTop = index === 0
                    return (
                      <tr
                        key={line.creatorId}
                        className={isTop ? 'statement-row-top' : undefined}
                      >
                        <td className="tabular-nums text-slate-500">{index + 1}</td>
                        <td>
                          <div className="flex min-w-0 items-center gap-2.5">
                            {portraitSrc ? (
                              <img
                                src={portraitSrc}
                                alt=""
                                className="statement-portrait"
                              />
                            ) : (
                              <span className="statement-portrait-fallback" aria-hidden>
                                {creatorInitial(line.name)}
                              </span>
                            )}
                            <span className="truncate font-medium text-slate-100">
                              {line.name}
                            </span>
                          </div>
                        </td>
                        <td className="tabular-nums text-slate-400">
                          {line.broadcastHours}
                          {t('settlement.hoursUnit')}
                        </td>
                        <td
                          className={`tabular-nums ${
                            line.viewersGained > 0
                              ? 'statement-amt-pos'
                              : line.viewersGained < 0
                                ? 'statement-amt-neg'
                                : 'text-slate-500'
                          }`}
                        >
                          {line.viewersGained > 0 ? '+' : line.viewersGained < 0 ? '−' : ''}
                          {Math.abs(Math.round(line.viewersGained)).toLocaleString('en-US')}
                          {t('settlement.viewersUnit')}
                        </td>
                        <td className={`tabular-nums ${amountClass(line.revenueWon, 'plain')}`}>
                          {formatStatementWon(line.revenueWon)}
                        </td>
                        <td className="tabular-nums">
                          <span className={laborWon > 0 ? 'statement-amt-neg' : 'text-slate-500'}>
                            {laborWon > 0
                              ? `-${formatStatementWon(laborWon)}`
                              : formatStatementWon(0)}
                          </span>
                          {line.careWon > 0 ? (
                            <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                              {t('settlement.laborCareHint')}
                            </span>
                          ) : null}
                        </td>
                        <td className={`tabular-nums font-semibold ${amountClass(line.profitWon)}`}>
                          {signedWon(line.profitWon)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {statement.highlights.length > 0 ? (
              <section className="statement-highlights">
                <h3 className="game-stat-label">{t('settlement.highlightsSection')}</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {statement.highlights.map((line) => (
                    <li key={line} className="statement-chip">
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <footer className="statement-footer mt-4 shrink-0 border-t border-white/8 pt-4">
            {statement.expenses.length > 0 ? (
              <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
                <span className="game-stat-label">{t('settlement.miscExpenses')}</span>
                {statement.expenses.map((row) => (
                  <span key={row.id} className="text-slate-400">
                    {row.label}
                    {row.detail ? (
                      <span className="text-slate-600"> ({row.detail})</span>
                    ) : null}
                    <span className="statement-amt-neg ml-1.5 font-semibold tabular-nums">
                      -{formatStatementWon(row.amountWon)}
                    </span>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <p className="game-stat-label">{t('settlement.netProfit')}</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p
                      className={`text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${
                        netPositive ? 'statement-amt-pos' : 'statement-amt-neg'
                      }`}
                    >
                      {signedWon(countedNet)}
                    </p>
                    {changeLabel ? (
                      <span className={`text-sm font-semibold tabular-nums ${changeClass}`}>
                        {changeLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div>
                  <p className="game-stat-label">{t('settlement.funds')}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-slate-100 sm:text-2xl">
                    {formatStatementWon(countedAssets)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onConfirm}
                className="game-btn game-btn-primary min-w-[148px] px-6 py-2.5 text-sm"
              >
                {t('settlement.confirm')}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
