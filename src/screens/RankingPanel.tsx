import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import {
  filterRankEntries,
  formatViewers,
  MILESTONE_REWARDS,
  RANK_MILESTONES,
  type LeagueState,
  type MilestoneReward,
  type RankEntry,
} from '../game/ranking'
import {
  getStationReviewStatus,
  STATION_SPECS,
  type StationGrade,
} from '../game/station'
import { useTranslation } from '../locales/i18n'

type RankFilter = 'all' | 'rivals' | 'top10'

type RankingPanelProps = {
  league: LeagueState
  stationGrade: StationGrade
  nextReviewDate: string
  weeksUntilSettlement: number
  creators: Array<{ grade: StationGrade }>
  onOpenScout: () => void
}

export function RankingPanel({
  league,
  stationGrade,
  nextReviewDate,
  weeksUntilSettlement,
  creators,
  onOpenScout,
}: RankingPanelProps) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<RankFilter>('all')
  const playerRowRef = useRef<HTMLTableRowElement | null>(null)
  const spec = STATION_SPECS[stationGrade]
  const review = useMemo(
    () => getStationReviewStatus(stationGrade, league.viewers, creators),
    [stationGrade, league.viewers, creators],
  )
  const rows = useMemo(
    () => filterRankEntries(league.entries, filter),
    [league.entries, filter],
  )

  useEffect(() => {
    if (filter !== 'all') return
    playerRowRef.current?.scrollIntoView({ block: 'center' })
  }, [filter, league.currentRank])

  const nextMilestone = RANK_MILESTONES.find((rank) => rank < league.currentRank) ?? null
  const reward = nextMilestone ? MILESTONE_REWARDS[nextMilestone] : null

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <header className="game-panel flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="min-w-0">
          <p className="game-kicker">GLOBAL BROADCAST LEAGUE</p>
          <h2 className="mt-0.5 text-lg font-black tracking-wide text-slate-100">
            {t('ranking.title')}
          </h2>
        </div>
        <span className="rounded-full border border-amber-400/30 bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-200">
          {t('station.gradeBadge').replace('{grade}', stationGrade)}
        </span>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <p className="font-bold text-amber-200">
            {t('ranking.myRank')}: {league.currentRank}
            {t('ranking.rankUnit')}
            <span className="ml-2 font-semibold text-slate-300">
              ({formatViewers(league.viewers)}
              {t('ranking.viewersUnit')})
            </span>
          </p>
          <p className="font-semibold text-slate-400">
            {t('ranking.settlementIn')}: {weeksUntilSettlement}
            {t('hud.weekUnit')}
          </p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <section className="game-panel flex min-h-0 flex-col overflow-hidden rounded-2xl p-3">
          <div className="mb-2 flex shrink-0 flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold tracking-wide ${
                  filter === item.id
                    ? 'border-pink-400/50 bg-pink-500/15 text-pink-200'
                    : 'border-white/10 bg-black/20 text-slate-400 hover:border-white/20'
                }`}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-separate border-spacing-y-1 text-left">
              <thead className="sticky top-0 z-10 bg-slate-950/95 text-[10px] font-bold tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">{t('ranking.colRank')}</th>
                  <th className="px-2 py-1.5">{t('ranking.colStation')}</th>
                  <th className="px-2 py-1.5">{t('ranking.colAce')}</th>
                  <th className="px-2 py-1.5 text-right">{t('ranking.colViewers')}</th>
                  <th className="px-2 py-1.5 text-right">{t('ranking.colChange')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <RankRow
                    key={`${row.rank}-${row.stationName}`}
                    row={row}
                    rowRef={row.isPlayer ? playerRowRef : undefined}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-2.5 overflow-auto">
          <section className="game-panel rounded-2xl p-3">
            <h3 className="game-stat-label">{t('station.panelTitle')}</h3>
            <p className="mt-1.5 text-sm font-black text-slate-100">
              {t('station.gradeBadge').replace('{grade}', stationGrade)}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-slate-300">
              {t('station.maxRank')}: {spec.maxRank}
              {t('ranking.rankUnit')}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-300">
              {t('station.viewerCap')}:{' '}
              {spec.viewerCap == null
                ? t('station.viewerCapNone')
                : `${formatViewers(spec.viewerCap)}${t('ranking.viewersUnit')}`}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-amber-200/90">
              {t('station.nextReview')}: {nextReviewDate}
            </p>
          </section>

          <section
            className={`game-panel rounded-2xl p-3 ${
              review.next && !review.eligible
                ? 'border border-rose-400/40 bg-rose-950/30'
                : ''
            }`}
          >
            <h3 className="game-stat-label">{t('station.reviewChecks')}</h3>
            {review.next ? (
              <>
                <ul className="mt-2 space-y-1.5">
                  <li
                    className={`rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${
                      review.viewersMet
                        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    <span className="mr-1">{review.viewersMet ? '[v]' : '[x]'}</span>
                    {t('station.needViewers')} ({formatViewers(review.viewers)} /{' '}
                    {formatViewers(review.requiredViewers)}
                    {t('ranking.viewersUnit')})
                  </li>
                  <li
                    className={`rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${
                      review.creatorsMet
                        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    <span className="mr-1">{review.creatorsMet ? '[v]' : '[x]'}</span>
                    {t('station.needCreators')
                      .replace('{grade}', review.creatorGrade)
                      .replace('{count}', String(review.creatorRequired))}{' '}
                    ({review.creatorCurrent}/{review.creatorRequired})
                  </li>
                </ul>
                {!review.creatorsMet ? (
                  <button
                    type="button"
                    onClick={onOpenScout}
                    className="game-btn-pink mt-3 w-full rounded-xl px-3 py-2 text-[11px] font-black"
                  >
                    {t('ranking.goScout')}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-xs font-bold text-amber-300">{t('station.reviewMax')}</p>
            )}
          </section>

          <section className="game-panel rounded-2xl p-3">
            <h3 className="game-stat-label">{t('ranking.rewardTitle')}</h3>
            {reward ? (
              <RewardList reward={reward} nextMilestone={nextMilestone} />
            ) : (
              <p className="mt-2 text-xs text-slate-500">{t('ranking.noReward')}</p>
            )}
            {league.hiddenEventUnlocked ? (
              <p className="mt-2 text-[10px] font-bold text-violet-300">
                {t('ranking.hiddenUnlocked')}
              </p>
            ) : null}
            {league.gameCleared ? (
              <p className="mt-1 text-[10px] font-bold text-amber-300">{t('ranking.cleared')}</p>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  )
}

const FILTERS: Array<{ id: RankFilter; labelKey: string }> = [
  { id: 'all', labelKey: 'ranking.filterAll' },
  { id: 'rivals', labelKey: 'ranking.filterRivals' },
  { id: 'top10', labelKey: 'ranking.filterTop10' },
]

function RankRow({
  row,
  rowRef,
}: {
  row: RankEntry
  rowRef?: Ref<HTMLTableRowElement>
}) {
  const { t } = useTranslation()
  const medal =
    row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : String(row.rank)
  const change =
    row.rankChange > 0
      ? `▲ +${row.rankChange}`
      : row.rankChange < 0
        ? `▼ ${row.rankChange}`
        : '—'
  const changeClass =
    row.rankChange > 0
      ? 'text-emerald-400'
      : row.rankChange < 0
        ? 'text-rose-400'
        : 'text-slate-500'

  return (
    <tr
      ref={rowRef}
      className={
        row.isPlayer
          ? 'bg-amber-500/15 shadow-[0_0_16px_rgba(245,158,11,0.18)]'
          : 'bg-black/20'
      }
    >
      <td
        className={`rounded-l-lg px-2 py-2 text-xs font-black tabular-nums ${
          row.isPlayer ? 'border-y-2 border-l-2 border-amber-500/60' : 'border border-transparent'
        }`}
      >
        <span className="inline-flex items-center gap-1 tabular-nums">{medal}</span>
      </td>
      <td
        className={`px-2 py-2 text-xs font-semibold ${
          row.isPlayer ? 'border-y-2 border-amber-500/60 text-amber-100' : 'text-slate-200'
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          {row.stationName}
          {row.isPlayer ? (
            <span className="rounded border border-amber-400/50 bg-amber-500/20 px-1 py-0.5 text-[8px] font-black text-amber-200">
              MY
            </span>
          ) : null}
        </span>
      </td>
      <td
        className={`px-2 py-2 text-[11px] ${
          row.isPlayer ? 'border-y-2 border-amber-500/60 text-slate-200' : 'text-slate-400'
        }`}
      >
        {row.aceCreatorName}
        <span className="ml-1 font-bold text-amber-400/90">({row.aceCreatorGrade})</span>
      </td>
      <td
        className={`px-2 py-2 text-right text-[11px] font-bold tabular-nums ${
          row.isPlayer ? 'border-y-2 border-amber-500/60 text-slate-100' : 'text-slate-300'
        }`}
      >
        {formatViewers(row.viewers)}
        {t('ranking.viewersUnit')}
      </td>
      <td
        className={`rounded-r-lg px-2 py-2 text-right text-[11px] font-black tabular-nums ${changeClass} ${
          row.isPlayer ? 'border-y-2 border-r-2 border-amber-500/60' : ''
        }`}
      >
        {change}
      </td>
    </tr>
  )
}

function RewardList({
  reward,
  nextMilestone,
}: {
  reward: MilestoneReward
  nextMilestone: number | null
}) {
  const { t } = useTranslation()
  const lines: string[] = []
  if (reward.subscribersBonus > 0) {
    lines.push(
      `${t('ranking.rewardSubs')} +${formatViewers(reward.subscribersBonus)}${t('ranking.viewersUnit')}`,
    )
  }
  if (reward.revenueBonusPercent > 0) {
    lines.push(`${t('ranking.rewardRevenue')} +${reward.revenueBonusPercent}%`)
  }
  if (reward.specialEventUnlock) lines.push(t('ranking.rewardHidden'))
  if (reward.isGameClear) lines.push(t('ranking.rewardClear'))

  return (
    <div className="mt-2 space-y-1">
      {nextMilestone ? (
        <p className="text-[10px] font-bold text-amber-200/90">
          {nextMilestone}
          {t('ranking.rankUnit')} {t('ranking.entry')}
        </p>
      ) : null}
      {lines.length === 0 ? (
        <p className="text-xs text-slate-500">{t('ranking.noReward')}</p>
      ) : (
        lines.map((line) => (
          <p key={line} className="text-[11px] font-semibold text-slate-300">
            - {line}
          </p>
        ))
      )}
    </div>
  )
}
