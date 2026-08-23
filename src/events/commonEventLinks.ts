import type { CompanyTierId } from '../game/ranking'

type CommonEventSlot = {
  key: string
  label: string
  hint: string
  companyTier?: CompanyTierId
  rankFrom?: number
  rankTo?: number
}

/** 캐릭터에 묶이지 않는 공용 이벤트 슬롯 */
export const COMMON_EVENT_SLOTS = [
  {
    key: 'vipAppear',
    label: 'VIP 등장 이벤트',
    hint: 'VIP가 방송국을 찾아올 때',
  },
  {
    key: 'promoteTiny',
    label: '영세기업 승급심사',
    hint: '101위 ~ 150위',
    companyTier: 'tiny',
    rankFrom: 101,
    rankTo: 150,
  },
  {
    key: 'promoteSme',
    label: '중소기업 승급심사',
    hint: '51위 ~ 100위',
    companyTier: 'sme',
    rankFrom: 51,
    rankTo: 100,
  },
  {
    key: 'promoteMid',
    label: '중견기업 승급심사',
    hint: '21위 ~ 50위',
    companyTier: 'mid',
    rankFrom: 21,
    rankTo: 50,
  },
  {
    key: 'promoteLarge',
    label: '대기업 승급심사',
    hint: '11위 ~ 20위',
    companyTier: 'large',
    rankFrom: 11,
    rankTo: 20,
  },
  {
    key: 'promoteTop',
    label: '일등기업 승급심사',
    hint: '1위 ~ 10위',
    companyTier: 'top',
    rankFrom: 1,
    rankTo: 10,
  },
] as const satisfies ReadonlyArray<CommonEventSlot>

export type CommonEventSlotKey = (typeof COMMON_EVENT_SLOTS)[number]['key']

export type CommonEventLinks = Record<CommonEventSlotKey, string | null>

export function emptyCommonEventLinks(): CommonEventLinks {
  return {
    vipAppear: null,
    promoteTiny: null,
    promoteSme: null,
    promoteMid: null,
    promoteLarge: null,
    promoteTop: null,
  }
}

export function normalizeCommonEventLinks(raw: unknown): CommonEventLinks {
  const next = emptyCommonEventLinks()
  if (!raw || typeof raw !== 'object') return next
  const record = raw as Record<string, unknown>
  for (const slot of COMMON_EVENT_SLOTS) {
    const value = record[slot.key]
    next[slot.key] = typeof value === 'string' && value.trim() ? value.trim() : null
  }
  return next
}

export function commonEventIdOf(
  links: CommonEventLinks,
  key: CommonEventSlotKey,
): string | null {
  return links[key] ?? null
}
