import { useMemo, type CSSProperties } from 'react'
import {
  COMPANY_TIERS,
  companyTierLabelKey,
  companyTierOf,
  companyTierReached,
  formatViewers,
  MILESTONE_REWARDS,
  RANK_MILESTONES,
  type CompanyTier,
  type LeagueState,
  type MilestoneReward,
} from '../game/ranking'
import {
  getStationReviewStatus,
  type StationGrade,
} from '../game/station'
import { useTranslation } from '../locales/i18n'

type RankingPanelProps = {
  league: LeagueState
  stationGrade: StationGrade
  nextReviewDate: string
  weeksUntilSettlement: number
  creators: Array<{ grade: StationGrade }>
  onOpenScout: () => void
}

const TIER_COUNT = COMPANY_TIERS.length

export function RankingPanel({
  league,
  stationGrade,
  nextReviewDate,
  weeksUntilSettlement,
  creators,
  onOpenScout,
}: RankingPanelProps) {
  const { t } = useTranslation()
  const review = useMemo(
    () => getStationReviewStatus(stationGrade, league.viewers, creators),
    [stationGrade, league.viewers, creators],
  )
  const currentTier = companyTierOf(league.currentRank)
  const rankUp = league.previousRank > league.currentRank
  const rankDown = league.previousRank < league.currentRank
  const nextMilestone = RANK_MILESTONES.find((rank) => rank < league.currentRank) ?? null
  const reward = nextMilestone ? MILESTONE_REWARDS[nextMilestone] : null

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
            {league.currentRank}
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
              const active = tier.id === currentTier.id
              const filled = companyTierReached(league.currentRank, tier)
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
                  {active ? (
                    <CurrentMarker rank={league.currentRank} cheering={rankUp} />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="rank-cards">
          {COMPANY_TIERS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              active={tier.id === currentTier.id}
              filled={companyTierReached(league.currentRank, tier)}
            />
          ))}
        </div>
      </div>

      <footer className="rank-foot">
        <p className="rank-foot-meta">
          {t('ranking.settlementIn')}: {weeksUntilSettlement}
          {t('hud.weekUnit')}
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
        {review.next && !review.creatorsMet ? (
          <button type="button" onClick={onOpenScout} className="game-btn-pink rank-foot-scout">
            {t('ranking.goScout')}
          </button>
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

function CurrentMarker({ rank, cheering }: { rank: number; cheering: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={`rank-tip${cheering ? ' is-up' : ''}`}>
      {cheering ? <span className="rank-tip-shout">{t('ranking.upShout')}</span> : null}
      <div className="rank-tip-card">
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
}: {
  tier: CompanyTier
  active: boolean
  filled: boolean
}) {
  const { t } = useTranslation()
  const range =
    tier.worstRank == null
      ? t('ranking.rangeOpen').replace('{from}', String(tier.bestRank))
      : t('ranking.rangeClosed')
          .replace('{from}', String(tier.bestRank))
          .replace('{to}', String(tier.worstRank))

  return (
    <div
      className={`rank-card rank-card--${tier.id}${filled ? ' is-filled' : ''}${active ? ' is-active' : ''}`}
    >
      <span className={`rank-card-icon rank-legend-icon--${tier.id}`} aria-hidden />
      <div className="rank-card-copy">
        <p className="rank-card-name">{t(companyTierLabelKey(tier.id))}</p>
        <p className="rank-card-range">{range}</p>
      </div>
    </div>
  )
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
