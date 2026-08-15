import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  canPurchaseNode,
  EQUIP_NODE_DEFS,
  EQUIP_RING_MIN_GRADE,
  EQUIP_SPOKE_COUNT,
  EQUIP_SPOKE_STEP,
  EQUIP_TREE_RING_RADII,
  getConditionReductionPercent,
  getEquipNode,
  getRevenueBonusPercent,
  getStaminaReductionPercent,
  isNodeOwned,
  isNodeUnlocked,
  listEquipEdges,
  nodeStatus,
  type EquipmentTreeState,
  type EquipNodeDef,
  type EquipNodeType,
} from '../game/equipmentTree'
import { formatMoney } from '../game/money'
import { meetsStationGrade, type StationGrade } from '../game/station'
import { useTranslation } from '../locales/i18n'

type EquipmentPanelProps = {
  tree: EquipmentTreeState
  assets: number
  skillPoints: number
  stationGrade: StationGrade
  canScout?: boolean
  researchLocked?: boolean
  onPurchase: (nodeId: string) => void
}

type NodeTier = 'hub' | 'master' | 'sub' | 'unlock' | 'scout'
type BranchKind = 'hub' | 'revenue' | 'stamina' | 'condition' | 'unlock' | 'scout'
type IconKind =
  | 'hub'
  | 'revenue'
  | 'coin'
  | 'stamina'
  | 'shield'
  | 'condition'
  | 'heart'
  | 'unlock'
  | 'lock'
  | 'scout'

const VIEW_PAD = 0.055
const MASTER_IDS = new Set(['rev_1', 'sta_1', 'cond_1'])

export function EquipmentPanel({
  tree,
  assets,
  skillPoints,
  stationGrade,
  canScout = true,
  researchLocked = false,
  onPurchase,
}: EquipmentPanelProps) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string>('hub')
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState(0)
  const [purchaseFx, setPurchaseFx] = useState<{
    id: string
    nodeId: string
    x: number
    y: number
  } | null>(null)
  const fxClearRef = useRef<number | null>(null)

  const selected = getEquipNode(selectedId) ?? EQUIP_NODE_DEFS[0]!
  const status = nodeStatus(tree, selected.id)
  const purchase = canPurchaseNode(tree, selected.id, assets, skillPoints, stationGrade)
  const scoutBlocked = selected.type === 'scout' && !canScout
  const canBuy = purchase.ok && !scoutBlocked && !researchLocked
  const edges = useMemo(() => listEquipEdges(), [])
  const visual = getNodeVisual(selected)
  const progress = getBranchProgress(tree, selected)

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setStageSize(Math.max(0, Math.floor(Math.min(width, height))))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      if (fxClearRef.current != null) window.clearTimeout(fxClearRef.current)
    }
  }, [])

  function triggerPurchase() {
    if (!canBuy) return
    const node = selected
    const pos = toView(node.x, node.y)
    if (fxClearRef.current != null) window.clearTimeout(fxClearRef.current)
    setPurchaseFx({
      id: `${node.id}-${Date.now()}`,
      nodeId: node.id,
      x: pos.x,
      y: pos.y,
    })
    onPurchase(node.id)
    fxClearRef.current = window.setTimeout(() => setPurchaseFx(null), 1100)
  }

  const nodeScale = stageSize > 0 ? Math.max(0.58, Math.min(1.2, stageSize / 500)) : 1
  const openedRingRadius = EQUIP_TREE_RING_RADII.reduce<number | null>((acc, r, i) => {
    const grade = EQUIP_RING_MIN_GRADE[i]
    return grade && meetsStationGrade(stationGrade, grade) ? r : acc
  }, null)
  const fxEdgeKeys = useMemo(() => {
    if (!purchaseFx) return new Set<string>()
    const keys = new Set<string>()
    for (const edge of edges) {
      if (edge.to === purchaseFx.nodeId || edge.from === purchaseFx.nodeId) {
        keys.add(`${edge.from}-${edge.to}`)
      }
    }
    return keys
  }, [purchaseFx, edges])

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-[minmax(0,1.75fr)_minmax(15.5rem,21rem)] lg:gap-3">
      <section
        ref={stageRef}
        className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0b0e14]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.35)_1px,transparent_1.2px)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_58%)]" />

        <div className="pointer-events-none absolute top-3 left-3 z-10">
          <p className="text-[10px] font-semibold tracking-[0.28em] text-white/55 uppercase">
            {t('equipment.tree.title')}
          </p>
          <div className="mt-1 h-px w-16 bg-white/25" />
          {researchLocked ? (
            <p className="mt-2 border border-rose-400/30 bg-rose-950/70 px-2 py-1 text-[10px] font-semibold tracking-wide text-rose-200/90">
              {t('equipment.tree.onAirLockHint')}
            </p>
          ) : null}
        </div>

        <div className="pointer-events-none absolute top-3 right-3 z-10 border border-cyan-300/35 bg-black/45 px-3 py-1.5 text-right backdrop-blur-[2px]">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-cyan-200/70 uppercase">
            {t('hud.skillPoints')}
          </p>
          <p className="text-sm font-black tabular-nums text-cyan-200">{skillPoints}</p>
        </div>

        <div
          className="relative shrink-0"
          style={{
            width: stageSize || '100%',
            height: stageSize || '100%',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {stageSize > 0 ? (
            <div className="absolute inset-0" style={{ ['--equip-node-scale' as string]: String(nodeScale) }}>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
                {openedRingRadius != null ? (
                  <circle
                    cx="50"
                    cy="50"
                    r={(openedRingRadius / 0.5) * (50 - VIEW_PAD * 100)}
                    fill="rgba(255,255,255,0.05)"
                  />
                ) : null}
                {EQUIP_TREE_RING_RADII.map((r) => {
                  const pct = (r / 0.5) * (50 - VIEW_PAD * 100)
                  return (
                    <circle
                      key={r}
                      cx="50"
                      cy="50"
                      r={pct}
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="0.25"
                    />
                  )
                })}

                {Array.from({ length: EQUIP_SPOKE_COUNT }, (_, spoke) => {
                  const a = (spoke * EQUIP_SPOKE_STEP * Math.PI) / 180
                  const inner = toView(0.5 + 0.08 * Math.cos(a), 0.5 + 0.08 * Math.sin(a))
                  const outer = toView(0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a))
                  return (
                    <line
                      key={`spoke-${spoke}`}
                      x1={inner.x}
                      y1={inner.y}
                      x2={outer.x}
                      y2={outer.y}
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="0.2"
                    />
                  )
                })}

                {edges.map((edge) => {
                  const from = getEquipNode(edge.from)
                  const to = getEquipNode(edge.to)
                  if (!from || !to) return null
                  const fromOwned = tree.ownedNodeIds.includes(edge.from)
                  const toOwned = tree.ownedNodeIds.includes(edge.to)
                  const bothOwned = fromOwned && toOwned
                  const toAvailable =
                    (fromOwned && !toOwned && isNodeUnlocked(tree, edge.to)) ||
                    (toOwned && !fromOwned && isNodeUnlocked(tree, edge.from))
                  const eitherOwned = fromOwned || toOwned
                  const p1 = toView(from.x, from.y)
                  const p2 = toView(to.x, to.y)
                  const ignite = fxEdgeKeys.has(`${edge.from}-${edge.to}`)

                  let stroke = 'rgba(148,163,184,0.16)'
                  let width = 0.45
                  let dash: string | undefined = '1.3 1.2'
                  let glow: string | undefined
                  if (bothOwned) {
                    stroke = 'rgba(253,224,71,1)'
                    width = 1.15
                    dash = undefined
                    glow = 'rgba(250,204,21,0.55)'
                  } else if (toAvailable) {
                    stroke = 'rgba(255,255,255,0.78)'
                    width = 0.9
                    dash = undefined
                  } else if (eitherOwned) {
                    stroke = 'rgba(255,255,255,0.22)'
                    width = 0.55
                    dash = '1.1 1.1'
                  }

                  const common = {
                    fill: 'none' as const,
                    stroke: ignite ? 'rgba(254,240,138,1)' : stroke,
                    strokeWidth: ignite ? width + 0.35 : width,
                    strokeDasharray: ignite ? undefined : dash,
                    strokeLinecap: 'round' as const,
                  }
                  const glowProps = {
                    fill: 'none' as const,
                    stroke: ignite ? 'rgba(255,255,255,0.85)' : glow,
                    strokeWidth: ignite ? width + 2.2 : width + 1.4,
                    strokeLinecap: 'round' as const,
                    className: ignite ? 'equip-edge-ignite' : undefined,
                  }

                  return (
                    <g key={`${edge.from}-${edge.to}`}>
                      {edge.kind === 'ring' ? (
                        <>
                          {glow || ignite ? <path d={ringArcPath(p1, p2)} {...glowProps} /> : null}
                          <path d={ringArcPath(p1, p2)} {...common} />
                        </>
                      ) : (
                        <>
                          {glow || ignite ? (
                            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} {...glowProps} />
                          ) : null}
                          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} {...common} />
                        </>
                      )}
                    </g>
                  )
                })}
              </svg>

              {EQUIP_NODE_DEFS.map((node) => {
                const pos = toView(node.x, node.y)
                return (
                  <TreeNodeButton
                    key={node.id}
                    node={node}
                    status={nodeStatus(tree, node.id)}
                    gradeOk={meetsStationGrade(stationGrade, node.minStationGrade)}
                    selected={selectedId === node.id}
                    purchasing={purchaseFx?.nodeId === node.id}
                    leftPct={pos.x}
                    topPct={pos.y}
                    onSelect={() => setSelectedId(node.id)}
                  />
                )
              })}

              {purchaseFx ? (
                <PurchaseBurst key={purchaseFx.id} x={purchaseFx.x} y={purchaseFx.y} />
              ) : null}
            </div>
          ) : null}
        </div>

        {purchaseFx ? <div className="pointer-events-none absolute inset-0 z-20 equip-stage-flash" /> : null}
      </section>

      <aside className="relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#10141c]">
        <div className="relative flex min-h-0 flex-1 flex-col justify-between p-4 sm:p-5">
          <div className="min-h-0 flex-1 space-y-4 overflow-auto">
            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p
                    className={`text-[10px] font-semibold tracking-[0.28em] uppercase ${
                      selected.type === 'scout'
                        ? 'text-fuchsia-300/80'
                        : selected.type === 'slot_unlock'
                          ? 'text-cyan-300/80'
                          : 'text-white/40'
                    }`}
                  >
                    {t(categoryBadgeKey(visual.branch))}
                  </p>
                  <div
                    className={`mt-1 h-px w-10 ${
                      selected.type === 'scout'
                        ? 'bg-fuchsia-400/70'
                        : selected.type === 'slot_unlock'
                          ? 'bg-cyan-400/70'
                          : 'bg-white/30'
                    }`}
                  />
                </div>
                <p className="text-xs font-semibold tabular-nums text-white/70">
                  Lv. {progress.current}/{progress.max}
                </p>
              </div>

              <div className="mb-3 h-px w-full bg-white/10">
                <div
                  className="h-px bg-amber-300 transition-all"
                  style={{
                    width: `${Math.max(8, Math.round((progress.current / Math.max(1, progress.max)) * 100))}%`,
                  }}
                />
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center border ${
                    selected.type === 'scout'
                      ? `rounded-full ${
                          status === 'owned'
                            ? 'border-fuchsia-300 bg-fuchsia-500/15 text-fuchsia-100 shadow-[0_0_22px_rgba(232,121,249,0.45)]'
                            : 'border-fuchsia-400/80 bg-fuchsia-500/10 text-fuchsia-100'
                        }`
                      : selected.type === 'slot_unlock'
                        ? `rounded-xl ${
                            status === 'owned'
                              ? 'border-cyan-300 bg-cyan-500/15 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.45)]'
                              : 'border-cyan-400/80 bg-cyan-500/10 text-cyan-100'
                          }`
                      : status === 'owned'
                        ? 'rounded-full border-amber-300 bg-amber-300/10 text-amber-100 shadow-[0_0_22px_rgba(250,204,21,0.45)]'
                        : status === 'available'
                          ? 'rounded-full border-white/80 bg-white/5 text-white'
                          : 'rounded-full border-white/15 bg-black/30 text-white/30'
                  }`}
                >
                  <NodeIcon kind={visual.icon} className="h-6 w-6" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2 className="text-base font-semibold leading-snug text-white sm:text-lg">
                    {formatNodeTitle(selected, t)}
                  </h2>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
                    {formatNodeDesc(selected, t)}
                  </p>
                </div>
              </div>
            </div>

            <section>
              <p className="mb-2 text-[10px] font-semibold tracking-[0.22em] text-white/35 uppercase">
                {t('equipment.tree.researchEffect')}
              </p>
              <div className="space-y-2 border border-white/10 bg-black/20 px-3 py-3 text-xs">
                <EffectCompare node={selected} tree={tree} status={status} t={t} />
              </div>
            </section>

            {selected.requires.length > 0 ? (
              <section>
                <p className="mb-2 text-[10px] font-semibold tracking-[0.22em] text-white/35 uppercase">
                  {t('equipment.tree.requires')}
                </p>
                <ul className="space-y-1.5">
                  {selected.requires.map((reqId) => {
                    const req = getEquipNode(reqId)
                    const owned = isNodeOwned(tree, reqId)
                    return (
                      <li
                        key={reqId}
                        className={`flex items-center gap-2 border px-2.5 py-2 text-[11px] ${
                          owned ? 'border-white/15 text-white/80' : 'border-white/8 text-white/35'
                        }`}
                      >
                        <span className="font-semibold">{owned ? '✓' : '–'}</span>
                        <span className="truncate">{req ? formatNodeTitle(req, t) : reqId}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="mt-4 shrink-0 space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="tracking-wide text-cyan-200/70 uppercase">{t('hud.skillPoints')}</span>
              <span className="font-black tabular-nums text-cyan-200">{skillPoints}</span>
            </div>
            {status === 'owned' ? (
              <p className="border border-white/20 bg-white/5 py-3 text-center text-xs font-semibold tracking-[0.18em] text-white/80 uppercase">
                {t('equipment.tree.owned')}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="tracking-wide text-white/40 uppercase">
                    {t('equipment.tree.needCost')}
                  </span>
                  <span className="font-semibold tabular-nums text-amber-300">
                    {formatMoney(selected.cost)}
                    {selected.spCost > 0 ? ` · SP ${selected.spCost}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/30">{t('equipment.tree.minGrade')}</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      purchase.reason === 'grade' ? 'text-rose-300/80' : 'text-white/70'
                    }`}
                  >
                    {selected.minStationGrade}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/30">{t('hud.assets')}</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      assets >= selected.cost ? 'text-white/70' : 'text-white/35'
                    }`}
                  >
                    {formatMoney(assets)}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={triggerPurchase}
                  className="w-full border border-amber-300/80 bg-amber-300/15 py-3.5 text-xs font-semibold tracking-[0.14em] text-amber-100 uppercase transition hover:bg-amber-300/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
                >
                  {t('equipment.tree.researchBuy')
                    .replace('{price}', formatMoney(selected.cost))
                    .replace('{sp}', String(selected.spCost))}
                </button>
                {!canBuy ? (
                  <p className="text-center text-[11px] text-white/40">
                    {researchLocked
                      ? t('equipment.tree.needOnAir')
                      : purchase.reason === 'locked'
                      ? t('equipment.tree.needParent')
                      : purchase.reason === 'grade'
                        ? t('equipment.tree.needStationGrade').replace(
                            '{grade}',
                            selected.minStationGrade,
                          )
                        : purchase.reason === 'sp'
                          ? t('equipment.tree.needSp')
                          : purchase.reason === 'funds'
                            ? t('equipment.tree.needAssets')
                            : scoutBlocked
                              ? t('equipment.tree.needScoutPool')
                              : t('equipment.tree.unavailable')}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

function toView(x: number, y: number): { x: number; y: number } {
  const span = 1 - VIEW_PAD * 2
  return {
    x: (VIEW_PAD + x * span) * 100,
    y: (VIEW_PAD + y * span) * 100,
  }
}

function ringArcPath(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const cx = 50
  const cy = 50
  const r = (Math.hypot(p1.x - cx, p1.y - cy) + Math.hypot(p2.x - cx, p2.y - cy)) / 2
  const cross = (p1.x - cx) * (p2.y - cy) - (p1.y - cy) * (p2.x - cx)
  const sweep = cross > 0 ? 1 : 0
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 ${sweep} ${p2.x} ${p2.y}`
}

function getBranchKind(type: EquipNodeType): BranchKind {
  if (type === 'hub') return 'hub'
  if (type === 'revenue') return 'revenue'
  if (type === 'stamina') return 'stamina'
  if (type === 'condition') return 'condition'
  if (type === 'scout') return 'scout'
  if (type === 'slot_unlock') return 'unlock'
  return 'unlock'
}

function getNodeTier(node: EquipNodeDef): NodeTier {
  if (node.type === 'hub') return 'hub'
  if (node.type === 'scout') return 'scout'
  if (node.type === 'slot_unlock') return 'unlock'
  if (node.ring === 0 || MASTER_IDS.has(node.id)) return 'master'
  return 'sub'
}

function getNodeVisual(node: EquipNodeDef): {
  icon: IconKind
  tier: NodeTier
  branch: BranchKind
} {
  const tier = getNodeTier(node)
  const branch = getBranchKind(node.type)
  if (node.type === 'hub') return { icon: 'hub', tier, branch }
  if (node.type === 'scout') return { icon: 'scout', tier, branch }
  if (node.type === 'slot_unlock') return { icon: 'unlock', tier, branch }
  if (node.type === 'revenue') {
    return { icon: tier === 'master' ? 'revenue' : 'coin', tier, branch }
  }
  if (node.type === 'stamina') {
    return { icon: tier === 'master' ? 'stamina' : 'shield', tier, branch }
  }
  return { icon: tier === 'master' ? 'condition' : 'heart', tier, branch }
}

function categoryBadgeKey(branch: BranchKind): string {
  if (branch === 'hub') return 'equipment.tree.badgeHub'
  if (branch === 'revenue') return 'equipment.tree.badgeRevenue'
  if (branch === 'stamina') return 'equipment.tree.badgeStamina'
  if (branch === 'condition') return 'equipment.tree.badgeCondition'
  if (branch === 'scout') return 'equipment.tree.badgeScout'
  return 'equipment.tree.badgeUnlock'
}

function getBranchProgress(
  tree: EquipmentTreeState,
  node: EquipNodeDef,
): { current: number; max: number } {
  if (node.type === 'hub') {
    const rest = EQUIP_NODE_DEFS.filter((n) => n.type !== 'hub')
    const owned = rest.filter((n) => isNodeOwned(tree, n.id)).length
    return { current: owned, max: rest.length }
  }
  const peers = EQUIP_NODE_DEFS.filter((n) => n.type === node.type)
  const owned = peers.filter((n) => isNodeOwned(tree, n.id)).length
  return { current: owned, max: peers.length }
}

function TreeNodeButton({
  node,
  status,
  gradeOk,
  selected,
  purchasing,
  leftPct,
  topPct,
  onSelect,
}: {
  node: EquipNodeDef
  status: 'owned' | 'available' | 'locked'
  gradeOk: boolean
  selected: boolean
  purchasing?: boolean
  leftPct: number
  topPct: number
  onSelect: () => void
}) {
  const visual = getNodeVisual(node)
  const special = node.type === 'scout' ? 'scout' : node.type === 'slot_unlock' ? 'slot' : null
  const base =
    visual.tier === 'hub'
      ? 3.7
      : visual.tier === 'master'
        ? 3.05
        : special
          ? 2.45
          : 2.35
  const sizeRem = `calc(${base}rem * var(--equip-node-scale, 1))`
  const shape = special === 'slot' ? 'rounded-lg' : 'rounded-full'

  let tone =
    'border-white/12 bg-[#0d1118]/55 text-white/18 opacity-55'
  if (special === 'scout') {
    if (status === 'owned') {
      tone = selected
        ? 'border-fuchsia-300 border-[2px] bg-[#2a1024] text-fuchsia-50 shadow-[0_0_12px_rgba(232,121,249,0.55)] equip-node-scout-owned'
        : 'border-fuchsia-400 border-[2px] bg-[#2a1024] text-fuchsia-100 shadow-[0_0_10px_rgba(232,121,249,0.4)] equip-node-scout-owned'
    } else if (!gradeOk) {
      tone = selected
        ? 'border-fuchsia-400/50 bg-[#1a1018] text-fuchsia-200/40 opacity-85'
        : 'border-fuchsia-500/25 bg-[#140c14] text-fuchsia-300/30 opacity-70'
    } else if (status === 'available') {
      tone = selected
        ? 'border-fuchsia-200 border-2 bg-fuchsia-500/25 text-fuchsia-50 shadow-[0_0_12px_rgba(240,171,252,0.55)] equip-node-scout-available'
        : 'border-fuchsia-400 border-2 bg-fuchsia-500/20 text-fuchsia-100 shadow-[0_0_10px_rgba(232,121,249,0.4)] equip-node-scout-available'
    } else if (selected) {
      tone = 'border-fuchsia-400/40 bg-[#1a1018] text-fuchsia-200/50 opacity-85'
    } else {
      tone = 'border-fuchsia-500/30 bg-[#140c14] text-fuchsia-300/40 opacity-70'
    }
  } else if (special === 'slot') {
    if (status === 'owned') {
      tone = selected
        ? 'border-cyan-300 border-[2px] bg-[#082428] text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,0.55)] equip-node-slot-owned'
        : 'border-cyan-400 border-[2px] bg-[#082428] text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.4)] equip-node-slot-owned'
    } else if (!gradeOk) {
      tone = selected
        ? 'border-cyan-400/50 bg-[#081418] text-cyan-200/40 opacity-85'
        : 'border-cyan-500/25 bg-[#061014] text-cyan-300/30 opacity-70'
    } else if (status === 'available') {
      tone = selected
        ? 'border-cyan-200 border-2 bg-cyan-500/25 text-cyan-50 shadow-[0_0_12px_rgba(165,243,252,0.55)] equip-node-slot-available'
        : 'border-cyan-400 border-2 bg-cyan-500/20 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.4)] equip-node-slot-available'
    } else if (selected) {
      tone = 'border-cyan-400/40 bg-[#081418] text-cyan-200/50 opacity-85'
    } else {
      tone = 'border-cyan-500/30 bg-[#061014] text-cyan-300/40 opacity-70'
    }
  } else if (status === 'owned') {
    tone = selected
      ? 'border-amber-300 border-[2.5px] bg-[#1a1608] text-amber-50 equip-node-owned shadow-[0_0_28px_rgba(250,204,21,0.65)]'
      : 'border-amber-300 border-[2.5px] bg-[#1a1608] text-amber-50 equip-node-owned shadow-[0_0_22px_rgba(250,204,21,0.55)]'
  } else if (!gradeOk) {
    tone = selected
      ? 'border-rose-300/50 bg-[#1a1014] text-white/35 opacity-80'
      : 'border-white/12 bg-[#0d1118]/55 text-white/18 opacity-45'
  } else if (status === 'available') {
    tone = selected
      ? 'border-white border-2 bg-[#171b24] text-white shadow-[0_0_16px_rgba(255,255,255,0.28)]'
      : 'border-white/85 border-2 bg-[#171b24] text-white/95 equip-node-available'
  } else if (selected) {
    tone = 'border-white/35 bg-[#12161f] text-white/40 opacity-80'
  }

  return (
    <button
      type="button"
      data-equip-node
      onClick={onSelect}
      className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center border transition duration-150 hover:scale-105 ${shape} ${tone} ${
        selected ? 'z-20 scale-110' : ''
      } ${purchasing ? 'equip-node-purchase z-30' : ''}`}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: sizeRem,
        height: sizeRem,
      }}
    >
      {status === 'owned' || visual.tier === 'hub' || (special && selected) ? (
        <span
          className={`pointer-events-none absolute border ${
            special
              ? `inset-[-8%] ${
                  special === 'scout'
                    ? `rounded-full ${status === 'owned' ? 'border-fuchsia-300/55' : 'border-fuchsia-400/35'}`
                    : `rounded-lg ${status === 'owned' ? 'border-cyan-300/55' : 'border-cyan-400/35'}`
                }`
              : `inset-[-16%] rounded-full ${status === 'owned' ? 'border-amber-300/45' : 'border-white/20'}`
          }`}
        />
      ) : null}
      <NodeIcon
        kind={
          special === 'slot' && (status === 'locked' || !gradeOk) ? 'lock' : visual.icon
        }
        className={
          visual.tier === 'hub'
            ? 'h-[55%] w-[55%]'
            : visual.tier === 'master'
              ? 'h-[52%] w-[52%]'
              : 'h-[48%] w-[48%]'
        }
      />
      {node.type !== 'hub' ? (
        <span
          className={`absolute -right-0.5 -bottom-0.5 rounded bg-black/85 px-1 text-[8px] font-semibold ${
            status === 'owned'
              ? 'text-amber-200'
              : gradeOk
                ? 'text-white/55'
                : 'text-rose-300/80'
          }`}
        >
          {node.minStationGrade}
        </span>
      ) : null}
    </button>
  )
}

function PurchaseBurst({ x, y }: { x: number; y: number }) {
  const sparks = [
    { angle: 0, dist: 42 },
    { angle: 45, dist: 38 },
    { angle: 90, dist: 44 },
    { angle: 135, dist: 36 },
    { angle: 180, dist: 42 },
    { angle: 225, dist: 38 },
    { angle: 270, dist: 44 },
    { angle: 315, dist: 36 },
  ]

  return (
    <div
      className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="equip-buy-ring equip-buy-ring-a absolute left-1/2 top-1/2 rounded-full border-2 border-amber-200" />
      <span className="equip-buy-ring equip-buy-ring-b absolute left-1/2 top-1/2 rounded-full border border-white/80" />
      <span className="equip-buy-core absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200" />
      {sparks.map((spark) => (
        <span
          key={spark.angle}
          className="equip-buy-spark absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100"
          style={
            {
              ['--spark-x' as string]: `${Math.cos((spark.angle * Math.PI) / 180) * spark.dist}px`,
              ['--spark-y' as string]: `${Math.sin((spark.angle * Math.PI) / 180) * spark.dist}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

function NodeIcon({ kind, className }: { kind: IconKind; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  const icons: Record<IconKind, ReactNode> = {
    hub: (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.2" />
        <circle cx="12" cy="12" r="7.2" />
        <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4" />
      </svg>
    ),
    revenue: (
      <svg {...common}>
        <path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 3 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />
      </svg>
    ),
    coin: (
      <svg {...common}>
        <circle cx="12" cy="12" r="7.5" />
        <path d="M12 8v8M9.5 10.2c.6-.7 1.5-1.1 2.5-1.1s1.9.4 2.5 1.1M14.5 13.8c-.6.7-1.5 1.1-2.5 1.1s-1.9-.4-2.5-1.1" />
      </svg>
    ),
    stamina: (
      <svg {...common}>
        <path d="M13 3 6.5 13.5h4.2L10.2 21 17.5 10.2h-4.1z" />
      </svg>
    ),
    shield: (
      <svg {...common}>
        <path d="M12 3.5 19 7v5.2c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V7z" />
        <path d="M9.2 12.2 11.2 14.2 15 10.2" />
      </svg>
    ),
    condition: (
      <svg {...common}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    ),
    heart: (
      <svg {...common}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        <path d="M9.5 11.5h5M12 9v5" />
      </svg>
    ),
    unlock: (
      <svg {...common}>
        <rect x="6" y="10.5" width="12" height="9" rx="1.5" />
        <path d="M9 10.5V8a3 3 0 0 1 5.2-2" />
        <circle cx="12" cy="15" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
    lock: (
      <svg {...common}>
        <rect x="6" y="10.5" width="12" height="9" rx="1.5" />
        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
        <circle cx="12" cy="15" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
    scout: (
      <svg {...common}>
        <circle cx="9" cy="8" r="3.1" />
        <path d="M4.2 18.2c0-2.7 2.2-4.8 4.8-4.8s4.8 2.1 4.8 4.8" />
        <path d="M17 8.2v6.2M13.9 11.3h6.2" />
      </svg>
    ),
  }

  return icons[kind]
}

function formatNodeTitle(node: EquipNodeDef, t: (key: string) => string): string {
  if (node.type === 'hub' || node.type === 'scout') {
    return t(node.nameKey)
  }
  if (node.type === 'slot_unlock') {
    return t(node.nameKey)
  }
  return t(node.nameKey).replace('{value}', String(node.valuePercent ?? 0))
}

function formatNodeDesc(node: EquipNodeDef, t: (key: string) => string): string {
  if (node.type === 'hub' || node.type === 'scout') return t(node.descKey)
  if (node.type === 'slot_unlock') {
    return t(node.descKey)
  }
  return t(node.descKey).replace('{value}', String(node.valuePercent ?? 0))
}

function EffectRow({
  label,
  current,
  next,
  owned,
}: {
  label: string
  current: string
  next?: string
  owned: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/40">{label}</span>
      {owned || !next ? (
        <span className="font-semibold text-white/85">{current}</span>
      ) : (
        <span className="font-semibold text-white/70">
          {current} <span className="text-white/30">→</span>{' '}
          <strong className="text-amber-300">{next}</strong>
        </span>
      )}
    </div>
  )
}

function EffectCompare({
  node,
  tree,
  status,
  t,
}: {
  node: EquipNodeDef
  tree: EquipmentTreeState
  status: 'owned' | 'available' | 'locked'
  t: (key: string) => string
}) {
  const owned = status === 'owned'
  const add = node.valuePercent ?? 0

  if (node.type === 'hub') {
    return (
      <EffectRow label={t('equipment.tree.statSlots')} current={t('equipment.tree.hubEffect')} owned />
    )
  }

  if (node.type === 'scout') {
    return (
      <EffectRow
        label={t('equipment.tree.statScout')}
        current={owned ? t('equipment.tree.scoutDone') : t('equipment.tree.scoutReady')}
        next={owned ? undefined : t('equipment.tree.scoutDone')}
        owned={owned}
      />
    )
  }

  if (node.type === 'slot_unlock') {
    return (
      <EffectRow
        label={t('equipment.tree.statSlots')}
        current={owned ? t('equipment.tree.unlockDone') : t('equipment.tree.unlockLocked')}
        next={owned ? undefined : t('equipment.tree.unlockDone')}
        owned={owned}
      />
    )
  }

  if (node.type === 'revenue') {
    const cur = getRevenueBonusPercent(tree)
    const after = owned ? cur : Math.min(60, cur + add)
    return (
      <>
        <EffectRow
          label={t('equipment.tree.statRevenue')}
          current={`+${cur}%`}
          next={owned ? undefined : `+${after}%`}
          owned={owned}
        />
        <p className="text-[10px] text-white/30">
          {t('equipment.tree.nodeGain').replace('{value}', String(add))}
        </p>
      </>
    )
  }

  if (node.type === 'stamina') {
    const cur = getStaminaReductionPercent(tree)
    const after = owned ? cur : Math.min(50, cur + add)
    return (
      <>
        <EffectRow
          label={t('equipment.tree.statStamina')}
          current={`−${cur}%`}
          next={owned ? undefined : `−${after}%`}
          owned={owned}
        />
        <p className="text-[10px] text-white/30">
          {t('equipment.tree.nodeGain').replace('{value}', String(add))}
        </p>
      </>
    )
  }

  const cur = getConditionReductionPercent(tree)
  const after = owned ? cur : Math.min(50, cur + add)
  return (
    <>
      <EffectRow
        label={t('equipment.tree.statCondition')}
        current={`−${cur}%`}
        next={owned ? undefined : `−${after}%`}
        owned={owned}
      />
      <p className="text-[10px] text-white/30">
        {t('equipment.tree.nodeGain').replace('{value}', String(add))}
      </p>
    </>
  )
}
