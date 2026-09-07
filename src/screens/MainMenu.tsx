import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from '../locales/i18n'
import { useGameBgm } from '../game/bgm'
import { playSfx } from '../game/uiSfx'
import { listSaveMetas } from '../game/saveService'
import { SaveListPanel } from './SaveListPanel'
import { SettingsPanel } from './SettingsPanel'
import { EndingGalleryPanel } from './EndingGalleryPanel'
import { AchievementsPanel } from './AchievementsPanel'
import { MainMenuBackgroundSlideshow } from './MainMenuBackgroundSlideshow'

type MenuId =
  | 'continue'
  | 'new'
  | 'load'
  | 'settings'
  | 'gallery'
  | 'achievements'
  | 'exit'
  | 'edit'

type LeftPanelType = 'load' | 'settings' | 'gallery' | 'achievements' | null

type MenuItemDef = {
  id: Exclude<MenuId, 'continue' | 'edit'>
  labelKey: string
  subKey?: string
}

const MENU_ITEMS: MenuItemDef[] = [
  { id: 'new', labelKey: 'menu.newGame' },
  { id: 'load', labelKey: 'menu.loadGame', subKey: 'menu.savedData' },
  { id: 'settings', labelKey: 'menu.settings' },
  { id: 'gallery', labelKey: 'menu.gallery' },
  { id: 'achievements', labelKey: 'menu.achievements' },
  { id: 'exit', labelKey: 'menu.exit' },
]

type MainMenuProps = {
  onNewGame: () => void
  onLoadGame: (id?: string) => void
  onOpenEditor?: () => void
}

export function MainMenu({ onNewGame, onLoadGame, onOpenEditor }: MainMenuProps) {
  const { t } = useTranslation()
  const [saves, setSaves] = useState(() => listSaveMetas())
  const latestSave = saves.length > 0 ? saves[0] : null
  const [active, setActive] = useState<MenuId>(latestSave ? 'continue' : 'new')
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanelType>(null)

  // If latestSave disappears, switch active from 'continue' to 'new'
  useEffect(() => {
    if (!latestSave && active === 'continue') {
      setActive('new')
    }
  }, [latestSave, active])

  const showEditor = import.meta.env.DEV
  useGameBgm('menu')

  const menuList = useMemo(() => {
    const list: MenuId[] = []
    if (latestSave) list.push('continue')
    MENU_ITEMS.forEach((item) => list.push(item.id))
    if (showEditor) list.push('edit')
    return list
  }, [latestSave, showEditor])

  const handleSelect = useCallback((id: MenuId) => {
    playSfx('ui-click')
    setActive(id)
    if (id === 'continue' && latestSave) {
      setActiveLeftPanel(null)
      onLoadGame(latestSave.id)
      return
    }
    if (id === 'new') {
      setActiveLeftPanel(null)
      onNewGame()
      return
    }
    if (id === 'load') {
      setActiveLeftPanel((prev) => (prev === 'load' ? null : 'load'))
      return
    }
    if (id === 'settings') {
      setActiveLeftPanel((prev) => (prev === 'settings' ? null : 'settings'))
      return
    }
    if (id === 'gallery') {
      setActiveLeftPanel((prev) => (prev === 'gallery' ? null : 'gallery'))
      return
    }
    if (id === 'achievements') {
      setActiveLeftPanel((prev) => (prev === 'achievements' ? null : 'achievements'))
      return
    }
    setActiveLeftPanel(null)
    if (id === 'edit') {
      onOpenEditor?.()
      return
    }
    if (id === 'exit' && window.confirm(t('menu.confirmExit'))) {
      window.close()
    }
  }, [latestSave, onLoadGame, onNewGame, onOpenEditor, t])

  // Keyboard navigation for menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeLeftPanel) {
        setActiveLeftPanel(null)
        playSfx('ui-click')
        return
      }

      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        const curIdx = menuList.indexOf(active)
        const nextIdx = (curIdx + 1) % menuList.length
        setActive(menuList[nextIdx])
        playSfx('ui-click')
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        const curIdx = menuList.indexOf(active)
        const nextIdx = (curIdx - 1 + menuList.length) % menuList.length
        setActive(menuList[nextIdx])
        playSfx('ui-click')
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleSelect(active)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, activeLeftPanel, handleSelect, menuList])

  return (
    <main className="game-stage relative flex h-full w-full items-center justify-between overflow-hidden px-[clamp(1.5rem,4vw,5rem)] py-6 select-none">
      {/* Background Animated Ambient Lights */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[70vw] w-[70vw] rounded-full bg-gradient-to-br from-indigo-600/15 via-purple-600/10 to-transparent blur-[120px] animate-pulse duration-1000" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[60vw] w-[60vw] rounded-full bg-gradient-to-tl from-pink-600/15 via-amber-600/10 to-transparent blur-[140px] animate-pulse duration-700" />
      </div>

      {/* Atmospheric Background Scene Slideshow (Scout / Date 1 / Date 2) */}
      <MainMenuBackgroundSlideshow />

      {/* Cyber Grid Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)] opacity-60" />

      {/* ── LEFT SLIDING PANEL (LOAD / SETTINGS / GALLERY / ACHIEVEMENTS) ── */}
      <div
        className={`relative z-20 flex-1 ${
          activeLeftPanel === 'gallery' || activeLeftPanel === 'achievements'
            ? 'max-w-[1240px]'
            : 'max-w-[780px]'
        } mr-6 transition-all duration-300`}
      >
        {activeLeftPanel === 'load' && (
          <SaveListPanel
            onLoad={(id) => {
              setActiveLeftPanel(null)
              onLoadGame(id)
            }}
            onClose={() => setActiveLeftPanel(null)}
            onSavesChange={() => setSaves(listSaveMetas())}
          />
        )}
        {activeLeftPanel === 'settings' && (
          <SettingsPanel onClose={() => setActiveLeftPanel(null)} />
        )}
        {activeLeftPanel === 'gallery' && (
          <EndingGalleryPanel onClose={() => setActiveLeftPanel(null)} />
        )}
        {activeLeftPanel === 'achievements' && (
          <AchievementsPanel onClose={() => setActiveLeftPanel(null)} />
        )}
      </div>

      {/* ── RIGHT MENU STACK: TITLE & CYBER BUTTONS ── */}
      <div
        className="relative z-10 flex flex-col ml-auto"
        style={{
          width: 'clamp(280px, 22vw + 10vh, 460px)',
          gap: 'clamp(1rem, 2vh, 2rem)',
        }}
      >
        {/* Title Header */}
        <header className="text-right flex flex-col items-end">
          {/* Live Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pink-500/40 bg-pink-950/40 backdrop-blur-md mb-2 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
            <span className="h-2 w-2 rounded-full bg-pink-500 animate-ping" />
            <span className="text-[10px] font-black tracking-widest text-pink-300 uppercase">
              {t('menu.kicker') || "TONIGHT'S BROADCAST"}
            </span>
          </div>

          {/* Main Logo Title */}
          <h1
            className="font-black leading-[0.85] tracking-tight text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
            style={{ fontSize: 'clamp(2.8rem, 3.2vw + 2.5vh, 5.5rem)' }}
          >
            <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              STAR
            </span>
            <span className="mt-[0.1em] block text-[0.48em] font-extrabold tracking-[0.12em] bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              BROADCASTING CO.
            </span>
          </h1>

          {/* Subtitle Badge */}
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-semibold text-slate-300 shadow-md">
            <span>{t('menu.desc')}</span>
            <span className="text-amber-400 font-bold font-mono">({t('menu.finalVer')})</span>
          </div>
        </header>

        {/* Navigation Buttons List */}
        <nav
          className="flex w-full flex-col"
          aria-label={t('menu.ariaMainMenu')}
          style={{ gap: 'clamp(0.45rem, 1vh, 0.9rem)' }}
        >
          {/* Continue Button (If save exists) */}
          {latestSave ? (
            <button
              type="button"
              onMouseEnter={() => {
                setActive('continue')
                playSfx('ui-click')
              }}
              onFocus={() => setActive('continue')}
              onClick={() => handleSelect('continue')}
              className={`game-menu-btn is-continue-btn flex items-center justify-between px-6 py-3.5 text-left ${
                active === 'continue' && !activeLeftPanel ? 'is-active' : ''
              }`}
            >
              <div>
                <div className="font-extrabold tracking-[0.14em] text-amber-300 text-sm sm:text-base">
                  {t('menu.continueGame') || 'CONTINUE'}
                </div>
                <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                  {latestSave.companyName} · {latestSave.date}
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400/80">▶</span>
            </button>
          ) : null}

          {/* Main Menu Buttons */}
          {MENU_ITEMS.map((item) => {
            const isActive = activeLeftPanel ? item.id === activeLeftPanel : active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => {
                  setActive(item.id)
                  playSfx('ui-click')
                }}
                onFocus={() => setActive(item.id)}
                onClick={() => handleSelect(item.id)}
                className={`game-menu-btn flex items-center justify-between px-6 py-3 text-left ${
                  isActive ? 'is-active' : ''
                }`}
              >
                <div>
                  <div className="font-bold tracking-[0.14em] text-xs sm:text-sm uppercase">
                    {t(item.labelKey)}
                  </div>
                  {item.subKey && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {t(item.subKey).replace(/[()]/g, '')}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-mono font-bold transition-transform ${isActive ? 'translate-x-1 text-white' : 'text-slate-600'}`}>
                  ▶
                </span>
              </button>
            )
          })}

          {/* Dev Editor Button */}
          {showEditor ? (
            <button
              type="button"
              onMouseEnter={() => {
                setActive('edit')
                playSfx('ui-click')
              }}
              onFocus={() => setActive('edit')}
              onClick={() => handleSelect('edit')}
              className={`game-menu-btn mt-2 flex items-center justify-between px-6 py-2.5 text-left border-amber-500/30 ${
                active === 'edit' && !activeLeftPanel ? 'is-active' : ''
              }`}
            >
              <span className="font-bold text-xs tracking-[0.14em] text-amber-300 uppercase">
                {t('menu.edit')}
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                ({t('menu.devOnly')})
              </span>
            </button>
          ) : null}
        </nav>
      </div>

      {/* Footer Info */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-8 py-4 text-[11px] font-mono text-slate-500">
        <span className="tracking-widest">v1.0 (FINAL VER.)</span>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-indigo-400/40 bg-indigo-500/10 text-[10px] font-bold text-indigo-300">
            A
          </span>
          <span className="font-bold tracking-widest text-slate-300">
            AURA STUDIOS
          </span>
        </div>
      </footer>
    </main>
  )
}
