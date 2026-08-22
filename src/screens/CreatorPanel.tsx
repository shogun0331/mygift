import { useEffect, useMemo, useState } from 'react'
import {
  type Grade,
  type OwnedCreator,
  type RegisteredCharacter,
} from '../game/characters'
import {
  canHireScoutOffer,
  type ScoutOffer,
  type ScoutSystemState,
} from '../game/scout'
import {
  calcConditionFullCareCost,
  calcVacationCost,
  canBroadcastByStamina,
  CONDITION_ICON,
  CONDITION_LABEL_KEY,
  conditionFromScore,
  scoreOf,
} from '../game/condition'
import { formatMoney, formatMoneyPerYear } from '../game/money'
import {
  characterDisplayJob,
  characterDisplayName,
} from '../game/characterLocales'
import { useTranslation } from '../locales/i18n'

type CreatorPanelProps = {
  ownedCreators: OwnedCreator[]
  registeredCharacters: RegisteredCharacter[]
  scoutState: ScoutSystemState
  assets: number
  broadcastMonthNumber: number
  /** 명세서 종료 후 스카우트 강제 오픈 */
  openScout?: boolean
  onScoutClosed?: () => void
  onScoutViewed: () => void
  onScoutPass: () => void
  onScoutHire: (offer: ScoutOffer) => void
  onConditionCare: (creatorId: string) => void
  onVacation: (creatorId: string) => void
}

const GRADE_FILTERS: Array<'ALL' | Grade> = ['ALL', 'S', 'A', 'B', 'C']

const GRADE_STYLE: Record<Grade, string> = {
  S: 'border-amber-400/40 bg-amber-400/15 text-amber-300',
  A: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-300',
  B: 'border-slate-500/50 bg-slate-700/40 text-slate-300',
  C: 'border-slate-700 bg-slate-800/60 text-slate-400',
}

const GRADE_TEXT: Record<Grade, string> = {
  S: 'text-amber-300',
  A: 'text-indigo-300',
  B: 'text-slate-300',
  C: 'text-slate-400',
}

function formatSalary(value: number) {
  return formatMoney(value)
}

function formatSalaryShort(value: number) {
  return formatMoneyPerYear(value)
}

function formatContract(weeks: number) {
  if (weeks >= 48) return `${weeks}주 (1년)`
  return `${weeks}주`
}

function trustOf(creator: OwnedCreator) {
  return creator.trust ?? creator.loyalty ?? 0
}

export function CreatorPanel({
  ownedCreators,
  registeredCharacters,
  scoutState,
  assets,
  broadcastMonthNumber,
  openScout = false,
  onScoutClosed,
  onScoutViewed,
  onScoutPass,
  onScoutHire,
  onConditionCare,
  onVacation,
}: CreatorPanelProps) {
  const { t, locale } = useTranslation()
  const [view, setView] = useState<'roster' | 'scout'>('roster')
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState<'ALL' | Grade>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!openScout) return
    setSelectedId(null)
    setView('scout')
  }, [openScout])

  function leaveScout() {
    setView('roster')
    onScoutClosed?.()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ownedCreators.filter((creator) => {
      const matchGrade = gradeFilter === 'ALL' || creator.grade === gradeFilter
      const nameHay = [
        creator.name,
        ...Object.values(creator.names ?? {}),
        creator.job,
        creator.concept,
        ...Object.values(creator.jobs ?? {}),
      ]
        .join(' ')
        .toLowerCase()
      const matchQuery = q.length === 0 || nameHay.includes(q)
      return matchGrade && matchQuery
    })
  }, [ownedCreators, query, gradeFilter])

  const sortedBySalary = useMemo(
    () => [...filtered].sort((a, b) => b.salary - a.salary),
    [filtered],
  )

  const selected = ownedCreators.find((creator) => creator.id === selectedId) ?? null

  if (view === 'scout') {
    return (
      <ScoutView
        offer={scoutState.activeOffer}
        assets={assets}
        ownedCount={ownedCreators.length}
        registeredCount={registeredCharacters.length}
        onBack={leaveScout}
        onViewed={onScoutViewed}
        onPass={() => {
          onScoutPass()
          leaveScout()
        }}
        onHire={(offer) => {
          onScoutHire(offer)
          leaveScout()
        }}
      />
    )
  }

  if (selected) {
    return (
      <CreatorDetailView
        creator={selected}
        assets={assets}
        broadcastMonthNumber={broadcastMonthNumber}
        onBack={() => setSelectedId(null)}
        onConditionCare={onConditionCare}
        onVacation={onVacation}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="game-panel-strong flex shrink-0 flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <div className="mr-auto min-w-0">
          <p className="game-kicker">CREATOR MANAGEMENT</p>
          <p className="mt-0.5 text-xs text-slate-500">
            보유 {ownedCreators.length}명 · 스카우트로 영입
          </p>
        </div>

        <label className="relative min-w-[10rem] flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색"
            className="w-full rounded-xl border border-white/10 bg-black/25 py-2 pr-3 pl-9 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/40"
          />
        </label>

        <label className="relative">
          <span className="sr-only">등급 필터</span>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value as 'ALL' | Grade)}
            className="appearance-none rounded-xl border border-white/10 bg-black/25 py-2 pr-9 pl-3 text-sm text-slate-200 outline-none transition focus:border-indigo-400/40"
          >
            {GRADE_FILTERS.map((grade) => (
              <option key={grade} value={grade}>
                {grade === 'ALL' ? '등급 필터' : `${grade} 등급`}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500">
            ▼
          </span>
        </label>
      </div>

      <section className="shrink-0">
        <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
          <p className="text-xs font-semibold tracking-wide text-slate-400">보유 크리에이터 카드</p>
          <p className="text-[10px] text-slate-500">좌우 스크롤 · 클릭 시 상세</p>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {filtered.map((creator) => {
            const displayName = characterDisplayName(creator, locale)
            return (
            <button
              key={creator.id}
              type="button"
              onClick={() => setSelectedId(creator.id)}
              className="game-card w-[7.5rem] shrink-0 text-left sm:w-[8.25rem]"
            >
              <div className="relative flex aspect-[3/4] items-end justify-center bg-gradient-to-b from-slate-700/80 to-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.22),transparent_55%)]" />
                <div className="absolute top-1.5 left-1.5">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${GRADE_STYLE[creator.grade]}`}
                  >
                    {creator.grade}급
                  </span>
                </div>
                {creator.profileImageUrl ? (
                  <img
                    src={creator.profileImageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className={`relative mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-slate-950 ${creator.avatarTone}`}
                  >
                    {displayName.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="border-t border-white/8 px-2 py-2">
                <h3 className="truncate text-xs font-semibold text-slate-100">{displayName}</h3>
                <p className="mt-0.5 text-[10px] font-semibold text-amber-400">
                  {formatSalaryShort(creator.salary)}
                </p>
              </div>
            </button>
            )
          })}
          {filtered.length === 0 ? (
            <div className="flex min-h-[10rem] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 text-center">
              <p className="text-sm text-slate-400">보유 캐릭터가 없습니다.</p>
              <p className="text-xs text-slate-500">월간 명세서 이후 스카우트 기회가 열립니다.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="game-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5 sm:px-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-200">연봉 & 계약 정산</p>
            <p className="mt-0.5 text-[10px] text-slate-500">연봉순 정렬 · 엑셀 스타일 테이블</p>
          </div>
          <span className="game-chip text-[10px]">{sortedBySalary.length}명</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {sortedBySalary.length === 0 ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-sm text-slate-400">표시할 크리에이터가 없습니다.</p>
              <p className="text-xs text-slate-500">월간 명세서 이후 스카우트 기회가 열립니다.</p>
            </div>
          ) : (
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
                <tr className="border-b border-white/10 text-[10px] tracking-wide text-slate-500 uppercase">
                  <th className="px-3 py-2.5 font-semibold sm:px-4">이름</th>
                  <th className="px-3 py-2.5 font-semibold">등급</th>
                  <th className="px-3 py-2.5 font-semibold">{t('creator.statPopularity')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('creator.statSkill')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('creator.statHeat')}</th>
                  <th className="px-3 py-2.5 font-semibold">현재 연봉</th>
                  <th className="px-3 py-2.5 font-semibold">{t('creator.statTrust')}</th>
                  <th className="px-3 py-2.5 font-semibold sm:px-4">액션</th>
                </tr>
              </thead>
              <tbody>
                {sortedBySalary.map((creator, index) => {
                  const trust = trustOf(creator)
                  const displayName = characterDisplayName(creator, locale)
                  const displayJob = characterDisplayJob(creator, locale)
                  return (
                    <tr
                      key={creator.id}
                      className={`border-b border-white/6 transition hover:bg-indigo-500/8 ${
                        index % 2 === 0 ? 'bg-black/10' : 'bg-transparent'
                      }`}
                    >
                      <td className="px-3 py-2.5 sm:px-4">
                        <div className="flex items-center gap-2">
                          {creator.profileImageUrl ? (
                            <img
                              src={creator.profileImageUrl}
                              alt={displayName}
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-slate-950 ${creator.avatarTone}`}
                            >
                              {displayName.slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-100">{displayName}</p>
                            <p className="text-[10px] text-slate-500">{displayJob}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${GRADE_STYLE[creator.grade]}`}
                        >
                          {creator.grade}급
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-300">{creator.popularity}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-300">{creator.skill ?? '—'}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-300">
                        LV.{creator.heat ?? 1}
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-amber-400">
                        {formatSalary(creator.salary)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-300"
                              style={{ width: `${trust}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-xs text-slate-300">{trust}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedId(creator.id)}
                          className="game-btn rounded-lg px-2.5 py-1 text-xs"
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

function ScoutView({
  offer,
  assets,
  ownedCount,
  registeredCount,
  onBack,
  onViewed,
  onPass,
  onHire,
}: {
  offer: ScoutOffer | null
  assets: number
  ownedCount: number
  registeredCount: number
  onBack: () => void
  onViewed: () => void
  onPass: () => void
  onHire: (offer: ScoutOffer) => void
}) {
  const { t, locale } = useTranslation()
  const stats = offer?.stats
  const hireCheck = offer ? canHireScoutOffer(offer, assets) : null
  const mustHire = ownedCount <= 0

  useEffect(() => {
    onViewed()
    // 진입 시 1회만 레드닷 해제
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="game-panel-strong flex shrink-0 flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        {mustHire ? null : (
          <button type="button" onClick={onBack} className="game-btn rounded-xl px-3 py-2 text-sm">
            ← 돌아가기
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="game-kicker">SCOUT</p>
          <h2 className="truncate text-base font-semibold text-slate-100">{t('creator.scout')}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t('creator.scoutDesc')}</p>
        </div>
      </header>

      {offer ? (
        <div className="shrink-0 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-center text-sm font-semibold text-indigo-200">
          {t('creator.scoutNewArrival')}
        </div>
      ) : null}

      <section className="game-panel flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-2xl p-4 sm:p-6">
        {!offer || !stats ? (
          <div className="flex max-w-md flex-col items-center gap-2 text-center">
            {registeredCount === 0 ? (
              <>
                <p className="text-sm text-slate-300">등록된 캐릭터가 없습니다.</p>
                <p className="text-xs text-slate-500">
                  에디터에서 캐릭터를 추가하면 스카우트 후보로 등장합니다.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-300">{t('creator.scoutWaiting')}</p>
                <p className="text-xs text-slate-500">{t('creator.scoutEmpty')}</p>
              </>
            )}
          </div>
        ) : (
          <article className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <div className="game-card relative aspect-[3/4] overflow-hidden sm:aspect-auto sm:min-h-[22rem]">
              {offer.template.profileImageUrl ? (
                <img
                  src={offer.template.profileImageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-700 to-slate-950">
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-slate-950 ${offer.template.avatarTone}`}
                  >
                    {characterDisplayName(offer.template, locale).slice(0, 1)}
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              <div className="absolute top-2 left-2">
                <span
                  className={`rounded border px-2 py-0.5 text-xs font-bold ${GRADE_STYLE[offer.grade]}`}
                >
                  {offer.grade}급
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="text-lg font-bold text-slate-50">
                  {characterDisplayName(offer.template, locale)}
                </h3>
                <p className="text-xs text-slate-300">
                  {characterDisplayJob(offer.template, locale)}
                  {offer.template.age ? ` · ${offer.template.age}세` : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/25 p-4">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold tracking-wide text-slate-500">제안 연봉</p>
                  <p className="text-xl font-black tabular-nums text-amber-400">
                    {formatSalary(offer.salary)}
                  </p>
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  {t('creator.statRevenueMult')} ×{stats.revenueMult.toFixed(1)}
                </p>
              </div>

              <div className="space-y-2.5">
                <StatBar
                  label={t('creator.statPopularity')}
                  valueLabel={`${stats.popularity}`}
                  percent={stats.popularity}
                  barClass="from-pink-400 to-rose-300"
                />
                <StatBar
                  label={t('creator.statSkill')}
                  valueLabel={`${stats.skill}`}
                  percent={stats.skill}
                  barClass="from-violet-400 to-indigo-300"
                />
                <StatBar
                  label={t('creator.statHeat')}
                  valueLabel={`LV.${stats.heat}`}
                  percent={(stats.heat / 2) * 100}
                  barClass="from-orange-400 to-amber-300"
                />
                <StatBar
                  label={t('creator.statTrust')}
                  valueLabel={`${stats.trust}`}
                  percent={stats.trust}
                  barClass="from-indigo-400 to-sky-300"
                />
                <StatBar
                  label={t('creator.statStamina')}
                  valueLabel={`${stats.stamina}/${stats.staminaMax}`}
                  percent={(stats.stamina / Math.max(1, stats.staminaMax)) * 100}
                  barClass="from-cyan-400 to-teal-300"
                />
              </div>

              {hireCheck && !hireCheck.ok ? (
                <p className="text-center text-[11px] font-semibold text-rose-300">
                  {t('creator.scoutHireBlockedAssets')}
                </p>
              ) : null}

              <div
                className={`mt-auto grid gap-2 pt-2 ${mustHire ? 'grid-cols-1' : 'grid-cols-2'}`}
              >
                {mustHire ? null : (
                  <button
                    type="button"
                    onClick={onPass}
                    className="game-btn rounded-xl px-4 py-3 text-sm font-semibold"
                  >
                    {t('creator.scoutPass')}
                  </button>
                )}
                <button
                  type="button"
                  disabled={!hireCheck?.ok}
                  onClick={() => onHire(offer)}
                  className="game-btn-pink rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('creator.scoutHire')}
                </button>
              </div>
            </div>
          </article>
        )}
      </section>
    </div>
  )
}

function CreatorDetailView({
  creator,
  assets,
  broadcastMonthNumber,
  onBack,
  onConditionCare,
  onVacation,
}: {
  creator: OwnedCreator
  assets: number
  broadcastMonthNumber: number
  onBack: () => void
  onConditionCare: (creatorId: string) => void
  onVacation: (creatorId: string) => void
}) {
  const { t, locale } = useTranslation()
  const displayName = characterDisplayName(creator, locale)
  const displayJob = characterDisplayJob(creator, locale)
  const trust = trustOf(creator)
  const staminaPct = Math.round((creator.stamina / Math.max(1, creator.staminaMax)) * 100)
  const skill = creator.skill ?? 0
  const heat = creator.heat ?? 1
  const revenueMult = creator.revenueMult ?? 1
  const conditionScore = scoreOf(creator)
  const condition = conditionFromScore(conditionScore)
  const vacationCost = calcVacationCost(creator.salary, creator.grade)
  const vacationUsed = creator.lastVacationMonth === broadcastMonthNumber
  const canAffordVacation = assets >= vacationCost
  const canVacation = !vacationUsed && canAffordVacation
  const broadcastBlocked = !canBroadcastByStamina(creator.stamina)
  const careCost = calcConditionFullCareCost(creator.grade)
  const conditionFull = conditionScore >= 100
  const canAffordCare = assets >= careCost
  const canCare = !conditionFull && canAffordCare

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="game-panel-strong flex shrink-0 flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <button type="button" onClick={onBack} className="game-btn rounded-xl px-3 py-2 text-sm">
          ← 돌아가기
        </button>
        <div className="min-w-0 flex-1">
          <p className="game-kicker">CREATOR PROFILE</p>
          <h2 className="truncate text-base font-semibold text-slate-100">
            {displayName}{' '}
            <span className={`text-sm font-bold ${GRADE_TEXT[creator.grade]}`}>
              ({creator.grade}급)
            </span>
          </h2>
        </div>
        <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold tracking-wide text-cyan-400/80">월급 지출일</p>
          <p className="text-sm font-bold text-cyan-300">{creator.nextPayTurns}턴 후</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto lg:grid-cols-[auto_minmax(0,1fr)] lg:overflow-hidden">
        <section className="flex justify-center lg:h-full lg:min-h-0 lg:items-center">
          <article className="game-card relative aspect-[3/4] w-full max-w-[18rem] overflow-hidden lg:max-h-full lg:w-[min(20rem,34vh)]">
            {creator.profileImageUrl ? (
              <img
                src={creator.profileImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-slate-700/80 to-slate-950">
                <div
                  className={`mb-16 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-slate-950 ${creator.avatarTone}`}
                >
                  {creator.name.slice(0, 1)}
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            <div className="absolute top-2.5 left-2.5">
              <span
                className={`rounded border px-2 py-0.5 text-xs font-bold ${GRADE_STYLE[creator.grade]}`}
              >
                {creator.grade}급
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400">{displayJob}</p>
              <h3 className="text-lg font-bold text-slate-50">{displayName}</h3>
              <p className="mt-0.5 text-xs text-slate-300">
                {displayJob}
                {creator.age ? ` · ${creator.age}세` : ''}
              </p>
            </div>
          </article>
        </section>

        <section className="game-panel flex min-h-0 flex-col overflow-auto rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold tracking-wide text-slate-100">핵심 능력치 & 상태</h3>

          {broadcastBlocked ? (
            <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
              {t('creator.broadcastBlocked')}
            </p>
          ) : null}

          <div className="mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
            <StatBar
              label={t('creator.statPopularity')}
              valueLabel={`${creator.popularity}`}
              percent={creator.popularity}
              barClass="from-pink-400 to-rose-300"
            />
            <StatBar
              label={t('creator.statSkill')}
              valueLabel={`${skill}`}
              percent={skill}
              barClass="from-violet-400 to-indigo-300"
            />
            <StatBar
              label={t('creator.statHeat')}
              valueLabel={`LV.${heat}`}
              percent={(heat / 2) * 100}
              barClass="from-orange-400 to-amber-300"
            />
            <StatBar
              label={t('creator.statTrust')}
              valueLabel={`${trust}%`}
              note={trust >= 90 ? '만족도 최고' : '관리 필요'}
              percent={trust}
              barClass="from-indigo-400 to-violet-300"
            />
            <StatBar
              label={t('creator.statStamina')}
              valueLabel={`${creator.stamina}/${creator.staminaMax}`}
              percent={staminaPct}
              barClass="from-cyan-400 to-teal-300"
            />
            <StatBar
              label={t('condition.title')}
              valueLabel={`${CONDITION_ICON[condition]} ${t(CONDITION_LABEL_KEY[condition])} (${conditionScore})`}
              percent={conditionScore}
              barClass="from-emerald-400 to-lime-300"
            />
            <StatBar
              label={t('creator.statRevenueMult')}
              valueLabel={`×${revenueMult.toFixed(1)}`}
              percent={Math.min(100, (revenueMult / 2) * 100)}
              barClass="from-amber-400 to-yellow-300"
            />
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wide text-slate-500">현재 연봉</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-amber-400">
                {formatSalary(creator.salary)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                남은 계약: {formatContract(creator.contractWeeks)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold tracking-wide text-slate-100">
              {t('creator.careTitle')}
            </h3>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!canVacation}
                onClick={() => onVacation(creator.id)}
                className="game-btn flex w-full flex-col items-start rounded-xl px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-sm font-semibold text-slate-100">
                  {t('creator.vacationTitle')}
                </span>
                <span className="mt-0.5 text-xs text-slate-400">
                  {t('creator.vacationDesc')} · {formatSalary(vacationCost)}
                </span>
                {vacationUsed ? (
                  <span className="mt-1 text-[10px] font-semibold text-amber-300/80">
                    {t('creator.vacationUsed')}
                  </span>
                ) : !canAffordVacation ? (
                  <span className="mt-1 text-[10px] font-semibold text-rose-300/80">
                    {t('creator.careNeedAssets')}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                disabled={!canCare}
                onClick={() => onConditionCare(creator.id)}
                className="game-btn flex w-full flex-col items-start rounded-xl px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-100">
                    {t('creator.careOption')}
                  </span>
                  <span className="text-sm font-black tabular-nums text-amber-300">
                    −{formatSalary(careCost)}
                  </span>
                </span>
                <span className="mt-0.5 text-xs text-slate-400">
                  {t('creator.careFullDesc')} · {creator.grade}급
                </span>
                {conditionFull ? (
                  <span className="mt-1 text-[10px] font-semibold text-emerald-300/80">
                    {t('creator.careAlreadyBest')}
                  </span>
                ) : !canAffordCare ? (
                  <span className="mt-1 text-[10px] font-semibold text-rose-300/80">
                    {t('creator.careNeedAssets')}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function StatBar({
  label,
  valueLabel,
  note,
  percent,
  barClass,
}: {
  label: string
  valueLabel: string
  note?: string
  percent: number
  barClass: string
}) {
  const width = Math.max(0, Math.min(100, percent))
  return (
    <div>
      <div className="mb-1 flex items-end justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400">{label}</p>
        <p className="text-xs font-bold tabular-nums text-slate-200">{valueLabel}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {note ? <p className="mt-1 text-[10px] text-slate-500">{note}</p> : null}
    </div>
  )
}
