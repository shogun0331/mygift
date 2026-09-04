import type { StationGrade } from '../../game/stationGradeConfig'

export type SlotSymbolId =
  | 'cherry'
  | 'lemon'
  | 'grape'
  | 'bell'
  | 'star'
  | 'diamond'
  | 'seven'
  | 'scatter'
  | 'wild'

export type SlotSymbolDef = {
  id: SlotSymbolId
  name: string
  icon: string
  multiplier: number // 3개 매칭 시 배율
  weight: number // 릴 생성 출현 가중치
  isScatter?: boolean
  isWild?: boolean
}

export const SLOT_SYMBOLS: Record<SlotSymbolId, SlotSymbolDef> = {
  cherry: { id: 'cherry', name: '체리', icon: '🍒', multiplier: 2, weight: 28 },
  lemon: { id: 'lemon', name: '레몬', icon: '🍋', multiplier: 3, weight: 24 },
  grape: { id: 'grape', name: '포도', icon: '🍇', multiplier: 4, weight: 20 },
  bell: { id: 'bell', name: '벨', icon: '🔔', multiplier: 5, weight: 16 },
  star: { id: 'star', name: '별', icon: '⭐', multiplier: 8, weight: 12 },
  diamond: { id: 'diamond', name: '다이아', icon: '💎', multiplier: 12, weight: 8 },
  seven: { id: 'seven', name: '세븐', icon: '7️⃣', multiplier: 20, weight: 5 },
  scatter: { id: 'scatter', name: '스캐터', icon: '🎰', multiplier: 10, weight: 4, isScatter: true },
  wild: { id: 'wild', name: '와일드', icon: '🃏', multiplier: 15, weight: 3, isWild: true },
}

export const SLOT_SYMBOL_KEYS: SlotSymbolId[] = Object.keys(SLOT_SYMBOLS) as SlotSymbolId[]

/** 방송국 등급별 스핀당 베팅금액 매핑 */
export const STATION_BET_AMOUNTS: Record<StationGrade, number> = {
  black: 100,
  tiny: 500,
  sme: 2_000,
  mid: 10_000,
  large: 50_000,
  top: 200_000,
}

export function getBetAmountByGrade(grade?: StationGrade | null): number {
  if (!grade || !(grade in STATION_BET_AMOUNTS)) return STATION_BET_AMOUNTS.sme
  return STATION_BET_AMOUNTS[grade]
}

/** 5개 페이라인 조합 (3x3 grid: [row][col]) */
export type PaylineDef = {
  id: number
  name: string
  coords: [number, number][] // 3개 좌표 [row, col]
  color: string
}

export const PAYLINES: PaylineDef[] = [
  {
    id: 1,
    name: '중앙 가로줄',
    coords: [
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    color: '#f59e0b', // amber
  },
  {
    id: 2,
    name: '상단 가로줄',
    coords: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    color: '#3b82f6', // blue
  },
  {
    id: 3,
    name: '하단 가로줄',
    coords: [
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    color: '#10b981', // emerald
  },
  {
    id: 4,
    name: '대각선 (좌상→우하)',
    coords: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    color: '#a855f7', // purple
  },
  {
    id: 5,
    name: '대각선 (좌하→우상)',
    coords: [
      [2, 0],
      [1, 1],
      [0, 2],
    ],
    color: '#ec4899', // pink
  },
]

export type WinningLine = {
  payline: PaylineDef
  matchedSymbol: SlotSymbolDef
  payout: number
  isWildInvolved: boolean
}

export type SlotSpinResult = {
  grid: SlotSymbolId[][] // 3x3 (rows: 3, cols: 3)
  winningLines: WinningLine[]
  scatterCount: number
  isScatterWon: boolean
  scatterPayout: number
  freeSpinsAwarded: number
  isJackpot: boolean
  jackpotPayout: number
  totalWinAmount: number
}

/** 가중치 기반 무작위 심볼 뽑기 */
export function getRandomSlotSymbol(): SlotSymbolId {
  const totalWeight = SLOT_SYMBOL_KEYS.reduce(
    (sum, key) => sum + SLOT_SYMBOLS[key].weight,
    0,
  )
  let rand = Math.random() * totalWeight
  for (const key of SLOT_SYMBOL_KEYS) {
    const sym = SLOT_SYMBOLS[key]
    if (rand < sym.weight) return key
    rand -= sym.weight
  }
  return 'cherry'
}

/** 3x3 무작위 릴 그리드 생성 */
export function generateRandomSlotGrid(): SlotSymbolId[][] {
  return [
    [getRandomSlotSymbol(), getRandomSlotSymbol(), getRandomSlotSymbol()],
    [getRandomSlotSymbol(), getRandomSlotSymbol(), getRandomSlotSymbol()],
    [getRandomSlotSymbol(), getRandomSlotSymbol(), getRandomSlotSymbol()],
  ]
}

/** 3x3 릴 그리드 당첨 판정 함수 */
export function evaluateSlotSpin(grid: SlotSymbolId[][], betAmount: number): SlotSpinResult {
  const winningLines: WinningLine[] = []
  let totalWin = 0

  // 1. 5개 페이라인 판정
  for (const line of PAYLINES) {
    const [c0, c1, c2] = line.coords
    const sym0 = grid[c0[0]][c0[1]]
    const sym1 = grid[c1[0]][c1[1]]
    const sym2 = grid[c2[0]][c2[1]]

    // 스캐터는 페이라인 계산에서 제외
    if (sym0 === 'scatter' || sym1 === 'scatter' || sym2 === 'scatter') continue

    // 3개 심볼 매칭 여부 (Wild 조커 대체 포함)
    const symbols = [sym0, sym1, sym2]
    const nonWilds = symbols.filter((s) => s !== 'wild')

    let matchedSymbolId: SlotSymbolId | null = null
    let isWildInvolved = symbols.includes('wild')

    if (nonWilds.length === 0) {
      // 3개 모두 Wild
      matchedSymbolId = 'seven' // 최고 배율 적용
    } else if (nonWilds.every((s) => s === nonWilds[0])) {
      matchedSymbolId = nonWilds[0]
    }

    if (matchedSymbolId) {
      const def = SLOT_SYMBOLS[matchedSymbolId]
      const payout = Math.round(betAmount * def.multiplier)
      winningLines.push({
        payline: line,
        matchedSymbol: def,
        payout,
        isWildInvolved,
      })
      totalWin += payout
    }
  }

  // 2. 스캐터(🎰) 판정 (위치 상관없이 3개 이상)
  let scatterCount = 0
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (grid[r][c] === 'scatter') scatterCount += 1
    }
  }

  const isScatterWon = scatterCount >= 3
  const scatterPayout = isScatterWon ? Math.round(betAmount * SLOT_SYMBOLS.scatter.multiplier) : 0
  const freeSpinsAwarded = isScatterWon ? 3 : 0
  if (scatterPayout > 0) totalWin += scatterPayout

  // 3. 잭팟(Jackpot) 판정 (3x3 9개 칸 전체 동일 심볼 또는 Wild 조율)
  const flat = grid.flat()
  const nonWildFlat = flat.filter((s) => s !== 'wild' && s !== 'scatter')
  const isJackpot =
    nonWildFlat.length > 0 &&
    nonWildFlat.every((s) => s === nonWildFlat[0]) &&
    flat.every((s) => s !== 'scatter')

  const jackpotPayout = isJackpot ? Math.round(betAmount * 100) : 0
  if (jackpotPayout > 0) totalWin += jackpotPayout

  return {
    grid,
    winningLines,
    scatterCount,
    isScatterWon,
    scatterPayout,
    freeSpinsAwarded,
    isJackpot,
    jackpotPayout,
    totalWinAmount: totalWin,
  }
}
