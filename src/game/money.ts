/**
 * 게임 내 화폐 단위: USD ($)
 * 환산: 레거시 원화 ÷ 1000 (1000원 = $1)
 */

/** raw 스칼라 → USD (구 REVENUE_RAW_TO_WON=2000 ÷ 1000) */
export const REVENUE_RAW_TO_USD = 2

/** 금액 표시 — `$12,345` */
export function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

/** 부호 포함 — `+$1,234` / `-$1,234` */
export function formatMoneySigned(amount: number): string {
  const abs = formatMoney(Math.abs(amount))
  if (amount > 0) return `+${abs}`
  if (amount < 0) return `-${abs}`
  return abs
}

/** 압축 표기 — `$50K` / `$1.2M` */
export function formatMoneyCompact(amount: number): string {
  const v = Math.round(amount)
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    return `${sign}$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    return `${sign}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`
  }
  return `${sign}$${abs.toLocaleString('en-US')}`
}

/** 연봉 축약 — `$50K/yr` */
export function formatMoneyPerYear(amount: number): string {
  return `${formatMoneyCompact(amount)}/yr`
}

/**
 * 금액 반올림 (기본 $10 단위 — 구 1만 원)
 */
export function roundMoney(value: number, unit = 10): number {
  return Math.max(unit, Math.round(value / unit) * unit)
}
