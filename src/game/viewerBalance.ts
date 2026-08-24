/**
 * 시청자 성장 밸런스 — station_grade_config.json 의 `balance` 섹션에서 관리.
 * (JSON 로드 → setViewerBalance → ranking.ts의 getViewerBalance가 읽음)
 * 순환 참조 방지를 위해 독립 모듈로 분리.
 */

export type ViewerBalance = {
  /** 소통 1당 시청자 기여 (로스터 잠재력 계수) */
  viewerPerCommPoint: number
  /** 방송 중 잠재력 방향 월 성장률 */
  viewerGrowthRate: number
  /** 잠재력 도달/초과 시 월 유기성장률 */
  viewerOrganicGrowthRate: number
  /** 무방송 월 이탈률 */
  idleViewerDecay: number
  /** 구독자 1명당 시청자 기여 */
  subscriberViewerRate: number
}

/** 기본값 — station_grade_config.json `balance` 섹션과 동일해야 함 */
export const DEFAULT_VIEWER_BALANCE: ViewerBalance = {
  viewerPerCommPoint: 20,
  viewerGrowthRate: 0.18,
  viewerOrganicGrowthRate: 0.1,
  idleViewerDecay: 0.04,
  subscriberViewerRate: 0.2,
}

let active: ViewerBalance = { ...DEFAULT_VIEWER_BALANCE }

function clampNum(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export function setViewerBalance(
  balance: Partial<ViewerBalance> | null | undefined,
): void {
  active = {
    viewerPerCommPoint: clampNum(
      balance?.viewerPerCommPoint,
      DEFAULT_VIEWER_BALANCE.viewerPerCommPoint,
    ),
    viewerGrowthRate: clampNum(balance?.viewerGrowthRate, DEFAULT_VIEWER_BALANCE.viewerGrowthRate),
    viewerOrganicGrowthRate: clampNum(
      balance?.viewerOrganicGrowthRate,
      DEFAULT_VIEWER_BALANCE.viewerOrganicGrowthRate,
    ),
    idleViewerDecay: clampNum(balance?.idleViewerDecay, DEFAULT_VIEWER_BALANCE.idleViewerDecay),
    subscriberViewerRate: clampNum(
      balance?.subscriberViewerRate,
      DEFAULT_VIEWER_BALANCE.subscriberViewerRate,
    ),
  }
}

export function getViewerBalance(): ViewerBalance {
  return active
}
