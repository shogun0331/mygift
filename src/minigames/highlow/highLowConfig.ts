export type HighLowRoomId = 'local' | 'star' | 'legend'

export type Suit = 'spades' | 'hearts' | 'diams' | 'clubs'

export type CasinoItemType = 'peek_card' | 'double_payout' | 'loss_shield' | 'staff_hire'

export interface CasinoItem {
  id: string
  type: CasinoItemType
  name: string
  icon: string
  description: string
  badgeColor: string
}

export const CASINO_ITEMS_INFO: Record<CasinoItemType, Omit<CasinoItem, 'id'>> = {
  peek_card: {
    type: 'peek_card',
    name: '카드 엿보기',
    icon: '👁️',
    description: '플레이어 카드 숫자를 미리 투시합니다.',
    badgeColor: '#06b6d4',
  },
  double_payout: {
    type: 'double_payout',
    name: '배당 2배',
    icon: '⚡',
    description: '승리 시 수령금을 2배로 증폭합니다.',
    badgeColor: '#eab308',
  },
  loss_shield: {
    type: 'loss_shield',
    name: '패배 쉴드',
    icon: '🛡️',
    description: '패배 시 판돈 손실을 100% 방어합니다.',
    badgeColor: '#ec4899',
  },
  staff_hire: {
    type: 'staff_hire',
    name: '스태프 영입',
    icon: '🎩',
    description: '방송국 전용 스태프를 영입합니다.',
    badgeColor: '#a855f7',
  },
}

export interface Card {
  id: string
  suit: Suit
  value: number // 2 ~ 14 (2..10, J=11, Q=12, K=13, A=14)
}

export interface HighLowRoomConfig {
  id: HighLowRoomId
  name: string
  subtitle: string
  ante: number
  startChips: number
  dealerName: string
  dealerTitle: string
  dealerMediaUrl: string
  dealerMediaType: 'image' | 'video'
  badgeColor: string
  borderColor: string
  houseEdge: number // default 0.03 (3%)
  itemDropRate: number // 0 ~ 100 (%)
  maxComboLimit: number // 최대 콤보 제한 (1 ~ 10회)
}

export type HighLowConfigMap = Record<HighLowRoomId, HighLowRoomConfig>

export const DEFAULT_HIGH_LOW_CONFIG: HighLowConfigMap = {
  local: {
    id: 'local',
    name: '로컬 룸 (Local Room)',
    subtitle: '초보자를 위한 라이트 듀얼 테이블',
    ante: 500,
    startChips: 50000,
    dealerName: 'Rookie Dealer',
    dealerTitle: 'LOCAL DEALER',
    dealerMediaUrl: '',
    dealerMediaType: 'image',
    badgeColor: '#3b82f6',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    houseEdge: 0.03,
    itemDropRate: 40, // 40% 확률로 아이템 등장
    maxComboLimit: 3, // 최대 3콤보 (8배)
  },
  star: {
    id: 'star',
    name: '스타 룸 (Star Room)',
    subtitle: '하이 롤러를 위한 하이엔드 베팅 테이블',
    ante: 5000,
    startChips: 250000,
    dealerName: 'VIP Cyber',
    dealerTitle: 'STAR DEALER',
    dealerMediaUrl: '',
    dealerMediaType: 'image',
    badgeColor: '#a855f7',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    houseEdge: 0.03,
    itemDropRate: 60, // 60% 확률로 아이템 등장
    maxComboLimit: 5, // 최대 5콤보 (32배)
  },
  legend: {
    id: 'legend',
    name: '레전드 VIP 룸 (Legend VIP Room)',
    subtitle: '최상위 VIP 전용 다크 네온 듀얼 테이블',
    ante: 50000,
    startChips: 2000000,
    dealerName: 'KAIRO',
    dealerTitle: 'LEGEND DEALER',
    dealerMediaUrl: '',
    dealerMediaType: 'image',
    badgeColor: '#ec4899',
    borderColor: 'rgba(236, 72, 153, 0.4)',
    houseEdge: 0.03,
    itemDropRate: 80, // 80% 확률로 아이템 등장
    maxComboLimit: 7, // 최대 7콤보 (128배)
  },
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diams: '♦',
  clubs: '♣',
}

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#f43f5e',
  diams: '#f43f5e',
  spades: '#0f172a',
  clubs: '#0f172a',
}

/**
 * 트럼프 카드 서열 표기:
 * 2, 3, 4, 5, 6, 7 (LOW)
 * 8 (NEUTRAL CENTER)
 * 9, 10, J(11), Q(12), K(13), A(14 - MAX HIGH)
 */
export function getCardDisplayValue(val: number): string {
  if (val === 14 || val === 1) return 'A'
  if (val === 13) return 'K'
  if (val === 12) return 'Q'
  if (val === 11) return 'J'
  return String(val)
}

/**
 * 딜러 카드가 `dealerValue` (2~14) 일 때, HIGH / LOW 배당률 계산
 * V = 딜러 값 (2..14)
 * LOW 범주: 2..7 (6개)
 * NEUTRAL: 8 (중앙 기준점)
 * HIGH 범주: 9..14 (6개)
 *
 * HIGH 승리 조건: Player > V  (가능 수: 14 - V)
 * LOW 승리 조건: Player < V   (가능 수: V - 2)
 */
export function calculatePayout(
  dealerValue: number,
  choice: 'HIGH' | 'LOW' | 'TIE',
  houseEdge: number = 0.03
): number {
  if (choice === 'TIE') {
    return 50.0
  }

  const totalOtherCards = 12 // 14 - 2 = 12개 랭크 구분
  let winOddsCount = 0

  if (choice === 'HIGH') {
    winOddsCount = 14 - dealerValue
  } else {
    winOddsCount = dealerValue - 2
  }

  if (winOddsCount <= 0) { // 예: 14 (A)일 때 HIGH 선택, 2일 때 LOW 선택
    return 15.0 // 고배당 클램핑
  }

  const prob = winOddsCount / totalOtherCards
  const rawPayout = (1 / prob) * (1 - houseEdge)

  const clamped = Math.min(15.0, Math.max(1.05, rawPayout))
  return Math.round(clamped * 100) / 100
}

/** 52장 트럼프 덱 생성 (2 ~ 14 / A=14) */
export function createDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'diams', 'clubs']
  const deck: Card[] = []
  let id = 1

  for (const suit of suits) {
    for (let val = 2; val <= 14; val++) {
      deck.push({
        id: `card-${id++}`,
        suit,
        value: val,
      })
    }
  }

  return shuffleDeck(deck)
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
