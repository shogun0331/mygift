import type { DayEvent } from './economy'
import { formatMoney } from './money'

export const STATION_NAME = '스타라이트 방송국'
/** 방송 1주 환산 시간 (기존 일×6시간 × 7일) */
export const HOURS_PER_BROADCAST_WEEK = 42

/** 슬롯 운영비 기본 (USD, 구 50만 원) — 해금 슬롯 n개면 base × 3^(n-1) */
export const SLOT_OP_COST_BASE = 500
/** 무배치(실제 방송자 0명) 월 — 운영비만 이 비율로 적용. 월급은 그대로 */
export const EMPTY_BROADCAST_OP_COST_RATE = 0.1

/**
 * 월 슬롯 운영비 = $500 × 3^(슬롯 수 - 1)
 * 1→$500, 2→$1.5K, 3→$4.5K, …
 */
export function calcMonthlySlotOperatingCost(slotCount: number): number {
  const n = Math.max(0, Math.min(6, Math.round(slotCount)))
  if (n <= 0) return 0
  return SLOT_OP_COST_BASE * 3 ** (n - 1)
}

export type WeeklyCreatorLine = {
  creatorId: string
  name: string
  broadcastHours: number
  revenueWon: number
}

export type SettlementExpenseLine = {
  id: string
  label: string
  detail?: string
  amountWon: number
}

export type WeeklyStatement = {
  /** 월차(턴) 번호 */
  monthNumber: number
  issuedDate: string
  stationName: string
  lines: WeeklyCreatorLine[]
  expenses: SettlementExpenseLine[]
  totalRevenueWon: number
  totalExpenseWon: number
  netProfitWon: number
  profitChangePct: number | null
  highlights: string[]
}

export type WeeklyCreatorAccum = {
  creatorId: string
  name: string
  weeksBroadcast: number
  revenueWon: number
}

export type SettlementCareExpense = {
  creatorId: string
  name: string
  amountWon: number
}

export type WeekAccumulator = {
  monthNumber: number
  byCreator: Map<string, WeeklyCreatorAccum>
  highlights: string[]
  totalRevenueWon: number
  /** 이번 달 컨디션 케어로 이미 지출한 금액(즉시 차감분) */
  careExpenses: SettlementCareExpense[]
}

export function createWeekAccumulator(monthNumber: number): WeekAccumulator {
  return {
    monthNumber,
    byCreator: new Map(),
    highlights: [],
    totalRevenueWon: 0,
    careExpenses: [],
  }
}

export function recordCareExpense(
  week: WeekAccumulator,
  line: SettlementCareExpense,
): WeekAccumulator {
  if (line.amountWon <= 0) return week
  return {
    ...week,
    careExpenses: [...week.careExpenses, line],
  }
}

function monthlySalaryFromAnnual(annualSalary: number) {
  return Math.max(0, Math.round(Number(annualSalary) / 12) || 0)
}

/** 월간 하이라이트용 후보 이벤트 선별 */
export function pickDayHighlights(events: DayEvent[]): string[] {
  const highlights: string[] = []
  const donations = events
    .filter((e) => e.type === 'donation' && e.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const top = donations[0]
  if (top && top.amount >= 1_000) {
    highlights.push(`${top.creatorName} 대형 후원! (${formatMoney(top.amount)})`)
  } else if (top && top.amount >= 500) {
    highlights.push(`${top.creatorName} 후원 화제! (${formatMoney(top.amount)})`)
  }

  for (const event of events) {
    if (event.type === 'popularity') {
      highlights.push(`${event.creatorName} 인기 폭발!`)
      break
    }
  }

  for (const event of events) {
    if (event.type === 'viewers') {
      highlights.push(`${event.creatorName} 시청자 급증!`)
      break
    }
  }

  return highlights
}

export function recordDayIntoWeek(
  week: WeekAccumulator,
  plans: Array<{ creatorId: string; creatorName: string; weekRevenueWon: number; events: DayEvent[] }>,
): WeekAccumulator {
  const byCreator = new Map(week.byCreator)
  let totalRevenueWon = week.totalRevenueWon
  const highlights = [...week.highlights]

  for (const plan of plans) {
    const prev = byCreator.get(plan.creatorId)
    byCreator.set(plan.creatorId, {
      creatorId: plan.creatorId,
      name: plan.creatorName,
      weeksBroadcast: (prev?.weeksBroadcast ?? 0) + 1,
      revenueWon: (prev?.revenueWon ?? 0) + plan.weekRevenueWon,
    })
    totalRevenueWon += plan.weekRevenueWon
  }

  for (const line of pickDayHighlights(plans.flatMap((p) => p.events))) {
    if (highlights.length >= 5) break
    if (!highlights.includes(line)) highlights.push(line)
  }

  return { ...week, byCreator, totalRevenueWon, highlights }
}

export function buildWeeklyStatement(opts: {
  week: WeekAccumulator
  issuedDate: string
  previousNetProfitWon: number | null
  stationName?: string
  /** 해금된 스튜디오 슬롯 수 — 운영비 */
  unlockedSlotCount: number
  /** 월급 지급 대상 (연봉 보유 크리에이터) */
  payroll: Array<{ id: string; name: string; salary: number }>
  /** 3월 연간 소득세 (없으면 0) */
  annualTaxWon?: number
  /** 과세 대상 연도 (3월 고정 이벤트일 때만) */
  taxYear?: number
  /** 해당 연도 연간 수익 (세금 산출 기준) */
  annualRevenueForTaxWon?: number
}): WeeklyStatement {
  const { week, issuedDate, previousNetProfitWon } = opts
  const lines = [...week.byCreator.values()]
    .map((row) => ({
      creatorId: row.creatorId,
      name: row.name,
      broadcastHours: row.weeksBroadcast * HOURS_PER_BROADCAST_WEEK,
      revenueWon: row.revenueWon,
    }))
    .sort((a, b) => b.revenueWon - a.revenueWon)

  const expenses: SettlementExpenseLine[] = []
  const slotCount = Math.max(0, Math.round(opts.unlockedSlotCount))
  const fullOpCost = calcMonthlySlotOperatingCost(slotCount)
  const emptyBroadcastMonth = week.byCreator.size === 0
  const opCost = emptyBroadcastMonth
    ? Math.round(fullOpCost * EMPTY_BROADCAST_OP_COST_RATE)
    : fullOpCost
  if (opCost > 0) {
    expenses.push({
      id: 'slot-ops',
      label: '스튜디오 운영비',
      detail: emptyBroadcastMonth
        ? `무배치 방송 (${Math.round(EMPTY_BROADCAST_OP_COST_RATE * 100)}%)`
        : undefined,
      amountWon: opCost,
    })
  }

  for (const creator of opts.payroll) {
    const monthly = monthlySalaryFromAnnual(creator.salary)
    if (monthly <= 0) continue
    expenses.push({
      id: `salary-${creator.id}`,
      label: `월급 (${creator.name})`,
      amountWon: monthly,
    })
  }

  for (const [index, care] of week.careExpenses.entries()) {
    if (care.amountWon <= 0) continue
    expenses.push({
      id: `care-${care.creatorId}-${index}`,
      label: `컨디션 케어 (${care.name})`,
      amountWon: care.amountWon,
    })
  }

  const annualTaxWon = Math.max(0, Math.round(opts.annualTaxWon ?? 0))
  const taxYear = opts.taxYear
  const annualRevenueForTaxWon = Math.max(0, Math.round(opts.annualRevenueForTaxWon ?? 0))
  const isMarchTaxEvent = taxYear != null
  if (isMarchTaxEvent && annualTaxWon > 0) {
    expenses.push({
      id: 'annual-tax',
      label: '세금 과세',
      detail: `${taxYear}년 연간 수익 ${formatStatementWon(annualRevenueForTaxWon)} 기준`,
      amountWon: annualTaxWon,
    })
  }

  const totalRevenueWon = week.totalRevenueWon
  const totalExpenseWon = expenses.reduce((sum, row) => sum + row.amountWon, 0)
  const netProfitWon = totalRevenueWon - totalExpenseWon

  let profitChangePct: number | null = null
  if (previousNetProfitWon != null && previousNetProfitWon !== 0 && lines.length > 0) {
    profitChangePct =
      Math.round(((netProfitWon - previousNetProfitWon) / Math.abs(previousNetProfitWon)) * 1000) /
      10
  }

  const highlights = [...week.highlights]
  const top = lines[0]
  if (top && !highlights.some((h) => h.includes(top.name))) {
    highlights.unshift(`${top.name} 월간 최고 수익!`)
  }
  if (isMarchTaxEvent) {
    highlights.unshift(
      annualTaxWon > 0
        ? `${taxYear}년 연간 소득세 과세 (−${formatStatementWon(annualTaxWon)})`
        : `${taxYear}년 연간 소득세 과세 (해당 없음)`,
    )
  }
  if (highlights.length === 0) {
    highlights.push('이번 달 특이 이벤트 없음')
  }

  return {
    monthNumber: week.monthNumber,
    issuedDate,
    stationName: opts.stationName ?? STATION_NAME,
    lines,
    expenses,
    totalRevenueWon,
    totalExpenseWon,
    netProfitWon,
    profitChangePct,
    highlights: highlights.slice(0, 8),
  }
}

export function formatStatementWon(amount: number) {
  return formatMoney(amount)
}
