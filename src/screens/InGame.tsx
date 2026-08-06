import { useState, type ReactNode } from 'react'
import { CreatorPanel } from './CreatorPanel'
import { DashboardPanel } from './DashboardPanel'
import { EquipmentPanel } from './EquipmentPanel'
import { SchedulePanel } from './SchedulePanel'

export type GameTab =
  | 'dashboard'
  | 'creator'
  | 'schedule'
  | 'equipment'
  | 'settings'

const TAB_TITLES: Record<GameTab, string> = {
  dashboard: 'DASHBOARD',
  creator: 'CREATOR',
  schedule: 'SCHEDULE',
  equipment: 'EQUIPMENT',
  settings: 'SETTINGS',
}

function IconBack() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.5 6.5 9 12l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconDashboard() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconCreator() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5.5 19.5c1.2-3.2 3.5-4.8 6.5-4.8s5.3 1.6 6.5 4.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSchedule() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 13h3M13 13h3M8 16.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconEquipment() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="7" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 10.5l4-2.2v7.4l-4-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="8.2" cy="18.8" r="1.2" fill="currentColor" />
      <circle cx="12.2" cy="18.8" r="1.2" fill="currentColor" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
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

const TABS: { id: GameTab; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'DASHBOARD', icon: <IconDashboard /> },
  { id: 'creator', label: 'CREATOR', icon: <IconCreator /> },
  { id: 'schedule', label: 'SCHEDULE', icon: <IconSchedule /> },
  { id: 'equipment', label: 'EQUIPMENT', icon: <IconEquipment /> },
  { id: 'settings', label: 'SETTINGS', icon: <IconSettings /> },
]

type InGameProps = {
  onBack: () => void
  onStartBroadcast: () => void
}

export function InGame({ onBack, onStartBroadcast }: InGameProps) {
  const [tab, setTab] = useState<GameTab>('dashboard')

  return (
    <main className="game-stage fixed inset-0 grid h-dvh grid-rows-[auto_1fr_auto] overflow-hidden">
      <header className="game-hud z-20 flex shrink-0 items-center justify-between gap-4 px-6 py-3">
        <div>
          <p className="game-kicker">STAR BROADCASTING CO.</p>
          <h1
            className="game-title mt-1 text-2xl"
            style={{ letterSpacing: '0.04em' }}
          >
            {TAB_TITLES[tab]}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="game-panel rounded-xl px-4 py-2 text-right">
            <p className="game-stat-label">자산</p>
            <p className="text-sm font-bold text-amber-400">₩12,500,000</p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="game-btn px-4 py-2 text-sm"
          >
            <IconBack />
            <span>뒤로가기</span>
          </button>
        </div>
      </header>

      <section className="z-10 min-h-0 overflow-auto p-6">
        {tab === 'dashboard' ? (
          <DashboardPanel onStartBroadcast={onStartBroadcast} />
        ) : tab === 'creator' ? (
          <CreatorPanel />
        ) : tab === 'schedule' ? (
          <SchedulePanel />
        ) : tab === 'equipment' ? (
          <EquipmentPanel />
        ) : (
          <div className="game-panel min-h-full rounded-2xl p-6 text-slate-500">
            <p className="text-base">{TAB_TITLES[tab]} 화면 준비 중</p>
          </div>
        )}
      </section>

      <nav className="game-dock z-20 shrink-0 px-6 py-3" aria-label="인게임 메뉴">
        <div className="mx-auto flex w-full max-w-5xl gap-2">
          {TABS.map((item) => {
            const isActive = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`game-btn-tab flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold tracking-wide ${
                  isActive ? 'is-active' : ''
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </main>
  )
}
