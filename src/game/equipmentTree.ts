/** 장비 스킬트리 — 자산+SP, 국 등급 게이트. 슬롯은 트리 노드로 1칸씩 개방 */

import type { StationGrade } from './station'
import { meetsStationGrade } from './station'

export type EquipNodeType = 'hub' | 'revenue' | 'stamina' | 'condition' | 'scout' | 'slot_unlock'

export type EquipNodeDef = {
  id: string
  type: EquipNodeType
  /** 효과 % (수익 가산 / 소모 감소) */
  valuePercent?: number
  /** 슬롯 개방 노드: 이 번호까지 해금 */
  slotIndex?: number
  cost: number
  spCost: number
  minStationGrade: StationGrade
  requires: string[]
  /** 정규화 좌표 0~1 */
  x: number
  y: number
  angle: number
  ring: number
  icon: string
  nameKey: string
  descKey: string
}

export type EquipmentTreeState = {
  ownedNodeIds: string[]
}

export const HUB_NODE_ID = 'hub'
export const REVENUE_CAP_PERCENT = 60
export const DRAIN_REDUCTION_CAP_PERCENT = 50

/** 동심원 반경 — 안쪽부터 C / B / A / S, 간격 균등 */
export const EQUIP_TREE_RING_RADII = [0.2, 0.315, 0.415, 0.495] as const
const R = EQUIP_TREE_RING_RADII
export const EQUIP_RING_MIN_GRADE: StationGrade[] = ['C', 'B', 'A', 'S']

/** 12방향 30° 격자. C 동서남북 4칸, B는 스카웃 2·슬롯 1 포함 8칸 */
export const EQUIP_SPOKE_COUNT = 12
export const EQUIP_SPOKE_STEP = 360 / EQUIP_SPOKE_COUNT
const C_SPOKES = [0, 3, 6, 9] as const
const B_SPOKES = [0, 1, 3, 5, 6, 8, 9, 10] as const
const STAT_CYCLE = ['revenue', 'stamina', 'condition'] as const

const RING_PAY = [
  { cost: 280, spCost: 1, revenue: 3, stamina: 3, condition: 3 },
  { cost: 1_800, spCost: 2, revenue: 3, stamina: 3, condition: 3 },
  { cost: 4_500, spCost: 3, revenue: 4, stamina: 4, condition: 4 },
  { cost: 10_000, spCost: 4, revenue: 4, stamina: 4, condition: 4 },
] as const

const NODE_META: Record<
  Exclude<EquipNodeType, 'hub'>,
  { icon: string; nameKey: string; descKey: string }
> = {
  revenue: {
    icon: '$',
    nameKey: 'equipment.tree.revenue',
    descKey: 'equipment.tree.revenueDesc',
  },
  stamina: {
    icon: 'S',
    nameKey: 'equipment.tree.stamina',
    descKey: 'equipment.tree.staminaDesc',
  },
  condition: {
    icon: 'C',
    nameKey: 'equipment.tree.condition',
    descKey: 'equipment.tree.conditionDesc',
  },
  scout: {
    icon: 'P',
    nameKey: 'equipment.tree.scout',
    descKey: 'equipment.tree.scoutDesc',
  },
  slot_unlock: {
    icon: 'U',
    nameKey: 'equipment.tree.slotUnlock',
    descKey: 'equipment.tree.slotUnlockDesc',
  },
}

/** 0°=동 · 90°=남 · 180°=서 · 270°=북 · y는 아래로 증가 */
function at(angleDeg: number, radius: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180
  return {
    x: Math.round((0.5 + radius * Math.cos(a)) * 1000) / 1000,
    y: Math.round((0.5 + radius * Math.sin(a)) * 1000) / 1000,
  }
}

function def(
  partial: Omit<EquipNodeDef, 'x' | 'y' | 'icon' | 'nameKey' | 'descKey' | 'minStationGrade'> & {
    angle: number
    ring: 0 | 1 | 2 | 3
    type: Exclude<EquipNodeType, 'hub'>
  },
): EquipNodeDef {
  const { angle, ring, type, ...rest } = partial
  return {
    ...rest,
    type,
    angle,
    ring,
    minStationGrade: EQUIP_RING_MIN_GRADE[ring] ?? 'C',
    ...NODE_META[type],
    ...at(angle, R[ring]),
  }
}

type Ring = 0 | 1 | 2 | 3
type Draft = {
  id: string
  type: Exclude<EquipNodeType, 'hub'>
  spoke: number
  ring: Ring
  slotIndex?: number
}

function spokeAngle(spoke: number): number {
  return (spoke * EQUIP_SPOKE_STEP) % 360
}

function specialCell(ring: Ring, spoke: number): Partial<Draft> | null {
  if (ring === 0 && spoke === 0) return { id: 'sta_1', type: 'stamina' }
  if (ring === 0 && spoke === 3) return { id: 'cond_1', type: 'condition' }
  if (ring === 0 && spoke === 6) return { id: 'rev_w_c', type: 'revenue' }
  if (ring === 0 && spoke === 9) return { id: 'rev_1', type: 'revenue' }
  if (ring === 1 && spoke === 10) return { id: 'scout_b1', type: 'scout' }
  if (ring === 1 && spoke === 0) return { id: 'scout_b2', type: 'scout' }
  if (ring === 2 && spoke === 9) return { id: 'scout_a1', type: 'scout' }
  if (ring === 2 && spoke === 11) return { id: 'scout_a2', type: 'scout' }
  if (ring === 2 && spoke === 0) return { id: 'scout_a3', type: 'scout' }
  if (ring === 2 && spoke === 5) return { id: 'scout_a4', type: 'scout' }
  if (ring === 3 && spoke === 9) return { id: 'scout_s1', type: 'scout' }
  if (ring === 3 && spoke === 11) return { id: 'scout_s2', type: 'scout' }
  if (ring === 3 && spoke === 5) return { id: 'scout_s3', type: 'scout' }
  if (ring === 1 && spoke === 6) return { id: 'slot_2', type: 'slot_unlock', slotIndex: 2 }
  if (ring === 2 && spoke === 3) return { id: 'slot_3', type: 'slot_unlock', slotIndex: 3 }
  if (ring === 2 && spoke === 6) return { id: 'slot_4', type: 'slot_unlock', slotIndex: 4 }
  if (ring === 2 && spoke === 8) return { id: 'slot_5', type: 'slot_unlock', slotIndex: 5 }
  if (ring === 3 && spoke === 6) return { id: 'slot_6', type: 'slot_unlock', slotIndex: 6 }
  return null
}

function cellType(ring: Ring, spoke: number): Exclude<EquipNodeType, 'hub'> {
  return specialCell(ring, spoke)?.type ?? STAT_CYCLE[(spoke + ring) % STAT_CYCLE.length]!
}

function cellId(ring: Ring, spoke: number): string {
  return specialCell(ring, spoke)?.id ?? `n_${ring}_${spoke}`
}

function payFor(d: Draft): { cost: number; spCost: number; valuePercent?: number } {
  const ring = RING_PAY[d.ring]!
  if (d.type === 'scout') {
    if (d.ring <= 1) return { cost: 2_000, spCost: 2 }
    if (d.ring === 2) return { cost: 4_800, spCost: 3 }
    return { cost: 11_000, spCost: 4 }
  }
  if (d.type === 'slot_unlock') {
    if (d.ring === 0) return { cost: 900, spCost: 1 }
    if (d.ring === 1) return { cost: 2_200, spCost: 2 }
    if (d.ring === 2) return { cost: 5_200, spCost: 3 }
    return { cost: 12_000, spCost: 4 }
  }
  const valuePercent =
    d.type === 'revenue' || d.type === 'stamina' || d.type === 'condition' ? ring[d.type] : undefined
  return { cost: ring.cost, spCost: ring.spCost, valuePercent }
}

function buildGrid(): (Draft | null)[][] {
  return ([0, 1, 2, 3] as Ring[]).map((ring) =>
    Array.from({ length: EQUIP_SPOKE_COUNT }, (_, spoke) => {
      if (ring === 0 && !(C_SPOKES as readonly number[]).includes(spoke)) return null
      if (ring === 1 && !(B_SPOKES as readonly number[]).includes(spoke)) return null
      const special = specialCell(ring, spoke)
      return {
        id: cellId(ring, spoke),
        type: cellType(ring, spoke),
        spoke,
        ring,
        slotIndex: special?.slotIndex,
      } satisfies Draft
    }),
  )
}

function nextOnRing(row: (Draft | null)[], spoke: number, dir: 1 | -1): Draft {
  for (let step = 1; step <= EQUIP_SPOKE_COUNT; step++) {
    const cell = row[(spoke + dir * step + EQUIP_SPOKE_COUNT * 4) % EQUIP_SPOKE_COUNT]
    if (cell) return cell
  }
  return row[spoke]!
}

function buildTreeNodes(): EquipNodeDef[] {
  const grid = buildGrid()
  return grid.flatMap((row) =>
    row.flatMap((d) => {
      if (!d) return []
      const left = nextOnRing(row, d.spoke, -1)
      const right = nextOnRing(row, d.spoke, 1)
      const inner = d.ring === 0 ? HUB_NODE_ID : grid[d.ring - 1]![d.spoke]?.id
      const requires = [inner, left.id, right.id].filter(
        (id, i, arr): id is string => Boolean(id) && arr.indexOf(id) === i && id !== d.id,
      )
      const pay = payFor(d)
      return [
        def({
          id: d.id,
          type: d.type,
          angle: spokeAngle(d.spoke),
          ring: d.ring,
          requires,
          slotIndex: d.slotIndex,
          cost: pay.cost,
          spCost: pay.spCost,
          valuePercent: pay.valuePercent,
        }),
      ]
    }),
  )
}

/**
 * C는 동서남북 4칸(슬롯 없음). B는 8칸(스카웃 2·슬롯 1). A 슬롯 3·S 슬롯 1.
 * 연결: 허브→C, 같은 각도 바깥 링, 같은 링 좌우(원형).
 */
export const EQUIP_NODE_DEFS: EquipNodeDef[] = [
  {
    id: HUB_NODE_ID,
    type: 'hub',
    cost: 0,
    spCost: 0,
    minStationGrade: 'C',
    requires: [],
    x: 0.5,
    y: 0.5,
    angle: 0,
    ring: -1,
    icon: '◎',
    nameKey: 'equipment.tree.hub',
    descKey: 'equipment.tree.hubDesc',
  },
  ...buildTreeNodes(),
]

export type EquipEdge = { from: string; to: string; kind: 'radial' | 'ring' }

const NODE_BY_ID = new Map(EQUIP_NODE_DEFS.map((node) => [node.id, node]))

export function getEquipNode(id: string): EquipNodeDef | undefined {
  return NODE_BY_ID.get(id)
}

export function createInitialEquipmentTree(): EquipmentTreeState {
  return { ownedNodeIds: [HUB_NODE_ID] }
}

export function isNodeOwned(state: EquipmentTreeState, nodeId: string): boolean {
  return state.ownedNodeIds.includes(nodeId)
}

export function isNodeUnlocked(state: EquipmentTreeState, nodeId: string): boolean {
  const node = NODE_BY_ID.get(nodeId)
  if (!node) return false
  if (node.requires.length === 0) return true
  return node.requires.some((req) => isNodeOwned(state, req))
}

export function canPurchaseNode(
  state: EquipmentTreeState,
  nodeId: string,
  assets: number,
  skillPoints = 0,
  stationGrade: StationGrade = 'C',
): { ok: boolean; reason?: 'missing' | 'owned' | 'locked' | 'funds' | 'sp' | 'grade' } {
  const node = NODE_BY_ID.get(nodeId)
  if (!node) return { ok: false, reason: 'missing' }
  if (isNodeOwned(state, nodeId)) return { ok: false, reason: 'owned' }
  if (!isNodeUnlocked(state, nodeId)) return { ok: false, reason: 'locked' }
  if (!meetsStationGrade(stationGrade, node.minStationGrade)) {
    return { ok: false, reason: 'grade' }
  }
  if (skillPoints < node.spCost) return { ok: false, reason: 'sp' }
  if (assets < node.cost) return { ok: false, reason: 'funds' }
  return { ok: true }
}

export function purchaseNode(
  state: EquipmentTreeState,
  nodeId: string,
): EquipmentTreeState {
  if (isNodeOwned(state, nodeId)) return state
  return { ownedNodeIds: [...state.ownedNodeIds, nodeId] }
}

function ownedDefs(state: EquipmentTreeState): EquipNodeDef[] {
  return state.ownedNodeIds
    .map((id) => NODE_BY_ID.get(id))
    .filter((node): node is EquipNodeDef => Boolean(node))
}

function sumPercent(state: EquipmentTreeState, type: EquipNodeType): number {
  return ownedDefs(state).reduce((sum, node) => {
    if (node.type !== type) return sum
    return sum + (node.valuePercent ?? 0)
  }, 0)
}

export function getRevenueBonusPercent(state: EquipmentTreeState): number {
  return Math.min(REVENUE_CAP_PERCENT, sumPercent(state, 'revenue'))
}

export function getStaminaReductionPercent(state: EquipmentTreeState): number {
  return Math.min(DRAIN_REDUCTION_CAP_PERCENT, sumPercent(state, 'stamina'))
}

export function getConditionReductionPercent(state: EquipmentTreeState): number {
  return Math.min(DRAIN_REDUCTION_CAP_PERCENT, sumPercent(state, 'condition'))
}

/** 수익 배율 (1.0 = 100%) */
export function getRevenueMult(state: EquipmentTreeState): number {
  return 1 + getRevenueBonusPercent(state) / 100
}

/** 스테미나 소모 배율 (0.5~1.0) */
export function getStaminaCostMult(state: EquipmentTreeState): number {
  return 1 - getStaminaReductionPercent(state) / 100
}

/** 컨디션 소모 배율 (0.5~1.0) */
export function getConditionCostMult(state: EquipmentTreeState): number {
  return 1 - getConditionReductionPercent(state) / 100
}

export function listEquipEdges(): EquipEdge[] {
  const byRingSpoke = new Map<string, EquipNodeDef>()
  for (const node of EQUIP_NODE_DEFS) {
    if (node.type === 'hub') continue
    byRingSpoke.set(`${node.ring}:${Math.round(node.angle / EQUIP_SPOKE_STEP) % EQUIP_SPOKE_COUNT}`, node)
  }
  const idAt = (ring: number, spoke: number) =>
    byRingSpoke.get(`${ring}:${((spoke % EQUIP_SPOKE_COUNT) + EQUIP_SPOKE_COUNT) % EQUIP_SPOKE_COUNT}`)?.id

  const edges: EquipEdge[] = []
  for (let spoke = 0; spoke < EQUIP_SPOKE_COUNT; spoke++) {
    const inner = idAt(0, spoke)
    if (inner) edges.push({ from: HUB_NODE_ID, to: inner, kind: 'radial' })
    for (let ring = 0; ring < 3; ring++) {
      const from = idAt(ring, spoke)
      const to = idAt(ring + 1, spoke)
      if (from && to) edges.push({ from, to, kind: 'radial' })
    }
  }
  for (let ring = 0; ring < 4; ring++) {
    const spokes = Array.from({ length: EQUIP_SPOKE_COUNT }, (_, spoke) => spoke).filter((spoke) =>
      idAt(ring, spoke),
    )
    for (let i = 0; i < spokes.length; i++) {
      const from = idAt(ring, spokes[i]!)
      const to = idAt(ring, spokes[(i + 1) % spokes.length]!)
      if (from && to) edges.push({ from, to, kind: 'ring' })
    }
  }
  return edges
}

export function nodeStatus(
  state: EquipmentTreeState,
  nodeId: string,
): 'owned' | 'available' | 'locked' {
  if (isNodeOwned(state, nodeId)) return 'owned'
  if (isNodeUnlocked(state, nodeId)) return 'available'
  return 'locked'
}
