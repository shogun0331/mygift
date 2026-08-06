import { useMemo, useState } from 'react'

type Grade = 'S' | 'A' | 'B' | 'C'

type Creator = {
  id: string
  name: string
  grade: Grade
  popularity: number
  concept: string
}

const CREATORS: Creator[] = [
  { id: '1', name: '이지현', grade: 'B', popularity: 40, concept: '청순' },
  { id: '2', name: '한소희', grade: 'A', popularity: 55, concept: '섹시' },
  { id: '3', name: '김미래', grade: 'A', popularity: 50, concept: '카리스마' },
  { id: '4', name: '서아람', grade: 'B', popularity: 45, concept: '개그' },
  { id: '5', name: '정유진', grade: 'B', popularity: 35, concept: '힐링' },
  { id: '6', name: '박순정', grade: 'C', popularity: 20, concept: '뉴비' },
]

const GRADE_FILTERS: Array<'ALL' | Grade> = ['ALL', 'S', 'A', 'B', 'C']

const GRADE_STYLE: Record<Grade, string> = {
  S: 'border-amber-400/40 bg-amber-400/15 text-amber-300',
  A: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-300',
  B: 'border-slate-500/50 bg-slate-700/40 text-slate-300',
  C: 'border-slate-700 bg-slate-800/60 text-slate-400',
}

export function CreatorPanel() {
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState<'ALL' | Grade>('ALL')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CREATORS.filter((creator) => {
      const matchGrade = gradeFilter === 'ALL' || creator.grade === gradeFilter
      const matchQuery =
        q.length === 0 ||
        creator.name.toLowerCase().includes(q) ||
        creator.concept.toLowerCase().includes(q)
      return matchGrade && matchQuery
    })
  }, [query, gradeFilter])

  return (
    <div className="flex min-h-full flex-col gap-4">
      {/* Action bar */}
      <div className="game-panel-strong flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <label className="relative min-w-[12rem] flex-1">
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

        <button type="button" className="game-btn-primary rounded-xl px-4 py-2 text-sm">
          <span aria-hidden>＋</span>
          스카우트
        </button>
      </div>

      {/* Creator cards */}
      <div className="flex flex-wrap gap-2.5">
        {filtered.map((creator) => (
          <article
            key={creator.id}
            className="game-card w-[8.5rem] sm:w-[9rem]"
          >
            <div className="relative flex aspect-[3/4] items-end justify-center bg-gradient-to-b from-slate-700/80 to-slate-950">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.22),transparent_55%)]" />
              <div className="absolute top-1.5 left-1.5">
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${GRADE_STYLE[creator.grade]}`}
                >
                  {creator.grade}
                </span>
              </div>
              <div className="relative mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-indigo-300/25 bg-indigo-500/10 text-sm font-bold text-indigo-50">
                {creator.name.slice(0, 1)}
              </div>
            </div>

            <div className="border-t border-white/8 px-2 py-2">
              <h3 className="truncate text-xs font-semibold text-slate-100">
                {creator.name}
              </h3>
              <p className="mt-0.5 text-[10px] font-semibold text-amber-400">
                {creator.grade} · {creator.popularity} 인기
              </p>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-500">
          검색 결과가 없습니다.
        </div>
      ) : null}
    </div>
  )
}
