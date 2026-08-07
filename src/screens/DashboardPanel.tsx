import type { ReactNode } from 'react'

type DashboardPanelProps = {
  onStartBroadcast: () => void
}

type StreamSlot = {
  id: string
  label: string
  live: boolean
  name: string
  concept: string
  tag?: { text: string; tone: 'amber' | 'rose' | 'cyan' | 'violet' }
  stamina: number
  staminaMax: number
  viewers: string
  preview: string
  avatar: string
  avatarTone: string
}

type UnassignedCreator = {
  id: string
  name: string
  grade: 'S' | 'A' | 'B' | 'C'
  avatar: string
  avatarTone: string
  energy: number
  mood: number
}

const STREAMS: StreamSlot[] = [
  {
    id: '1',
    label: 'STREAM 01',
    live: true,
    name: 'HAN SOHEE',
    concept: 'SEXY',
    stamina: 75,
    staminaMax: 100,
    viewers: '12.5k',
    preview: 'from-rose-500/40 via-fuchsia-700/30 to-slate-950',
    avatar: '한',
    avatarTone: 'from-rose-400 to-amber-300',
  },
  {
    id: '2',
    label: 'STREAM 02',
    live: true,
    name: 'VTUBER YURI',
    concept: 'IDOL',
    tag: { text: '음악', tone: 'amber' },
    stamina: 90,
    staminaMax: 100,
    viewers: '8.9k',
    preview: 'from-violet-400/35 via-indigo-600/35 to-slate-950',
    avatar: 'Yuri',
    avatarTone: 'from-violet-300 to-pink-400',
  },
  {
    id: '3',
    label: 'STREAM 03',
    live: true,
    name: 'K-FOOD MUKBANG',
    concept: '',
    stamina: 62,
    staminaMax: 100,
    viewers: '5.2k',
    preview: 'from-orange-400/35 via-amber-700/25 to-slate-950',
    avatar: '먹',
    avatarTone: 'from-orange-300 to-rose-400',
  },
  {
    id: '4',
    label: 'STREAM 04',
    live: true,
    name: 'MIDNIGHT TALK',
    concept: '',
    stamina: 48,
    staminaMax: 100,
    viewers: '3.1k',
    preview: 'from-sky-400/30 via-indigo-800/35 to-slate-950',
    avatar: '톡',
    avatarTone: 'from-sky-300 to-indigo-400',
  },
  {
    id: '5',
    label: 'STREAM 05',
    live: true,
    name: 'GAMING ZONE',
    concept: '',
    tag: { text: 'IT/X', tone: 'rose' },
    stamina: 81,
    staminaMax: 100,
    viewers: '9.4k',
    preview: 'from-emerald-400/30 via-cyan-800/30 to-slate-950',
    avatar: 'G',
    avatarTone: 'from-emerald-300 to-cyan-400',
  },
  {
    id: '6',
    label: 'STREAM 06',
    live: false,
    name: 'EMPTY SLOT',
    concept: '',
    stamina: 0,
    staminaMax: 100,
    viewers: '—',
    preview: 'from-slate-700/40 via-slate-900 to-slate-950',
    avatar: '＋',
    avatarTone: 'from-slate-500 to-slate-700',
  },
]

const EVENTS = [
  { time: '15:32', text: '한소희 인기 급증!', tone: 'bg-amber-400' },
  { time: '15:10', text: '세금 납부 기간입니다.', tone: 'bg-indigo-400' },
  { time: '14:48', text: '신규 이벤트 신청 가능', tone: 'bg-emerald-400' },
  { time: '14:21', text: '유리 스태미나 회복 완료', tone: 'bg-cyan-400' },
  { time: '13:55', text: '장비 강화 성공 · CAM +1', tone: 'bg-violet-400' },
]

const UNASSIGNED: UnassignedCreator[] = [
  {
    id: 'u1',
    name: '서아람',
    grade: 'A',
    avatar: '서',
    avatarTone: 'from-amber-300 to-orange-500',
    energy: 72,
    mood: 64,
  },
  {
    id: 'u2',
    name: '정유진',
    grade: 'B',
    avatar: '정',
    avatarTone: 'from-sky-300 to-indigo-500',
    energy: 58,
    mood: 71,
  },
  {
    id: 'u3',
    name: '김미래',
    grade: 'S',
    avatar: '김',
    avatarTone: 'from-fuchsia-300 to-rose-500',
    energy: 88,
    mood: 80,
  },
  {
    id: 'u4',
    name: '박순정',
    grade: 'C',
    avatar: '박',
    avatarTone: 'from-slate-300 to-slate-500',
    energy: 41,
    mood: 53,
  },
]

const GRADE_STYLE: Record<UnassignedCreator['grade'], string> = {
  S: 'text-amber-300',
  A: 'text-indigo-300',
  B: 'text-slate-300',
  C: 'text-slate-500',
}

const TAG_STYLE = {
  amber: 'border-amber-400/30 bg-amber-400/15 text-amber-300',
  rose: 'border-rose-400/30 bg-rose-400/15 text-rose-300',
  cyan: 'border-cyan-400/30 bg-cyan-400/15 text-cyan-300',
  violet: 'border-violet-400/30 bg-violet-400/15 text-violet-300',
} as const

export function DashboardPanel({ onStartBroadcast }: DashboardPanelProps) {
  return (
    <div className="grid min-h-full grid-cols-1 gap-4 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
      <section className="grid min-h-0 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:grid-rows-2">
        {STREAMS.map((stream) => (
          <StreamCard key={stream.id} stream={stream} />
        ))}
      </section>

      <aside className="flex min-h-0 flex-col gap-3">
        <section className="game-panel flex min-h-0 flex-1 flex-col rounded-2xl p-3.5">
          <h2 className="game-stat-label shrink-0">Recent Events</h2>
          <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
            {EVENTS.map((event) => (
              <li
                key={`${event.time}-${event.text}`}
                className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/20 px-2.5 py-2 text-xs text-slate-300"
              >
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${event.tone}`} />
                <div className="min-w-0">
                  <span className="mr-1.5 font-semibold text-slate-500">{event.time}</span>
                  <span>{event.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="game-panel shrink-0 rounded-2xl p-3.5">
          <h2 className="game-stat-label">Unassigned Creators Deck</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            {UNASSIGNED.map((creator) => (
              <article
                key={creator.id}
                className="rounded-xl border border-white/10 bg-black/25 p-2 text-center"
              >
                <div
                  className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-slate-950 ${creator.avatarTone}`}
                >
                  {creator.avatar}
                </div>
                <p className={`mt-1.5 text-lg font-black leading-none ${GRADE_STYLE[creator.grade]}`}>
                  {creator.grade}
                </p>
                <p className="mt-1 truncate text-[10px] text-slate-400">{creator.name}</p>
                <div className="mt-1.5 flex items-center justify-center gap-2 text-[10px] text-slate-500">
                  <span>⚡{creator.energy}</span>
                  <span>～{creator.mood}</span>
                </div>
                <button
                  type="button"
                  className="game-btn mt-2 w-full rounded-lg px-1 py-1 text-[9px] tracking-wide"
                >
                  DRAG TO STREAM
                </button>
              </article>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={onStartBroadcast}
          className="game-btn-primary mt-auto w-full shrink-0 rounded-2xl px-4 py-3.5 text-[15px] font-bold tracking-wide"
        >
          ▶ 방송시작
        </button>
      </aside>
    </div>
  )
}

function StreamCard({ stream }: { stream: StreamSlot }) {
  const empty = stream.name === 'EMPTY SLOT'
  const staminaPct = Math.max(0, Math.min(100, (stream.stamina / stream.staminaMax) * 100))

  return (
    <article className="game-panel flex min-h-0 flex-col overflow-hidden rounded-2xl">
      <div className={`relative min-h-[7.5rem] flex-1 bg-gradient-to-br ${stream.preview}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/90 to-transparent" />

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
          <span className="rounded-md border border-white/10 bg-black/45 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-slate-200 backdrop-blur-sm">
            {stream.label}
          </span>
          {stream.live ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-300">
              <span className="game-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
              LIVE
            </span>
          ) : (
            <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              IDLE
            </span>
          )}
        </div>

        {empty ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs font-semibold tracking-wide text-slate-400">CREATOR 미배정</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2.5 p-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-slate-950 ${stream.avatarTone}`}
          >
            {stream.avatar.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-xs font-semibold text-slate-100">
                {stream.name}
                {stream.concept ? (
                  <span className="font-medium text-amber-400"> ({stream.concept})</span>
                ) : null}
              </p>
              {stream.tag ? (
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${TAG_STYLE[stream.tag.tone]}`}
                >
                  {stream.tag.text}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-400">
            <IconEye />
            {stream.viewers}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="font-semibold tracking-wide text-slate-400">Stamina</span>
            <span className="font-semibold text-cyan-300">
              {stream.stamina}/{stream.staminaMax}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300"
              style={{ width: `${staminaPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1">
          <StreamAction label="배정" icon={<IconAssign />} />
          <StreamAction label="훈련" icon={<IconTrain />} />
          <StreamAction label="통계" icon={<IconStats />} />
          <StreamAction label="설정" icon={<IconGear />} />
        </div>
      </div>
    </article>
  )
}

function StreamAction({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      className="game-btn flex h-7 items-center justify-center rounded-lg text-slate-300"
    >
      <span className="sr-only">{label}</span>
      {icon}
    </button>
  )
}

function IconEye() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconAssign() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 18.5c.9-2.8 2.8-4.2 5.5-4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M17 9v6M14 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconTrain() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V8M12 8l-2.5 2.5M12 8l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="18.5" r="1.2" fill="currentColor" />
      <path d="M6 19.5h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconStats() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18V11M10 18V7M15 18v-5M20 18V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M4.9 6.4l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.6l1.6-1.6M17.5 8l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
