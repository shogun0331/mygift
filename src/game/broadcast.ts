export type BroadcastPhase = 'prep' | 'live'

/** 게임 한 주 = 실시간 5초 (배속 적용) */
export const MS_PER_GAME_WEEK = 5000

/** 무배치(빈) 방송 한 주 = 실시간 1초 — 빠르게 스킵 */
export const MS_PER_EMPTY_BROADCAST_WEEK = 1000

/** 한 턴 = 한 달 = 4주 */
export const WEEKS_PER_MONTH = 4

/** 게임 시작일 — 9월 1일. 첫 등급 심사는 이듬해 1월 1일 */
export const GAME_EPOCH = new Date(2026, 8, 1)

/** 턴(월) 인덱스로 달력 날짜 — 항상 해당 월 1일 */
export function monthToCalendarDate(epoch: Date, monthIndex: number) {
  return new Date(epoch.getFullYear(), epoch.getMonth() + monthIndex, 1)
}
