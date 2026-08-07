import { useMemo, useState } from 'react'
import {
  scoutCandidates,
  type Grade,
  type OwnedCreator,
  type RegisteredCharacter,
} from '../game/characters'

type CreatorPanelProps = {
  ownedCreators: OwnedCreator[]
  registeredCharacters: RegisteredCharacter[]
  onScout: (character: RegisteredCharacter) => void
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

const CARE_ACTIONS = [
  {
    id: 'bonus',
    title: '특별 보너스 지급',
    desc: '충성도 +15%, 사기 진작',
  },
  {
    id: 'gift',
    title: '선물하기',
    desc: '호감도 상승 & 스트레스 ↓',
  },
  {
    id: 'renegotiate',
    title: '연봉 재협상',
    desc: '계약 연장 및 인상',
  },
  {
    id: 'vacation',
    title: '특별 휴가 보내기',
    desc: '체력 100% 즉시 회복',
  },
] as const

function formatSalary(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`
}

function formatSalaryShort(value: number) {
  const millions = value / 1_000_000
  return `₩${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M/년`
}

function formatContract(weeks: number) {
  if (weeks >= 48) return `${weeks}주 (1년)`
  return `${weeks}주`
}

export function CreatorPanel({
  ownedCreators,
  registeredCharacters,
  onScout,
}: CreatorPanelProps) {
  const [view, setView] = useState<'roster' | 'scout'>('roster')
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState<'ALL' | Grade>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ownedCreators.filter((creator) => {
      const matchGrade = gradeFilter === 'ALL' || creator.grade === gradeFilter
      const matchQuery =
        q.length === 0 ||
        creator.name.toLowerCase().includes(q) ||
        creator.concept.toLowerCase().includes(q)
      return matchGrade && matchQuery
    })
  }, [ownedCreators, query, gradeFilter])

  const sortedBySalary = useMemo(
    () => [...filtered].sort((a, b) => b.salary - a.salary),
    [filtered],
  )

  const selected = ownedCreators.find((creator) => creator.id === selectedId) ?? null
  const candidates = scoutCandidates(registeredCharacters, ownedCreators)

  if (view === 'scout') {
    return (
      <ScoutView
        candidates={candidates}
        registeredCount={registeredCharacters.length}
        onBack={() => setView('roster')}
        onScout={(character) => {
          onScout(character)
          setView('roster')
          setSelectedId(character.id)
        }}
      />
    )
  }

  if (selected) {
    return (
      <CreatorDetailView creator={selected} onBack={() => setSelectedId(null)} />
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

        <button
          type="button"
          onClick={() => setView('scout')}
          className="game-btn-primary rounded-xl px-4 py-2 text-sm"
        >
          <span aria-hidden>＋</span>
          스카우트
        </button>
      </div>

      <section className="shrink-0">
        <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
          <p className="text-xs font-semibold tracking-wide text-slate-400">보유 크리에이터 카드</p>
          <p className="text-[10px] text-slate-500">좌우 스크롤 · 클릭 시 상세</p>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {filtered.map((creator) => (
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
                    {creator.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="border-t border-white/8 px-2 py-2">
                <h3 className="truncate text-xs font-semibold text-slate-100">{creator.name}</h3>
                <p className="mt-0.5 text-[10px] font-semibold text-amber-400">
                  {formatSalaryShort(creator.salary)}
                </p>
              </div>
            </button>
          ))}
          {filtered.length === 0 ? (
            <div className="flex min-h-[10rem] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 text-center">
              <p className="text-sm text-slate-400">보유 캐릭터가 없습니다.</p>
              <p className="text-xs text-slate-500">
                스카우트를 눌러 등록된 캐릭터를 영입하세요.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="game-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5 sm:px-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-200">
              연봉 & 계약 정산
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">연봉순 정렬 · 엑셀 스타일 테이블</p>
          </div>
          <span className="game-chip text-[10px]">{sortedBySalary.length}명</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {sortedBySalary.length === 0 ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-sm text-slate-400">표시할 크리에이터가 없습니다.</p>
              <button
                type="button"
                onClick={() => setView('scout')}
                className="game-btn-primary mt-1 rounded-xl px-4 py-2 text-sm"
              >
                스카우트하러 가기
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
                <tr className="border-b border-white/10 text-[10px] tracking-wide text-slate-500 uppercase">
                  <th className="px-3 py-2.5 font-semibold sm:px-4">이름</th>
                  <th className="px-3 py-2.5 font-semibold">등급</th>
                  <th className="px-3 py-2.5 font-semibold">인기도</th>
                  <th className="px-3 py-2.5 font-semibold">현재 연봉</th>
                  <th className="px-3 py-2.5 font-semibold">계약 기간</th>
                  <th className="px-3 py-2.5 font-semibold">다음 월급</th>
                  <th className="px-3 py-2.5 font-semibold">충성도</th>
                  <th className="px-3 py-2.5 font-semibold sm:px-4">액션</th>
                </tr>
              </thead>
              <tbody>
                {sortedBySalary.map((creator, index) => (
                  <tr
                    key={creator.id}
                    className={`border-b border-white/6 transition hover:bg-indigo-500/8 ${
                      index % 2 === 0 ? 'bg-black/10' : 'bg-transparent'
                    }`}
                  >
                    <td className="px-3 py-2.5 sm:px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-slate-950 ${creator.avatarTone}`}
                        >
                          {creator.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-100">{creator.name}</p>
                          <p className="text-[10px] text-slate-500">{creator.concept}</p>
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
                    <td className="px-3 py-2.5 font-semibold tabular-nums text-amber-400">
                      {formatSalary(creator.salary)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {formatContract(creator.contractWeeks)}
                    </td>
                    <td className="px-3 py-2.5 text-cyan-300">{creator.nextPayTurns}턴 후</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-300"
                            style={{ width: `${creator.loyalty}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-xs text-slate-300">{creator.loyalty}%</span>
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

function ScoutView({
  candidates,
  registeredCount,
  onBack,
  onScout,
}: {
  candidates: RegisteredCharacter[]
  registeredCount: number
  onBack: () => void
  onScout: (character: RegisteredCharacter) => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="game-panel-strong flex shrink-0 flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <button type="button" onClick={onBack} className="game-btn rounded-xl px-3 py-2 text-sm">
          ← 돌아가기
        </button>
        <div className="min-w-0 flex-1">
          <p className="game-kicker">SCOUT</p>
          <h2 className="truncate text-base font-semibold text-slate-100">스카우트</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            에디터에 등록된 캐릭터 중 아직 영입하지 않은 카드를 선택합니다.
          </p>
        </div>
        <span className="game-chip text-[10px]">후보 {candidates.length}명</span>
      </header>

      <section className="game-panel min-h-0 flex-1 overflow-auto rounded-2xl p-4 sm:p-5">
        {candidates.length === 0 ? (
          <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-2 text-center">
            {registeredCount === 0 ? (
              <>
                <p className="text-sm text-slate-300">등록된 캐릭터가 없습니다.</p>
                <p className="max-w-sm text-xs text-slate-500">
                  메인 메뉴 → 에디터 → 캐릭터 관리에서 캐릭터를 추가하면 스카우트 목록에
                  나타납니다.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-300">스카우트 가능한 캐릭터가 없습니다.</p>
                <p className="text-xs text-slate-500">등록된 캐릭터를 모두 영입했습니다.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {candidates.map((character) => (
              <article
                key={character.id}
                className="game-card flex flex-col overflow-hidden text-left"
              >
                <div className="relative flex aspect-[3/4] items-end justify-center bg-gradient-to-b from-slate-700/80 to-slate-950">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.18),transparent_55%)]" />
                  <div className="absolute top-1.5 left-1.5">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${GRADE_STYLE[character.grade]}`}
                    >
                      {character.grade}급
                    </span>
                  </div>
                  {character.profileImageUrl ? (
                    <img
                      src={character.profileImageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`relative mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-slate-950 ${character.avatarTone}`}
                    >
                      {character.name.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="border-t border-white/8 px-2.5 py-2.5">
                  <h3 className="truncate text-sm font-semibold text-slate-100">{character.name}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {character.concept}
                    {character.age ? ` · ${character.age}세` : ''}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-amber-400">
                    {formatSalaryShort(character.salary)}
                  </p>
                  <button
                    type="button"
                    onClick={() => onScout(character)}
                    className="game-btn-primary mt-2.5 w-full rounded-lg px-2 py-1.5 text-xs"
                  >
                    스카우트
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function CreatorDetailView({
  creator,
  onBack,
}: {
  creator: OwnedCreator
  onBack: () => void
}) {
  const staminaPct = Math.round((creator.stamina / creator.staminaMax) * 100)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="game-panel-strong flex shrink-0 flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <button type="button" onClick={onBack} className="game-btn rounded-xl px-3 py-2 text-sm">
          ← 돌아가기
        </button>
        <div className="min-w-0 flex-1">
          <p className="game-kicker">CREATOR PROFILE</p>
          <h2 className="truncate text-base font-semibold text-slate-100">
            {creator.name}{' '}
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

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-2">
        <section className="game-panel flex min-h-0 flex-col overflow-auto rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold tracking-wide text-slate-100">핵심 능력치 & 상태</h3>

          <div className="mt-4 space-y-4">
            <StatBar
              label="체력"
              valueLabel={`${creator.stamina}/${creator.staminaMax}`}
              note={`컨디션: ${creator.condition}`}
              percent={staminaPct}
              barClass="from-cyan-400 to-teal-300"
            />
            <StatBar
              label="충성도"
              valueLabel={`${creator.loyalty}%`}
              note={creator.loyalty >= 90 ? '만족도 최고' : '관리 필요'}
              percent={creator.loyalty}
              barClass="from-indigo-400 to-violet-300"
            />

            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
              <p className="text-[10px] font-semibold tracking-wide text-slate-500">현재 연봉</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-amber-400">
                {formatSalary(creator.salary)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                남은 계약: {formatContract(creator.contractWeeks)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold tracking-wide text-slate-100">
              인터랙션 & 관리 액션
            </h3>
            <div className="mt-3 space-y-2">
              {CARE_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="game-btn flex w-full flex-col items-start rounded-xl px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-slate-100">{action.title}</span>
                  <span className="mt-0.5 text-xs text-slate-400">{action.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="game-panel relative min-h-[16rem] overflow-hidden rounded-2xl lg:min-h-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(129,140,248,0.28),transparent_50%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

          <div className="relative flex h-full min-h-[16rem] flex-col items-center justify-end px-6 pb-8 pt-10 lg:min-h-0">
            {creator.profileImageUrl ? (
              <img
                src={creator.profileImageUrl}
                alt=""
                className="mb-4 h-48 w-40 rounded-2xl object-cover shadow-2xl sm:h-56 sm:w-44"
              />
            ) : (
              <div
                className={`mb-4 flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br text-5xl font-black text-slate-950 shadow-2xl sm:h-48 sm:w-48 sm:text-6xl ${creator.avatarTone}`}
              >
                {creator.name.slice(0, 1)}
              </div>
            )}
            <p className="text-xl font-semibold text-slate-100">{creator.name}</p>
            <p className="mt-1 text-sm text-amber-400">
              {creator.grade}급 · {creator.concept}
            </p>
            <p className="mt-3 max-w-xs text-center text-xs text-slate-400">
              크리에이터 대형 일러스트 / 스탠딩 영역
            </p>
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
  note: string
  percent: number
  barClass: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-300">{label}</p>
          <p className="text-[10px] text-slate-500">{note}</p>
        </div>
        <p className="text-xs font-bold tabular-nums text-slate-100">{valueLabel}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barClass}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  )
}
