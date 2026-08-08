import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from '../locales/i18n'
import {
  toStudioHandCard,
  type OwnedCreator,
  type RegisteredCharacter,
} from '../game/characters'
import type { StudioSlot } from '../game/studioSlots'
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


const SPEED_OPTIONS = ['1x', '2x', '3x'] as const
type SpeedOption = (typeof SPEED_OPTIONS)[number]

function formatGameClock(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return {
    date: `${year}.${month}.${day}`,
    time: `${hours}:${minutes}:${seconds}`,
  }
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
  { id: 'schedule', label: 'STUDIO', icon: <IconSchedule /> },
  { id: 'equipment', label: 'EQUIPMENT', icon: <IconEquipment /> },
  { id: 'settings', label: 'SETTINGS', icon: <IconSettings /> },
]

type InGameProps = {
  registeredCharacters: RegisteredCharacter[]
  ownedCreators: OwnedCreator[]
  studioSlots: StudioSlot[]
  onStudioSlotsChange: (slots: StudioSlot[]) => void
  onScout: (character: RegisteredCharacter) => void
  onBack: () => void
  onOpenEditor?: () => void
  onStartBroadcast: () => void
}

export function InGame({
  registeredCharacters,
  ownedCreators,
  studioSlots,
  onStudioSlotsChange,
  onScout,
  onBack,
  onOpenEditor,
  onStartBroadcast,
}: InGameProps) {
  const { t, locale, setLocale } = useTranslation()
  const [tab, setTab] = useState<GameTab>('dashboard')
  const [speed, setSpeed] = useState<SpeedOption>('1x')
  const [now, setNow] = useState(() => new Date())
  const handCards = ownedCreators.map(toStudioHandCard)

  const handleUpgradeStudio = () => {
    const targetIndex = studioSlots.findIndex((slot) => slot.status === 'locked')
    if (targetIndex === -1) return
    onStudioSlotsChange(
      studioSlots.map((slot, idx) => {
        if (idx !== targetIndex) return slot
        return { ...slot, status: 'empty' }
      }),
    )
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const clock = formatGameClock(now)

  return (
    <main className="game-stage fixed inset-0 grid h-dvh grid-rows-[auto_1fr_auto] overflow-hidden">
      <header className="game-hud z-20 flex shrink-0 items-center justify-between gap-4 px-6 pt-6 pb-3">
        <div>
          <p className="game-kicker">STAR BROADCASTING CO.</p>
          <h1
            className="game-title mt-1 text-2xl"
            style={{ letterSpacing: '0.04em' }}
          >
            {t(`menu.${tab}`)}
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="game-panel rounded-xl px-3 py-2 text-right sm:px-4 border-indigo-500/25 shadow-[0_0_15px_rgba(0,245,255,0.04)]">
            <p className="game-stat-label">{t('hud.dateTime')}</p>
            <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-100 sm:text-sm">
              <span>{clock.date}</span>
              <span className="mx-1.5 text-slate-600">|</span>
              <span className="neon-text-cyan" style={{ textShadow: '0 0 8px rgba(0, 245, 255, 0.45)' }}>{clock.time}</span>
            </p>
          </div>

          <div className="game-panel rounded-xl px-2.5 py-2 sm:px-3 border-indigo-500/25">
            <p className="game-stat-label mb-1 px-0.5">{t('hud.speed')}</p>
            <div className="flex gap-1">
              {SPEED_OPTIONS.map((option) => {
                const isActive = speed === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSpeed(option)}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                      isActive ? 'game-btn-pink' : 'game-btn'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="game-panel rounded-xl px-3 py-2 text-right sm:px-4 border-indigo-500/25 shadow-[0_0_15px_rgba(251,191,36,0.04)]">
            <p className="game-stat-label">{t('hud.assets')}</p>
            <p className="text-sm font-black text-amber-400 animate-pulse" style={{ textShadow: '0 0 8px rgba(251, 191, 36, 0.45)' }}>₩12,500,000</p>
          </div>

          {import.meta.env.DEV && onOpenEditor ? (
            <button
              type="button"
              onClick={onOpenEditor}
              className="game-btn px-4 py-2 text-sm"
            >
              EDIT
            </button>
          ) : null}
          <button
            type="button"
            onClick={onBack}
            className="game-btn px-4 py-2 text-sm"
          >
            <IconBack />
            <span>{t('hud.back')}</span>
          </button>
        </div>
      </header>

      <section
        className={`relative z-10 min-h-0 ${
          tab === 'dashboard' || tab === 'schedule' || tab === 'creator'
            ? 'overflow-hidden p-3 sm:p-4'
            : 'overflow-auto p-6'
        }`}
      >
        {/* 탭 전환 시 언마운트하지 않아 idle 영상 루프 유지. 비활성 시 화면 밖으로 이동해 뒤에 비치지 않음 */}
        <div
          className={
            tab === 'dashboard'
              ? 'h-full min-h-0'
              : 'pointer-events-none fixed left-[-200vw] top-0 z-[-1] h-dvh w-screen overflow-hidden opacity-0'
          }
          aria-hidden={tab !== 'dashboard'}
        >
          <DashboardPanel
            slots={studioSlots}
            ownedCreators={ownedCreators}
            onStartBroadcast={onStartBroadcast}
          />
        </div>

        {tab === 'dashboard' ? null : tab === 'creator' ? (
          <CreatorPanel
            ownedCreators={ownedCreators}
            registeredCharacters={registeredCharacters}
            onScout={onScout}
          />
        ) : tab === 'schedule' ? (
          <SchedulePanel
            slots={studioSlots}
            handCards={handCards}
            onSlotsChange={onStudioSlotsChange}
          />
        ) : tab === 'equipment' ? (
          <EquipmentPanel onUpgradeStudio={handleUpgradeStudio} />
        ) : tab === 'settings' ? (
          <div className="neon-glow-card rounded-2xl p-6 bg-slate-950/50 backdrop-blur-md max-w-2xl mx-auto border border-indigo-500/20">
            <h2 className="text-lg font-bold text-slate-100 tracking-wider mb-5 flex items-center gap-2">
              ⚙️ {t('settings.title')}
            </h2>

            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 tracking-wider">
                  {t('settings.language')}
                </label>
                <p className="text-[10px] text-slate-600 mb-1">
                  {t('settings.languageDesc')}
                </p>
                <div className="relative">
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as any)}
                    className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl px-4 py-3 text-xs text-slate-200 font-bold focus:outline-none focus:border-pink-500/60 appearance-none cursor-pointer transition-all"
                  >
                    <option value="KO">한국어 (KO)</option>
                    <option value="EN">English (EN)</option>
                    <option value="JA">日本語 (JA)</option>
                    <option value="ZH-CN">简体中文 (ZH-CN)</option>
                    <option value="RU">Русский (RU)</option>
                    <option value="ES">Español (ES)</option>
                    <option value="DE">Deutsch (DE)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-indigo-400">
                    <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 tracking-wider">
                  {t('settings.audio')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">{t('settings.bgm')}</span>
                    <input type="range" className="accent-pink-500 bg-slate-900 border border-indigo-500/20 h-1.5 rounded-lg appearance-none cursor-pointer" defaultValue={70} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">{t('settings.se')}</span>
                    <input type="range" className="accent-pink-500 bg-slate-900 border border-indigo-500/20 h-1.5 rounded-lg appearance-none cursor-pointer" defaultValue={80} />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 tracking-wider">
                    {t('settings.devMode')}
                  </h3>
                  <p className="text-[9px] text-slate-600 mt-1">
                    {t('settings.devModeDesc')}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-bold bg-slate-900 border border-indigo-500/25 px-2.5 py-1 rounded-lg">
                  OFF
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="game-panel min-h-full rounded-2xl p-6 text-slate-500">
            <p className="text-base">{t(`menu.${tab}`) || (tab as string).toUpperCase()} 화면 준비 중</p>
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
                <span>{t(`menu.${item.id}`)}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </main>
  )
}
