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

export const DEFAULT_SLOT_SYMBOLS: Record<SlotSymbolId, SlotSymbolDef> = {
  cherry: { id: 'cherry', name: '체리', icon: '🍒', multiplier: 2, weight: 28 },
  lemon: { id: 'lemon', name: '레몬', icon: '🍋', multiplier: 3, weight: 24 },
  grape: { id: 'grape', name: '포도', icon: '🍇', multiplier: 4, weight: 20 },
  bell: { id: 'bell', name: '벨', icon: '🔔', multiplier: 5, weight: 16 },
  star: { id: 'star', name: '별', icon: '⭐', multiplier: 8, weight: 12 },
  diamond: { id: 'diamond', name: '다이아', icon: '💎', multiplier: 12, weight: 8 },
  seven: { id: 'seven', name: '세븐', icon: '✨7️⃣✨', multiplier: 20, weight: 5 },
  scatter: { id: 'scatter', name: '스캐터', icon: '🎰', multiplier: 10, weight: 4, isScatter: true },
  wild: { id: 'wild', name: '와일드', icon: '🃏', multiplier: 15, weight: 3, isWild: true },
}

export const SLOT_SYMBOLS = DEFAULT_SLOT_SYMBOLS
export const SLOT_SYMBOL_KEYS: SlotSymbolId[] = Object.keys(DEFAULT_SLOT_SYMBOLS) as SlotSymbolId[]

/** 방송국 등급별 스핀당 베팅금액 매핑 */
export const DEFAULT_STATION_BET_AMOUNTS: Record<StationGrade, number> = {
  black: 100,
  tiny: 500,
  sme: 2_000,
  mid: 10_000,
  large: 50_000,
  top: 200_000,
}

export const STATION_BET_AMOUNTS = DEFAULT_STATION_BET_AMOUNTS

export type SlotMachineConfig = {
  winRate: number // 기본 당첨 확률 (%) - 기본 45% (기존엔 ~12%)
  bigWinShare: number // 당첨 중 빅윈(3라인이상/고배율) 당첨 비중 (%)
  scatterShare: number // 당첨 중 스캐터 3개(프리스핀) 당첨 비중 (%)
  jackpotShare: number // 당첨 중 3x3 올잭팟 당첨 비중 (%)
  symbols: Record<SlotSymbolId, SlotSymbolDef>
  stationBetAmounts: Record<StationGrade, number>
}

export const DEFAULT_SLOT_CONFIG: SlotMachineConfig = {
  winRate: 45, // 기존 ~12%에서 45%로 당첨 확률 대폭 향상!
  bigWinShare: 25,
  scatterShare: 10,
  jackpotShare: 5,
  symbols: { ...DEFAULT_SLOT_SYMBOLS },
  stationBetAmounts: { ...DEFAULT_STATION_BET_AMOUNTS },
}

const STORAGE_KEY = 'broadcast_slot_machine_config'

export function loadSlotConfig(): SlotMachineConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SLOT_CONFIG
    const parsed = JSON.parse(raw) as Partial<SlotMachineConfig>
    return {
      winRate: typeof parsed.winRate === 'number' ? parsed.winRate : DEFAULT_SLOT_CONFIG.winRate,
      bigWinShare: typeof parsed.bigWinShare === 'number' ? parsed.bigWinShare : DEFAULT_SLOT_CONFIG.bigWinShare,
      scatterShare: typeof parsed.scatterShare === 'number' ? parsed.scatterShare : DEFAULT_SLOT_CONFIG.scatterShare,
      jackpotShare: typeof parsed.jackpotShare === 'number' ? parsed.jackpotShare : DEFAULT_SLOT_CONFIG.jackpotShare,
      symbols: { ...DEFAULT_SLOT_CONFIG.symbols, ...(parsed.symbols ?? {}) },
      stationBetAmounts: { ...DEFAULT_SLOT_CONFIG.stationBetAmounts, ...(parsed.stationBetAmounts ?? {}) },
    }
  } catch (e) {
    console.error('Failed to load slot config:', e)
    return DEFAULT_SLOT_CONFIG
  }
}

export function saveSlotConfig(config: SlotMachineConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('Failed to save slot config:', e)
  }
}

export function resetSlotConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('Failed to reset slot config:', e)
  }
}

export function getBetAmountByGrade(grade?: StationGrade | null, config?: SlotMachineConfig): number {
  const conf = config ?? loadSlotConfig()
  const bets = conf.stationBetAmounts ?? DEFAULT_STATION_BET_AMOUNTS
  if (!grade || !(grade in bets)) return bets.sme ?? 2_000
  return bets[grade]
}

/** 8개 페이라인 조합 (3x3 grid: [row][col]) */
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
  {
    id: 6,
    name: '좌측 세로줄',
    coords: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    color: '#06b6d4', // cyan
  },
  {
    id: 7,
    name: '중앙 세로줄',
    coords: [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    color: '#f97316', // orange
  },
  {
    id: 8,
    name: '우측 세로줄',
    coords: [
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    color: '#84cc16', // lime
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
export function getRandomSlotSymbol(config?: SlotMachineConfig): SlotSymbolId {
  const conf = config ?? loadSlotConfig()
  const symbols = conf.symbols ?? DEFAULT_SLOT_SYMBOLS
  const totalWeight = SLOT_SYMBOL_KEYS.reduce(
    (sum, key) => sum + (symbols[key]?.weight ?? 10),
    0,
  )
  let rand = Math.random() * totalWeight
  for (const key of SLOT_SYMBOL_KEYS) {
    const w = symbols[key]?.weight ?? 10
    if (rand < w) return key
    rand -= w
  }
  return 'cherry'
}

/** 3x3 무작위 릴 그리드 생성 */
export function generateRandomSlotGrid(config?: SlotMachineConfig): SlotSymbolId[][] {
  return [
    [getRandomSlotSymbol(config), getRandomSlotSymbol(config), getRandomSlotSymbol(config)],
    [getRandomSlotSymbol(config), getRandomSlotSymbol(config), getRandomSlotSymbol(config)],
    [getRandomSlotSymbol(config), getRandomSlotSymbol(config), getRandomSlotSymbol(config)],
  ]
}

/** 확률 조작 반영 Smart Slot Grid 생성기 */
export function generateSmartSlotGrid(config?: SlotMachineConfig): SlotSymbolId[][] {
  const conf = config ?? loadSlotConfig()
  const isWinRoll = Math.random() * 100 < conf.winRate

  if (!isWinRoll) {
    // 꽝 (Loss Roll): 당첨금이 0이 되는 그리드 생성
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const grid = generateRandomSlotGrid(conf)
      const res = evaluateSlotSpin(grid, 100, conf)
      if (res.totalWinAmount === 0) return grid
    }
    const grid = generateRandomSlotGrid(conf)
    grid[1][1] = grid[1][1] === 'cherry' ? 'lemon' : 'cherry'
    return grid
  }

  // 당첨 (Win Roll): 세부 당첨 유형 선택 (Jackpot, Scatter, BigWin, NormalWin)
  const rollWin = Math.random() * 100
  const jShare = conf.jackpotShare
  const sShare = conf.scatterShare
  const bShare = conf.bigWinShare

  if (rollWin < jShare) {
    // 👑 잭팟 (3x3 올 세븐/와일드)
    const jackSym: SlotSymbolId = Math.random() < 0.5 ? 'seven' : 'wild'
    return [
      [jackSym, jackSym, jackSym],
      [jackSym, jackSym, jackSym],
      [jackSym, jackSym, jackSym],
    ]
  }

  if (rollWin < jShare + sShare) {
    // 🎰 스캐터 프리스핀 (3개 🎰 스캐터 배치)
    const grid = generateRandomSlotGrid(conf)
    const allPositions: [number, number][] = [
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2],
    ]
    const shuffled = [...allPositions].sort(() => Math.random() - 0.5)
    for (let i = 0; i < 3; i += 1) {
      const pos = shuffled[i]
      if (pos) {
        grid[pos[0]][pos[1]] = 'scatter'
      }
    }
    return grid
  }

  if (rollWin < jShare + sShare + bShare) {
    // ⭐ 빅 윈 (다중 라인/고배율)
    const bigSymbols: SlotSymbolId[] = ['seven', 'diamond', 'star', 'wild']
    const pickSym = bigSymbols[Math.floor(Math.random() * bigSymbols.length)] ?? 'seven'
    const grid = generateRandomSlotGrid(conf)
    grid[0] = [pickSym, pickSym, pickSym]
    grid[1] = [pickSym, pickSym, pickSym]
    return grid
  }

  // 🍒 일반 당첨 (1개 라인 3개 심볼 매칭)
  const normalSymbols: SlotSymbolId[] = ['cherry', 'lemon', 'grape', 'bell', 'star', 'wild']
  const pickSym = normalSymbols[Math.floor(Math.random() * normalSymbols.length)] ?? 'cherry'
  const grid = generateRandomSlotGrid(conf)
  const targetLineIdx = Math.floor(Math.random() * 3)
  grid[targetLineIdx] = [pickSym, pickSym, pickSym]

  return grid
}

/** 3x3 릴 그리드 당첨 판정 함수 */
export function evaluateSlotSpin(
  grid: SlotSymbolId[][],
  betAmount: number,
  config?: SlotMachineConfig,
): SlotSpinResult {
  const conf = config ?? loadSlotConfig()
  const symbols = conf.symbols ?? DEFAULT_SLOT_SYMBOLS
  const winningLines: WinningLine[] = []
  let totalWin = 0

  // 1. 8개 페이라인 판정
  for (const line of PAYLINES) {
    const [c0, c1, c2] = line.coords
    const sym0 = grid[c0[0]][c0[1]]
    const sym1 = grid[c1[0]][c1[1]]
    const sym2 = grid[c2[0]][c2[1]]

    // 스캐터는 페이라인 계산에서 제외
    if (sym0 === 'scatter' || sym1 === 'scatter' || sym2 === 'scatter') continue

    const syms = [sym0, sym1, sym2]
    const nonWilds = syms.filter((s) => s !== 'wild')

    let matchedSymbolId: SlotSymbolId | null = null
    let isWildInvolved = syms.includes('wild')

    if (nonWilds.length === 0) {
      matchedSymbolId = 'seven'
    } else if (nonWilds.every((s) => s === nonWilds[0])) {
      matchedSymbolId = nonWilds[0]
    }

    if (matchedSymbolId) {
      const def = symbols[matchedSymbolId] ?? DEFAULT_SLOT_SYMBOLS[matchedSymbolId]
      const payout = Math.round(betAmount * (def?.multiplier ?? 2))
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

  const scatterDef = symbols.scatter ?? DEFAULT_SLOT_SYMBOLS.scatter
  const isScatterWon = scatterCount >= 3
  const scatterPayout = isScatterWon ? Math.round(betAmount * (scatterDef.multiplier ?? 10)) : 0
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
