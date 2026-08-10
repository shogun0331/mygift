import type { DayEvent } from './economy'

/** 연간 수익 누진 세율 구간 (원) */
export const ANNUAL_TAX_BRACKETS = [
  { size: 500_000_000, rate: 0.05 }, // 0 ~ 5억
  { size: 500_000_000, rate: 0.1 }, // 5억 ~ 10억
  { size: 1_000_000_000, rate: 0.15 }, // 10억 ~ 20억
] as const

/** 20억 초과분도 최고 세율 15% 적용 */
const TOP_MARGINAL_RATE = 0.15

function formatWon(amount: number) {
  return Math.max(0, Math.round(amount)).toLocaleString('ko-KR')
}

/**
 * 연간 수익 누진 과세
 * 예: 5억 → 2,500만 / 10억 → 7,500만 / 20억 → 2.25억
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
    text: `다음 달 연간 소득세 과세 예정 (${taxYear}년 누적 수익 ${formatWon(revenue)}원)`,
    atMs: 0,
    tone: 'bg-amber-400',
  }
}
