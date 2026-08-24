import type { DayEvent } from './economy'
import { formatMoney } from './money'
import { getCurrentLocale, translate } from '../locales/i18n'

/** 연간 수익 누진 세율 구간 (USD, 구 원화÷1000) */
export const ANNUAL_TAX_BRACKETS = [
  { size: 500_000, rate: 0.05 }, // 0 ~ $500K (구 5억)
  { size: 500_000, rate: 0.1 }, // $500K ~ $1M
  { size: 1_000_000, rate: 0.15 }, // $1M ~ $2M
] as const

/** $2M 초과분도 최고 세율 15% 적용 */
const TOP_MARGINAL_RATE = 0.15

/**
 * 연간 수익 누진 과세
 * 예: $500K → $25K / $1M → $75K / $2M → $225K
 */
export function calcProgressiveAnnualTax(annualRevenueWon: number): number {
  let remaining = Math.max(0, Math.round(annualRevenueWon))
  if (remaining <= 0) return 0

  let tax = 0
  for (const band of ANNUAL_TAX_BRACKETS) {
    const taxable = Math.min(remaining, band.size)
    tax += taxable * band.rate
    remaining -= taxable
    if (remaining <= 0) break
  }
  if (remaining > 0) {
    tax += remaining * TOP_MARGINAL_RATE
  }
  return Math.round(tax)
}

export function isFebruaryCalendarMonth(date: Date) {
  return date.getMonth() === 1
}

export function isMarchCalendarMonth(date: Date) {
  return date.getMonth() === 2
}

/** 2월: 다음 달 과세 예정 안내 */
export function createTaxUpcomingEvent(taxYear: number, annualRevenueWon: number): DayEvent {
  const revenue = Math.max(0, Math.round(annualRevenueWon))
  return {
    id: `tax-upcoming-${taxYear}`,
    creatorId: '',
    creatorName: '',
    type: 'tax',
    amount: 0,
    text: translate(getCurrentLocale(), 'feed.taxUpcoming')
      .replace('{year}', String(taxYear))
      .replace('{amount}', () => formatMoney(revenue)),
    atMs: 0,
    tone: 'bg-amber-400',
  }
}
