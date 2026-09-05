import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  COMPANY_TIERS,
  companyTierLabelKey,
  companyTierOf,
  companyTierReached,
  formatViewers,
  getPyramidY,
  MILESTONE_REWARDS,
  RANK_MILESTONES,
  type CompanyTier,
  type LeagueState,
  type MilestoneReward,
} from '../game/ranking'
import type {
  StationGrade,
} from '../game/station'
import type { StationGradeConfig, StationPromotionRule } from '../game/stationGradeConfig'
import type { Grade } from '../game/characters'
import { playSfx } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'

export type RankBubblePlay = {
  fromRank: number
  toRank: number
}

type RankingPanelProps = {
  league: LeagueState
  stationGrade: StationGrade
  stationGradeConfig: StationGradeConfig
  unlockedSlotCount: number
  assets: number
  nextReviewDate: string
  turnsUntilRankRefresh: number
  rankPlay?: RankBubblePlay | null
  onRankPlayDone?: () => void
  creators: Array<{ grade: Grade; snsSubscribers?: number }>
  onOpenScout?: () => void
}

const RANK_BUBBLE_MS = 1600

const TIER_COUNT = COMPANY_TIERS.length

export function RankingPanel({
  league,
  stationGrade: _stationGrade,
  stationGradeConfig,
  unlockedSlotCount,
  assets,
  nextReviewDate,
  turnsUntilRankRefresh,
  rankPlay = null,
  onRankPlayDone,
  creators,
}: RankingPanelProps) {
  const { t } = useTranslation()
  const [playProgress, setPlayProgress] = useState(1)
  const playDoneRef = useRef<string | null>(null)
  const onRankPlayDoneRef = useRef(onRankPlayDone)
  onRankPlayDoneRef.current = onRankPlayDone

  useEffect(() => {
    if (!rankPlay) {
      setPlayProgress(1)
      return
    }
    const playKey = `${rankPlay.fromRank}:${rankPlay.toRank}`
    playDoneRef.current = null
    setPlayProgress(0)
    if (rankPlay.fromRank > rankPlay.toRank) playSfx('rank-up')
    let raf = 0
    const started = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / RANK_BUBBLE_MS)
      const eased = 1 - (1 - t) ** 3
      setPlayProgress(eased)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
        return
      }
      if (playDoneRef.current === playKey) return
      playDoneRef.current = playKey
      onRankPlayDoneRef.current?.()
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (playDoneRef.current !== playKey) {
        playDoneRef.current = playKey
        onRankPlayDoneRef.current?.()
      }
    }
  }, [rankPlay])

  const displayRankFloat = rankPlay
    ? rankPlay.fromRank + (rankPlay.toRank - rankPlay.fromRank) * playProgress
    : league.currentRank
  const displayRank = Math.round(displayRankFloat)
  const currentTier = companyTierOf(displayRankFloat)
  const destTier = companyTierOf(rankPlay?.toRank ?? league.currentRank)
  const rankUp = (rankPlay?.fromRank ?? league.previousRank) > displayRank
  const rankDown = (rankPlay?.fromRank ?? league.previousRank) < displayRank
  const playing = Boolean(rankPlay)
  const nextMilestone = RANK_MILESTONES.find((rank) => rank < league.currentRank) ?? null
  const reward = nextMilestone ? MILESTONE_REWARDS[nextMilestone] : null

  const pyramidY = getPyramidY(displayRankFloat)
  const topPct = pyramidY * 100
  const leftPct = (0.5 - 0.5 * pyramidY) * 100

  return (
    <div className="rank-arena">
      <div className="rank-stats" role="status">
        <div className="rank-stats-row">
          <span className="rank-stats-ico rank-stats-ico--viewers" aria-hidden />
          <span className="rank-stats-label">{t('ranking.stockLabel')}</span>
          <span className="rank-stats-value">
            {formatViewers(league.viewers)}
            {t('ranking.viewersUnit')}
          </span>
          <RankDelta up={rankUp} down={rankDown} />
        </div>
        <div className="rank-stats-row">
          <span className="rank-stats-ico rank-stats-ico--rank" aria-hidden />
          <span className="rank-stats-label">{t('ranking.currentRankLabel')}</span>
          <span className="rank-stats-value">
            {displayRank}
            {t('ranking.rankUnit')}
          </span>
          <span className={`rank-stats-tier rank-stats-tier--${currentTier.id}`}>
            {t(companyTierLabelKey(currentTier.id))}
          </span>
          <RankDelta up={rankUp} down={rankDown} />
        </div>
      </div>

      <div className="rank-board">
        <div className="rank-pyramid-wrap">
          <div className="rank-layers" aria-hidden={false}>
            {COMPANY_TIERS.map((tier, index) => {
              const active = tier.id === destTier.id
              const filled = companyTierReached(displayRankFloat, tier)
              return (
                <div
                  key={tier.id}
                  className={`rank-layer-slot${filled ? ' is-filled' : ''}${active ? ' is-current' : ''}`}
                  style={
                    {
                      '--t0': String(index / TIER_COUNT),
                      '--t1': String((index + 1) / TIER_COUNT),
                    } as CSSProperties
                  }
                >
                  <div className={`rank-layer rank-layer--${tier.id}`} />
                  {filled ? <LayerSparks dense={active} /> : null}
                </div>
              )
            })}
            <CurrentMarker
              rank={displayRank}
              cheering={rankUp}
              rising={playing}
              fill={playProgress}
              topPct={topPct}
              leftPct={leftPct}
            />
          </div>
        </div>

        <div className="rank-cards">
          {COMPANY_TIERS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              active={tier.id === currentTier.id}
              filled={companyTierReached(displayRank, tier)}
              rule={tier.id === 'black' ? null : stationGradeConfig.promotions[tier.id]}
              ctx={{ viewers: league.viewers, unlockedSlotCount, assets, creators }}
            />
          ))}
        </div>
      </div>

      <footer className="rank-foot">
        <p className="rank-foot-meta">
          {t('ranking.refreshIn')}: {turnsUntilRankRefresh}
          {t('ranking.turnUnit')}
          <span className="rank-foot-dot">·</span>
          {t('station.nextReview')}: {nextReviewDate}
        </p>
        {reward && nextMilestone ? (
          <p className="rank-foot-reward">
            {nextMilestone}
            {t('ranking.rankUnit')} {t('ranking.entry')}
            {' — '}
            <RewardSummary reward={reward} />
          </p>
        ) : null}
      </footer>
    </div>
  )
}

function RankDelta({ up, down }: { up: boolean; down: boolean }) {
  if (up) return <span className="rank-delta is-up" aria-hidden />
  if (down) return <span className="rank-delta is-down" aria-hidden />
  return <span className="rank-delta is-flat" aria-hidden />
}

function LayerSparks({ dense }: { dense: boolean }) {
  const count = dense ? 14 : 7
  return (
    <div className="rank-layer-sparks" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="rank-spark"
          style={
            {
              '--x': `${18 + ((i * 17) % 64)}%`,
              '--d': `${(i * 0.18).toFixed(2)}s`,
              '--s': `${0.55 + (i % 4) * 0.18}`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

function CurrentMarker({
  rank,
  cheering,
  rising = false,
  fill = 1,
  topPct,
  leftPct,
}: {
  rank: number
  cheering: boolean
  rising?: boolean
  fill?: number
  topPct: number
  leftPct: number
}) {
  const { t } = useTranslation()
  return (
    <div
      className={`rank-tip${cheering ? ' is-up' : ''}${rising ? ' is-rising' : ''}`}
      style={
        {
          top: `${topPct.toFixed(3)}%`,
          left: `calc(${leftPct.toFixed(3)}% - 0.35rem)`,
        } as CSSProperties
      }
    >
      {cheering ? <span className="rank-tip-shout">{t('ranking.upShout')}</span> : null}
      <div
        className={`rank-tip-card${rising ? ' is-filling' : ''}`}
        style={{ '--fill': `${Math.round(fill * 100)}%` } as CSSProperties}
      >
        <p className="rank-tip-kicker">{t('ranking.currentMarker')}</p>
        <p className="rank-tip-rank">
          {rank}
          {t('ranking.rankUnit')}
        </p>
      </div>
    </div>
  )
}

function TierCard({
  tier,
  active,
  filled,
  rule,
  ctx,
}: {
  tier: CompanyTier
  active: boolean
  filled: boolean
  rule: StationPromotionRule | null
  ctx: PromotionCtx
}) {
  const { t } = useTranslation()
  const range =
    tier.worstRank == null
      ? t('ranking.rangeOpen').replace('{from}', String(tier.bestRank))
      : t('ranking.rangeClosed')
          .replace('{from}', String(tier.bestRank))
          .replace('{to}', String(tier.worstRank))
  const cells = rule ? promotionCondCells(rule, ctx, t) : []

  return (
    <div
      className={`rank-card rank-card--${tier.id}${filled ? ' is-filled' : ''}${active ? ' is-active' : ''}`}
    >
      <span className={`rank-card-icon rank-legend-icon--${tier.id}`} aria-hidden />
      <div className="rank-card-copy">
        <p className="rank-card-name">{t(companyTierLabelKey(tier.id))}</p>
        <p className="rank-card-range">{range}</p>
        {cells.length > 0 ? (
          <div className="rank-card-conds">
            {cells.map((cell) => (
              <span key={cell.id} className={`rank-cond-cell${cell.met ? ' is-met' : ''}`}>
                {cell.met ? (
                  <span className="rank-cond-check" aria-hidden>
                    ✓
                  </span>
                ) : null}
                {cell.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** 충족 판정에 필요한 현재 플레이어 수치 */
type PromotionCtx = {
  viewers: number
  unlockedSlotCount: number
  assets: number
  creators: Array<{ grade: Grade; snsSubscribers?: number }>
}

const COND_GRADE_RANK: Record<Grade, number> = { C: 0, B: 1, A: 2, S: 3 }

function countCreatorsAtLeast(creators: Array<{ grade: Grade }>, minGrade: Grade): number {
  const min = COND_GRADE_RANK[minGrade]
  return creators.filter((c) => COND_GRADE_RANK[c.grade] >= min).length
}

/** 승급 조건 → 셀 단위 + 충족 여부 (에디터 설정값 기반) */
function promotionCondCells(
  rule: StationPromotionRule,
  ctx: PromotionCtx,
  t: (key: string) => string,
): Array<{ id: string; label: string; met: boolean }> {
  const cells: Array<{ id: string; label: string; met: boolean }> = []
  cells.push({
    id: 'viewers',
    label: t('ranking.cond.viewers').replace('{n}', formatViewers(rule.requiredViewers)),
    met: ctx.viewers >= rule.requiredViewers,
  })
  if (rule.minSnsSubscribers?.enabled) {
    const totalSnsSubs = ctx.creators.reduce((sum, c) => sum + (c.snsSubscribers ?? 0), 0)
    const val = rule.minSnsSubscribers.value
    const valStr = val.toLocaleString()
    const tmpl = t('ranking.cond.snsSubscribers') || 'SNS Subscribers {n}'
    cells.push({
      id: 'snsSubscribers',
      label: tmpl.replace('{n}', valStr),
      met: totalSnsSubs >= val,
    })
  }
  if (rule.minUnlockedSlots.enabled) {
    cells.push({
      id: 'slots',
      label: t('ranking.cond.slots').replace('{n}', String(rule.minUnlockedSlots.value)),
      met: ctx.unlockedSlotCount >= rule.minUnlockedSlots.value,
    })
  }
  if (rule.minAssets.enabled) {
    cells.push({
      id: 'assets',
      label: t('ranking.cond.assets').replace('{n}', rule.minAssets.value.toLocaleString()),
      met: ctx.assets >= rule.minAssets.value,
    })
  }
  for (const req of rule.creatorRequirements) {
    if (!req.enabled) continue
    cells.push({
      id: req.id,
      label: t('ranking.cond.creators')
        .replace('{grade}', req.minGrade)
        .replace('{n}', String(req.count)),
      met: countCreatorsAtLeast(ctx.creators, req.minGrade) >= req.count,
    })
  }
  return cells
}

function RewardSummary({ reward }: { reward: MilestoneReward }) {
  const { t } = useTranslation()
  const parts: string[] = []
  if (reward.subscribersBonus > 0) {
    parts.push(
      `${t('ranking.rewardSubs')} +${formatViewers(reward.subscribersBonus)}${t('ranking.viewersUnit')}`,
    )
  }
  if (reward.revenueBonusPercent > 0) {
    parts.push(`${t('ranking.rewardRevenue')} +${reward.revenueBonusPercent}%`)
  }
  if (reward.specialEventUnlock) parts.push(t('ranking.rewardHidden'))
  if (reward.isGameClear) parts.push(t('ranking.rewardClear'))
  return <span>{parts.join(' · ') || t('ranking.noReward')}</span>
}
